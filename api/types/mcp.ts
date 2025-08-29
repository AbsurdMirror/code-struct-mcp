/**
 * MCP协议相关的类型定义
 * 基于MOD004 AI模型MCP接口的设计文档
 */

import { z } from 'zod';
import { ModuleType, AccessModifier, Parameter } from './module.js';

// MCP请求基础接口
export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
  id?: string | number;
}

// MCP响应基础接口
export interface MCPResponse<T = any> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number;
}

// MCP工具调用接口
export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

// MCP工具定义接口
export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// 验证规则接口
export interface ValidationRule {
  field: string;
  rule: 'required' | 'type' | 'length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// add_module工具参数验证schema
export const AddModuleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['class', 'function', 'variable', 'file', 'functionGroup']),
  parent_module: z.string().optional(),
  file_path: z.string().min(1),
  access_modifier: z.enum(['public', 'private', 'protected']),
  description: z.string().optional(),
  // 类型特定字段
  inheritance: z.array(z.string()).optional(),
  interfaces: z.array(z.string()).optional(),
  parameters: z.array(z.object({
    name: z.string().min(1),
    data_type: z.string().min(1),
    default_value: z.string().nullable().optional(),
    is_required: z.boolean(),
    description: z.string().optional()
  })).optional(),
  return_type: z.string().optional(),
  is_async: z.boolean().optional(),
  data_type: z.string().optional(),
  initial_value: z.string().optional(),
  is_constant: z.boolean().optional(),
  functions: z.array(z.string()).optional()
});

// get_module_by_name工具参数验证schema
export const GetModuleByNameSchema = z.object({
  hierarchical_name: z.string().min(1)
});

