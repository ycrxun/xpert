import { inject, Injectable } from '@angular/core'
import { OrganizationBaseCrudService } from '@metad/cloud/state'
import { NGXLogger } from 'ngx-logger'
import { BehaviorSubject } from 'rxjs'
import { API_XPERT_WORKSPACE } from '../constants/app.constants'
import { IXpertWorkspace } from '../types'
import { toParams } from '@metad/ocap-angular/core'

@Injectable({ providedIn: 'root' })
export class XpertWorkspaceService extends OrganizationBaseCrudService<IXpertWorkspace> {
  readonly #logger = inject(NGXLogger)

  readonly #refresh = new BehaviorSubject<void>(null)

  constructor() {
    super(API_XPERT_WORKSPACE)
  }
}

export class XpertWorkspaceBaseCrudService<T> extends OrganizationBaseCrudService<T> {
  getAllByWorkspace(workspace: IXpertWorkspace, options?) {
    return this.httpClient.get<{ items: T[] }>(`${this.apiBaseUrl}/by-workspace/${workspace?.id}`, {
      params: toParams({
        data: JSON.stringify(options ?? {})
      })
    })
  }
}
