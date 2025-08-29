# 代码文档管理工具 (Code Structure MCP)

一个基于 MCP (Model Context Protocol) 协议的代码文档管理工具，支持代码模块的结构化存储、查询和管理。

## 功能特性

### 核心功能

- 🏗️ **代码模块管理** - 支持类、函数、变量、文件等多种代码模块类型
- 🔍 **智能搜索** - 基于名称、类型、描述等多维度的智能搜索
- 📊 **层次结构** - 支持模块间的父子关系和依赖关系
- 💾 **YAML存储** - 使用YAML格式进行数据持久化存储
- 🔄 **数据备份** - 自动备份和数据完整性检查

### 接口支持

- 🌐 **RESTful API** - 完整的HTTP API接口
- 🤖 **MCP协议** - 支持AI模型直接集成
- 📱 **Web界面** - React + TypeScript前端界面
- 🔧 **CLI工具** - 命令行操作支持

### 技术栈

- **后端**: Node.js + TypeScript + Express
- **前端**: React + TypeScript + Tailwind CSS + Vite
- **存储**: YAML文件系统
- **协议**: MCP (Model Context Protocol)
- **验证**: Zod数据验证
- **工具**: ESLint + Prettier

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (推荐) 或 npm >= 9.0.0

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 环境配置

1. 复制环境变量配置文件：

    ```bash
    cp .env.example .env
    ```

2. 根据需要修改 `.env` 文件中的配置。

### 启动应用

#### 开发模式

```bash
# 启动完整应用（前端 + 后端）
pnpm dev

# 仅启动后端API服务器
pnpm dev:api

# 仅启动前端开发服务器
pnpm dev:web
```

#### 生产模式

```bash
# 构建应用
pnpm build

# 启动生产服务器
pnpm start

# 仅启动MCP服务器（用于AI模型集成）
pnpm start:mcp
```

### 访问应用

- **Web界面**: <http://localhost:5173> (开发模式) 或 <http://localhost:3000> (生产模式)
- **API文档**: <http://localhost:3000/api/v1/health>
- **健康检查**: <http://localhost:3000/api/v1/health>

## API文档

### RESTful API端点

#### 模块管理

- `GET /api/v1/modules` - 获取模块列表
- `POST /api/v1/modules` - 创建新模块
- `GET /api/v1/modules/:id` - 获取指定模块
- `PUT /api/v1/modules/:id` - 更新模块
- `DELETE /api/v1/modules/:id` - 删除模块
- `GET /api/v1/modules/search` - 搜索模块

#### 类型结构

- `GET /api/v1/type-structure` - 获取完整类型结构
- `GET /api/v1/type-structure/:name` - 获取指定模块的类型结构

#### 系统管理

- `GET /api/v1/health` - 健康检查
- `GET /api/v1/stats` - 系统统计信息
- `GET /api/v1/config` - 获取配置信息
- `POST /api/v1/storage/backup` - 创建数据备份
- `POST /api/v1/storage/integrity-check` - 数据完整性检查

### MCP协议工具

#### 可用工具

- `add_module` - 添加新模块
- `get_module_by_name` - 根据名称获取模块
- `smart_search` - 智能搜索模块
- `get_type_structure` - 获取类型结构

## 项目结构

```txt
code-struct-mcp/
├── api/                    # 后端API服务
│   ├── index.ts           # 应用入口文件
│   ├── server.ts          # Express服务器
│   ├── types/             # 类型定义
│   │   ├── module.ts      # 模块相关类型
│   │   ├── config.ts      # 配置类型
│   │   ├── mcp.ts         # MCP协议类型
│   │   ├── api.ts         # API类型
│   │   ├── storage.ts     # 存储类型
│   │   └── index.ts       # 类型统一导出
│   ├── modules/           # 模块管理
│   │   └── module-manager.ts
│   ├── storage/           # 数据存储
│   │   └── yaml-storage.ts
│   ├── mcp/              # MCP协议实现
│   │   └── mcp-server.ts
│   └── utils/            # 工具函数
│       ├── validation.ts  # 数据验证
│       ├── logger.ts     # 日志工具
│       └── index.ts      # 工具统一导出
├── src/                  # 前端React应用
│   ├── components/       # React组件
│   ├── pages/           # 页面组件
│   ├── hooks/           # 自定义Hooks
│   ├── services/        # API服务
│   ├── types/           # 前端类型定义
│   ├── utils/           # 前端工具函数
│   └── App.tsx          # 应用根组件
├── data/                # 数据存储目录
│   └── backups/         # 备份文件目录
├── docs/                # 项目文档
├── .trae/              # Trae AI配置
│   └── documents/       # 技术文档
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript配置
├── vite.config.ts       # Vite配置
├── tailwind.config.js   # Tailwind CSS配置
└── README.md           # 项目说明
```

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `NODE_ENV` | `development` | 运行环境 |
| `PORT` | `3000` | API服务器端口 |
| `DATA_PATH` | `./data` | 数据存储路径 |
| `BACKUP_PATH` | `./data/backups` | 备份存储路径 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `CORS_ENABLED` | `true` | 是否启用CORS |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | 允许的CORS源 |

### 数据格式

模块数据使用YAML格式存储，支持以下模块类型：

- **类模块** (`class`): 包含继承、接口、抽象等信息
- **函数模块** (`function`): 包含参数、返回值、异步等信息
- **变量模块** (`variable`): 包含数据类型、初始值、常量等信息
- **文件模块** (`file`): 包含导入导出、语言等信息
- **函数组模块** (`function_group`): 包含函数列表、命名空间等信息

## 开发指南

### 代码规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 代码规范
- 使用中文注释和文档
- 采用驼峰命名法（JavaScript/TypeScript）

### 测试

```bash
# 运行测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监听模式运行测试
pnpm test:watch
```

### 构建

```bash
# 构建生产版本
pnpm build

# 构建后端
pnpm build:api

# 构建前端
pnpm build:web

# 类型检查
pnpm type-check
```

### 代码检查

```bash
# ESLint检查
pnpm lint

# 自动修复ESLint问题
pnpm lint:fix

# Prettier格式化
pnpm format
```

## MCP集成

### 在AI模型中使用

1. 启动MCP服务器：

    ```bash
    pnpm start:mcp
    ```

2. 在AI模型配置中添加MCP服务器连接信息。

3. 使用可用的MCP工具进行代码文档管理。

### MCP工具示例

```typescript
// 添加模块
const result = await mcpClient.callTool('add_module', {
  name: 'UserService',
  type: 'class',
  file_path: 'src/services/user.service.ts',
  description: '用户服务类'
});

// 搜索模块
const searchResult = await mcpClient.callTool('smart_search', {
  query: 'user',
  type: 'class',
  limit: 10
});
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到问题或有建议，请：

1. 查看 [文档](docs/)
2. 搜索现有的 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新信息。
