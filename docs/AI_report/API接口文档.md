# API服务器接口文档

## 概述

本文档描述了代码结构管理系统的HTTP RESTful API接口。服务器基于Express框架构建，提供模块的增删改查功能。

## 基础信息

- **服务器框架**: Express.js
- **默认端口**: 3000
- **API前缀**: `/api`
- **内容类型**: `application/json`
- **跨域支持**: 已启用CORS

## 通用数据结构

### APIResponse<T>

所有API接口的统一响应格式：

```typescript
interface APIResponse<T = any> {
  success: boolean;  // 操作是否成功
  data?: T;         // 返回数据
  message?: string; // 提示信息或错误详情
}
```

### Module

模块基础数据结构：

```typescript
interface Module {
  name: string;                // 模块名称（非唯一标识符）
  hierarchical_name: string;   // 层次化唯一标识符（点号分隔路径）
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  description: string;         // 模块描述
  parent?: string;            // 父模块的hierarchical_name
  file?: string;              // 所属文件路径
}
```

### Parameter

参数数据结构：

```typescript
interface Parameter {
  name: string;           // 参数名称
  type: string;           // 参数类型
  defaultValue?: string;  // 默认值
  description?: string;   // 参数描述
}
```

## API接口详情

### 1. 获取根模块列表

**接口地址**: `GET /api/modules`

**功能描述**: 获取所有根级别模块的列表

**请求参数**: 无

**响应数据结构**:
```typescript
APIResponse<Module[]>
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "name": "MyClass",
      "hierarchical_name": "MyClass",
      "type": "class",
      "description": "示例类模块",
      "file": "src/example.ts"
    }
  ],
  "message": "成功获取根模块列表"
}
```

**状态码**:
- `200`: 成功
- `500`: 服务器内部错误

---

### 2. 搜索模块

**接口地址**: `GET /api/modules/search`

**功能描述**: 根据关键词搜索模块，支持分页

**请求参数**:
- `keyword` (string, 必需): 搜索关键词
- `type` (string, 可选): 模块类型筛选 (`class` | `function` | `variable` | `file` | `functionGroup`)
- `page` (number, 可选): 页码，默认为1
- `limit` (number, 可选): 每页数量，默认为10

**请求示例**:
```
GET /api/modules/search?keyword=test&type=function&page=1&limit=5
```

