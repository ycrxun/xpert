import { Injectable } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DimensionType, getLevelsHierarchy, PropertyLevel } from '@metad/ocap-core'
import { AccordionWrappers, FORMLY_ROW, FORMLY_W_1_2, FORMLY_W_FULL } from '@metad/story/designer'
import { ISelectOption } from '@metad/ocap-angular/core'
import { FormlyFieldConfig } from '@ngx-formly/core'
import { combineLatest, Observable } from 'rxjs'
import { combineLatestWith, filter, map, shareReplay, startWith, switchMap } from 'rxjs/operators'
import {
  CaptionExpressionAccordion,
  KeyExpressionAccordion,
  NameExpressionAccordion,
  OrdinalExpressionAccordion,
  ParentExpressionAccordion,
  SemanticsAccordionWrapper
} from './common'
import { CubeSchemaService } from './cube.schema'

@Injectable()
export class LevelSchemaService extends CubeSchemaService<PropertyLevel> {

  readonly _hierarchy$ = combineLatest([this.cube$, this.id$]).pipe(
    map(([cube, id]) => (cube?.dimensions ? getLevelsHierarchy(cube.dimensions, id) : null))
  )

  readonly hierarchy$ = this.select((state) => state.hierarchy).pipe(
    combineLatestWith(this._hierarchy$),
    map(([hierarchy, _hierarchy]) => hierarchy ?? _hierarchy)
  )

  readonly hierarchyTable$ = this.hierarchy$.pipe(
    map((hierarchy) => hierarchy?.primaryKeyTable ?? hierarchy?.tables?.[0]?.name)
  )

  readonly hierarchyTables$ = this.hierarchy$.pipe(
    map((hierarchy) => {
      const options = [
        {
          value: null,
          key: null,
          caption: this.getTranslation('PAC.KEY_WORDS.Default', { Default: 'Default' })
        }
      ]
      hierarchy?.tables.forEach((table) => {
        options.push({
          value: table.name,
          key: table.name,
          caption: table.name
        })
      })
      return options
    })
  )

  // Take the Level's own Table, otherwise take the Hierarchy's Table
  readonly table$ = combineLatest([
    this.select((state) => state.modeling?.table),
    this.hierarchyTable$,
    this.factName$
  ]).pipe(map(([lTable, hTable, fact]) => lTable ?? hTable ?? fact))

  readonly columnOptions$: Observable<ISelectOption[]> = this.table$.pipe(
    filter((table) => !!table),
    switchMap((table) => this.modelService.selectOriginalEntityProperties(table)),
    map((properties) => {
      const options = [
        {
          key: null,
          value: null,
          caption: this.getTranslation('PAC.KEY_WORDS.None', { Default: 'None' })
        }]
      properties?.forEach((property) => {
        options.push({ key: property.name, value: property.name, caption: property.caption })
      })
      return options
    }),
    takeUntilDestroyed(),
    shareReplay(1)
  )

  private LEVEL: any

  getSchema() {
    return this.translate.stream('PAC.MODEL.SCHEMA').pipe(
      map((SCHEMA) => {
        this.SCHEMA = SCHEMA
        this.LEVEL = SCHEMA.LEVEL
        return [
          {
            type: 'tabs',
            fieldGroup: [
              {
                props: {
                  label: this.LEVEL?.Level ?? 'Level',
                  icon: 'format_list_numbered'
                },
                fieldGroup: [this.levelModeling]
              }
              // this.role as any
            ] as FormlyFieldConfig[]
          }
        ]
      })
    )
  }

