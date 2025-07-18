import { Component, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { DataSourceProtocolEnum, DataSourceService, DataSourceTypesService } from '@metad/cloud/state'
import { AuthenticationEnum, IDataSource, IDataSourceType } from '@cloud/app/@core/types'
import { isEmpty, omit } from '@metad/ocap-core'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { BehaviorSubject, firstValueFrom, map } from 'rxjs'
import {
  LocalAgent,
  ServerAgent,
  ToastrService,
  convertConfigurationSchema,
  getErrorMessage
} from '@cloud/app/@core/index'
import { environment } from '@cloud/environments/environment'
import { CommonModule } from '@angular/common'
import { DragDropModule } from '@angular/cdk/drag-drop'
import { MatListModule } from '@angular/material/list'
import { ContentLoaderModule } from '@ngneat/content-loader'
import { MatButtonModule } from '@angular/material/button'
import { NgmInputComponent } from '@metad/ocap-angular/common'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { FormlyModule } from '@ngx-formly/core'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatTooltipModule } from '@angular/material/tooltip'
import { AppearanceDirective, ButtonGroupDirective, DensityDirective } from '@metad/ocap-angular/core'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'

@Component({
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    TranslateModule,
    FormlyModule,
    FormsModule,
    ReactiveFormsModule,
    MatListModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatTooltipModule,
    ContentLoaderModule,
    NgmInputComponent,
    ButtonGroupDirective,
    AppearanceDirective,
    DensityDirective
  ],
  selector: 'pac-data-source-creation',
  templateUrl: './creation.component.html',
  styleUrls: ['./creation.component.scss']
})
export class PACDataSourceCreationComponent implements OnInit {
  AuthenticationEnum = AuthenticationEnum
  enableLocalAgent = environment.enableLocalAgent

  private typesService = inject(DataSourceTypesService)
  private dataSourceService = inject(DataSourceService)
  private toastrService = inject(ToastrService)
  private translateService = inject(TranslateService)
  private data: IDataSource = inject(DIALOG_DATA, { optional: true })
  public dialogRef = inject(DialogRef<Partial<IDataSource>>)
  private localAgent? = inject(LocalAgent, { optional: true })
  private serverAgent = inject(ServerAgent)

  readonly loading = signal(false)

  readonly connectionTypes$ = this.typesService.types$.pipe(takeUntilDestroyed())
  public typeFormGroup = new FormGroup({
    type: new FormControl(null, [Validators.required])
  })
  // get type(): IDataSourceType {
  //   return this.typeFormGroup.value?.type?.[0]
  // }

  readonly dataSourceType = toSignal(this.typeFormGroup.valueChanges.pipe(map((value) => value?.type?.[0])))

  formGroup = new FormGroup({
    name: new FormControl(null, [Validators.required]),
    useLocalAgent: new FormControl(),
    authType: new FormControl<AuthenticationEnum>(null),
    options: new FormGroup({})
  })

  get nameCtrl() {
    return this.formGroup.get('name')
  }
  get options() {
    return this.formGroup.get('options') as FormGroup
  }

  model = {}
  readonly fields$ = new BehaviorSubject([])

  // Signal States
  readonly isXmla = computed(() => this.dataSourceType()?.protocol === DataSourceProtocolEnum.XMLA)

  private _typeFormGroupSub = this.typeFormGroup.valueChanges.subscribe(({ type }) => {
    if (!isEmpty(type)) {
      const i18n = this.translateService.instant('PAC.DataSources.Schema')
      this.fields$.next(convertConfigurationSchema(type[0].configuration, i18n))
    }
  })

  async ngOnInit() {
    if (this.data?.id) {
      const dataSource = await firstValueFrom(this.dataSourceService.getOne(this.data.id))
      this.typeFormGroup.patchValue({
        type: [dataSource.type]
      })
      this.formGroup.patchValue(omit(dataSource, 'id'))
      this.model = dataSource.options
    }
  }

  compareFn(a: IDataSourceType, b: IDataSourceType) {
    return a?.id === b?.id
  }

  async onSave() {
    if (this.formGroup.valid) {
      const result = await firstValueFrom(
        this.dataSourceService.create({
          ...this.formGroup.value,
          typeId: this.dataSourceType().id
        })
      )

      this.toastrService.success('PAC.MESSAGE.CreateDataSource', { Default: 'Create data source' })
      this.dialogRef.close(result)
    }
  }

  onCancel() {
    this.dialogRef.close()
  }

  onModelChange(event) {}

  async ping() {
    const agent = this.formGroup.value.useLocalAgent ? this.localAgent : this.serverAgent
    this.loading.set(true)
    try {
      await agent.request(
        {
          type: this.dataSourceType().protocol.toUpperCase(),
          dataSource: {
            ...this.formGroup.value,
            type: this.dataSourceType()
          }
        },
        {
          method: 'get',
          url: 'ping',
          body: {
            ...this.formGroup.value,
            type: this.dataSourceType()
          }
        }
      )

      this.loading.set(false)
      this.toastrService.success('PAC.ACTIONS.PING', { Default: 'Ping' })
    } catch (err) {
      const message = getErrorMessage(err)
      this.loading.set(false)
      this.toastrService.error(message)
    }
  }
}
