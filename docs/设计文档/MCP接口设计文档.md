# MCP接口设计文档

## add_module

### 工具描述
添加新模块到代码文档系统，支持添加class、function、variable、file、functionGroup五种类型模块。使用层次化命名系统解决同名模块冲突，自动生成hierarchical_name。

### 工具输入参数格式

#### 所有类型通用参数
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| name | string | 是 | 模块名称（非唯一标识符） | "UserService" |
| parent | string | 否 | 父模块的hierarchical_name | "services.user" |
| type | 'class' \| 'function' \| 'variable' \| 'file' \| 'functionGroup' | 是 | 模块类型 | "class" |
| description | string | 是 | 模块描述 | "用户服务模块" |
| file | string | 否 | 所属文件路径 | "/src/user/UserService.ts" |

#### name字段规范
- 只支持字母、数字、下划线
- 不能以数字开头
- 最大长度50字符

#### parent字段说明
- 指定父模块的hierarchical_name
- 留空表示根模块
- 最大嵌套深度：5层

#### class类型特有参数
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| parentClass | string | 否 | 父类名称 | "BaseService" |
| functions | string[] | 否 | 类中的函数列表 | ["login", "logout"] |
| variables | string[] | 否 | 类中的变量列表 | ["userId", "username"] |
| classes | string[] | 否 | 类中的嵌套类列表 | ["UserValidator"] |
| access | 'public' \| 'private' \| 'protected' | 否 | 访问权限 | "public" |

#### function类型特有参数
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| parameters | Parameter[] | 是 | 函数参数列表 | [{"name": "username", "type": "string"}] |
| returnType | string | 是 | 返回值类型 | "Promise<User>" |
| access | 'public' \| 'private' \| 'protected' | 否 | 访问权限 | "public" |

#### variable类型特有参数
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| dataType | string | 是 | 变量数据类型 | "string" |
| initialValue | string | 否 | 初始值 | '"default"' |
| access | 'public' \| 'private' \| 'protected' | 否 | 访问权限 | "private" |

#### Parameter参数定义（用于function类型）
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| name | string | 是 | 参数名称 | "username" |
| type | string | 是 | 参数类型 | "string" |
| defaultValue | string | 否 | 默认值 | "guest" |
| description | string | 否 | 参数描述 | "用户名" |

### 工具返回格式
| 字段名 | 类型 | 描述 | 示例 |
|---|---|---|---|
| success | boolean | 操作是否成功 | true |
| message | string | 操作结果描述 | "模块添加成功" 或 "错误：模块已存在" |
| hierarchical_name | string | 生成的层次化唯一标识符 | "services.user.UserService" |

## get_module_by_name

### 工具描述
通过模块的hierarchical_name精准查询单个模块信息，返回完整的模块定义数据。

### 工具输入参数格式
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| hierarchical_name | string | 是 | 模块的层次化唯一标识符 | "services.user.UserService" |

### 工具返回格式
| 字段名 | 类型 | 描述 | 示例 |
|---|---|---|---|
| name | string | 模块名称 | "UserService" |
| hierarchical_name | string | 层次化唯一标识符 | "services.user.UserService" |
| type | 'class' \| 'function' \| 'variable' \| 'file' \| 'functionGroup' | 模块类型 | "class" |
| description | string | 模块描述 | "用户服务模块" |
| parent | string | 父模块的hierarchical_name | "services.user" |
| file | string | 所属文件路径 | "/src/user/UserService.ts" |

## smart_search

### 工具描述
智能搜索功能，支持基于模块名称、类型、描述的模糊匹配，返回匹配的模块列表按相关度排序。不支持基于路径的搜索。

### 工具输入参数格式
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| name | string | 否 | 模块名称（模糊匹配） | "user" |
| type | 'class' \| 'function' \| 'variable' \| 'file' \| 'functionGroup' | 否 | 模块类型过滤 | "function" |
| keyword | string | 否 | 关键字搜索（匹配描述） | "用户登录" |

### 工具返回格式
返回SearchResult数组，每个元素包含：
| 字段名 | 类型 | 描述 | 示例 |
|---|---|---|---|
| module | Module | 匹配的模块信息 | {"name": "UserService", "hierarchical_name": "services.user.UserService", ...} |
| score | number | 匹配分数（0-1） | 0.85 |

## get_type_structure

### 工具描述
获取指定模块类型的数据结构规范，返回该类型的完整字段定义和格式说明。

### 工具输入参数格式
| 参数名 | 类型 | 必需 | 描述 | 示例 |
|---|---|---|---|---|
| type_name | 'class' \| 'function' \| 'variable' \| 'file' \| 'functionGroup' | 是 | 类型名称 | "class" |

### 工具返回格式
| 字段名 | 类型 | 描述 | 示例 |
|---|---|---|---|
| type_name | 'class' \| 'function' \| 'variable' \| 'file' \| 'functionGroup' | 类型名称 | "class" |
| structure | object | 该类型的数据结构格式定义 | {"fields": [...], "required": [...]} |
| description | string | 类型描述 | "类模块的数据结构" |
| fields | object[] | 该类型包含的字段定义列表 | [{"name": "name", "type": "string", "required": true}] |