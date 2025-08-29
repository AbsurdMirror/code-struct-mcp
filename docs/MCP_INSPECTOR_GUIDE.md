# MCP Inspector 使用指南

本指南详细介绍如何使用 MCP Inspector 测试和调试 Code Structure MCP 服务器。

## 概述

MCP Inspector 是一个可视化的开发工具，用于测试和调试 MCP 服务器 <mcreference link="https://github.com/modelcontextprotocol/inspector" index="1">1</mcreference>。它提供了一个交互式的 Web 界面，让开发者可以实时测试 MCP 服务器的功能，而无需编写客户端代码。

## 系统要求

- **Node.js**: 版本 22.7.5 或更高 <mcreference link="https://modelcontextprotocol.io/legacy/tools/inspector" index="2">2</mcreference>
- **操作系统**: Windows, macOS, Linux
- **浏览器**: 现代浏览器（Chrome, Firefox, Safari, Edge）

## 快速开始

### 1. 使用启动脚本（推荐）

#### Linux/macOS:
```bash
# 给脚本添加执行权限（首次运行）
chmod +x scripts/start-inspector.sh

# 启动 MCP Inspector
./scripts/start-inspector.sh
```

#### Windows:
```cmd
# 双击运行或在命令行中执行
scripts\start-inspector.bat
```

### 2. 手动启动

```bash
# 1. 构建项目
npm run build
# 或使用 pnpm
pnpm run build

# 2. 启动 MCP Inspector
npx @modelcontextprotocol/inspector \
    -e NODE_ENV=development \
    -e DEBUG=true \
    -e LOG_LEVEL=debug \
    -e STORAGE_PATH=./data \
    node dist/server.js
```

## 访问界面

启动成功后，MCP Inspector 将在以下地址运行：

- **客户端 UI**: http://localhost:6274
- **代理服务器**: http://localhost:6277

在浏览器中打开 http://localhost:6274 即可访问测试界面 <mcreference link="https://mcpcat.io/guides/setting-up-mcp-inspector-server-testing/" index="3">3</mcreference>。

## 功能测试

### 1. 连接测试

1. 打开 MCP Inspector 界面
2. 在左侧连接面板中，确认服务器配置：
   - **Transport**: stdio
   - **Command**: node
   - **Args**: dist/server.js
3. 点击 "Connect" 按钮
4. 连接成功后，界面会显示服务器的能力信息

### 2. 工具测试

#### 测试 add_module 工具

1. 切换到 "Tools" 标签页
2. 选择 "add_module" 工具
3. 填写测试参数：
   ```json
   {
     "name": "TestClass",
     "type": "class",
     "hierarchical_name": "test.TestClass",
     "file_path": "/test/TestClass.ts",
     "description": "测试类模块",
     "access_modifier": "public",
     "methods": [
       {
         "name": "testMethod",
         "parameters": [
           {
             "name": "param1",
             "type": "string",
             "description": "测试参数"
           }
         ],
         "return_type": "void",
         "description": "测试方法"
       }
     ]
   }
   ```
4. 点击 "Call Tool" 按钮
5. 查看返回结果

#### 测试 smart_search 工具

1. 选择 "smart_search" 工具
2. 填写搜索参数：
   ```json
   {
     "query": "test",
     "limit": 10
   }
   ```
3. 执行搜索并查看结果

#### 测试 get_module_by_name 工具

1. 选择 "get_module_by_name" 工具
2. 填写模块名称：
   ```json
   {
     "hierarchical_name": "test.TestClass"
   }
   ```
3. 执行查询并查看结果

#### 测试 get_type_structure 工具

1. 选择 "get_type_structure" 工具
2. 填写类型名称：
   ```json
   {
     "type_name": "class"
   }
   ```
3. 执行查询并查看类型结构

### 3. 资源测试

1. 切换到 "Resources" 标签页
2. 查看可用资源列表
3. 点击资源查看详细内容
4. 测试资源订阅功能（如果支持）

### 4. 提示测试

1. 切换到 "Prompts" 标签页
2. 查看可用的提示模板
3. 填写提示参数
4. 测试提示生成功能

## 调试功能

### 1. 请求历史

