import { inject, Injectable } from '@angular/core'
import { pick } from 'lodash-es'
import { NGXLogger } from 'ngx-logger'
import { BehaviorSubject } from 'rxjs'
import { API_XPERT_AGENT } from '../constants/app.constants'
import { injectApiBaseUrl } from '../providers'
import { IXpertAgent, TChatAgentParams } from '../types'
import { XpertWorkspaceBaseCrudService } from './xpert-workspace.service'
import { injectFetchEventSource } from './fetch-event-source'

@Injectable({ providedIn: 'root' })
export class XpertAgentService extends XpertWorkspaceBaseCrudService<IXpertAgent> {
  readonly #logger = inject(NGXLogger)
  readonly baseUrl = injectApiBaseUrl()
  readonly fetchEventSource = injectFetchEventSource()

  readonly #refresh = new BehaviorSubject<void>(null)

  constructor() {
    super(API_XPERT_AGENT)
  }

  chatAgent(data: TChatAgentParams) {
    return this.fetchEventSource(this.baseUrl + this.apiBaseUrl + `/chat`, JSON.stringify({
      ...data,
      xpert: pick(data.xpert, 'id', 'name', 'copilotId', 'copilotModel')
    }))
  }
}
