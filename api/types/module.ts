/**
 * 代码模块相关的类型定义
 * 基于MOD002模块管理模块的设计文档
 */

// 模块类型枚举
export type ModuleType = 'class' | 'function' | 'variable' | 'file' | 'functionGroup';

// 访问修饰符枚举
export type AccessModifier = 'public' | 'private' | 'protected';

// 参数定义
export interface Parameter {
  name: string;                    // 参数名称
  data_type: string;              // 数据类型
  default_value?: string | null;  // 默认值
  is_required: boolean;           // 是否必需
  description?: string;           // 参数描述
}

// 模块基础接口
export interface Module {
  name: string;                    // 模块名称
  hierarchical_name: string;       // 层次化名称
  type: ModuleType;               // 模块类型
  parent_module?: string;         // 父模块层次化名称
  file_path: string;              // 文件路径
  access_modifier: AccessModifier; // 访问修饰符
  description?: string;           // 描述信息
  created_at: string;             // 创建时间 (ISO 8601格式)
  updated_at: string;             // 更新时间 (ISO 8601格式)
  children?: string[];            // 子模块列表 (层次化名称)
  dependencies?: string[];        // 依赖模块列表 (层次化名称)
}

// 类模块接口
export interface ClassModule extends Module {
  type: 'class';
  inheritance?: string[];         // 继承关系
  interfaces?: string[];          // 实现的接口
  methods?: string[];            // 方法列表 (层次化名称)
  properties?: string[];         // 属性列表 (层次化名称)
}

// 函数模块接口
export interface FunctionModule extends Module {
  type: 'function';
  parameters: Parameter[];        // 参数列表
  return_type?: string;          // 返回值类型
  is_async: boolean;             // 是否异步函数
}

// 变量模块接口
export interface VariableModule extends Module {
  type: 'variable';
  data_type: string;             // 数据类型
  initial_value?: string;        // 初始值
  is_constant: boolean;          // 是否常量
}

// 文件模块接口
export interface FileModule extends Module {
  type: 'file';
}

// 函数组模块接口
export interface FunctionGroupModule extends Module {
  type: 'functionGroup';
  functions?: string[];          // 函数列表 (层次化名称)
}

// 联合类型：所有模块类型
export type AnyModule = ClassModule | FunctionModule | VariableModule | FileModule | FunctionGroupModule;

// 搜索条件接口
export interface SearchCriteria {
  name?: string;                 // 模块名称 (支持模糊匹配)
  type?: ModuleType;             // 模块类型
  parent_module?: string;        // 父模块层次化名称
  file_path?: string;           // 文件路径 (支持模糊匹配)
  access_modifier?: AccessModifier; // 访问修饰符
  description?: string;         // 描述信息 (支持模糊匹配)
  limit?: number;               // 返回结果数量限制
  offset?: number;              // 分页偏移量
}

// 模块关系接口
export interface ModuleRelationship {
  source: string;               // 源模块层次化名称
  target: string;               // 目标模块层次化名称
  relationship_type: 'parent-child' | 'inheritance' | 'interface' | 'dependency' | 'reference';
  description?: string;         // 关系描述
}

// 注意：CreateModuleRequest、UpdateModuleRequest 已在 api.ts 中定义，此处不重复定义

// 注意：ApiResponse、PaginatedResponse、ModuleListResponse 已在 api.ts 中定义，此处不重复定义

// 搜索结果接口
export interface SearchResult {
  modules: AnyModule[];
  total: number;
  query: SearchCriteria;
}

// 类型结构信息接口
export interface TypeStructure {
  type_name: string;
  hierarchy: string[];
  related_modules: AnyModule[];
  relationships: ModuleRelationship[];
}