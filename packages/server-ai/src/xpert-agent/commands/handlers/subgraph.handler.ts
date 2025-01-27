import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { get_lc_unique_name, Serializable } from '@langchain/core/load/serializable'
import { BaseMessage, HumanMessage, isAIMessage, ToolMessage } from '@langchain/core/messages'
import { HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts'
import { RunnableConfig, RunnableLambda } from '@langchain/core/runnables'
import {
	Annotation,
	CompiledStateGraph,
	END,
	LangGraphRunnableConfig,
	messagesStateReducer,
	Send,
	START,
	StateGraph
} from '@langchain/langgraph'
import { ChatMessageEventTypeEnum, ChatMessageTypeEnum, convertToUrlPath, IXpert, IXpertAgent, IXpertAgentExecution, TStateVariable, TSummarize, XpertAgentExecutionStatusEnum } from '@metad/contracts'
import { Logger, NotFoundException } from '@nestjs/common'
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs'
import { Subscriber } from 'rxjs'
import z from 'zod'
import { CopilotCheckpointSaver } from '../../../copilot-checkpoint'
import { memoryPrompt } from '../../../copilot-store/utils'
import { assignExecutionUsage, XpertAgentExecutionUpsertCommand } from '../../../xpert-agent-execution'
import { BaseToolset, ToolsetGetToolsCommand } from '../../../xpert-toolset'
import { GetXpertAgentQuery, GetXpertChatModelQuery } from '../../../xpert/queries'
import { createParameters } from '../execute.command'
import { XpertAgentSubgraphCommand } from '../subgraph.command'
import { ToolNode } from './tool_node'
import { AgentStateAnnotation, parseXmlString, TGraphTool, TSubAgent } from './types'
import { XpertAgentExecutionOneQuery } from '../../../xpert-agent-execution/queries'

@CommandHandler(XpertAgentSubgraphCommand)
export class XpertAgentSubgraphHandler implements ICommandHandler<XpertAgentSubgraphCommand> {
	readonly #logger = new Logger(XpertAgentSubgraphHandler.name)

	constructor(
		private readonly copilotCheckpointSaver: CopilotCheckpointSaver,
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus
	) {}

	public async execute(command: XpertAgentSubgraphCommand): Promise<CompiledStateGraph<unknown, unknown, any>> {
		const { agentKey, xpert, options } = command
		const { execution, leaderKey, summarizeTitle, subscriber, abortController } = options

		const agent = await this.queryBus.execute<GetXpertAgentQuery, IXpertAgent>(
			new GetXpertAgentQuery(xpert.id, agentKey, command.options?.isDraft)
		)
		if (!agent) {
			throw new NotFoundException(
				`Xpert agent not found for '${xpert.name}' and key ${agentKey} draft is ${command.options?.isDraft}`
			)
		}

		// The xpert (agent team)
		const team = agent.team

		// LLM
		const chatModel = await this.queryBus.execute<GetXpertChatModelQuery, BaseChatModel>(
			new GetXpertChatModelQuery(agent.team, agent, {
				abortController,
				usageCallback: assignExecutionUsage(execution)
			})
		)

		// Record ai model info into execution
		const copilotModel = agent.copilotModel ?? team.copilotModel
		execution.metadata = {
			provider: copilotModel.copilot.modelProvider?.providerName,
			model: copilotModel.model || copilotModel.copilot.copilotModel?.model
		}

		// Create tools
		const toolsets = await this.commandBus.execute<ToolsetGetToolsCommand, BaseToolset[]>(
			new ToolsetGetToolsCommand(options?.toolsets ?? agent.toolsetIds, {
				xpertId: xpert.id,
				agentKey
			})
		)
		const tools: TGraphTool[] = []
		const interruptBefore: string[] = []
		const stateVariables: TStateVariable[] = []
		for await (const toolset of toolsets) {
			stateVariables.push(...(toolset.getVariables() ?? []))
			const items = await toolset.initTools()
			items.forEach((tool) => {
				const lc_name = get_lc_unique_name(tool.constructor as typeof Serializable)
				tools.push({ caller: agent.key, tool, variables: team.agentConfig?.toolsMemory?.[lc_name] })

				// Add sensitive tools into interruptBefore
				if (team.agentConfig?.interruptBefore?.includes(lc_name)) {
					interruptBefore.push(tool.name)
				}
			})
		}

		this.#logger.debug(`Use tools:\n ${[...tools].map((_) => _.tool.name + ': ' + _.tool.description).join('\n')}`)

		// Sub agents
		const subAgents: Record<string, TSubAgent> = {}
		if (agent.followers?.length) {
			this.#logger.debug(`Use sub agents:\n ${agent.followers.map((_) => _.name)}`)
			for await (const follower of agent.followers) {
				const item = await this.createXpertAgent(follower, {
					xpert,
					options: {
						leaderKey: agent.key,
						rootExecutionId: command.options.rootExecutionId,
						isDraft: command.options.isDraft,
						subscriber
					}
				})

				subAgents[item.name] = item
				if (team.agentConfig?.interruptBefore?.includes(item.name)) {
					interruptBefore.push(item.name)
				}
			}
		}

		// State
		const SubgraphStateAnnotation = Annotation.Root({
			...AgentStateAnnotation.spec, // Common agent states
			[`${agent.key}.messages`]: Annotation<BaseMessage[]>({
				reducer: messagesStateReducer,
				default: () => []
			})
		})

		const chatModelWithTools = chatModel.bindTools([...tools.map((item) => item.tool), ...Object.keys(subAgents ?? {}).map((name) => subAgents[name].tool)])

		const enableMessageHistory = team.agentConfig?.enableMessageHistory
		const stateModifier = async (state: typeof AgentStateAnnotation.State) => {
			const { summary, memories } = state
			let systemTemplate = `Current time: ${new Date().toISOString()}\n${parseXmlString(agent.prompt) ?? ''}`
			if (memories?.length) {
				systemTemplate += `\n\n<memory>\n${memoryPrompt(memories)}\n</memory>`
			}
			if (summary) {
				systemTemplate += `\nSummary of conversation earlier: \n${summary}`
			}
			const systemMessage = await SystemMessagePromptTemplate.fromTemplate(systemTemplate, {
				templateFormat: 'mustache'
			}).format({ ...state })

			this.#logger.verbose(`SystemMessage:`, systemMessage.content)

			const messages: BaseMessage[] = [systemMessage]
			if (enableMessageHistory && state[`${agentKey}.messages`]) {
				messages.push(...state[`${agentKey}.messages`])
			}

			if (agent.promptTemplates) {
				const humanMessages = await Promise.all(
					agent.promptTemplates.map((temp) =>
						HumanMessagePromptTemplate.fromTemplate(temp.text, {
							templateFormat: 'mustache'
						}).format({ ...state })
					)
				)
				messages.push(...humanMessages)
			}
			return messages
		}

		const callModel = async (state: typeof SubgraphStateAnnotation.State, config?: RunnableConfig) => {
			const message = await chatModelWithTools.invoke(await stateModifier(state), config)
			return {
				messages: [message],
				[`${agentKey}.messages`]: [message]
			}
		}

		const thread_id = command.options.thread_id
		const subgraphBuilder = new StateGraph(SubgraphStateAnnotation)
			.addNode(
				agentKey,
				new RunnableLambda({ func: callModel }).withConfig({ runName: agentKey, tags: [thread_id] })
			)
			.addEdge(START, agentKey)

		// Add nodes for tools
		const summarize = ensureSummarize(team.summarize)
		const agentNavigator = (state: typeof AgentStateAnnotation.State) => {
			const { title, messages } = state
			const lastMessage = messages[messages.length - 1]
			if (isAIMessage(lastMessage)) {
				if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
					// If there are more than six messages, then we summarize the conversation
					if (summarize?.enabled && messages.length > summarize.maxMessages) {
						return 'summarize_conversation'
					} else if (!title && summarizeTitle) {
						return 'title_conversation'
					}

					return END
				}

				return lastMessage.tool_calls.map((toolCall) => new Send(toolCall.name, { ...state, toolCall }))
			}

			return END
		}

		subgraphBuilder.addConditionalEdges(agentKey, agentNavigator)
		const endNodes = team.agentConfig?.endNodes
		tools?.forEach(({ caller, tool, variables }) => {
			const name = tool.name
			subgraphBuilder
				.addNode(name, new ToolNode([tool], { caller, variables }))
				.addEdge(name, endNodes?.includes(tool.name) ? END : agentKey)
		})

		// Subgraphs
		if (subAgents) {
			Object.keys(subAgents).forEach((name) => {
				subgraphBuilder.addNode(name, subAgents[name].stateGraph)
					.addEdge(name, endNodes?.includes(name) ? END : agentKey)
			})
		}

		return subgraphBuilder.compile({
			checkpointer: this.copilotCheckpointSaver,
			interruptBefore: []
		})
	}

	async createXpertAgent(
		agent: IXpertAgent,
		config: {
			xpert: Partial<IXpert>
			options: {
				leaderKey: string
				rootExecutionId: string
				isDraft: boolean
				subscriber: Subscriber<MessageEvent>
			}
		}
	) {
		const { xpert, options } = config
		const { subscriber, leaderKey } = options
		const execution: IXpertAgentExecution = {}

		// Subgraph
		const subgraph = await this.commandBus.execute(
			new XpertAgentSubgraphCommand(agent.key, xpert, {
				leaderKey,
				rootExecutionId: config.options.rootExecutionId,
				isDraft: config.options.isDraft,
				subscriber,
				execution
			})
		)

		const uniqueName = convertToUrlPath(agent.name) || agent.key
		const agentTool = RunnableLambda.from(async (params: { input: string } & any): Promise<string> => ``).asTool({
			name: uniqueName,
			description: agent.description,
			schema: z.object({
				...(createParameters(agent.parameters) ?? {}),
				input: z.string().describe('Ask me some question or give me task to complete')
			})
		})

		return {
			name: uniqueName,
			tool: agentTool,
			stateGraph: RunnableLambda.from(async (state: typeof AgentStateAnnotation.State, config: LangGraphRunnableConfig): Promise<Partial<typeof AgentStateAnnotation.State>> => {
				const call = state.toolCall
				execution.threadId = config.configurable.thread_id
				execution.checkpointNs = config.configurable.checkpoint_ns

				// Record start time
				const timeStart = Date.now()
				const _execution = await this.commandBus.execute(
					new XpertAgentExecutionUpsertCommand({
						...execution,
						xpert: { id: xpert.id } as IXpert,
						agentKey: agent.key,
						inputs: call.args,
						parentId: options.rootExecutionId,
						status: XpertAgentExecutionStatusEnum.RUNNING
					})
				)

				// Start agent execution event
				subscriber.next(
					({
						data: {
							type: ChatMessageTypeEnum.EVENT,
							event: ChatMessageEventTypeEnum.ON_AGENT_START,
							data: _execution
						}
					}) as MessageEvent
				)

				let status = XpertAgentExecutionStatusEnum.SUCCESS
				let error = null
				let result = ''
				const finalize = async (configurable) => {
					const timeEnd = Date.now()
					// Record End time
					const newExecution = await this.commandBus.execute(
						new XpertAgentExecutionUpsertCommand({
							..._execution,
							checkpointId: configurable.checkpoint_id,
							elapsedTime: timeEnd - timeStart,
							status,
							error,
							outputs: {
								output: result
							}
						})
					)
		
					const fullExecution = await this.queryBus.execute(
						new XpertAgentExecutionOneQuery(newExecution.id)
					)
		
					// End agent execution event
					subscriber.next(
						({
							data: {
								type: ChatMessageTypeEnum.EVENT,
								event: ChatMessageEventTypeEnum.ON_AGENT_END,
								data: fullExecution
							}
						}) as MessageEvent
					)
				}

				try {
					const subState = {
						...state, ...call.args,
						[`${agent.key}.messages`]: [new HumanMessage(call.args.input)],
					}
					const output = await subgraph.invoke(subState, config)

					const _state = await subgraph.getState(config)

					// End agent execution event
					await finalize(_state.config.configurable)

					const lastMessage = output.messages[output.messages.length - 1]
					return {
						[`${leaderKey}.messages`]: [
							new ToolMessage({
								content: lastMessage.content,
								name: call.name,
								tool_call_id: call.id ?? "",
							})
						]
					}
				} catch(err) {
					console.error(err)
					// Catch the error before generated obs
					// try {
					// 	status = XpertAgentExecutionStatusEnum.ERROR
					// 	error = getErrorMessage(err)
					// 	await finalize()
					// } catch(err) {
					// 	//
					// }
					// throw err
				}
			}),
		} as TSubAgent
	}
}

function ensureSummarize(summarize?: TSummarize) {
	return (
		summarize && {
			...summarize,
			maxMessages: summarize.maxMessages ?? 100,
			retainMessages: summarize.retainMessages ?? 90
		}
	)
}
