import { RunnableLambda } from '@langchain/core/runnables'
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph/web'
import { CreateGraphOptions, Team } from '@metad/copilot'
import { CUBE_MODELER_NAME, injectRunCubeModeler } from '../cube'
import { DIMENSION_MODELER_NAME, injectRunDimensionModeler } from '../dimension/'
import { injectRunModelerPlanner } from './planner'
import { createSupervisor } from './supervisor'
import { PLANNER_NAME, SUPERVISOR_NAME, State } from './types'
import { HumanMessage } from '@langchain/core/messages'

const superState: StateGraphArgs<State>['channels'] = {
  ...Team.createState(),
  plan: {
    value: (x?: string[], y?: string[]) => y ?? x ?? [],
    default: () => []
  }
}

export function injectCreateModelerGraph() {
  const createModelerPlanner = injectRunModelerPlanner()
  const createDimensionModeler = injectRunDimensionModeler()
  const createCubeModeler = injectRunCubeModeler()

  return async ({ llm }: CreateGraphOptions) => {
    const supervisorNode = await createSupervisor(llm, [
      {
        name: PLANNER_NAME,
        description: 'Create a plan for modeling'
      },
      {
        name: DIMENSION_MODELER_NAME,
        description: 'Create a dimension, only one at a time'
      },
      {
        name: CUBE_MODELER_NAME,
        description: 'Create a cube, only one at a time'
      }
    ])
    const plannerAgent = await createModelerPlanner({ llm })

    const superGraph = new StateGraph({ channels: superState })
      // Add steps nodes
      .addNode(SUPERVISOR_NAME, RunnableLambda.from(async (state: State) => {
        const _state = await supervisorNode.invoke(state)
        return {
          ..._state,
          messages: [
            new HumanMessage(`Call ${_state.next} with instructions: ${_state.instructions}`)
          ]
        }
      }))
      .addNode(PLANNER_NAME, 
        RunnableLambda.from(async (state: State) => {
          return plannerAgent.invoke({
            input: state.instructions,
            role: state.role,
            context: state.context,
            language: state.language,
            messages: []
          })
        })
      )
      .addNode(
        DIMENSION_MODELER_NAME,
        RunnableLambda.from(async (state: State) => {
          return {
            input: state.instructions,
            role: state.role,
            context: state.context,
            language: state.language,
            messages: []
          }
        }).pipe(await createDimensionModeler({ llm }))
      )
      .addNode(
        CUBE_MODELER_NAME,
        RunnableLambda.from(async (state: State) => {
          return {
            input: state.instructions,
            role: state.role,
            context: state.context,
            language: state.language,
            messages: []
          }
        }).pipe(await createCubeModeler({ llm }))
      )

    superGraph.addEdge(PLANNER_NAME, SUPERVISOR_NAME)
    superGraph.addEdge(DIMENSION_MODELER_NAME, SUPERVISOR_NAME)
    superGraph.addEdge(CUBE_MODELER_NAME, SUPERVISOR_NAME)
    superGraph.addConditionalEdges(SUPERVISOR_NAME, (x) => x.next, {
      [PLANNER_NAME]: PLANNER_NAME,
      [DIMENSION_MODELER_NAME]: DIMENSION_MODELER_NAME,
      [CUBE_MODELER_NAME]: CUBE_MODELER_NAME,
      FINISH: END
    })

    superGraph.addEdge(START, SUPERVISOR_NAME)

    return superGraph
  }
}
