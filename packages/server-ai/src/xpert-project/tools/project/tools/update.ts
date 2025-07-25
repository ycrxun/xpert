import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch'
import { tool } from '@langchain/core/tools'
import { ChatMessageEventTypeEnum, TAgentRunnableConfigurable } from '@metad/contracts'
import { z } from 'zod'
import { XpertProjectTaskService } from '../../../services'
import { ProjectToolEnum } from '../project'

export const createUpdateTasksTool = ({
	projectId,
	service
}: {
	projectId: string
	service: XpertProjectTaskService
}) => {
	const updateTasksTool = tool(
		async (_, config) => {
			const { configurable } = config ?? {}
			const { subscriber, thread_id } = <TAgentRunnableConfigurable>configurable ?? {}

			const tasks = await service.updateTaskSteps(projectId, thread_id, ..._.tasks)

			// Tool message event
			await dispatchCustomEvent(ChatMessageEventTypeEnum.ON_TOOL_MESSAGE, {
				category: 'Computer',
				toolset: 'project',
				tool: 'project_update_tasks',
				message: _.tasks.map((_) => _.name).join('\n\n'),
				title: await service.translate('xpert.Project.UpdatingTasks'),
				data: tasks
			})

			return `Tasks updated!`
		},
		{
			name: ProjectToolEnum.UpdateTasks,
			schema: z.object({
				tasks: z
					.array(
						z.object({
							name: z.string().describe(`Task name`),
							steps: z.array(
								z.object({
									stepIndex: z.number().describe('Index of step'),
									status: z
										.enum(['pending', 'running', 'done', 'failed'])
										.describe('Status of step.'),
									notes: z.string().optional().describe('Notes of step status')
								})
							)
						})
					)
					.describe('Tasks to update status')
			}),
			description: 'Update step status of tasks in project.'
		}
	)
	return updateTasksTool
}
