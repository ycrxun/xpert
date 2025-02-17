import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'
import { Document, DocumentInterface } from '@langchain/core/documents'
import { BaseRetriever } from '@langchain/core/retrievers'
import { Logger } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch"
import { getErrorMessage } from '@metad/server-common'
import { KnowledgeSearchQuery } from './queries'
import { TKBRecallParams } from '@metad/contracts'

/**
 * Docs Retriever for signle Knowledgebase
 */
export class KnowledgeRetriever extends BaseRetriever {
	lc_namespace = ['xpert', 'knowledgenase']

	readonly #logger = new Logger(KnowledgeRetriever.name)

	tenantId: string
	organizationId: string

	constructor(
		private readonly queryBus: QueryBus,
		private readonly knowledgebaseId: string,
		private readonly options?: TKBRecallParams
	) {
		super()
	}

	async _getRelevantDocuments(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document[]> {
		this.#logger.debug(`Retrieving knowledge documents for query: ${query}`)

		this.metadata.knowledgebaseId = this.knowledgebaseId

		try {
			const results = await this.queryBus.execute<
				KnowledgeSearchQuery,
				{
					doc: DocumentInterface<Record<string, any>>
					score: number
				}[]
			>(
				new KnowledgeSearchQuery({
					tenantId: this.tenantId,
					organizationId: this.organizationId,
					knowledgebases: this.knowledgebaseId ? [this.knowledgebaseId] : [],
					query
				})
			)
			const docs = results.filter(({score}) => this.options?.score ? score >= this.options.score : true).map(({ doc }) => doc)
			return this.options?.topK ? docs.slice(0, this.options.topK) : docs
		} catch(error) {
			await dispatchCustomEvent("on_retriever_error", {knowledgebaseId: this.knowledgebaseId, error: getErrorMessage(error)})
			throw error
		}
	}
}

export function createKnowledgeRetriever(queryBus: QueryBus, knowledgebaseId: string, options?: TKBRecallParams) {
	class DynamicKnowledgeRetriever extends KnowledgeRetriever {
		// To enable langchain to obtain the actual knowledgebaseId of the Retriever as the event name
		static lc_name(): string {
			return knowledgebaseId
		}
		constructor(queryBus: QueryBus, knowledgebaseId: string, options?: TKBRecallParams) {
			super(queryBus, knowledgebaseId, options)
		}
	}
	return new DynamicKnowledgeRetriever(queryBus, knowledgebaseId, options) as KnowledgeRetriever
}
