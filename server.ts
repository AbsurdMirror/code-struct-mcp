#!/usr/bin/env node
/**
 * MCP服务器独立启动文件
 * 专门用于MCP Inspector测试和AI模型集成
 */

import { config } from 'dotenv';
import { MCPServer } from './api/mcp/mcp-server.js';
import { AppConfig, DEFAULT_CONFIG } from './api/types/config.js';
import * as path from 'path';
import * as fs from 'fs/promises';

// 设置MCP模式环境变量
process.env.MCP_MODE = 'true';

// 加载环境变量
config();

/**
 * 从环境变量加载配置
 */
function loadConfigFromEnv(): AppConfig {
  return {
    ...DEFAULT_CONFIG,
    storage: {
      ...DEFAULT_CONFIG.storage,
      data_path: process.env.STORAGE_PATH || process.env.DATA_PATH || DEFAULT_CONFIG.storage.data_path,
      backup_path: process.env.BACKUP_PATH || DEFAULT_CONFIG.storage.backup_path,
      backup_enabled: process.env.BACKUP_ENABLED === 'true' || DEFAULT_CONFIG.storage.backup_enabled,
      backup_interval: parseInt(process.env.BACKUP_INTERVAL || '0') || DEFAULT_CONFIG.storage.backup_interval,
    },
    http_server: {
      ...DEFAULT_CONFIG.http_server,
      port: parseInt(process.env.PORT || '0') || DEFAULT_CONFIG.http_server.port,
    },
    logging: {
      ...DEFAULT_CONFIG.logging,
      level: (process.env.LOG_LEVEL as any) || DEFAULT_CONFIG.logging.level,
    }
  };
}

/**
 * 确保必要的目录存在
 */
async function ensureDirectories(config: AppConfig): Promise<void> {
  const directories = [
    config.storage.data_path,
    config.storage.backup_path
  ];
  
  // 添加日志目录（如果配置了日志文件路径）
  if (config.logging.file_path) {
    directories.push(path.dirname(config.logging.file_path));
  }

  for (const dir of directories) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

/**
 * 创建初始示例数据
 */
async function createInitialData(config: AppConfig): Promise<void> {
  const exampleFile = path.join(config.storage.data_path, 'example.yaml');
  
  try {
    // 检查文件是否已存在
    await fs.access(exampleFile);
    return;
  } catch {
    // 文件不存在，创建示例数据
  }

  try {
    const exampleData = {
      metadata: {
        name: 'example-project',
        description: '示例项目代码文档',
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
  } catch (error) {
    // 不抛出错误，因为这不是致命的
  }
}

/**
 * 启动MCP服务器
 */
async function startMCPServer(): Promise<void> {
  // 启动MCP服务器（移除console.log以避免干扰MCP协议通信）
    
    try {
      // 加载配置
      const appConfig = loadConfigFromEnv();
      
      // 确保目录存在
      await ensureDirectories(appConfig);
      
      // 创建初始数据
      await createInitialData(appConfig);
      
      // 启动MCP服务器
      const mcpServer = new MCPServer(appConfig.storage);
      await mcpServer.start();
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      try {
        await mcpServer.stop();
        process.exit(0);
      } catch (error) {
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
  } catch (error) {
    process.exit(1);
  }
}

// 启动服务器
startMCPServer();