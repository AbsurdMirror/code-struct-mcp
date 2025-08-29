# MCP接口测试文档

## 基本信息

| 项目 | 内容 |
|------|------|
| 测试文档ID | TEST_MCP |
| 测试文档名称 | MCP接口测试文档 |
| 测试文档描述 | 针对MCP接口的程序化测试文档，使用@modelcontextprotocol/sdk的Client类进行自动化测试 |
| 对应设计文档 | MCP接口设计文档 |

## 测试环境与工具

### 测试工具与库

| 工具/库名称 | 版本要求 | 用途说明 |
|-------------|----------|----------|
| @modelcontextprotocol/sdk | ^1.12.0 | 官方MCP SDK，提供程序化测试所需的Client类 |
| Node.js | ^18.0.0 | 运行环境 |
| npm | 最新版本 | 包管理工具 |

### 安装命令

```bash
npm install @modelcontextprotocol/sdk
```

## 测试用例

### TESTCASE001. 添加模块接口测试

| 项目 | 内容 |
|------|------|
| 测试用例ID | TESTCASE001 |
| 测试用例名 | 添加模块接口测试 |
| 测试目标 | MCP接口.add_module |
| 测试用例描述 | 验证通过MCP协议调用add_module接口的正确性 |

**测试步骤：**

1. 使用@modelcontextprotocol/sdk的Client类创建MCP客户端连接
2. 构造add_module请求参数，包含模块名称、类型、路径信息
3. 通过MCP客户端发送add_module请求
4. 验证返回结果包含成功标识和模块信息

**预期结果：**

- 返回结果包含success字段且值为true
- 返回结果包含新添加的模块信息
- 模块信息与请求参数一致

### TESTCASE002. 获取模块接口测试

| 项目 | 内容 |
|------|------|
| 测试用例ID | TESTCASE002 |
| 测试用例名 | 获取模块接口测试 |
| 测试目标 | MCP接口.get_module_by_name |
| 测试用例描述 | 验证通过MCP协议调用get_module_by_name接口的正确性 |

**测试步骤：**

1. 使用@modelcontextprotocol/sdk的Client类创建MCP客户端连接
2. 构造get_module_by_name请求参数，指定要查询的模块名称
3. 通过MCP客户端发送get_module_by_name请求
4. 验证返回结果包含指定模块的详细信息

**预期结果：**

- 返回结果包含指定模块的完整信息
- 模块信息包含名称、类型、路径等字段
- 对于不存在的模块返回适当的错误信息

### TESTCASE003. 智能搜索接口测试

| 项目 | 内容 |
|------|------|
| 测试用例ID | TESTCASE003 |
| 测试用例名 | 智能搜索接口测试 |
| 测试目标 | MCP接口.smart_search |
| 测试用例描述 | 验证通过MCP协议调用smart_search接口的正确性 |

**测试步骤：**

1. 使用@modelcontextprotocol/sdk的Client类创建MCP客户端连接
2. 构造smart_search请求参数，包含搜索关键词和搜索范围
3. 通过MCP客户端发送smart_search请求
4. 验证返回结果包含匹配的模块列表

**预期结果：**

- 返回结果包含与搜索关键词匹配的模块列表
- 每个匹配项包含模块基本信息和匹配度
- 无匹配结果时返回空列表

### TESTCASE004. 类型结构接口测试

| 项目 | 内容 |
|------|------|
| 测试用例ID | TESTCASE004 |
| 测试用例名 | 类型结构接口测试 |
| 测试目标 | MCP接口.get_type_structure |
| 测试用例描述 | 验证通过MCP协议调用get_type_structure接口的正确性 |

**测试步骤：**

1. 使用@modelcontextprotocol/sdk的Client类创建MCP客户端连接
2. 构造get_type_structure请求参数，指定模块名称和类型
3. 通过MCP客户端发送get_type_structure请求
4. 验证返回结果包含指定类型的结构信息

**预期结果：**

- 返回结果包含指定类型的完整结构信息
- 结构信息包含字段定义、类型信息等
- 对于不存在的类型返回适当的错误信息

## 程序化测试方法

### 测试执行方式

使用@modelcontextprotocol/sdk提供的Client类直接进行程序化测试，无需MCP Inspector。Client类支持stdio和HTTP传输方式，可以通过代码直接调用MCP服务器提供的工具。

### 测试流程

1. 创建MCP客户端实例
2. 连接到MCP服务器
3. 构造测试请求
4. 发送请求并接收响应
5. 验证响应结果
6. 输出测试报告

### 测试配置

测试时需要配置MCP服务器地址和传输方式，支持本地stdio模式和远程HTTP模式两种测试环境。