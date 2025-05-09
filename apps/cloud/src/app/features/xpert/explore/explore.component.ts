import { Dialog } from '@angular/cdk/dialog'
import { CdkListboxModule } from '@angular/cdk/listbox'
import { CdkMenuModule } from '@angular/cdk/menu'
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { DynamicGridDirective } from '@metad/core'
import { NgmCommonModule, NgmHighlightDirective } from '@metad/ocap-angular/common'
import { TranslateModule } from '@ngx-translate/core'
import { injectQueryParams } from 'ngxtension/inject-query-params'
import { debounceTime, tap } from 'rxjs'
import { TXpertTemplate, XpertTemplateService, XpertTypeEnum } from '../../../@core'
import { EmojiAvatarComponent } from '../../../@shared/avatar'
import { XpertInstallComponent } from './install/install.component'

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    RouterModule,
    CdkMenuModule,
    CdkListboxModule,
    MatInputModule,

    NgmCommonModule,
    NgmHighlightDirective,
    DynamicGridDirective,
    EmojiAvatarComponent
  ],
  selector: 'xpert-explore',
  templateUrl: 'explore.component.html',
  styleUrl: 'explore.component.scss',
  animations: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: []
})
export class XpertExploreComponent {
  eXpertTypeEnum = XpertTypeEnum

  readonly templateService = inject(XpertTemplateService)
  readonly #dialog = inject(Dialog)
  readonly route = inject(ActivatedRoute)
  readonly querySearch = injectQueryParams('search')

  // States
  readonly loading = signal(true)
  readonly templates = toSignal(this.templateService.getAll().pipe(tap(() => this.loading.set(false))))

  readonly categories = computed(() => this.templates()?.categories)
  readonly category = model<string[]>(['recommended'])
  readonly recommendedApps = computed(() => {
    const category = this.category()[0]
    if (category === 'recommended') {
      return this.templates()?.recommendedApps
    } else {
      return this.templates()?.recommendedApps.filter((app) => app.category === category)
    }
  })
  readonly apps = computed(() => {
    const text = this.searchText().toLowerCase()
    return text
      ? this.recommendedApps()?.filter(
          (_) => _.name.toLowerCase().includes(text) || _.description?.toLowerCase().includes(text)
        )
      : this.recommendedApps()
  })

  readonly searchControl = new FormControl<string>('')
  readonly searchText = toSignal(this.searchControl.valueChanges.pipe(debounceTime(300)), { initialValue: '' })

  constructor() {
    effect(() => {
      if (this.querySearch()) {
        this.searchControl.setValue(this.querySearch())
      }
    })
  }

  install(app: TXpertTemplate) {
    this.#dialog
      .open(XpertInstallComponent, {
        data: app
      })
      .closed.subscribe({
        next: () => {}
      })
  }
}
