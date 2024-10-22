import { ApiProviderSchemaType, ApiToolBundle, ToolParameter } from '@metad/contracts';
import { shortuuid } from '@metad/server-common';
import { fromParameter, fromSchema } from '@openapi-contrib/openapi-schema-to-json-schema';
import { load } from 'js-yaml';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import { ToolParameterForm, ToolParameterType } from '../types';
import type { JSONSchema4 } from "json-schema";
import type { ParameterObject } from "openapi-typescript/src/types";
import { ToolApiSchemaError, ToolNotSupportedError, ToolProviderNotFoundError } from '../errors';


export class ApiBasedToolSchemaParser {
  static parseOpenapiToToolBundle(
    openapi: Record<string, any>,
    extraInfo: Record<string, any> = {},
    warning: Record<string, any> = {}
  ): ApiToolBundle[] {
    extraInfo['description'] = openapi['info']?.description || '';

    if (!openapi['servers'] || openapi['servers'].length === 0) {
      throw new Error('No server found in the openapi yaml.');
    }

    const serverUrl = openapi['servers'][0]['url'];
    const interfaces: any[] = [];

    for (const [path, pathItem] of Object.entries(openapi['paths'])) {
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
      for (const method of methods) {
        if (pathItem[method]) {
          interfaces.push({
            path,
            method,
            operation: pathItem[method],
          });
        }
      }
    }

    const bundles: ApiToolBundle[] = [];
    for (const interfaceObj of interfaces) {
      const parameters: ToolParameter[] = [];
      if (interfaceObj.operation.parameters) {
        for (const parameter of interfaceObj.operation.parameters) {
          const toolParameter: ToolParameter = {
            name: parameter.name,
            label: { en_US: parameter.name, zh_Hans: parameter.name },
            human_description: {
              en_US: parameter.description || '',
              zh_Hans: parameter.description || '',
            },
            type: ToolParameterType.STRING,
            required: parameter.required || false,
            form: ToolParameterForm.LLM,
            llm_description: parameter.description || '',
            default: parameter.schema?.default || null,
          };

          const typ = ApiBasedToolSchemaParser.getToolParameterType(parameter);
          if (typ) {
            toolParameter.type = typ;
          }

          parameters.push(toolParameter);
        }
      }

      if (interfaceObj.operation.requestBody) {
        const requestBody = interfaceObj.operation.requestBody;
        if (requestBody.content) {
          for (const [contentType, content] of Object.entries<any>(requestBody.content)) {
            if (!content.schema) continue;

            if (content.schema.$ref) {
              let root = openapi;
              const reference = content.schema.$ref.split('/').slice(1);
              for (const ref of reference) {
                root = root[ref];
              }
              interfaceObj.operation.requestBody.content[contentType].schema = root;
            }

            if (interfaceObj.operation.requestBody.content[contentType].schema) {
              const bodySchema = interfaceObj.operation.requestBody.content[contentType].schema;
              const required = bodySchema.required || [];
              const properties = bodySchema.properties || {};
              for (const [name, property] of Object.entries<any>(properties)) {
                const tool: ToolParameter = {
                  name,
                  label: { en_US: name, zh_Hans: name },
                  human_description: {
                    en_US: property.description || '',
                    zh_Hans: property.description || '',
                  },
                  type: ToolParameterType.STRING,
                  required: required.includes(name),
                  form: ToolParameterForm.LLM,
                  llm_description: property.description || '',
                  default: property.default || null,
                };

                const typ = ApiBasedToolSchemaParser.getToolParameterType(property);
                if (typ) {
                  tool.type = typ;
                }

                parameters.push(tool);
              }
            }
          }
        }
      }

      const parametersCount: Record<string, number> = {};
      for (const parameter of parameters) {
        parametersCount[parameter.name] = (parametersCount[parameter.name] || 0) + 1;
      }
      for (const [name, count] of Object.entries(parametersCount)) {
        if (count > 1) {
          warning['duplicated_parameter'] = `Parameter ${name} is duplicated.`;
        }
      }

      if (!interfaceObj.operation.operationId) {
        let path = interfaceObj.path;
        if (interfaceObj.path.startsWith('/')) {
          path = interfaceObj.path.slice(1);
        }
        path = path.replace(/[^a-zA-Z0-9_-]/g, '');
        if (!path) {
          path = shortuuid()
        }

        interfaceObj.operation.operationId = `${path}_${interfaceObj.method}`;
      }

      bundles.push({
        server_url: serverUrl + interfaceObj.path,
        method: interfaceObj.method,
        summary: interfaceObj.operation.description || interfaceObj.operation.summary || '',
        operation_id: interfaceObj.operation.operationId,
        parameters,
        author: '',
        icon: null,
        openapi: interfaceObj.operation,
      });
    }

    return bundles;
  }

