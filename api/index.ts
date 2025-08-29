/**
 * 应用程序主入口文件
 * 启动API服务器和MCP服务器
 */

import { config } from 'dotenv';
import { ApiServer } from './server.js';
import { MCPServer } from './mcp/mcp-server.js';
import { AppConfig, DEFAULT_CONFIG } from './types/config.js';
import * as path from 'path';
import * as fs from 'fs/promises';

// 加载环境变量
config();

/**
 * 从环境变量加载配置
 */
function loadConfigFromEnv(): AppConfig {
  const config: AppConfig = {
    ...DEFAULT_CONFIG,
    storage: {
      ...DEFAULT_CONFIG.storage,
      root_path: process.env.DATA_PATH || DEFAULT_CONFIG.storage.root_path,
      backup_enabled: process.env.AUTO_BACKUP === 'true',
      backup_interval: parseInt(process.env.BACKUP_INTERVAL || '3600'),
      max_backups: parseInt(process.env.MAX_BACKUPS || '10')
    },
    http_server: {
      ...DEFAULT_CONFIG.http_server,
      port: parseInt(process.env.PORT || '3000'),
      cors: {
        ...DEFAULT_CONFIG.http_server.cors,
        enabled: process.env.CORS_ENABLED !== 'false',
        origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : DEFAULT_CONFIG.http_server.cors.origins
      }
    },
    mcp_server: {
      ...DEFAULT_CONFIG.mcp_server,
      name: process.env.MCP_SERVER_NAME || DEFAULT_CONFIG.mcp_server.name,
      version: process.env.MCP_SERVER_VERSION || DEFAULT_CONFIG.mcp_server.version
    },
    logging: {
      ...DEFAULT_CONFIG.logging,
      level: (process.env.LOG_LEVEL as any) || DEFAULT_CONFIG.logging.level
    },
    environment: (process.env.NODE_ENV as any) || DEFAULT_CONFIG.environment
  };

  return config;
}

/**
 * 确保必要的目录存在
 */
async function ensureDirectories(config: AppConfig): Promise<void> {
  try {
    await fs.mkdir(config.storage.root_path, { recursive: true });
    const backupPath = path.join(config.storage.root_path, 'backups');
    await fs.mkdir(backupPath, { recursive: true });
    
    // MCP模式下使用stderr输出，避免干扰MCP协议通信
    const isMcpMode = process.env.MCP_MODE !== 'false';
    if (isMcpMode) {
      process.stderr.write('目录检查完成\n');
    } else {
      console.log('目录检查完成');
    }
  } catch (error) {
    const isMcpMode = process.env.MCP_MODE !== 'false';
    if (isMcpMode) {
      process.stderr.write(`创建目录失败: ${error}\n`);
    } else {
      console.error('创建目录失败:', error);
    }
    throw error;
  }
}

/**
 * 创建初始数据文件
 */