- 在 "History" 面板中查看所有请求和响应
- 分析请求参数和响应数据
- 导出历史记录为 JSON 格式

### 2. 日志监控

- 在 "Notifications" 面板中查看服务器日志
- 监控错误和警告信息
- 分析性能指标

### 3. 错误诊断

常见问题和解决方案：

#### 连接失败
- 检查服务器是否正确构建（`dist/server.js` 文件存在）
- 确认端口 6274 和 6277 未被占用
- 检查防火墙设置

#### 工具调用失败
- 验证参数格式是否正确
- 检查必需参数是否完整
- 查看服务器日志获取详细错误信息

#### 性能问题
- 监控请求响应时间
- 检查内存使用情况
- 分析并发请求处理能力

## 高级配置

### 环境变量配置

可以通过环境变量自定义 MCP Inspector 的行为：

```bash
# 自定义端口
CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector node dist/server.js

# 启用自动打开浏览器
AUTO_OPEN=true npx @modelcontextprotocol/inspector node dist/server.js

# 配置允许的来源
ALLOWED_ORIGINS=http://localhost:3000,http://example.com npx @modelcontextprotocol/inspector node dist/server.js
```

### 配置文件

项目包含预配置的 `mcp-inspector.config.json` 文件，包含：

- 服务器启动配置
- 环境变量设置
- 测试数据和用例
- Inspector 界面配置

### CLI 模式

对于自动化测试，可以使用 CLI 模式 <mcreference link="https://bootcamptoprod.com/mcp-inspector-guide/" index="5">5</mcreference>：

```bash
# 列出所有工具
npx @modelcontextprotocol/inspector --cli node dist/server.js --method tools/list

# 调用特定工具
npx @modelcontextprotocol/inspector --cli node dist/server.js \
    --method tools/call \
    --tool-name add_module \
    --tool-arg name=TestModule \
    --tool-arg type=class
```

## 测试用例

项目包含完整的测试套件（`test/mcp-inspector-tests.json`），涵盖：

- **连接测试**: 验证服务器启动和协议兼容性
- **工具测试**: 测试所有 MCP 工具的功能
- **错误处理测试**: 验证各种错误情况的处理
- **性能测试**: 测试批量操作和并发请求

## 最佳实践

### 开发工作流

1. **启动开发环境**
   - 使用启动脚本快速启动 Inspector
   - 确保开发模式和调试日志已启用

2. **迭代测试**
   - 修改服务器代码
   - 重新构建项目
   - 重新连接 Inspector
   - 测试受影响的功能

3. **边界测试**
   - 测试无效输入
   - 测试缺少参数的情况
   - 验证错误处理和响应

4. **性能监控**
   - 监控请求响应时间
   - 测试并发操作
   - 验证内存使用情况

### 安全注意事项

- MCP Inspector 包含可以运行本地进程的代理服务器 <mcreference link="https://github.com/modelcontextprotocol/inspector" index="1">1</mcreference>
- 仅在受信任的网络环境中绑定到所有接口
- 使用 `ALLOWED_ORIGINS` 环境变量配置允许的来源
- 避免在生产环境中运行 Inspector

## 故障排除

### 常见错误

1. **ERR_CONNECTION_REFUSED**
   - 检查代理服务器是否正在运行
   - 验证端口是否被其他进程占用
   - 检查防火墙设置

2. **服务器进程崩溃**
   - 查看 stderr 输出获取错误信息
   - 检查服务器初始化代码
   - 验证环境变量配置

3. **环境变量问题**
   - 确认所需的环境变量已设置
   - 检查 API 密钥和配置值
   - 使用 Inspector 的环境变量面板进行诊断

### 获取帮助

- 查看 [MCP 官方文档](https://modelcontextprotocol.io/)
- 参考 [调试指南](https://modelcontextprotocol.io/docs/debugging)
- 查看项目的测试用例和配置文件

## 总结

MCP Inspector 是开发和调试 MCP 服务器的强大工具。通过本指南，您可以：

- 快速启动和配置 Inspector
- 全面测试服务器功能
- 有效调试和优化性能
- 遵循最佳实践进行开发

定期使用 MCP Inspector 进行测试，可以确保您的 MCP 服务器稳定可靠，符合协议规范。