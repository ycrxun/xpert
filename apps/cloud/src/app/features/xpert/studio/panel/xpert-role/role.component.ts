import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  viewChild
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { FFlowModule } from '@foblex/flow'
import { IXpertRole } from '@metad/contracts'
import { NgmHighlightVarDirective } from '@metad/ocap-angular/common'
import { TranslateModule } from '@ngx-translate/core'
import { XpertRoleService } from 'apps/cloud/src/app/@core'
import { AvatarComponent, MaterialModule } from 'apps/cloud/src/app/@shared'
import { derivedAsync } from 'ngxtension/derived-async'
import { map } from 'rxjs'
import { XpertStudioApiService } from '../../domain'
import { XpertStudioPanelRoleToolsetComponent } from './toolset/toolset.component'

@Component({
  selector: 'xpert-studio-panel-role',
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FFlowModule,
    MaterialModule,
    FormsModule,
    TranslateModule,
    AvatarComponent,
    NgmHighlightVarDirective,
    XpertStudioPanelRoleToolsetComponent
  ],
  host: {
    tabindex: '-1',
    '[class.selected]': 'isSelected',
    '(contextmenu)': 'emitSelectionChangeEvent($event)'
  }
})
export class XpertStudioPanelRoleComponent {
  readonly regex = `{{(.*?)}}`
  readonly elementRef = inject(ElementRef)
  readonly apiService = inject(XpertStudioApiService)
  readonly xpertService = inject(XpertRoleService)

  readonly key = input<string>()
  readonly xpertRole = input<IXpertRole>()
  readonly promptInputElement = viewChild('editablePrompt', { read: ElementRef<HTMLDivElement> })

  readonly toolsets = computed(() => this.xpertRole()?.toolsets)
  readonly title = computed(() => this.xpertRole()?.title)
  readonly prompt = model<string>()
  readonly promptLength = computed(() => this.prompt()?.length)

  private get hostElement(): HTMLElement {
    return this.elementRef.nativeElement
  }

  readonly titleError = derivedAsync(() => {
    return this.xpertService
      .validateTitle(this.title())
      .pipe(map((items) => !!items.filter((item) => item.id !== this.xpertRole().id).length))
  })

  constructor() {
    effect(() => {
      if (this.xpertRole()) {
        this.prompt.set(this.xpertRole().prompt)
      }
    }, { allowSignalWrites: true })
  }

  protected emitSelectionChangeEvent(event: MouseEvent): void {
    this.hostElement.focus()
    event.preventDefault()
    // this.selectionService.setColumn(this.tableId, this.column.id);
  }

  onNameChange(event: string) {
    this.apiService.updateXpertRole(this.key(), { name: event })
  }
  onTitleChange(event: string) {
    this.apiService.updateXpertRole(this.key(), {
      title: event
    })
  }
  onDescChange(event: string) {
    this.apiService.updateXpertRole(this.key(), { description: event })
  }
  onBlur() {
    this.apiService.reload()
  }
  onPromptChange() {
    const text = this.promptInputElement().nativeElement.textContent
    console.log(text)
    console.log(this.promptInputElement().nativeElement)
    this.prompt.set(text)
    this.apiService.updateXpertRole(this.key(), { prompt: text })
  }
}
