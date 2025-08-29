# TESTMOD004. AI模型MCP接口

## 基本信息

### 模块ID
TESTMOD004

### 模块名
AI模型MCP接口测试

### 模块描述
对MOD004 AI模型MCP接口模块进行测试验证，确保MCP协议规范正确实现，AI模型能够安全地访问代码文档系统，实现模块查询、分析和管理功能。

## 测试用例

### TESTCASE001. 解析工具参数功能测试
- **测试用例名**: 解析工具参数功能测试
- **测试目标**: MOD004.FUNC001
- **测试用例描述**: 验证parse_tool_parameters函数能够正确解析和验证各种MCP工具参数，包括参数验证、类型检查和标准化处理
- **测试步骤**:
  1. 测试add_module工具参数解析：
     - 输入：tool_name="add_module", raw_params={"name":"testModule","type":"class","description":"测试模块","parent":""}
     - 验证：返回标准化参数对象，包含生成的hierarchical_name
  2. 测试get_module_by_name工具参数解析：
     - 输入：tool_name="get_module_by_name", raw_params={"hierarchical_name":"test.module"}
     - 验证：返回标准化参数对象，包含验证后的hierarchical_name
  3. 测试smart_search工具参数解析：
     - 输入：tool_name="smart_search", raw_params={"name":"test","type":"class"}
     - 验证：返回标准化参数对象，包含可选搜索字段
  4. 测试get_type_structure工具参数解析：
     - 输入：tool_name="get_type_structure", raw_params={"type_name":"class"}
     - 验证：返回标准化参数对象，包含验证后的type_name
  5. 测试无效参数处理：
     - 输入：tool_name="add_module", raw_params={"name":"123invalid","type":"invalid"}
     - 验证：返回错误信息，说明参数验证失败
- **测试结果**:
  - 预期结果1：add_module工具参数正确解析，hierarchical_name生成正确
  - 预期结果2：get_module_by_name工具参数验证通过
  - 预期结果3：smart_search工具参数正确解析，支持可选字段
  - 预期结果4：get_type_structure工具参数验证通过
  - 预期结果5：无效参数返回清晰的错误信息

### TESTCASE002. 处理MCP工具调用功能测试
- **测试用例名**: 处理MCP工具调用功能测试
- **测试目标**: MOD004.FUNC002
- **测试用例描述**: 验证handle_mcp_tools函数能够正确处理各种MCP工具调用，包括参数解析、功能执行和响应构建
- **测试步骤**:
  1. 测试add_module工具调用：
     - 输入：name="add_module", args={"name":"TestClass","type":"class","description":"测试类模块"}
     - 验证：返回成功响应，包含添加的模块信息
  2. 测试get_module_by_name工具调用：
     - 输入：name="get_module_by_name", args={"hierarchical_name":"TestClass"}
     - 验证：返回成功响应，包含指定模块的详细信息
  3. 测试smart_search工具调用：
     - 输入：name="smart_search", args={"name":"test","type":"class"}
     - 验证：返回成功响应，包含匹配的模块列表
  4. 测试get_type_structure工具调用：
     - 输入：name="get_type_structure", args={"type_name":"class"}
     - 验证：返回成功响应，包含class类型的结构定义
  5. 测试无效工具调用：
     - 输入：name="invalid_tool", args={}
     - 验证：返回错误响应，说明工具不存在
- **测试结果**:
  - 预期结果1：add_module工具调用成功，模块正确添加
  - 预期结果2：get_module_by_name工具调用成功，返回正确模块信息
  - 预期结果3：smart_search工具调用成功，返回匹配结果
  - 预期结果4：get_type_structure工具调用成功，返回类型结构定义
  - 预期结果5：无效工具调用返回清晰的错误响应