  get levelModeling() {
    const COMMON = this.SCHEMA.COMMON
    const LEVEL = this.LEVEL
    const className = FORMLY_W_1_2
    return {
      key: 'modeling',
      fieldGroup: [
        {
          wrappers: ['panel'],
          props: {
            label: LEVEL?.Modeling ?? 'Modeling',
            padding: true
          },
          fieldGroupClassName: FORMLY_ROW,
          fieldGroup: [
            {
              key: 'name',
              type: 'input',
              className,
              props: {
                label: LEVEL?.Name ?? 'Name',
                required: true
              }
            },
            {
              key: 'caption',
              type: 'input',
              className,
              props: {
                label: COMMON?.Caption ?? 'Caption'
              }
            },
            {
              className: FORMLY_W_FULL,
              key: 'description',
              type: 'textarea',
              props: {
                label: COMMON?.Description ?? 'Description',
                rows: 1,
                autosize: true
              }
            },
            {
              className,
              key: 'visible',
              type: 'checkbox',
              defaultValue: true,
              props: {
                label: COMMON?.Visible ?? 'Visible'
              }
            },
            {
              key: 'uniqueMembers',
              type: 'checkbox',
              className,
              props: {
                label: LEVEL?.UniqueMembers ?? 'Unique Members'
              },
              expressions: {
                'props.required': '!!model && !!model.closure'
              }
            },
            {
              key: 'column',
              type: 'ngm-select',
              className,
              props: {
                label: LEVEL?.Column ?? 'Column',
                required: true,
                searchable: true,
                options: this.columnOptions$,
                valueKey: 'key'
              }
            },
            {
              key: 'type',
              type: 'select',
              className,
              props: {
                label: LEVEL?.Type ?? 'Type',
                options: [
                  {
                    value: null,
                    label: LEVEL?.Type_Null ?? this.getTranslation('PAC.KEY_WORDS.None', { Default: 'None' })
                  },
                  { value: 'String', label: LEVEL?.Type_String ?? 'String' },
                  { value: 'Integer', label: LEVEL?.Type_Integer ?? 'Integer' },
                  { value: 'Numeric', label: LEVEL?.Type_Numeric ?? 'Numeric' },
                  { value: 'Boolean', label: LEVEL?.Type_Boolean ?? 'Boolean' },
                  { value: 'Date', label: LEVEL?.Type_Date ?? 'Date' },
                  { value: 'Time', label: LEVEL?.Type_Time ?? 'Time' },
                  { value: 'Timestamp', label: LEVEL?.Type_Timestamp ?? 'Timestamp' }
                ]
              }
            },
            {
              className,
              key: 'nameColumn',
              type: 'ngm-select',
              props: {
                label: LEVEL?.NameColumn ?? 'Name Column',
                searchable: true,
                options: this.columnOptions$,
                valueKey: 'key'
              }
            },
            {
              className,
              key: 'captionColumn',
              type: 'ngm-select',
              props: {
                label: LEVEL?.CaptionColumn ?? 'Caption Column',
                searchable: true,
                options: this.columnOptions$,
                valueKey: 'key'
              }
            },
            {
              className,
              key: 'ordinalColumn',
              type: 'ngm-select',
              props: {
                label: LEVEL?.OrdinalColumn ?? 'Ordinal Column',
                searchable: true,
                options: this.columnOptions$,
                valueKey: 'key'
              }
            },
            {
              className,
              key: 'parentColumn',
              type: 'ngm-select',
              props: {
                label: LEVEL?.ParentColumn ?? 'Parent Column',
                searchable: true,
                options: this.columnOptions$,
                valueKey: 'key'
              }
            },
            {
              className,
              key: 'nullParentValue',
              type: 'input',
              props: {
                label: LEVEL?.NullParentValue ?? 'Null Parent Value'
              }
            },
            {
              className,
              key: 'table',
              type: 'ngm-select',
              props: {
                label: LEVEL?.Table ?? 'Table',
                icon: 'table_view',
                searchable: true,
                options: this.hierarchyTables$
              }
            },
            {
              key: 'levelType',
              type: 'select',
              className,
              props: {
                label: LEVEL?.TimeLevelType ?? 'Time Level Type',
                icon: 'date_range',
                required: this.get((state) => state.dimension?.type === DimensionType.TimeDimension),
                options: [
                  { value: null, label: this.getTranslation('PAC.KEY_WORDS.None', { Default: 'None' }) },
                  { value: 'TimeYears', label: 'Year' },
                  { value: 'TimeQuarters', label: 'Quarter' },
                  { value: 'TimeMonths', label: 'Month' },
                  { value: 'TimeWeeks', label: 'Week' },
                  { value: 'TimeDays', label: 'Day' }
                ]
              }
            },
            {
              className,
              key: 'hideMemberIf',
              type: 'select',
              props: {
                label: LEVEL?.HideMemberIf ?? 'Hide Member If',
                options: [
                  { value: null, label: this.getTranslation('PAC.KEY_WORDS.None', { Default: 'None' }) },
                  { value: 'Never', label: 'Never' },
                  { value: 'IfBlankName', label: 'IfBlankName' },
                  { value: 'IfParentsName', label: 'IfParentsName' }
                ]
              }
            }
          ]
        },

        ...SemanticsAccordionWrapper(COMMON),
        ...AccordionWrappers([
          KeyExpressionAccordion(COMMON),
          NameExpressionAccordion(COMMON),
          CaptionExpressionAccordion(COMMON),
          OrdinalExpressionAccordion(COMMON),
          ParentExpressionAccordion(COMMON),
          this.closureAccordion(LEVEL, className),
          this.propertyAccordion(COMMON, LEVEL, className)
        ])
      ]
    }
  }

