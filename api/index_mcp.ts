/**
 * MCP服务器专用入口文件
 * 仅启动MCP服务器，用于AI模型集成
 */

import { config } from 'dotenv';
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
    process.stderr.write(`目录检查完成: ${config.storage.root_path}\n`);
  } catch (error) {
    process.stderr.write(`创建目录失败: ${error}\n`);
    throw error;
  }
}

/**
 * 创建初始数据文件（如果不存在）
 */
async function createInitialDataIfNeeded(config: AppConfig): Promise<void> {
  try {
    const exampleFile = path.join(config.storage.root_path, 'example.yaml');
    
    // 检查示例文件是否存在
    try {
      await fs.access(exampleFile);
      process.stderr.write('示例数据文件已存在\n');
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
    process.stderr.write(`示例数据文件已创建: ${exampleFile}\n`);
  } catch (error) {
    process.stderr.write(`创建初始数据失败: ${error}\n`);
    // 不抛出错误，因为这不是致命的
  }
}

/**
 * 启动MCP服务器
 */
async function startMCPServer(): Promise<void> {
  // 使用stderr输出启动信息，避免干扰MCP协议通信
  process.stderr.write('正在启动MCP服务器（专用模式）...\n');
  
  try {
    // 加载配置
    const appConfig = loadConfigFromEnv();
    process.stderr.write('配置加载完成\n');
    
    // 确保目录存在
    await ensureDirectories(appConfig);
    
    // 创建初始数据（如果需要）
    await createInitialDataIfNeeded(appConfig);
    
    // 启动MCP服务器
    process.stderr.write('正在初始化MCP服务器...\n');
    const mcpServer = new MCPServer(appConfig.storage);
    await mcpServer.start();
    
    // 使用stderr输出启动完成信息，避免干扰MCP协议通信
    process.stderr.write('MCP服务器已启动，等待AI模型连接...\n');
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      process.stderr.write(`\n收到 ${signal} 信号，正在优雅关闭MCP服务器...\n`);
      
      try {
        // MCP服务器通常不需要显式停止，因为它是基于stdio的
        process.stderr.write('MCP服务器已安全关闭\n');
        process.exit(0);
      } catch (error) {
        process.stderr.write(`关闭过程中发生错误: ${error}\n`);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
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
MCP服务器 v1.0.0`);
  console.log('专用于AI模型集成的MCP服务器\n');
  console.log('用法:');
  console.log('  node dist/api/index_mcp.js     # 启动MCP服务器');
  console.log('  tsx api/index_mcp.ts           # 开发模式启动');
  console.log('');
  console.log('选项:');
  console.log('  --help                         # 显示帮助信息');
  console.log('');
  console.log('环境变量:');
  console.log('  DATA_PATH                      # 数据存储路径 (默认: ./data)');
  console.log('  MCP_SERVER_NAME                # MCP服务器名称');
  console.log('  MCP_SERVER_VERSION             # MCP服务器版本');
  console.log('  LOG_LEVEL                      # 日志级别 (debug|info|warn|error)');
  console.log('');
}

// 主程序入口
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    showHelp();
  } else {
    startMCPServer();
  }
}

// 导出主要类和函数供其他模块使用
export { MCPServer } from './mcp/mcp-server.js';
export { YamlStorage } from './storage/yaml-storage.js';
export * from './types/index.js';
export { startMCPServer };