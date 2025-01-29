import { CdkMenuModule } from '@angular/cdk/menu'
import { TextFieldModule } from '@angular/cdk/text-field'
import { Component, computed, ElementRef, inject, input, model, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NgmI18nPipe } from '@metad/ocap-angular/core'
import { TranslateModule } from '@ngx-translate/core'
import { injectToastr, TStateVariable, TWFCaseCondition, WorkflowComparisonOperator } from 'apps/cloud/src/app/@core'
import { groupBy } from 'lodash'

@Component({
  standalone: true,
  selector: 'xpert-workflow-condition-form',
  templateUrl: './condition.component.html',
  styleUrls: ['./condition.component.scss'],
  imports: [FormsModule, CdkMenuModule, TranslateModule, MatTooltipModule, MatInputModule, TextFieldModule, NgmI18nPipe]
})
export class XpertWorkflowConditionFormComponent {
  readonly elementRef = inject(ElementRef)
  readonly #toastr = injectToastr()

  // Inputs
  readonly condition = model<TWFCaseCondition>()
  readonly variables = input<TStateVariable[]>()

  // Outputs
  readonly deleted = output<void>()

  // States
  readonly loading = signal(false)

  readonly variableSelector = computed(() => {
    const names = this.condition()?.variableSelector?.split('.')
    if (names?.length > 1) {
      return {
        group: names[0],
        name: names[1]
      }
    }
    return {
      name: this.condition()?.variableSelector
    }
  })
  readonly groupVariables = computed(() => {
    const variables = this.variables()?.map((item) => {
      const names = item.name.split('.')
      if (names.length > 1) {
        return {
          ...item,
          group: names[0],
          name: names[1]
        }
      }
      return item
    })
    if (!variables) return null
    const groups = groupBy(variables, 'group')
    return Object.keys(groups).map((group) => ({
      group,
      variables: groups[group] as Array<TStateVariable & { group: string }>
    }))
  })

  readonly hoverDelete = signal(false)

  get value() {
    return this.condition()?.value
  }
  set value(value) {
    this.condition.update((state) => ({ ...(state ?? {}), value }) as TWFCaseCondition)
  }

  get comparisonOperator() {
    return this.condition()?.comparisonOperator
  }
  set comparisonOperator(value) {
    this.condition.update((state) => ({ ...(state ?? {}), comparisonOperator: value }) as TWFCaseCondition)
  }

  readonly variable = computed(() => {
    return this.variables()?.find((_) => _.name === this.condition()?.variableSelector)
  })

  readonly operatorOptions = computed(() => {
    switch (this.variable()?.type) {
      case 'number': {
        return [
          {
            value: WorkflowComparisonOperator.EQUAL,
            label: {
              en_US: '='
            }
          },
          {
            value: WorkflowComparisonOperator.NOT_EQUAL,
            label: {
              en_US: '≠'
            }
          },
          {
            value: WorkflowComparisonOperator.GT,
            label: {
              en_US: '>'
            }
          },
          {
            value: WorkflowComparisonOperator.LT,
            label: {
              en_US: '<'
            }
          },
          {
            value: WorkflowComparisonOperator.GE,
            label: {
              en_US: '≥'
            }
          },
          {
            value: WorkflowComparisonOperator.LE,
            label: {
              en_US: '≤'
            }
          },
          {
            value: WorkflowComparisonOperator.EMPTY,
            label: {
              en_US: 'is empty',
              zh_Hans: '空'
            }
          },
          {
            value: WorkflowComparisonOperator.NOT_EMPTY,
            label: {
              en_US: 'not empty',
              zh_Hans: '非空'
            }
          }
        ]
      }
      default: {
        return [
          {
            value: WorkflowComparisonOperator.CONTAINS,
            label: {
              zh_Hans: '包含',
              en_US: 'contains'
            }
          },
          {
            value: WorkflowComparisonOperator.NOT_CONTAINS,
            label: {
              zh_Hans: '不包含',
              en_US: 'not contains'
            }
          }
        ]
      }
    }
  })

  readonly operatorLabel = computed(
    () =>
      this.operatorOptions()?.find((_) => _.value === this.condition()?.comparisonOperator)?.label ||
      this.condition()?.comparisonOperator
  )

  selectVariable(variable: TStateVariable & { group: string }) {
    this.condition.update(
      (state) =>
        ({
          ...(state ?? {}),
          variableSelector: variable.group ? `${variable.group}.${variable.name}` : variable.name
        }) as TWFCaseCondition
    )
  }

  selectOperator(value: WorkflowComparisonOperator) {
    this.comparisonOperator = value
  }
}
