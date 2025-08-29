/**
 * API服务器专用入口文件
 * 仅启动HTTP API服务器，用于Web界面和REST API调用
 */

import { config } from 'dotenv';
import { ApiServer } from './server.js';
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
    
    console.log('目录检查完成');
  } catch (error) {
    console.error('创建目录失败:', error);
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
      console.log('示例数据文件已存在');
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
 * 启动API服务器
 */
async function startAPIServer(): Promise<void> {
  console.log('正在启动API服务器（专用模式）...');
  
  try {
    // 加载配置
    const appConfig = loadConfigFromEnv();
    console.log('配置加载完成');
    
    // 确保目录存在
    await ensureDirectories(appConfig);
    
    // 创建初始数据（如果需要）
    await createInitialDataIfNeeded(appConfig);
    
    // 启动API服务器
    console.log('正在初始化API服务器...');
    const apiServer = new ApiServer(appConfig);
    await apiServer.start();
    
    console.log('API服务器启动完成！');
    console.log(`API服务器地址: http://localhost:${appConfig.http_server.port}`);
    console.log(`健康检查: http://localhost:${appConfig.http_server.port}/api/v1/health`);
    console.log(`API文档: http://localhost:${appConfig.http_server.port}/api/v1`);
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n收到 ${signal} 信号，正在优雅关闭API服务器...`);
      
      try {
        await apiServer.stop();
        console.log('API服务器已安全关闭');
        process.exit(0);
      } catch (error) {
        console.error('关闭过程中发生错误:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
  } catch (error) {
    console.error('启动API服务器失败:', error);
    process.exit(1);
  }
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`\nAPI服务器 v1.0.0`);
  console.log('代码文档管理工具的HTTP API服务器\n');
  console.log('用法:');
  console.log('  node dist/api/index_api.js     # 启动API服务器');
  console.log('  tsx api/index_api.ts           # 开发模式启动');
  console.log('');
  console.log('选项:');
  console.log('  --help                         # 显示帮助信息');
  console.log('');
  console.log('环境变量:');
  console.log('  PORT                           # API服务器端口 (默认: 3000)');
  console.log('  DATA_PATH                      # 数据存储路径 (默认: ./data)');
  console.log('  CORS_ENABLED                   # 启用CORS (默认: true)');
  console.log('  CORS_ORIGINS                   # 允许的源地址 (逗号分隔)');
  console.log('  AUTO_BACKUP                    # 自动备份 (默认: false)');
  console.log('  BACKUP_INTERVAL                # 备份间隔秒数 (默认: 3600)');
  console.log('  LOG_LEVEL                      # 日志级别 (debug|info|warn|error)');
  console.log('  NODE_ENV                       # 运行环境 (development|production)');
  console.log('');
  console.log('API端点:');
  console.log('  GET  /api/v1/health            # 健康检查');
  console.log('  GET  /api/v1/modules           # 获取模块列表');
  console.log('  POST /api/v1/modules           # 创建模块');
  console.log('  GET  /api/v1/modules/:name     # 获取单个模块');
  console.log('  PUT  /api/v1/modules/:name     # 更新模块');
  console.log('  DELETE /api/v1/modules/:name   # 删除模块');
  console.log('  GET  /api/v1/search            # 搜索模块');
  console.log('  GET  /api/v1/stats             # 获取统计信息');
  console.log('');
}

// 主程序入口
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    showHelp();
  } else {
    startAPIServer();
  }
}

// 导出主要类和函数供其他模块使用
export { ApiServer } from './server.js';
export { ModuleManager } from './modules/module-manager.js';
export { YamlStorage } from './storage/yaml-storage.js';
export * from './types/index.js';
export { startAPIServer };