  static getToolParameterType(parameter: Record<string, any>): ToolParameterType | null {
    const typ = parameter.type || parameter.schema?.type || null;

    if (typ === 'integer' || typ === 'number') {
      return ToolParameterType.NUMBER;
    } else if (typ === 'boolean') {
      return ToolParameterType.BOOLEAN;
    } else if (typ === 'string') {
      return ToolParameterType.STRING;
    }

    return null;
  }

  static parseOpenapiYamlToToolBundle(
    yaml: string,
    extraInfo: Record<string, any> = {},
    warning: Record<string, any> = {}
  ): ApiToolBundle[] {
    const openapi: Record<string, any> = load(yaml);
    if (!openapi) {
      throw new Error('Invalid openapi yaml.');
    }
    return ApiBasedToolSchemaParser.parseOpenapiToToolBundle(openapi, extraInfo, warning);
  }

  static parseOpenAPIYamlToJSONSchema(spec: string, options?: {path: string; operartor: string}) {
    const openapiSpecJSON = load(spec)
    const jsonSchema = fromSchema(openapiSpecJSON)
    if (options?.path) {
      return jsonSchema.paths?.[options.path]?.[options.operartor]
    }
    return jsonSchema
  }

  static parseJSONSchemaToZod(jsonSchema: JSONSchema4) {
    try {
      return eval(jsonSchemaToZod(jsonSchema, { module: 'cjs' }))
    } catch (err) {
      throw new Error(`Invalid input schema.`)
    }
  }

  static parseParametersToZod(parameters: ParameterObject[]) {
    if (!parameters) {
      throw new ToolApiSchemaError(`Parameters is empty`)
    }
    try {
      const jsonSchemaObject = {
        type: 'object',
        properties: parameters.reduce((acc, curr) => {
          acc[curr.name] = fromParameter(curr,)
          return acc
        }, {} as any),
        required: parameters.filter((p) => p.required).map((p) => p.name)
      }

      return eval(jsonSchemaToZod(jsonSchemaObject, { module: 'cjs' }))
    } catch (err) {
      console.error(err)
      throw new Error(`Invalid input schema.`)
    }
  }

  static parseOpenAPIYamlToZod(spec: string) {
    const jsonSchema = ApiBasedToolSchemaParser.parseOpenAPIYamlToJSONSchema(spec)
    return ApiBasedToolSchemaParser.parseJSONSchemaToZod(jsonSchema)
  }

