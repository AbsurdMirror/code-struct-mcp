/**
 * MOD004: AI模型MCP接口模块
 * 提供MCP (Model Context Protocol) 相关的接口类型定义和工具处理功能
 * 依赖: MOD001 (存储管理), MOD002 (模块管理), MOD003 (人类交互接口)
 */

// import { HumanInterface } from './human-interface.js'; // 暂时注释掉，human-interface.ts没有导出HumanInterface类
import { initialize_module_manager, add_module, find_modules, get_module_relationships } from './module-manager';
import { initialize_storage } from './storage';
import { Module, SearchResult, TypeStructure } from '../shared/types';

// ==================== MCP接口类型定义 ====================

/**
 * MCP请求接口
 */
export interface MCPRequest {
  /** 请求ID */
  id: string;
  /** 请求方法 */
  method: string;
  /** 请求参数 */
  params?: Record<string, any>;
}

/**
 * MCP响应接口
 */
export interface MCPResponse {
  /** 响应ID */
  id: string;
  /** 响应结果 */
  result?: any;
  /** 错误信息 */
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * 工具调用接口
 */
export interface ToolCall {
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  parameters: Record<string, any>;
}

/**
 * 参数验证规则接口
 */
export interface ValidationRule {
  /** 参数名称 */
  name: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 是否必需 */
  required: boolean;
  /** 参数描述 */
  description?: string;
  /** 默认值 */
  default?: any;
  /** 枚举值 */
  enum?: any[];
  /** 最小值/长度 */
  min?: number;
  /** 最大值/长度 */
  max?: number;
  /** 正则表达式模式 */
  pattern?: string;
}

// ==================== 全局变量定义 ====================

/**
 * MCP工具注册表
 * 存储所有可用的MCP工具及其配置信息
 */
export const mcp_tools_registry: Record<string, {
  name: string;
  description: string;
  parameters: ValidationRule[];
  handler: (params: Record<string, any>) => Promise<any>;
}> = {
  add_module: {
    name: 'add_module',
    description: '添加新的代码模块到系统中',
    parameters: [
      { name: 'name', type: 'string', required: true, description: '模块名称' },
      { name: 'type', type: 'string', required: true, description: '模块类型', enum: ['class', 'function', 'variable', 'file', 'functionGroup'] },
      { name: 'description', type: 'string', required: false, description: '模块描述' },
      { name: 'parent_module', type: 'string', required: false, description: '父模块名称' },
      { name: 'file_path', type: 'string', required: true, description: '文件路径' },
      { name: 'start_line', type: 'number', required: true, description: '起始行号', min: 1 },
      { name: 'end_line', type: 'number', required: true, description: '结束行号', min: 1 },
      { name: 'access_level', type: 'string', required: false, description: '访问级别', enum: ['public', 'private', 'protected'], default: 'public' },
      { name: 'class_name', type: 'string', required: false, description: '所属类名称（用于function和variable类型）' },
      { name: 'path', type: 'string', required: false, description: '文件完整路径（用于file类型）' },
      { name: 'functions', type: 'array', required: false, description: '函数列表（用于functionGroup和file类型）' }
    ],
    handler: async (params) => {
      // 生成层次化名称
      let hierarchical_name = params.name;
      if (params.parent_module) {
        hierarchical_name = `${params.parent_module}.${params.name}`;
      }
      
      const module: Module = {
        name: params.name,
        hierarchical_name: hierarchical_name,
        type: params.type,
        description: params.description || '',
        parent: params.parent_module,
        file: params.file_path
      };
      return add_module(module);
    }
  },
  get_module_by_name: {
    name: 'get_module_by_name',
    description: '根据模块名称获取模块信息',
    parameters: [
      { name: 'name', type: 'string', required: true, description: '模块名称' }
    ],
    handler: async (params) => {
      const modules = await find_modules({ hierarchical_name: params.name });
      return modules.length > 0 ? modules[0] : null;
    }
  },
  smart_search: {
    name: 'smart_search',
    description: '智能搜索代码模块',
    parameters: [
      { name: 'query', type: 'string', required: true, description: '搜索查询' },
      { name: 'type', type: 'string', required: false, description: '模块类型过滤', enum: ['class', 'function', 'variable', 'file', 'functionGroup'] },
      { name: 'limit', type: 'number', required: false, description: '结果数量限制', min: 1, max: 100, default: 10 }
    ],
    handler: async (params) => {
      const search_results = await find_modules(params);
      return search_results.map(module => ({
        hierarchical_name: module.hierarchical_name,
        name: module.name,
        type: module.type,
        description: module.description,
        relevance_score: 1.0,
        match_type: 'exact' as const,
        file: module.file,
        parent: module.parent
      }));
    }
  },
  get_type_structure: {
    name: 'get_type_structure',
    description: '获取类型结构信息',
    parameters: [
      { name: 'type_name', type: 'string', required: true, description: '类型名称' }
    ],
    handler: async (params) => {
      return {
        name: params.type_name,
        type: 'interface' as const,
        properties: [],
        description: `类型结构: ${params.type_name}`
      };
    }
  }
};

/**
 * 参数验证规则映射表
 * 为每个工具定义详细的参数验证规则
 */
export const parameter_validation_rules: Record<string, ValidationRule[]> = {
  add_module: mcp_tools_registry.add_module.parameters,
  get_module_by_name: mcp_tools_registry.get_module_by_name.parameters,
  smart_search: mcp_tools_registry.smart_search.parameters,
  get_type_structure: mcp_tools_registry.get_type_structure.parameters
};

/**
 * 类型结构定义映射表
 * 存储各种数据类型的结构定义
 */
export const type_structures: Record<string, TypeStructure> = {
  Module: {
    name: 'Module',
    type: 'interface',
    description: '代码模块结构',
    properties: [
      { name: 'name', type: 'string', optional: false, description: '模块名称' },
      { name: 'hierarchical_name', type: 'string', optional: false, description: '层次化唯一标识符' },
      { name: 'type', type: 'string', optional: false, description: '模块类型' },
      { name: 'description', type: 'string', optional: false, description: '模块描述' },
      { name: 'parent', type: 'string', optional: true, description: '父模块名称' },
      { name: 'file', type: 'string', optional: true, description: '所属文件路径' }
    ]
  },
  SearchResult: {
    name: 'SearchResult',
    type: 'interface',
    description: '搜索结果结构',
    properties: [
      { name: 'module', type: 'object', optional: false, description: '匹配的模块信息' },
      { name: 'score', type: 'number', optional: false, description: '匹配分数' },
      { name: 'highlights', type: 'array', optional: true, description: '高亮匹配项' }
    ]
  }
};

// ==================== 核心函数实现 ====================

/**
 * 解析和验证MCP工具参数
 * @param tool_name 工具名称
 * @param parameters 原始参数
 * @returns 验证后的参数对象
 */
export async function parse_tool_parameters(
  tool_name: string,
  parameters: Record<string, any>
): Promise<Record<string, any>> {
  const rules = parameter_validation_rules[tool_name];
  if (!rules) {
    throw new Error(`未知的工具: ${tool_name}`);
  }

  const validated_params: Record<string, any> = {};
  const errors: string[] = [];

  // 验证每个参数
  for (const rule of rules) {
    const value = parameters[rule.name];
    
    // 检查必需参数
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`缺少必需参数: ${rule.name}`);
      continue;
    }

