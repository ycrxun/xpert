import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { API_PREFIX } from '@metad/cloud/state'
import { ITenant, ITenantCreateInput, ITenantSetting } from '@metad/contracts'
import { firstValueFrom } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient)

  API_URL = `${API_PREFIX}/tenant`

  create(createInput: ITenantCreateInput): Promise<ITenant> {
    return firstValueFrom(this.http.post<ITenant>(`${this.API_URL}`, createInput))
  }
  getOnboard() {
    return this.http.get<ITenant>(`${this.API_URL}/onboard`)
  }
  onboard(createInput: ITenantCreateInput): Promise<ITenant> {
    return firstValueFrom(this.http.post<ITenant>(`${this.API_URL}/onboard`, createInput))
  }

  async getSettings() {
    return firstValueFrom(this.http.get<ITenantSetting>(`${API_PREFIX}/tenant-setting`))
  }

  async saveSettings(request: ITenantSetting) {
    return firstValueFrom(this.http.post<ITenantSetting>(`${API_PREFIX}/tenant-setting`, request))
  }

  generateDemo(id: string) {
    return this.http.post<ITenant>(`${this.API_URL}/${id}/demo`, {})
  }
}
