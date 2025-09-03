/**
 * 前端类型定义
 * 与后端API接口保持一致的数据结构
 */

// API响应接口定义
export interface APIResponse<T = any> {
  success: boolean;           // 操作是否成功
  data?: T;                  // 响应数据
  message?: string;          // 响应消息
  pagination?: {
    offset: number;          // 偏移量
    limit: number;           // 每页数量
    total: number;           // 总数量
    totalPages: number;      // 总页数
  };
}

// 参数接口定义
export interface Parameter {
  name: string;           // 参数名称
  type: string;           // 参数类型
  defaultValue?: string;  // 默认值
  description?: string;   // 参数描述
}

// 基础模块接口定义
export interface Module {
  name: string;                // 模块名称（非唯一标识符）
  hierarchical_name: string;   // 层次化唯一标识符（点号分隔路径）
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  description: string;         // 模块描述
  parent?: string;            // 父模块的hierarchical_name
  file?: string;              // 所属文件路径
  hasChildren?: boolean;      // 是否有子模块（由后端提供）
}

// 类模块扩展接口
export interface ClassModule extends Module {
  type: 'class';
  parentClass?: string;       // 父类名称
  functions?: string[];       // 类中的函数列表
  variables?: string[];       // 类中的变量列表
  classes?: string[];         // 类中的嵌套类列表
  access?: 'public' | 'private' | 'protected'; // 访问权限
}

// 函数模块扩展接口
export interface FunctionModule extends Module {
  type: 'function';
  parameters: Parameter[];    // 函数参数列表
  returnType: string;         // 返回值类型
  access?: 'public' | 'private' | 'protected'; // 访问权限
  class?: string;             // 所属类名称
}

// 变量模块扩展接口
export interface VariableModule extends Module {
  type: 'variable';
  dataType: string;           // 变量数据类型
  initialValue?: string;      // 初始值
  access?: 'public' | 'private' | 'protected'; // 访问权限
  class?: string;             // 所属类名称
}

// 文件模块扩展接口
export interface FileModule extends Module {
  type: 'file';
  path: string;               // 文件完整路径
  classes?: string[];         // 文件中的类列表
  functions?: string[];       // 文件中的函数列表
  variables?: string[];       // 文件中的变量列表
}

// 函数组模块扩展接口
export interface FunctionGroupModule extends Module {
  type: 'functionGroup';
  functions: string[];        // 函数组中的函数列表
}

// 模块请求接口定义
export interface ModuleRequest {
  name: string;         // 模块名称
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  description?: string; // 模块描述
  content?: string;     // 模块内容
  parent?: string;      // 父模块层次名称
  
  // function类型特定字段
  parameters?: Parameter[];   // 函数参数列表
  returnType?: string;        // 返回值类型
  class?: string;             // 所属类名称（用于function和variable类型）
  
  // class类型特定字段
  parentClass?: string;       // 父类名称
  functions?: string[];       // 类中的函数列表（统一字段名）
  variables?: string[];       // 类中的变量列表
  classes?: string[];         // 类中的嵌套类列表
  
  // variable类型特定字段
  dataType?: string;          // 变量数据类型
  initialValue?: string;      // 初始值
  
  // file类型特定字段
  path?: string;              // 文件完整路径
  
  // 通用字段
  access?: 'public' | 'private' | 'protected'; // 访问权限
  file?: string;              // 文件路径
}

// 搜索查询接口定义
export interface SearchQuery {
  keyword: string;                                                    // 搜索关键词（匹配模块名称和描述）
  type?: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型筛选
  limit?: number;                                                     // 返回结果数量限制，默认20
  offset?: number;                                                    // 结果偏移量，默认0
}

// 搜索结果接口定义
export interface SearchResult {
  hierarchical_name: string;  // 模块的层次化名称
  name: string;               // 模块名称
  type: string;               // 模块类型
  description: string;        // 模块描述
  relevance_score: number;    // 相关性评分（0-1之间）
  match_type: 'exact' | 'partial' | 'fuzzy'; // 匹配类型
  file?: string;              // 所属文件路径
  parent?: string;            // 父模块名称
}

// 搜索条件接口定义
export interface SearchCriteria {
  hierarchical_name?: string; // 精确匹配的层次化名称
  type?: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  keyword?: string;           // 关键字搜索（匹配描述）
}

// 模块关系接口定义
export interface ModuleRelationship {
  hierarchical_name: string;  // 模块的hierarchical_name
  children: string[];         // 子模块的name列表
  references: string[];       // 引用该模块的模块列表
}

// 类型结构接口定义
export interface TypeStructure {
  name: string;               // 类型名称
  type: 'interface' | 'class' | 'enum' | 'type'; // 类型种类
  properties: TypeProperty[]; // 类型属性列表
  methods?: TypeMethod[];     // 类型方法列表（仅适用于class和interface）
  description?: string;       // 类型描述
}

// 类型属性接口定义
export interface TypeProperty {
  name: string;               // 属性名称
  type: string;               // 属性类型
  optional: boolean;          // 是否可选
  description?: string;       // 属性描述
}

// 类型方法接口定义
export interface TypeMethod {
  name: string;               // 方法名称
  parameters: Parameter[];    // 方法参数
  returnType: string;         // 返回类型
  description?: string;       // 方法描述
}

// 菜单项接口定义
export interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: MenuItem[];
}