import { CdkMenuModule } from '@angular/cdk/menu'
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatTooltipModule } from '@angular/material/tooltip'
import { RouterModule } from '@angular/router'
import { calcTimeRange, OverlayAnimations, TimeRangeEnum, TimeRangeOptions } from '@metad/core'
import { NgmSpinComponent } from '@metad/ocap-angular/common'
import { NgmI18nPipe, TSelectOption } from '@metad/ocap-angular/core'
import { TranslateModule } from '@ngx-translate/core'
import { NgmSelectComponent } from 'apps/cloud/src/app/@shared/common'
import { addDays, differenceInDays, startOfMonth, startOfQuarter, startOfYear, subDays, subSeconds } from 'date-fns'
import { derivedAsync } from 'ngxtension/derived-async'
import { of } from 'rxjs'
import { injectApiBaseUrl, injectToastr, XpertService } from '../../../../../@core'
import { XpertComponent } from '../../xpert.component'
import { XpertStatisticsChartComponent } from '../chart/chart.component'

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    CdkMenuModule,
    MatTooltipModule,
    NgmI18nPipe,
    NgmSpinComponent,
    XpertStatisticsChartComponent,
    NgmSelectComponent
  ],
  selector: 'xpert-statistics',
  templateUrl: './statistics.component.html',
  styleUrl: 'statistics.component.scss',
  animations: [...OverlayAnimations],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class XpertStatisticsComponent {
  TimeRanges = TimeRangeOptions
  readonly xpertService = inject(XpertService)
  readonly #toastr = injectToastr()
  readonly xpertComponent = inject(XpertComponent)
  readonly apiBaseUrl = injectApiBaseUrl()

  readonly xpert = this.xpertComponent.latestXpert
  readonly xpertId = computed(() => this.xpert()?.id)

  readonly timeRangeValue = model<TimeRangeEnum>(TimeRangeEnum.Last7Days)
  readonly timeRange = computed(() => calcTimeRange(this.timeRangeValue()))

  readonly dailyConv = derivedAsync(() => {
    return this.xpertId() ? this.xpertService.getDailyConversations(this.xpertId(), this.timeRange()) : of(null)
  })

  readonly dailyEndUsers = derivedAsync(() => {
    return this.xpertId() ? this.xpertService.getDailyEndUsers(this.xpertId(), this.timeRange()) : of(null)
  })

  readonly averageSessionInteractions = derivedAsync(() => {
    return this.xpertId() ? this.xpertService.getAverageSessionInteractions(this.xpertId(), this.timeRange()) : of(null)
  })

  readonly dailyMessages = derivedAsync(() => {
    return this.xpertId() ? this.xpertService.getDailyMessages(this.xpertId(), this.timeRange()) : of(null)
  })

  readonly selectedTimeOption = computed(() => TimeRangeOptions.find((_) => _.value === this.timeRangeValue())?.label )
}