**响应数据结构**:
```typescript
APIResponse<Module[]> & {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "name": "testFunction",
      "hierarchical_name": "MyClass.testFunction",
      "type": "function",
      "description": "测试函数",
      "parent": "MyClass"
    }
  ],
  "message": "搜索完成",
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

**状态码**:
- `200`: 成功
- `400`: 参数错误（关键词为空）
- `500`: 服务器内部错误

---

### 3. 获取指定模块信息

**接口地址**: `GET /api/modules/get`

**功能描述**: 根据层次化名称获取特定模块的详细信息

**请求参数**:
- `name` (string, 必需): 模块的层次化名称

**请求示例**:
```
GET /api/modules/get?name=MyClass.testFunction
```

**响应数据结构**:
```typescript
APIResponse<Module>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "name": "testFunction",
    "hierarchical_name": "MyClass.testFunction",
    "type": "function",
    "description": "测试函数",
    "parent": "MyClass",
    "parameters": [
      {
        "name": "param1",
        "type": "string",
        "description": "第一个参数"
      }
    ],
    "returnType": "boolean"
  },
  "message": "成功获取模块信息"
}
```

**状态码**:
- `200`: 成功
- `400`: 参数错误（缺少name参数）
- `500`: 服务器内部错误

---

### 4. 添加新模块

**接口地址**: `POST /api/modules`

**功能描述**: 创建新的模块

**请求参数**: 请求体为JSON格式的模块数据

**请求数据结构**:
```typescript
interface ModuleRequest {
  name: string;         // 模块名称
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  description?: string; // 模块描述
  content?: string;     // 模块内容
  parent?: string;      // 父模块层次名称
  // 根据type类型，可能包含额外字段：
  // 对于function类型：
  parameters?: Parameter[];
  returnType?: string;
  // 对于class类型：
  parentClass?: string;
  functions?: string[];
  variables?: string[];
  classes?: string[];
  // 对于variable类型：
  dataType?: string;
  initialValue?: string;
  // 通用字段：
  access?: 'public' | 'private' | 'protected';
  file?: string;
}
```

**请求示例**:
```json
{
  "name": "newFunction",
  "type": "function",
  "description": "新创建的函数",
  "parent": "MyClass",
  "parameters": [
    {
      "name": "input",
      "type": "string",
      "description": "输入参数"
    }
  ],
  "returnType": "void"
}
```

**响应数据结构**:
```typescript
APIResponse<Module>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "name": "newFunction",
    "hierarchical_name": "MyClass.newFunction",
    "type": "function",
    "description": "新创建的函数",
    "parent": "MyClass"
  },
  "message": "模块创建成功"
}
```

**状态码**:
- `201`: 创建成功
- `400`: 参数错误或验证失败
- `409`: 模块已存在
- `500`: 服务器内部错误

---

### 5. 更新模块信息

**接口地址**: `PUT /api/modules/update`

**功能描述**: 修改现有模块的信息

**请求参数**:
- `name` (string, 必需): 要更新的模块的层次化名称（查询参数）
- 请求体: 要更新的字段数据

**请求数据结构**:
```typescript
Partial<ModuleRequest> // ModuleRequest的部分字段
```

**请求示例**:
```
PUT /api/modules/update?name=MyClass.testFunction
```

请求体:
```json
{
  "description": "更新后的函数描述",
  "returnType": "string"
}
```

**响应数据结构**:
```typescript
APIResponse<Module>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "name": "testFunction",
    "hierarchical_name": "MyClass.testFunction",
    "type": "function",
    "description": "更新后的函数描述",
    "parent": "MyClass",
    "returnType": "string"
  },
  "message": "模块更新成功"
}
```

**状态码**:
- `200`: 更新成功
- `400`: 参数错误（缺少name参数或更新数据为空）
- `404`: 模块不存在
- `500`: 服务器内部错误

---

### 6. 删除模块

**接口地址**: `DELETE /api/modules/delete`

**功能描述**: 删除指定的模块

**请求参数**:
- `name` (string, 必需): 要删除的模块的层次化名称

**请求示例**:
```
DELETE /api/modules/delete?name=MyClass.testFunction
```

**响应数据结构**:
```typescript
APIResponse<void>
```

**响应示例**:
```json
{
  "success": true,
  "message": "模块删除成功"
}
```

**状态码**:
- `200`: 删除成功
- `400`: 参数错误（缺少name参数）或存在依赖关系无法删除
- `404`: 模块不存在
- `500`: 服务器内部错误

---

### 7. 健康检查

**接口地址**: `GET /health`

**功能描述**: 检查服务器运行状态

**请求参数**: 无

**响应数据结构**:
```typescript
{
  success: boolean;
  message: string;
  timestamp: string;
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**状态码**:
- `200`: 服务器正常运行

---

## 错误处理

### 通用错误响应格式

```json
{
  "success": false,
  "message": "错误描述信息",
  "data": null
}
```

### 常见HTTP状态码

- `200`: 请求成功
- `201`: 资源创建成功
- `400`: 请求参数错误或验证失败
- `404`: 资源不存在或接口不存在
- `409`: 资源冲突（如模块已存在）
- `500`: 服务器内部错误

### 404处理

对于不存在的接口路径，服务器会返回：

```json
{
  "success": false,
  "message": "接口不存在: {METHOD} {PATH}"
}
```

## 注意事项

1. **日志记录**: 所有API请求和响应都会记录到日志文件中，不会在控制台输出
2. **参数验证**: 服务器会对所有输入参数进行严格验证
3. **层次化名称**: 模块的层次化名称使用点号分隔，最大深度为5层
4. **缓存机制**: 系统内置请求缓存以提高响应速度
5. **跨域支持**: 已启用CORS，支持跨域请求
6. **内容类型**: 请求和响应均使用JSON格式

## 使用示例

### 创建一个类模块

```bash
curl -X POST http://localhost:3000/api/modules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UserService",
    "type": "class",
    "description": "用户服务类",
    "file": "src/services/user.ts",
    "functions": ["getUser", "createUser"],
    "access": "public"
  }'
```

### 搜索函数类型的模块

```bash
curl "http://localhost:3000/api/modules/search?keyword=user&type=function&page=1&limit=5"
```

### 更新模块描述

```bash
curl -X PUT "http://localhost:3000/api/modules/update?name=UserService" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新后的用户服务类描述"
  }'
```

---

*文档生成时间: 2024年*
*API版本: 1.0.0*