    // 如果参数不存在且有默认值，使用默认值
    if (value === undefined && rule.default !== undefined) {
      validated_params[rule.name] = rule.default;
      continue;
    }

    // 如果参数不存在且不是必需的，跳过
    if (value === undefined) {
      continue;
    }

    // 类型验证
    if (!validateType(value, rule.type)) {
      errors.push(`参数 ${rule.name} 类型错误，期望 ${rule.type}，实际 ${typeof value}`);
      continue;
    }

    // 枚举值验证
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`参数 ${rule.name} 值无效，必须是 ${rule.enum.join(', ')} 中的一个`);
      continue;
    }

    // 数值范围验证
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`参数 ${rule.name} 值过小，最小值为 ${rule.min}`);
        continue;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`参数 ${rule.name} 值过大，最大值为 ${rule.max}`);
        continue;
      }
    }

    // 字符串长度验证
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        errors.push(`参数 ${rule.name} 长度过短，最小长度为 ${rule.min}`);
        continue;
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors.push(`参数 ${rule.name} 长度过长，最大长度为 ${rule.max}`);
        continue;
      }
    }

    // 正则表达式验证
    if (rule.pattern && rule.type === 'string' && typeof value === 'string') {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(value)) {
        errors.push(`参数 ${rule.name} 格式无效`);
        continue;
      }
    }

    validated_params[rule.name] = value;
  }

  if (errors.length > 0) {
    throw new Error(`参数验证失败: ${errors.join(', ')}`);
  }

  return validated_params;
}

/**
 * 处理MCP工具调用
 * @param tool_call 工具调用信息
 * @returns 工具执行结果
 */
export async function handle_mcp_tools(tool_call: ToolCall): Promise<any> {
  const { name, parameters } = tool_call;
  
  // 检查工具是否存在
  const tool = mcp_tools_registry[name];
  if (!tool) {
    return {
      success: false,
      error: `未知的工具: ${name}`,
      tool_name: name,
      timestamp: new Date().toISOString()
    };
  }

  try {
    // 验证参数
    const validated_params = await parse_tool_parameters(name, parameters);
    
    // 执行工具处理函数
    const result = await tool.handler(validated_params);
    
    return {
      success: true,
      result: result,
      tool_name: name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      tool_name: name,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 获取可用工具列表
 * @returns 可用工具的详细信息列表
 */
export async function list_available_tools(): Promise<Array<{
  name: string;
  description: string;
  parameters: ValidationRule[];
}>> {
  return Object.values(mcp_tools_registry).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
}

/**
 * 生成层次化名称
 * @param module_name 模块名称
 * @param parent_module 父模块名称
 * @returns 层次化的完整名称
 */
export async function generate_hierarchical_name(
  module_name: string,
  parent_module?: string
): Promise<string> {
  if (!parent_module) {
    return module_name;
  }
  
  // 递归获取完整的层次结构
  const parentModules = await find_modules({ keyword: parent_module });
  // 从搜索结果中找到名称完全匹配的模块
  const parentInfo = parentModules.find(m => m.name === parent_module) || null;
  
  if (parentInfo && parentInfo.parent) {
    const grandParentName = await generate_hierarchical_name(parent_module, parentInfo.parent);
    return `${grandParentName}.${module_name}`;
  }
  
  return `${parent_module}.${module_name}`;
}

// ==================== 辅助函数 ====================

/**
 * 验证值的类型
 * @param value 要验证的值
 * @param expectedType 期望的类型
 * @returns 是否匹配期望类型
 */
function validateType(value: any, expectedType: string): boolean {
  switch (expectedType) {
  case 'string':
    return typeof value === 'string';
  case 'number':
    return typeof value === 'number' && !isNaN(value);
  case 'boolean':
    return typeof value === 'boolean';
  case 'object':
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  case 'array':
    return Array.isArray(value);
  default:
    return false;
  }
}