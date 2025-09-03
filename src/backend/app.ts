/**
 * 统一入口启动文件
 * 负责解析命令行参数，初始化日志模块，根据模式启动相应的服务器
 */

import * as fs from 'fs';
import * as path from 'path';
import { start_server } from './server';
import MCPServer from './mcp-server';
import * as storage from './storage';

/**
 * 命令行参数接口
 */
interface AppConfig {
  mode: 'api' | 'mcp' | 'production';  // 运行模式：API模式、MCP模式或生产模式
  port?: number;        // API模式下的端口号
  dataPath: string;     // 数据存储目录路径
  staticDir?: string;   // 静态文件目录路径（生产模式）
  logFile?: string;     // 日志文件路径（可选）
}

/**
 * 简单的日志接口
 */
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/**
 * 简单的文件日志实现
 */
class FileLogger implements Logger {
  private logFilePath: string;

  constructor(logDirOrFile: string, isFilePath: boolean = false) {
    if (isFilePath) {
      // 直接使用指定的文件路径
      this.logFilePath = logDirOrFile;
      const logDir = path.dirname(logDirOrFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } else {
      // 使用目录路径，生成按日期的日志文件
      if (!fs.existsSync(logDirOrFile)) {
        fs.mkdirSync(logDirOrFile, { recursive: true });
      }
      const today = new Date().toISOString().split('T')[0];
      this.logFilePath = path.join(logDirOrFile, `app-${today}.log`);
    }
  }

  private writeLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFilePath, logEntry, 'utf8');
    } catch (error) {
      // 如果写入日志失败，静默处理（避免循环错误）
    }
  }

  info(message: string): void {
    this.writeLog('info', message);
  }

  warn(message: string): void {
    this.writeLog('warn', message);
  }

  error(message: string): void {
    this.writeLog('error', message);
  }

  debug(message: string): void {
    this.writeLog('debug', message);
  }
}

// 全局日志实例
let globalLogger: Logger;

/**
 * 获取全局日志实例
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    throw new Error('日志模块未初始化，请先调用initializeApp');
  }
  return globalLogger;
}

/**
 * 解析命令行参数
 */
function parseCommandLineArgs(): AppConfig {
  const args = process.argv.slice(2);
  const config: Partial<AppConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
    case '--mode': {
      const mode = args[i + 1];
      if (mode === 'api' || mode === 'mcp' || mode === 'production') {
        config.mode = mode;
        i++; // 跳过下一个参数
      } else {
        throw new Error('无效的mode参数，必须是api、mcp或production');
      }
      break;
    }
        
    case '--port': {
      const port = parseInt(args[i + 1]);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error('无效的port参数，必须是1-65535之间的数字');
      }
      config.port = port;
      i++; // 跳过下一个参数
      break;
    }
        
    case '--data-path': {
      const dataPath = args[i + 1];
      if (!dataPath) {
        throw new Error('data-path参数不能为空');
      }
      config.dataPath = path.resolve(dataPath);
      i++; // 跳过下一个参数
      break;
    }
        
    case '--static-dir': {
      const staticDir = args[i + 1];
      if (!staticDir) {
        throw new Error('static-dir参数不能为空');
      }
      config.staticDir = path.resolve(staticDir);
      i++; // 跳过下一个参数
      break;
    }
        
    case '--log-file': {
      const logFile = args[i + 1];
      if (!logFile) {
        throw new Error('log-file参数不能为空');
      }
      config.logFile = path.resolve(logFile);
      i++; // 跳过下一个参数
      break;
    }
        
    default: {
      if (arg.startsWith('--')) {
        throw new Error(`未知的参数: ${arg}`);
      }
      break;
    }
    }
  }

  // 验证必需参数
  if (!config.mode) {
    throw new Error('缺少必需参数: --mode');
  }
  
  if (!config.dataPath) {
    throw new Error('缺少必需参数: --data-path');
  }
  
  if ((config.mode === 'api' || config.mode === 'production') && !config.port) {
    // API模式或生产模式下，如果没有指定端口，使用默认端口3000
    config.port = 3000;
  }
  
  if (config.mode === 'production' && !config.staticDir) {
    // 生产模式下，如果没有指定静态文件目录，使用默认目录
    config.staticDir = path.join(__dirname, '../../frontend/dist');
  }

  return config as AppConfig;
}

