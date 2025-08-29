/**
 * 数据验证工具函数
 * 提供模块数据验证、格式检查等功能
 */

import { z } from 'zod';
import { Module, ModuleType, AccessModifier, Parameter } from '../types/module.js';

/**
 * 模块名称验证规则
 */
export const MODULE_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * 文件路径验证规则
 */
export const FILE_PATH_REGEX = /^[^<>:"|?*\x00-\x1f]*\.(ts|js|tsx|jsx|py|java|cpp|c|h|hpp|cs|php|rb|go|rs|kt|swift|dart|scala|clj|hs|ml|fs|vb|pas|pl|r|m|sh|ps1|bat|cmd)$/i;

/**
 * 层次化名称验证规则
 */
export const HIERARCHICAL_NAME_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$.]*$/;

/**
 * 参数验证Schema
 */
export const ParameterSchema = z.object({
  name: z.string().min(1).regex(MODULE_NAME_REGEX, '参数名称格式无效'),
  data_type: z.string().min(1),
  default_value: z.string().nullable().optional(),
  is_required: z.boolean().default(true),
  description: z.string().optional()
});

/**
 * 基础模块验证Schema
 */
export const BaseModuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).regex(MODULE_NAME_REGEX, '模块名称格式无效'),
  hierarchical_name: z.string().min(1).regex(HIERARCHICAL_NAME_REGEX, '层次化名称格式无效'),
  type: z.enum(['class', 'function', 'variable', 'file', 'function_group'] as const),
  parent_module: z.string().nullable().optional(),
  file_path: z.string().min(1).regex(FILE_PATH_REGEX, '文件路径格式无效'),
  access_modifier: z.enum(['public', 'private', 'protected', 'internal'] as const).default('public'),
  description: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * 类模块验证Schema
 */
export const ClassModuleSchema = BaseModuleSchema.extend({
  type: z.literal('class'),
  inheritance: z.array(z.string()).optional(),
  interfaces: z.array(z.string()).optional(),
  is_abstract: z.boolean().optional(),
  is_static: z.boolean().optional()
});

/**
 * 函数模块验证Schema
 */
export const FunctionModuleSchema = BaseModuleSchema.extend({
  type: z.literal('function'),
  parameters: z.array(ParameterSchema).optional(),
  return_type: z.string().optional(),
  is_async: z.boolean().optional(),
  is_static: z.boolean().optional(),
  is_abstract: z.boolean().optional()
});

/**
 * 变量模块验证Schema
 */
export const VariableModuleSchema = BaseModuleSchema.extend({
  type: z.literal('variable'),
  data_type: z.string().min(1),
  initial_value: z.string().optional(),
  is_constant: z.boolean().optional(),
  is_static: z.boolean().optional()
});

/**
 * 文件模块验证Schema
 */
export const FileModuleSchema = BaseModuleSchema.extend({
  type: z.literal('file'),
  exports: z.array(z.string()).optional(),
  imports: z.array(z.string()).optional(),
  language: z.string().optional()
});

/**
 * 函数组模块验证Schema
 */
export const FunctionGroupModuleSchema = BaseModuleSchema.extend({
  type: z.literal('function_group'),
  functions: z.array(z.string()).optional(),
  namespace: z.string().optional()
});

/**
 * 完整模块验证Schema
 */
export const ModuleSchema = z.discriminatedUnion('type', [
  ClassModuleSchema,
  FunctionModuleSchema,
  VariableModuleSchema,
  FileModuleSchema,
  FunctionGroupModuleSchema
]);

/**
 * 验证模块数据
 */
export function validateModule(data: unknown): { success: true; data: Module } | { success: false; errors: string[] } {
  try {
    const result = ModuleSchema.parse(data);
    return { success: true, data: result as Module };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['未知验证错误'] };
  }
}

/**
 * 验证模块名称
 */
export function validateModuleName(name: string): boolean {
  return MODULE_NAME_REGEX.test(name);
}

/**
 * 验证文件路径
 */
export function validateFilePath(path: string): boolean {
  return FILE_PATH_REGEX.test(path);
}

/**
 * 验证层次化名称
 */
export function validateHierarchicalName(name: string): boolean {
  return HIERARCHICAL_NAME_REGEX.test(name);
}

/**
 * 验证模块类型
 */
export function validateModuleType(type: string): type is ModuleType {
  return ['class', 'function', 'variable', 'file', 'function_group'].includes(type);
}