// smart_search工具参数验证schema
export const SmartSearchSchema = z.object({
  name: z.string().optional(),
  type: z.enum(['class', 'function', 'variable', 'file', 'functionGroup']).optional(),
  parent_module: z.string().optional(),
  file_path: z.string().optional(),
  access_modifier: z.enum(['public', 'private', 'protected']).optional(),
  description: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

// get_type_structure工具参数验证schema
export const GetTypeStructureSchema = z.object({
  type_name: z.string().min(1)
});

// MCP工具参数类型
export type AddModuleParams = z.infer<typeof AddModuleSchema>;
export type GetModuleByNameParams = z.infer<typeof GetModuleByNameSchema>;
export type SmartSearchParams = z.infer<typeof SmartSearchSchema>;
export type GetTypeStructureParams = z.infer<typeof GetTypeStructureSchema>;

// MCP工具响应类型
export interface AddModuleResponse {
  success: boolean;
  data: {
    hierarchical_name: string;
    message: string;
  };
}

export interface GetModuleByNameResponse {
  success: boolean;
  data: {
    module: any; // AnyModule类型，但为了避免循环依赖使用any
  };
}

export interface SmartSearchResponse {
  success: boolean;
  data: {
    modules: any[]; // AnyModule[]类型
    total: number;
    query: SmartSearchParams;
  };
}

export interface GetTypeStructureResponse {
  success: boolean;
  data: {
    type_name: string;
    hierarchy: string[];
    related_modules: any[]; // AnyModule[]类型
    relationships: any[]; // ModuleRelationship[]类型
  };
}

// MCP工具定义列表
export const MCP_TOOLS: ToolDefinition[] = [
  {
    name: 'add_module',
    title: '添加代码模块',
    description: '添加新的代码模块，支持class、function、variable等类型，自动生成层次化名称',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '模块名称',
          minLength: 1,
          maxLength: 100
        },
        type: {
          type: 'string',
          enum: ['class', 'function', 'variable', 'file', 'functionGroup'],
          description: '模块类型'
        },
        parent_module: {
          type: 'string',
          description: '父模块层次化名称（可选）'
        },
        file_path: {
          type: 'string',
          description: '文件路径',
          minLength: 1
        },
        access_modifier: {
          type: 'string',
          enum: ['public', 'private', 'protected'],
          description: '访问修饰符'
        },
        description: {
          type: 'string',
          description: '模块描述（可选）'
        },
        inheritance: {
          type: 'array',
          items: { type: 'string' },
          description: '继承关系（仅用于class类型）'
        },
        interfaces: {
          type: 'array',
          items: { type: 'string' },
          description: '实现的接口（仅用于class类型）'
        },
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              data_type: { type: 'string' },
              default_value: { type: 'string' },
              is_required: { type: 'boolean' },
              description: { type: 'string' }
            },
            required: ['name', 'data_type', 'is_required']
          },
          description: '参数列表（仅用于function类型）'
        },
        return_type: {
          type: 'string',
          description: '返回值类型（仅用于function类型）'
        },
        is_async: {
          type: 'boolean',
          description: '是否异步函数（仅用于function类型）'
        },
        data_type: {
          type: 'string',
          description: '数据类型（仅用于variable类型）'
        },
        initial_value: {
          type: 'string',
          description: '初始值（仅用于variable类型）'
        },
        is_constant: {
          type: 'boolean',
          description: '是否常量（仅用于variable类型）'
        },
        functions: {
          type: 'array',
          items: { type: 'string' },
          description: '函数列表（仅用于functionGroup类型）'
        }
      },
      required: ['name', 'type', 'file_path', 'access_modifier']
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            hierarchical_name: { type: 'string' },
            message: { type: 'string' }
          },
          required: ['hierarchical_name', 'message']
        }
      },
      required: ['success', 'data']
    }
  },
  {
    name: 'get_module_by_name',
    title: '获取模块信息',
    description: '根据层次化名称精确获取模块信息，包含完整的模块属性和关系',
    inputSchema: {
      type: 'object',
      properties: {
        hierarchical_name: {
          type: 'string',
          description: '模块的层次化名称',
          minLength: 1
        }
      },
      required: ['hierarchical_name']
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            module: { type: 'object' }
          },
          required: ['module']
        }
      },
      required: ['success', 'data']
    }
  },
  {
    name: 'smart_search',
    title: '智能搜索模块',
    description: '智能搜索功能，支持按名称、类型、文件路径、描述等条件进行模糊匹配',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '模块名称（支持模糊匹配）'
        },
        type: {
          type: 'string',
          enum: ['class', 'function', 'variable', 'file', 'functionGroup'],
          description: '模块类型'
        },
        parent_module: {
          type: 'string',
          description: '父模块层次化名称'
        },
        file_path: {
          type: 'string',
          description: '文件路径（支持模糊匹配）'
        },
        access_modifier: {
          type: 'string',
          enum: ['public', 'private', 'protected'],
          description: '访问修饰符'
        },
        description: {
          type: 'string',
          description: '描述信息（支持模糊匹配）'
        },
        limit: {
          type: 'number',
          description: '返回结果数量限制',
          minimum: 1,
          maximum: 100
        },
        offset: {
          type: 'number',
          description: '分页偏移量',
          minimum: 0
        }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            modules: {
              type: 'array',
              items: { type: 'object' }
            },
            total: { type: 'number' },
            query: { type: 'object' }
          },
          required: ['modules', 'total', 'query']
        }
      },
      required: ['success', 'data']
    }
  },
  {
    name: 'get_type_structure',
    title: '获取类型结构',
    description: '获取指定类型的结构信息，展示类型层次和关联关系',
    inputSchema: {
      type: 'object',
      properties: {
        type_name: {
          type: 'string',
          description: '类型名称',
          minLength: 1
        }
      },
      required: ['type_name']
    },
    outputSchema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            type_name: { type: 'string' },
            hierarchy: {
              type: 'array',
              items: { type: 'string' }
            },
            related_modules: {
              type: 'array',
              items: { type: 'object' }
            },
            relationships: {
              type: 'array',
              items: { type: 'object' }
            }
          },
          required: ['type_name', 'hierarchy', 'related_modules', 'relationships']
        }
      },
      required: ['success', 'data']
    }
  }
];

// MCP错误代码
export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  VALIDATION_ERROR = -32001,
  MODULE_NOT_FOUND = -32002,
  MODULE_ALREADY_EXISTS = -32003,
  CIRCULAR_REFERENCE = -32004,
  STORAGE_ERROR = -32005
}

// MCP错误消息
export const MCP_ERROR_MESSAGES: Record<MCPErrorCode, string> = {
  [MCPErrorCode.PARSE_ERROR]: '解析错误',
  [MCPErrorCode.INVALID_REQUEST]: '无效请求',
  [MCPErrorCode.METHOD_NOT_FOUND]: '方法未找到',
  [MCPErrorCode.INVALID_PARAMS]: '无效参数',
  [MCPErrorCode.INTERNAL_ERROR]: '内部错误',
  [MCPErrorCode.VALIDATION_ERROR]: '验证错误',
  [MCPErrorCode.MODULE_NOT_FOUND]: '模块未找到',
  [MCPErrorCode.MODULE_ALREADY_EXISTS]: '模块已存在',
  [MCPErrorCode.CIRCULAR_REFERENCE]: '循环引用',
  [MCPErrorCode.STORAGE_ERROR]: '存储错误'
};