/**
 * 初始化应用
 */
async function initializeApp(config: AppConfig): Promise<void> {
  // 1. 初始化日志模块
  if (config.logFile) {
    globalLogger = new FileLogger(config.logFile, true);
  } else {
    globalLogger = new FileLogger(config.dataPath, false);
  }
  
  globalLogger.info('应用启动开始');
  globalLogger.info(`运行模式: ${config.mode}`);
  globalLogger.info(`数据路径: ${config.dataPath}`);
  
  if (config.port) {
    globalLogger.info(`API端口: ${config.port}`);
  }
  
  if (config.staticDir) {
    globalLogger.info(`静态文件目录: ${config.staticDir}`);
  }
  
  if (config.logFile) {
    globalLogger.info(`日志文件: ${config.logFile}`);
  }

  // 2. 初始化存储模块
  globalLogger.info('初始化存储模块...');
  
  // 设置存储模块的日志实例
  storage.setStorageLogger(globalLogger);
  
  const [storageSuccess, storageMessage] = storage.initialize_storage(config.dataPath);
  
  if (!storageSuccess) {
    globalLogger.error(`存储模块初始化失败: ${storageMessage}`);
    throw new Error(`存储模块初始化失败: ${storageMessage}`);
  }
  
  globalLogger.info(`存储模块初始化成功: ${storageMessage}`);
  
  // 3. 初始化模块管理器
  globalLogger.info('初始化模块管理器...');
  
  // 设置模块管理器的日志实例
  const moduleManager = await import('./module-manager');
  moduleManager.setModuleManagerLogger(globalLogger);
  
  // 初始化模块管理器
  moduleManager.initialize_module_manager();
  globalLogger.info('模块管理器初始化成功');
  
  // 设置人类交互接口的日志实例
  const humanInterface = await import('./human-interface');
  humanInterface.setHumanInterfaceLogger(globalLogger);
  
  // 设置服务器日志实例
  const { setServerLogger } = await import('./server');
  setServerLogger(globalLogger);
  
  // 设置MCP服务器日志实例
  const { setMCPServerLogger } = await import('./mcp-server');
  setMCPServerLogger(globalLogger);
  globalLogger.info('模块管理器日志设置完成');
}

/**
 * 启动API服务器
 */
async function startApiServer(port: number, staticDir?: string): Promise<void> {
  globalLogger.info(`启动API服务器，端口: ${port}`);
  
  try {
    // 如果指定了静态文件目录，配置静态文件服务
    if (staticDir) {
      const { setStaticDirectory } = await import('./server');
      setStaticDirectory(staticDir);
    }
    
    await start_server(port);
    globalLogger.info('API服务器启动成功');
  } catch (error) {
    globalLogger.error(`API服务器启动失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 启动MCP服务器
 */
async function startMcpServer(): Promise<void> {
  globalLogger.info('启动MCP服务器...');
  
  try {
    const mcpServer = new MCPServer();
    await mcpServer.start();
    globalLogger.info('MCP服务器启动成功');
  } catch (error) {
    globalLogger.error(`MCP服务器启动失败: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    // 解析命令行参数
    const config = parseCommandLineArgs();
    
    // 初始化应用
    await initializeApp(config);
    
    // 根据模式启动相应的服务器
    if (config.mode === 'api') {
      await startApiServer(config.port!);
    } else if (config.mode === 'production') {
      await startApiServer(config.port!, config.staticDir);
    } else if (config.mode === 'mcp') {
      await startMcpServer();
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // 如果日志模块已初始化，记录错误
    if (globalLogger) {
      globalLogger.error(`应用启动失败: ${errorMessage}`);
    }
    
    // 退出程序
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  if (globalLogger) {
    globalLogger.error(`未捕获的异常: ${error.message}`);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  if (globalLogger) {
    globalLogger.error(`未处理的Promise拒绝: ${reason}`);
  }
  process.exit(1);
});

// 如果直接运行此文件，则启动应用
if (require.main === module) {
  main();
}

export { main, AppConfig, initializeApp };