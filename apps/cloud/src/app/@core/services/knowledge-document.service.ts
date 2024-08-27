import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import { API_PREFIX, OrganizationBaseCrudService } from '@metad/cloud/state'
import { IKnowledgeDocument } from '@metad/contracts'
import { NGXLogger } from 'ngx-logger'

const API_KNOWLEDGE_DOCUMENT = API_PREFIX + '/knowledge-document'

@Injectable({ providedIn: 'root' })
export class KnowledgeDocumentService extends OrganizationBaseCrudService<IKnowledgeDocument> {
  readonly #logger = inject(NGXLogger)
  readonly httpClient = inject(HttpClient)

  constructor() {
    super(API_KNOWLEDGE_DOCUMENT)
  }
}