### TESTCASE003. 列出可用工具功能测试
- **测试用例名**: 列出可用工具功能测试
- **测试目标**: MOD004.FUNC003
- **测试用例描述**: 验证list_available_tools函数能够正确返回4个核心工具定义，格式符合MCP协议规范
- **测试步骤**:
  1. 调用list_available_tools函数：
     - 输入：无参数
     - 验证：返回包含4个工具定义的数组
  2. 验证工具定义格式：
     - 检查每个工具包含name、description、inputSchema字段
     - 验证inputSchema符合JSON Schema规范
  3. 验证工具描述准确性：
     - 检查add_module工具描述包含模块添加功能
     - 检查get_module_by_name工具描述包含精确查询功能
     - 检查smart_search工具描述包含智能搜索功能
     - 检查get_type_structure工具描述包含类型结构查询功能
  4. 验证工具参数定义：
     - 检查每个工具的inputSchema定义了正确的参数结构
     - 验证必需参数和可选参数定义正确
- **测试结果**:
  - 预期结果1：返回包含4个工具定义的完整列表
  - 预期结果2：每个工具定义格式符合MCP规范
  - 预期结果3：工具描述准确反映功能
  - 预期结果4：参数定义完整准确

### TESTCASE004. 生成层次化名称功能测试
- **测试用例名**: 生成层次化名称功能测试
- **测试目标**: MOD004.FUNC004
- **测试用例描述**: 验证generate_hierarchical_name函数能够正确生成层次化唯一标识符，支持名称验证和层次深度检查
- **测试步骤**:
  1. 测试根模块名称生成：
     - 输入：parent="", name="RootModule"
     - 验证：返回"RootModule"
  2. 测试子模块名称生成：
     - 输入：parent="Parent", name="ChildModule"
     - 验证：返回"Parent.ChildModule"
  3. 测试多级层次名称生成：
     - 输入：parent="Level1.Level2", name="Level3"
     - 验证：返回"Level1.Level2.Level3"
  4. 测试无效名称格式：
     - 输入：parent="", name="123Invalid"
     - 验证：返回错误信息，名称格式无效
  5. 测试层次深度限制：
     - 输入：parent="L1.L2.L3.L4", name="L5"
     - 验证：返回错误信息，层次深度超过5层
  6. 测试特殊字符处理：
     - 输入：parent="", name="Invalid@Name"
     - 验证：返回错误信息，包含特殊字符
- **测试结果**:
  - 预期结果1：根模块名称生成正确
  - 预期结果2：子模块名称生成正确，使用点号连接
  - 预期结果3：多级层次名称生成正确
  - 预期结果4：无效名称格式返回清晰错误
  - 预期结果5：层次深度限制正确检查
  - 预期结果6：特殊字符正确处理并返回错误

### TESTCASE005. MCP协议完整流程测试
- **测试用例名**: MCP协议完整流程测试
- **测试目标**: MOD004整体功能
- **测试用例描述**: 验证整个MCP协议处理流程，从工具发现到工具调用的完整工作流程
- **测试步骤**:
  1. 测试工具发现阶段：
     - 调用list_available_tools获取工具列表
     - 验证返回4个核心工具定义
  2. 测试工具调用准备：
     - 选择add_module工具，准备参数
     - 验证参数解析正确
  3. 测试模块添加：
     - 调用handle_mcp_tools添加新模块
     - 验证模块正确添加到系统
  4. 测试模块查询：
     - 使用get_module_by_name查询刚添加的模块
     - 验证查询结果准确
  5. 测试智能搜索：
     - 使用smart_search搜索相关模块
     - 验证搜索结果包含刚添加的模块
  6. 测试类型结构查询：
     - 使用get_type_structure查询class类型结构
     - 验证返回的结构定义正确
- **测试结果**:
  - 预期结果1：工具发现阶段返回完整的工具列表
  - 预期结果2：工具调用准备阶段参数解析正确
  - 预期结果3：模块添加成功，系统正确响应
  - 预期结果4：模块查询返回准确信息
  - 预期结果5：智能搜索返回相关结果
  - 预期结果6：类型结构查询返回正确定义