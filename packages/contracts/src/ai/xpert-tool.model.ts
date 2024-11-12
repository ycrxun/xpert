import { IBasePerTenantAndOrganizationEntityModel } from '../base-entity.model'
import { I18nObject } from './ai-model.model'
import { AiProviderRole } from './copilot.model'
import { TAvatar } from './types'
import { IXpertToolset } from './xpert-toolset.model'

/**
 * Tools for Xpert
 */
export interface IXpertTool extends IBasePerTenantAndOrganizationEntityModel, XpertToolType {}

export type XpertToolType = {
  name: string
  description?: string
  avatar?: TAvatar
  /**
   * Is enabled in toolset
   */
  enabled?: boolean
  options?: Record<string, any>
  schema?: Record<string, any> | TXpertToolEntity | IBuiltinTool
  /**
   * Default input parameters of tool
   */
  parameters?: Record<string, any>

  /**
   * Priority role of AI provider
   * @default `AiProviderRole.Secondary`
   */
  aiProviderRole?: AiProviderRole

  toolset?: IXpertToolset
  toolsetId?: string

  // Temporary properties
  provider?: IBuiltinTool
}

export type TToolProviderIdentity = {
  name: string
  author: string
  label: I18nObject
  provider: string
  entity?: string
}

interface ToolParameterOption {
  value: string;
  label: I18nObject;
}

export enum ToolParameterType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  ARRAY = "array",
  SELECT = "select",
  SECRET_INPUT = "secret-input",
  FILE = "file"
}

export enum ToolParameterForm {
  SCHEMA = "schema",  // should be set while adding tool
  FORM = "form",      // should be set before invoking tool
  LLM = "llm"         // will be set by LLM
}

export type TToolParameter = {
  name: string;
  label: I18nObject;
  human_description?: I18nObject;
  placeholder?: I18nObject;
  type: ToolParameterType;
  form: ToolParameterForm;
  llm_description?: string;
  required?: boolean;
  default?: number | string;
  min?: number;
  max?: number;
  options?: ToolParameterOption[];
  items?: {
    type: ToolParameterType
  }

  /**
   * Is visible for ai tool parameters
   */
  visible?: boolean
}

export interface ApiToolBundle {
  /**
   * This interface is used to store the schema information of an api based tool,
   * such as the url, the method, the parameters, etc.
   */

  // server_url
  server_url: string;
  // method
  method: string;
  // summary
  summary?: string;
  // operation_id
  operation_id?: string;
  // parameters
  parameters?: TToolParameter[];
  // author
  author: string;
  // icon
  icon?: string;
  // openapi operation
  openapi: Record<string, any>;
}

export interface IBuiltinTool {
  identity: TToolProviderIdentity
  description: {
    human: I18nObject
    llm: string
  }
  parameters: TToolParameter[]
  entity: string
}

// Types for OData
export type TXpertToolEntity = {
  name: string
  method: 'create' | 'get' | 'query' | 'update' | 'delete'
  entity: string
  path: string
  /**
   * Definition of properties
   */
  parameters: Partial<TToolParameter>[]

  description?: string
}

export const TOOL_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