    static async autoParseToToolBundle(
        content: string,
        extraInfo: Record<string, any> = {},
        warning: Record<string, any> = {}
    ): Promise<[ApiToolBundle[], string]> {
        content = content.trim();
        let loadedContent: any = null;
        let jsonError: Error | null = null;
        let yamlError: Error | null = null;

        try {
            loadedContent = JSON.parse(content);
        } catch (e) {
            jsonError = e;
        }

        if (loadedContent === null) {
            try {
                loadedContent = load(content)
            } catch (e) {
                yamlError = e;
            }
        }

        if (loadedContent === null) {
            throw new ToolApiSchemaError(
                `Invalid api schema, schema is neither json nor yaml. json error: ${jsonError?.message}, yaml error: ${yamlError?.message}`
            );
        }

        let swaggerError: Error | null = null;
        let openapiError: Error | null = null;
        let openapiPluginError: Error | null = null;
        let schemaType: string | null = null;

        try {
            const openapi = ApiBasedToolSchemaParser.parseOpenapiToToolBundle(
                loadedContent, extraInfo, warning
            );
            schemaType = ApiProviderSchemaType.OPENAPI;
            return [openapi, schemaType];
        } catch (e) {
            openapiError = e;
        }

        try {
            const convertedSwagger = ApiBasedToolSchemaParser.parseSwaggerToOpenapi(
                loadedContent, extraInfo, warning
            );
            schemaType = ApiProviderSchemaType.SWAGGER;
            return [
                ApiBasedToolSchemaParser.parseOpenapiToToolBundle(
                    convertedSwagger, extraInfo, warning
                ),
                schemaType
            ];
        } catch (e) {
            swaggerError = e;
        }

        try {
            const openapiPlugin = await ApiBasedToolSchemaParser.parseOpenaiPluginJsonToToolBundle(
                JSON.stringify(loadedContent), extraInfo, warning
            );
            return [openapiPlugin, ApiProviderSchemaType.OPENAI_PLUGIN];
        } catch (e) {
            openapiPluginError = e;
        }

        throw new ToolApiSchemaError(
            `Invalid api schema, openapi error: ${openapiError?.message}, swagger error: ${swaggerError?.message}, openapi plugin error: ${openapiPluginError?.message}`
        );
    }

      static parseSwaggerToOpenapi(
          swagger: Record<string, any>,
          extraInfo: Record<string, any> = {},
          warning: Record<string, any> = {}
      ): Record<string, any> {
          const info = swagger.info || { title: "Swagger", description: "Swagger", version: "1.0.0" };
          const servers = swagger.servers || [];
  
          if (servers.length === 0) {
              throw new ToolApiSchemaError("No server found in the swagger yaml.");
          }
  
          const openapi: Record<string, any> = {
              openapi: "3.0.0",
              info: {
                  title: info.title || "Swagger",
                  description: info.description || "Swagger",
                  version: info.version || "1.0.0",
              },
              servers: swagger.servers,
              paths: {},
              components: { schemas: {} },
          };
  
          if (!swagger.paths || Object.keys(swagger.paths).length === 0) {
              throw new ToolApiSchemaError("No paths found in the swagger yaml.");
          }
  
          for (const [path, pathItem] of Object.entries(swagger.paths)) {
              openapi.paths[path] = {};
              for (const [method, operation] of Object.entries(pathItem)) {
                  if (!operation.operationId) {
                      throw new ToolApiSchemaError(`No operationId found in operation ${method} ${path}.`);
                  }
  
                  if ((!operation.summary || operation.summary.length === 0) &&
                      (!operation.description || operation.description.length === 0)) {
                      warning["missing_summary"] = `No summary or description found in operation ${method} ${path}.`;
                  }
  
                  openapi.paths[path][method] = {
                      operationId: operation.operationId,
                      summary: operation.summary || "",
                      description: operation.description || "",
                      parameters: operation.parameters || [],
                      responses: operation.responses || {},
                  };
  
                  if (operation.requestBody) {
                      openapi.paths[path][method].requestBody = operation.requestBody;
                  }
              }
          }
  
          for (const [name, definition] of Object.entries(swagger.definitions || {})) {
              openapi.components.schemas[name] = definition;
          }
  
          return openapi;
      }
  
      static async parseOpenaiPluginJsonToToolBundle(
          json: string,
          extraInfo: Record<string, any> = {},
          warning: Record<string, any> = {}
      ): Promise<ApiToolBundle[]> {
          try {
              const openaiPlugin = JSON.parse(json);
              const api = openaiPlugin.api;
              const apiUrl = api.url;
              const apiType = api.type;
  
              if (apiType !== "openapi") {
                  throw new ToolNotSupportedError("Only openapi is supported now.");
              }
  
              const response = await fetch(apiUrl, {
                  headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
                  // timeout: 5000
              });
  
              if (!response.ok) {
                  throw new ToolProviderNotFoundError("Cannot get openapi yaml from url.");
              }
  
              const yamlText = await response.text();
              return ApiBasedToolSchemaParser.parseOpenapiYamlToToolBundle(yamlText, extraInfo, warning);
          } catch (error) {
              throw new ToolProviderNotFoundError("Invalid openai plugin json.");
          }
      }

}