async function createInitialData(config: AppConfig): Promise<void> {
  try {
    const exampleFile = path.join(config.storage.root_path, 'example.yaml');
    
    // 检查示例文件是否存在
    try {
      await fs.access(exampleFile);
      // MCP模式下使用stderr输出，避免干扰MCP协议通信
      const isMcpMode = process.env.MCP_MODE !== 'false';
      if (isMcpMode) {
        process.stderr.write('示例数据文件已存在\n');
      } else {
        console.log('示例数据文件已存在');
      }
      return;
    } catch {
      // 文件不存在，创建示例数据
    }

    const exampleData = {
      metadata: {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_modules: 3
      },
      modules: [
        {
          id: '1',
          name: 'UserService',
          hierarchical_name: 'UserService',
          type: 'class',
          parent_module: null,
          file_path: 'src/services/user.service.ts',
          access_modifier: 'public',
          description: '用户服务类，处理用户相关的业务逻辑',
          inheritance: ['BaseService'],
          interfaces: ['IUserService'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'createUser',
          hierarchical_name: 'UserService.createUser',
          type: 'function',
          parent_module: 'UserService',
          file_path: 'src/services/user.service.ts',
          access_modifier: 'public',
          description: '创建新用户',
          parameters: [
            {
              name: 'userData',
              data_type: 'CreateUserDto',
              default_value: null,
              is_required: true,
              description: '用户创建数据'
            }
          ],
          return_type: 'Promise<User>',
          is_async: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'API_BASE_URL',
          hierarchical_name: 'API_BASE_URL',
          type: 'variable',
          parent_module: null,
          file_path: 'src/config/constants.ts',
          access_modifier: 'public',
          description: 'API基础URL配置',
          data_type: 'string',
          initial_value: 'https://api.example.com',
          is_constant: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };

    const yaml = await import('js-yaml');
    const yamlContent = yaml.dump(exampleData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    });

    await fs.writeFile(exampleFile, yamlContent, 'utf-8');
    console.log('示例数据文件已创建:', exampleFile);
  } catch (error) {
    console.error('创建初始数据失败:', error);
    // 不抛出错误，因为这不是致命的
  }
}

/**
 * 启动应用程序
 */
async function startApplication(): Promise<void> {
  // MCP模式下使用stderr输出，避免干扰MCP协议通信
  const isMcpMode = process.env.MCP_MODE === 'true';
  if (isMcpMode) {
    process.stderr.write('正在启动代码文档管理工具...\n');
  } else {
    console.log('正在启动代码文档管理工具...');
  }
  
  try {
    // 加载配置
    const appConfig = loadConfigFromEnv();
    if (isMcpMode) {
      process.stderr.write('配置加载完成\n');
    } else {
      console.log('配置加载完成');
    }
    
    // 确保必要的目录存在
    await ensureDirectories(appConfig);
    if (isMcpMode) {
      process.stderr.write('目录初始化完成\n');
    } else {
      console.log('目录初始化完成');
    }

    // 创建初始数据
    await createInitialData(appConfig);
    if (isMcpMode) {
      process.stderr.write('初始数据创建完成\n');
    } else {
      console.log('初始数据创建完成');
    }
    
    // 启动API服务器
    const apiServer = new ApiServer(appConfig);
    await apiServer.start();
    if (isMcpMode) {
      process.stderr.write(`API服务器已启动，端口: ${appConfig.http_server.port}\n`);
    } else {
      console.log(`API服务器已启动，端口: ${appConfig.http_server.port}`);
    }

    // 如果启用了MCP，启动MCP服务器
    let mcpServer: MCPServer | null = null;
    if (process.argv.includes('--mcp')) {
      mcpServer = new MCPServer(appConfig.storage);
      await mcpServer.start();
      if (isMcpMode) {
        process.stderr.write('MCP服务器已启动\n');
      } else {
        console.log('MCP服务器已启动');
      }
    }

    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      if (isMcpMode) {
        process.stderr.write(`\n收到 ${signal} 信号，正在关闭服务器...\n`);
      } else {
        console.log(`\n收到 ${signal} 信号，正在关闭服务器...`);
      }
      
      try {
        await apiServer.stop();
        if (mcpServer) {
          await mcpServer.stop();
        }
        if (isMcpMode) {
          process.stderr.write('应用程序已安全关闭\n');
        } else {
          console.log('应用程序已安全关闭');
        }
        process.exit(0);
      } catch (error) {
        if (isMcpMode) {
          process.stderr.write(`关闭过程中发生错误: ${error}\n`);
        } else {
          console.error('关闭过程中发生错误:', error);
        }
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
  } catch (error) {
    if (process.env.MCP_MODE === 'true') {
      process.stderr.write(`启动应用程序失败: ${error}\n`);
    } else {
      console.error('启动应用程序失败:', error);
    }
    process.exit(1);
  }
}

/**
 * 仅启动MCP服务器（用于AI模型集成）
 */
async function startMCPOnly(): Promise<void> {
  // 使用stderr输出启动信息，避免干扰MCP协议通信
  process.stderr.write('正在启动MCP服务器（仅MCP模式）...\n');
  
  try {
    const appConfig = loadConfigFromEnv();
    await ensureDirectories(appConfig);
    
    const mcpServer = new MCPServer(appConfig.storage);
    await mcpServer.start();
    
    // 使用stderr输出启动完成信息，避免干扰MCP协议通信
    process.stderr.write('MCP服务器已启动，等待AI模型连接...\n');
    
  } catch (error) {
    // 使用stderr输出错误信息，避免干扰MCP协议通信
    process.stderr.write(`启动MCP服务器失败: ${error}\n`);
    process.exit(1);
  }
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
代码文档管理工具 v1.0.0
`);
  console.log('用法:');
  console.log('  npm start              # 启动完整应用（API服务器）');
  console.log('  npm run mcp            # 仅启动MCP服务器');
  console.log('  npm run dev            # 开发模式启动');
  console.log('');
  console.log('选项:');
  console.log('  --mcp                  # 同时启动MCP服务器');
  console.log('  --help                 # 显示帮助信息');
  console.log('');
  console.log('环境变量:');
  console.log('  PORT                   # API服务器端口 (默认: 3000)');
  console.log('  DATA_PATH              # 数据存储路径 (默认: ./data)');
  console.log('  BACKUP_PATH            # 备份存储路径 (默认: ./data/backups)');
  console.log('  NODE_ENV               # 运行环境 (development|production)');
  console.log('  LOG_LEVEL              # 日志级别 (debug|info|warn|error)');
  console.log('');
}

// 主程序入口
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  if (process.argv.includes('--help')) {
    showHelp();
  } else if (process.argv.includes('--mcp-only')) {
    startMCPOnly();
  } else {
    startApplication();
  }
}

// 导出主要类和函数供其他模块使用
export { ApiServer } from './server.js';
export { MCPServer } from './mcp/mcp-server.js';
export { ModuleManager } from './modules/module-manager.js';
export { YamlStorage } from './storage/yaml-storage.js';
export * from './types/index.js';