/**
 * 验证访问修饰符
 */
export function validateAccessModifier(modifier: string): modifier is AccessModifier {
  return ['public', 'private', 'protected', 'internal'].includes(modifier);
}

/**
 * 验证参数数组
 */
export function validateParameters(parameters: unknown[]): { success: true; data: Parameter[] } | { success: false; errors: string[] } {
  try {
    const result = z.array(ParameterSchema).parse(parameters) as Parameter[];
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return path ? `参数[${path}]: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['参数验证失败'] };
  }
}

/**
 * 验证UUID格式
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 验证ISO日期格式
 */
export function validateISODate(date: string): boolean {
  try {
    const parsed = new Date(date);
    return parsed.toISOString() === date;
  } catch {
    return false;
  }
}

/**
 * 清理和标准化模块名称
 */
export function sanitizeModuleName(name: string): string {
  // 移除非法字符，保留字母、数字、下划线和美元符号
  let sanitized = name.replace(/[^a-zA-Z0-9_$]/g, '_');
  
  // 确保以字母、下划线或美元符号开头
  if (!/^[a-zA-Z_$]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  
  return sanitized;
}

/**
 * 清理和标准化文件路径
 */
export function sanitizeFilePath(path: string): string {
  // 标准化路径分隔符
  let sanitized = path.replace(/\\/g, '/');
  
  // 移除危险字符
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
  
  // 移除多余的斜杠
  sanitized = sanitized.replace(/\/+/g, '/');
  
  // 移除开头的斜杠（相对路径）
  sanitized = sanitized.replace(/^\//, '');
  
  return sanitized;
}

/**
 * 生成层次化名称
 */
export function generateHierarchicalName(parentName: string | null, moduleName: string): string {
  if (!parentName) {
    return moduleName;
  }
  return `${parentName}.${moduleName}`;
}

/**
 * 解析层次化名称
 */
export function parseHierarchicalName(hierarchicalName: string): { parent: string | null; name: string } {
  const lastDotIndex = hierarchicalName.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    return { parent: null, name: hierarchicalName };
  }
  
  return {
    parent: hierarchicalName.substring(0, lastDotIndex),
    name: hierarchicalName.substring(lastDotIndex + 1)
  };
}

/**
 * 验证模块关系（防止循环引用）
 */
export function validateModuleRelationship(childName: string, parentName: string | null, existingModules: Module[]): boolean {
  if (!parentName) {
    return true; // 顶级模块没有循环引用问题
  }
  
  // 检查是否试图将模块设为自己的子模块
  if (childName === parentName) {
    return false;
  }
  
  // 检查是否会形成循环引用
  const visited = new Set<string>();
  let currentParent: string | null = parentName;
  
  while (currentParent && !visited.has(currentParent)) {
    visited.add(currentParent);
    
    // 如果当前父模块就是要添加的子模块，则形成循环
    if (currentParent === childName) {
      return false;
    }
    
    // 查找当前父模块的父模块
    const parentModule = existingModules.find(m => m.name === currentParent);
    currentParent = parentModule?.parent_module ?? null;
  }
  
  return true;
}

/**
 * 验证数据类型字符串
 */
export function validateDataType(dataType: string): boolean {
  // 基本类型
  const basicTypes = [
    'string', 'number', 'boolean', 'object', 'undefined', 'null', 'void',
    'any', 'unknown', 'never', 'bigint', 'symbol'
  ];
  
  // 检查基本类型
  if (basicTypes.includes(dataType.toLowerCase())) {
    return true;
  }
  
  // 检查数组类型 (Type[] 或 Array<Type>)
  if (/^.+\[\]$/.test(dataType) || /^Array<.+>$/.test(dataType)) {
    return true;
  }
  
  // 检查泛型类型 (Type<T> 或 Type<T, U>)
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*<.+>$/.test(dataType)) {
    return true;
  }
  
  // 检查联合类型 (Type1 | Type2)
  if (dataType.includes('|')) {
    return dataType.split('|').every(type => validateDataType(type.trim()));
  }
  
  // 检查交叉类型 (Type1 & Type2)
  if (dataType.includes('&')) {
    return dataType.split('&').every(type => validateDataType(type.trim()));
  }
  
  // 检查自定义类型名称
  return MODULE_NAME_REGEX.test(dataType);
}