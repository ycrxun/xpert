import { Dialog } from '@angular/cdk/dialog'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { CdkMenuModule } from '@angular/cdk/menu'
import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewContainerRef
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatTooltipModule } from '@angular/material/tooltip'
import { RouterModule } from '@angular/router'
import { AnalyticalCardModule } from '@metad/ocap-angular/analytical-card'
import { NgmCommonModule } from '@metad/ocap-angular/common'
import { NgmDSCoreService } from '@metad/ocap-angular/core'
import { NgmSelectionModule, SlicersCapacity } from '@metad/ocap-angular/selection'
import { DataSettings, Indicator, TimeGranularity } from '@metad/ocap-core'
import { StoryExplorerComponent } from '@metad/story'
import { ExplainComponent } from '@metad/story/story'
import { NxWidgetKpiComponent } from '@metad/story/widgets/kpi'
import { TranslateModule } from '@ngx-translate/core'
import { compact, uniq } from 'lodash-es'
import { ChatMessageStepCategory, IXpertTask, Store } from '../../@core'
import { ChatComponentScheduleTasksComponent } from './schedule-tasks/tasks.component'
import { XpertHomeService } from '../home.service'
import { ChatComponentMemoriesComponent } from './memories/memories.component'
import { ChatComponentMessageFilesComponent } from './files/files.component'
import { ChatComponentMessageTasksComponent } from './tasks/tasks.component'


/**
 * A component that uniformly displays different types of component messages.
 * Currently has two categories: `Computer` and `Dashboard`
 * 
 */
@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    DragDropModule,
    CdkMenuModule,
    RouterModule,
    TranslateModule,
    MatTooltipModule,
    NgmCommonModule,
    NgmSelectionModule,
    AnalyticalCardModule,
    NxWidgetKpiComponent,

    ChatComponentMessageTasksComponent,
    ChatComponentScheduleTasksComponent,
    ChatComponentMemoriesComponent,
    ChatComponentMessageFilesComponent
  ],
  selector: 'chat-component-message',
  templateUrl: './component-message.component.html',
  styleUrl: 'component-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponentMessageComponent {
  eSlicersCapacity = SlicersCapacity
  eTimeGranularity = TimeGranularity
  eChatMessageStepCategory = ChatMessageStepCategory

  readonly #store = inject(Store)
  readonly #dialog = inject(Dialog)
  readonly dsCore = inject(NgmDSCoreService)
  readonly #viewContainerRef = inject(ViewContainerRef)
  readonly homeService = inject(XpertHomeService)

  // Inputs
  // Message ID
  readonly messageId = input<string>()
  // Sub component message
  readonly message = input<any>()


  // States
  readonly data = computed(() => this.message()?.data as any)

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly primaryTheme = toSignal(this.#store.primaryTheme$)

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly chartSettings = computed(() => {
    return {
      ...(this.data()?.chartSettings ?? {}),
      theme: this.primaryTheme()
    }
  })

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly dataSettings = computed(() => this.data()?.dataSettings as DataSettings)
  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly indicator = computed<Indicator>(() => this.data()?.indicator)
  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly dataSource = computed(() => this.dataSettings()?.dataSource)
  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly indicators = computed(() => this.data()?.indicators)
  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly slicers = computed(() => this.data()?.slicers)
  readonly tasks = computed(() => this.data()?.tasks as IXpertTask[])
  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly dataSources = computed(() => compact(uniq<string>(this.indicators()?.map((_) => _.dataSource))))

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  readonly explains = signal<any[]>([])

  // constructor() {
  //   effect(
  //     () => {
  //       if (this.dataSource()) {
  //         this.register.emit([
  //           {
  //             id: this.dataSource(),
  //             indicators: this.indicators()
  //           }
  //         ])
  //       }
  //     },
  //     { allowSignalWrites: true }
  //   )

  //   effect(
  //     () => {
  //       const newIndicator = this.indicator()
  //       if (newIndicator) {
  //         this.register.emit([
  //           {
  //             id: newIndicator.modelId,
  //             indicators: [newIndicator]
  //           }
  //         ])
  //       }
  //     },
  //     { allowSignalWrites: true }
  //   )

  //   effect(
  //     () => {
  //       if (this.dataSources()) {
  //         this.register.emit(this.dataSources().map((id) => ({ id })))
  //       }
  //     },
  //     { allowSignalWrites: true }
  //   )
  // }

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  setExplains(items: unknown[]) {
    this.explains.set(items)
  }

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  openExplain() {
    this.#dialog.open(ExplainComponent, {
      data: this.explains()
    })
  }

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  openExplorer() {
    this.#dialog
      .open(StoryExplorerComponent, {
        viewContainerRef: this.#viewContainerRef,
        disableClose: true,
        data: {
          data: {
            dataSettings: this.dataSettings(),
            slicers: this.slicers()
          }
        }
      })
      .closed.subscribe({
        next: (result) => {
          if (result) {
            // console.log(result)
          }
        }
      })
  }

  /**
   * @deprecated move to ChatMessageDashboardComponent
   */
  openCanvas() {
    this.homeService.canvasOpened.set({
      opened: true,
      type: 'Dashboard',
      messageId: this.messageId(),
      componentId: this.message().id
    })
  }

}