  closureAccordion(LEVEL, className: string) {
    return {
      key: 'closure',
      label: LEVEL?.ClosureTable ?? 'Closure Table',
      toggleable: true,
      fieldGroupClassName: FORMLY_ROW,
      fieldGroup: [
        {
          className: FORMLY_W_FULL,
          key: 'table',
          fieldGroup: [
            {
              key: 'name',
              type: 'ngm-select',
              props: {
                label: LEVEL?.Table ?? 'Table',
                searchable: true,
                options: this.tables$
              }
            }
          ]
        },
        {
          className,
          key: 'parentColumn',
          type: 'ngm-select',
          props: {
            label: LEVEL?.ParentColumn ?? 'Parent Column',
            searchable: true,
            valueKey: 'key'
          },
          hooks: {
            onInit: (field: FormlyFieldConfig) => {
              const tableControl = field.parent.fieldGroup[0].formControl.get('name')
              field.props.options = tableControl.valueChanges.pipe(
                startWith(tableControl.value),
                filter((table) => !!table),
                switchMap((table) => this.selectTableColumns(table))
              )
            }
          }
        },
        {
          className,
          key: 'childColumn',
          type: 'ngm-select',
          props: {
            label: LEVEL?.ChildColumn ?? 'Child Column',
            searchable: true,
            valueKey: 'key'
          },
          hooks: {
            onInit: (field: FormlyFieldConfig) => {
              const tableControl = field.parent.fieldGroup[0].formControl.get('name')
              field.props.options = tableControl.valueChanges.pipe(
                startWith(tableControl.value),
                filter((table) => !!table),
                switchMap((table) => this.selectTableColumns(table))
              )
            }
          }
        }
      ]
    }
  }

  propertyAccordion(COMMON, LEVEL, className) {
    return {
      key: 'properties',
      type: 'array',
      label: LEVEL?.Property ?? 'Property',
      toggleable: true,
      fieldArray: {
        fieldGroup: [
          {
            fieldGroupClassName: FORMLY_ROW,
            fieldGroup: [
              {
                className,
                key: 'name',
                type: 'input',
                props: {
                  label: LEVEL?.Name ?? 'Name',
                  appearance: 'standard'
                }
              },
              {
                className,
                key: 'column',
                type: 'ngm-select',
                props: {
                  label: LEVEL?.Column ?? 'Column',
                  searchable: true,
                  options: this.columnOptions$,
                  valueKey: 'key'
                }
              }
            ]
          },
          {
            className: FORMLY_W_FULL,
            key: 'caption',
            type: 'input',
            props: {
              label: COMMON?.Caption ?? 'Caption'
            }
          },
          {
            className: FORMLY_W_FULL,
            key: 'description',
            type: 'textarea',
            props: {
              label: COMMON?.Description ?? 'Description',
              rows: 1,
              autosize: true
            }
          }

          // Mondrian 不支持？
          // {
          //   key: 'propertyExpression',
          //   wrappers: ['panel'],
          //   props: {
          //     label: LEVEL?.PropertyExpression ?? 'Property Expression'
          //   },
          //   fieldGroup: [SQLExpression(LEVEL)]
          // }
        ]
      }
    }
  }
}
