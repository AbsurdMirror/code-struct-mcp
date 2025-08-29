/**
 * 日志工具函数
 * 提供结构化日志记录功能
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志级别名称映射
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR'
};

/**
 * 日志级别颜色映射（用于控制台输出）
 */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m',  // 绿色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.ERROR]: '\x1b[31m'  // 红色
};

/**
 * 重置颜色代码
 */
export const RESET_COLOR = '\x1b[0m';

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  data?: any;
  error?: Error;
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file?: string;
  maxFileSize?: number; // 字节
  maxFiles?: number;
  format?: 'json' | 'text';
}

/**
 * 默认日志配置
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  console: true,
  format: 'text'
};

/**
 * 日志记录器类
 */
export class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }

  /**
   * 记录调试日志
   */
  debug(message: string, module?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, module, data);
  }

  /**
   * 记录信息日志
   */
  info(message: string, module?: string, data?: any): void {
    this.log(LogLevel.INFO, message, module, data);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, module?: string, data?: any): void {
    this.log(LogLevel.WARN, message, module, data);
  }

  /**
   * 记录错误日志
   */
  error(message: string, module?: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, message, module, data, error);
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, module?: string, data?: any, error?: Error): void {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(module && { module }),
      ...(data !== undefined && { data }),
      ...(error && { error })
    };

    // 控制台输出
    if (this.config.console) {
      this.logToConsole(entry);
    }

    // 文件输出
    if (this.config.file) {
      this.logQueue.push(entry);
      this.processLogQueue();
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const color = LOG_LEVEL_COLORS[entry.level];
    const levelName = LOG_LEVEL_NAMES[entry.level];
    const timestamp = entry.timestamp.replace('T', ' ').replace('Z', '');
    
    let logMessage = `${color}[${timestamp}] [${levelName}]${RESET_COLOR}`;
    
    if (entry.module) {
      logMessage += ` [${entry.module}]`;
    }
    
    logMessage += ` ${entry.message}`;
    
    // MCP服务器模式下使用stderr输出，避免干扰MCP协议通信
    if (process.env.MCP_MODE === 'true') {
      process.stderr.write(logMessage + '\n');
      
      // 输出附加数据到stderr
      if (entry.data) {
        process.stderr.write(`  数据: ${JSON.stringify(entry.data)}\n`);
      }
      
      // 输出错误信息到stderr
      if (entry.error) {
        process.stderr.write(`  错误: ${entry.error.message}\n`);
        if (entry.error.stack) {
          process.stderr.write(`  堆栈: ${entry.error.stack}\n`);
        }
      }
    } else {
      // 非MCP模式下使用标准console输出
      console.log(logMessage);
      
      // 输出附加数据
      if (entry.data) {
        console.log('  数据:', entry.data);
      }
      
      // 输出错误信息
      if (entry.error) {
        console.error('  错误:', entry.error.message);
        if (entry.error.stack) {
          console.error('  堆栈:', entry.error.stack);
        }
      }
    }
  }

  /**
   * 处理日志队列
   */
  private async processLogQueue(): Promise<void> {
    if (this.isWriting || this.logQueue.length === 0 || !this.config.file) {
      return;
    }

    this.isWriting = true;

    try {
      const entries = [...this.logQueue];
      this.logQueue = [];

      await this.writeToFile(entries);
    } catch (error) {
      // MCP服务器模式下禁用控制台输出
      if (process.env.MCP_MODE !== 'true') {
        console.error('写入日志文件失败:', error);
      }
      // 将失败的日志重新加入队列
      this.logQueue.unshift(...this.logQueue);
    } finally {
      this.isWriting = false;
      
      // 如果队列中还有日志，继续处理
      if (this.logQueue.length > 0) {
        setTimeout(() => this.processLogQueue(), 100);
      }
    }
  }

  /**
   * 写入文件
   */
  private async writeToFile(entries: LogEntry[]): Promise<void> {
    if (!this.config.file) return;

    // 确保日志目录存在
    const logDir = path.dirname(this.config.file);
    await fs.mkdir(logDir, { recursive: true });

    // 检查文件大小并轮转
    await this.rotateLogFile();

    // 格式化日志条目
    const logLines = entries.map(entry => this.formatLogEntry(entry));
    const logContent = logLines.join('\n') + '\n';

    // 追加到文件
    await fs.appendFile(this.config.file, logContent, 'utf-8');
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: LOG_LEVEL_NAMES[entry.level],
        message: entry.message,
        module: entry.module,
        data: entry.data,
        error: entry.error ? {
          message: entry.error.message,
          stack: entry.error.stack
        } : undefined
      });
    } else {
      let line = `[${entry.timestamp}] [${LOG_LEVEL_NAMES[entry.level]}]`;
      
      if (entry.module) {
        line += ` [${entry.module}]`;
      }
      
      line += ` ${entry.message}`;
      
      if (entry.data) {
        line += ` | 数据: ${JSON.stringify(entry.data)}`;
      }
      
      if (entry.error) {
        line += ` | 错误: ${entry.error.message}`;
        if (entry.error.stack) {
          line += ` | 堆栈: ${entry.error.stack.replace(/\n/g, ' ')}`;
        }
      }
      
      return line;
    }
  }

  /**
   * 日志文件轮转
   */
  private async rotateLogFile(): Promise<void> {
    if (!this.config.file || !this.config.maxFileSize) return;

    try {
      const stats = await fs.stat(this.config.file);
      
      if (stats.size >= this.config.maxFileSize) {
        const maxFiles = this.config.maxFiles || 5;
        const logDir = path.dirname(this.config.file);
        const logName = path.basename(this.config.file, path.extname(this.config.file));
        const logExt = path.extname(this.config.file);

        // 轮转现有文件
        for (let i = maxFiles - 1; i >= 1; i--) {
          const oldFile = path.join(logDir, `${logName}.${i}${logExt}`);
          const newFile = path.join(logDir, `${logName}.${i + 1}${logExt}`);
          
          try {
            await fs.access(oldFile);
            if (i === maxFiles - 1) {
              await fs.unlink(oldFile); // 删除最老的文件
            } else {
              await fs.rename(oldFile, newFile);
            }
          } catch {
            // 文件不存在，忽略
          }
        }

        // 重命名当前文件
        const rotatedFile = path.join(logDir, `${logName}.1${logExt}`);
        await fs.rename(this.config.file, rotatedFile);
      }
    } catch (error) {
      // 文件不存在或其他错误，忽略
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 刷新日志队列
   */
  async flush(): Promise<void> {
    while (this.logQueue.length > 0 || this.isWriting) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * 全局日志记录器实例
 */
export const logger = new Logger();

/**
 * 模块日志记录器接口
 */
export interface ModuleLogger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: Error, data?: any) => void;
  updateConfig: (config: Partial<LoggerConfig>) => void;
  getConfig: () => LoggerConfig;
  flush: () => Promise<void>;
}

/**
 * 创建模块专用日志记录器
 */
export function createModuleLogger(moduleName: string, config?: Partial<LoggerConfig>): ModuleLogger {
  const moduleLogger = new Logger(config);
  
  return {
    debug: (message: string, data?: any) => moduleLogger.debug(message, moduleName, data),
    info: (message: string, data?: any) => moduleLogger.info(message, moduleName, data),
    warn: (message: string, data?: any) => moduleLogger.warn(message, moduleName, data),
    error: (message: string, error?: Error, data?: any) => moduleLogger.error(message, moduleName, error, data),
    updateConfig: moduleLogger.updateConfig.bind(moduleLogger),
    getConfig: moduleLogger.getConfig.bind(moduleLogger),
    flush: moduleLogger.flush.bind(moduleLogger)
  };
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(operation: string, loggerInstance: Logger = logger) {
    this.operation = operation;
    this.logger = loggerInstance;
    this.startTime = Date.now();
    this.logger.debug(`开始执行: ${operation}`);
  }

  /**
   * 结束计时并记录
   */
  end(additionalInfo?: string): number {
    const duration = Date.now() - this.startTime;
    const message = `完成执行: ${this.operation} (耗时: ${duration}ms)`;
    
    if (additionalInfo) {
      this.logger.info(`${message} - ${additionalInfo}`);
    } else {
      this.logger.info(message);
    }
    
    return duration;
  }

  /**
   * 记录中间步骤
   */
  step(stepName: string): number {
    const duration = Date.now() - this.startTime;
    this.logger.debug(`${this.operation} - ${stepName} (已耗时: ${duration}ms)`);
    return duration;
  }
}

/**
 * 创建性能计时器
 */
export function createTimer(operation: string, logger?: Logger): PerformanceTimer {
  return new PerformanceTimer(operation, logger);
}