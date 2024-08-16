import { z } from 'zod'
import { EntityType, getEntityVariables, TimeGranularity, TimeRangeType } from '../../models'
import { ISlicer } from '../../types'
import { MemberSchema, tryFixDimension } from './common'

export const SlicerSchema = z.object({
  dimension: z
    .object({
      dimension: z.string().describe('The name of the dimension'),
      hierarchy: z.string().optional().describe('The name of the hierarchy in the dimension'),
      level: z.string().optional().describe('The name of the level in the hierarchy'),
      parameter: z.string().optional().describe('The name of variable reference to')
    })
    .describe('dimension of the slicer'),
  exclude: z.boolean().optional().describe('Exclude members'),
  members: z.array(MemberSchema).describe('Members in the slicer')
})
export const VariableSchema = z.object({
  variable: z.string().describe('The name of the variable')
})

export const TimeSlicerSchema = z.object({
  dimension: z
    .object({
      dimension: z.string().describe('The name of the dimension'),
      hierarchy: z.string().optional().describe('The name of the hierarchy in the dimension')
    })
    .describe('the time dimension'),
  ranges: z.array(
    z.object({
      type: z.enum([TimeRangeType.Standard, TimeRangeType.Offset]).describe('The type of time range'),
      granularity: z
        .enum([
          TimeGranularity.Year,
          TimeGranularity.Quarter,
          TimeGranularity.Month,
          TimeGranularity.Week,
          TimeGranularity.Day
        ])
        .describe('The granularity of the time range'),
      lookBack: z.number().optional().describe('The look back period in granularity'),
      lookAhead: z.number().optional().describe('The look ahead period in granularity')
    })
  )
})

export function tryFixSlicer(slicer: ISlicer, entityType: EntityType) {
  return {
    ...slicer,
    dimension: tryFixDimension(slicer.dimension, entityType)
  }
}

export function tryFixVariableSlicer(slicer: ISlicer, entityType: EntityType) {
  const variable = slicer.dimension.parameter
  let parameter = null
  if (entityType.parameters[variable]) {
    parameter = variable
  } else {
    const _parameter = getEntityVariables(entityType).find((item) => item.caption === variable)
    if (_parameter) {
      parameter = _parameter.name
    } else {
      throw new Error(`Can't find variable '${variable}', please confirm you use the name of variable`)
    }
  }
  return {
    ...slicer,
    dimension: {
      ...slicer.dimension,
      parameter
    }
  }
}
