/**
 * 错误处理工具类
 * 提供统一的错误处理、验证和日志记录功能
 */

import { Logger } from './logger.js';
import { z } from 'zod';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CIRCULAR_REFERENCE_ERROR = 'CIRCULAR_REFERENCE_ERROR',
  RESOURCE_LIMIT_ERROR = 'RESOURCE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 标准化错误接口
 */
export interface StandardError {
  code: string;
  type: ErrorType;
  message: string;
  details?: any;
  severity: ErrorSeverity;
  timestamp: string;
  context?: {
    operation?: string;
    resource?: string;
    user_id?: string;
    request_id?: string;
    [key: string]: any;
  };
  stack_trace?: string;
  suggestions?: string[];
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: StandardError[];
  warnings: StandardError[];
}

/**
 * 操作结果接口
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: StandardError;
  warnings?: StandardError[];
  metadata?: {
    duration?: number;
    timestamp: string;
    operation: string;
    [key: string]: any;
  };
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: Logger;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, number> = new Map();
  private readonly MAX_ERROR_RATE = 10; // 每分钟最大错误数
  private readonly ERROR_WINDOW = 60000; // 1分钟窗口

  private constructor() {
    this.logger = new Logger();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 创建标准化错误
   */
  createError(
    type: ErrorType,
    message: string,
    options: {
      code?: string;
      details?: any;
      severity?: ErrorSeverity;
      context?: StandardError['context'];
      suggestions?: string[];
      originalError?: Error;
    } = {}
  ): StandardError {
    const error: StandardError = {
      code: options.code || this.generateErrorCode(type),
      type,
      message,
      details: options.details,
      severity: options.severity || this.determineSeverity(type),
      timestamp: new Date().toISOString(),
      context: options.context || {},
      suggestions: options.suggestions || []
    };

    // 添加堆栈跟踪（如果有原始错误）
    if (options.originalError && options.originalError.stack) {
      error.stack_trace = options.originalError.stack;
    }

    // 记录错误
    this.logError(error);

    // 更新错误统计
    this.updateErrorStats(error.code);

    return error;
  }

  /**
   * 包装操作结果
   */
  wrapOperation<T>(
    operation: string,
    fn: () => Promise<T> | T,
    context?: StandardError['context']
  ): Promise<OperationResult<T>> {
    return this.executeWithErrorHandling(async () => {
      const startTime = Date.now();
      
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        return {
          success: true,
          data: result,
          metadata: {
            duration,
            timestamp: new Date().toISOString(),
            operation,
            ...context
          }
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const standardError = this.handleError(error, { operation, ...context });
        
        return {
          success: false,
          error: standardError,
          metadata: {
            duration,
            timestamp: new Date().toISOString(),
            operation,
            ...context
          }
        };
      }
    });
  }

  /**
   * 处理错误
   */
  handleError(
    error: unknown,
    context?: StandardError['context']
  ): StandardError {
    // Zod验证错误
    if (error instanceof z.ZodError) {
      return this.createError(
        ErrorType.VALIDATION_ERROR,
        '数据验证失败',
        {
          details: {
            issues: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          },
          context,
          suggestions: [
            '请检查输入数据格式',
            '确保所有必需字段都已提供',
            '验证数据类型是否正确'
          ]
        }
      );
    }

    // 标准Error对象
    if (error instanceof Error) {
      const errorType = this.classifyError(error);
      return this.createError(
        errorType,
        error.message,
        {
          context,
          originalError: error,
          suggestions: this.getSuggestions(errorType)
        }
      );
    }

    // 字符串错误
    if (typeof error === 'string') {
      return this.createError(
        ErrorType.INTERNAL_ERROR,
        error,
        { context }
      );
    }

    // 未知错误
    return this.createError(
      ErrorType.INTERNAL_ERROR,
      '发生未知错误',
      {
        details: { originalError: error },
        context
      }
    );
  }

  /**
   * 验证数据
   */
  validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: StandardError['context']
  ): ValidationResult {
    try {
      schema.parse(data);
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => this.createError(
          ErrorType.VALIDATION_ERROR,
          `${e.path.join('.')}: ${e.message}`,
          {
            code: `VALIDATION_${e.code.toUpperCase()}`,
            details: { 
              path: e.path, 
              message: e.message,
              code: e.code
            },
            context,
            severity: ErrorSeverity.MEDIUM
          }
        ));
        
        return {
          isValid: false,
          errors,
          warnings: []
        };
      }
      
      return {
        isValid: false,
        errors: [this.handleError(error, context)],
        warnings: []
      };
    }
  }

  /**
   * 检查错误率
   */
  checkErrorRate(errorCode: string): boolean {
    const now = Date.now();
    const lastErrorTime = this.lastErrors.get(errorCode) || 0;
    const errorCount = this.errorCounts.get(errorCode) || 0;
    
    // 如果超过时间窗口，重置计数
    if (now - lastErrorTime > this.ERROR_WINDOW) {
      this.errorCounts.set(errorCode, 1);
      this.lastErrors.set(errorCode, now);
      return true;
    }
    
    // 检查是否超过错误率限制
    return errorCount < this.MAX_ERROR_RATE;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: StandardError[];
  } {
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0);
    
    const errorsByType: Record<string, number> = {};
    this.errorCounts.forEach((count, code) => {
      errorsByType[code] = count;
    });
    
    return {
      totalErrors,
      errorsByType,
      recentErrors: [] // 可以实现最近错误的缓存
    };
  }

  /**
   * 清除错误统计
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  /**
   * 获取错误率
   */
  getErrorRate(): number {
    const totalErrors = Array.from(this.errorCounts.values())
      .reduce((sum, count) => sum + count, 0);
    const timeWindow = 60000; // 1分钟
    const now = Date.now();
    
    // 计算最近时间窗口内的错误数
    let recentErrors = 0;
    this.lastErrors.forEach((timestamp) => {
      if (now - timestamp < timeWindow) {
        recentErrors++;
      }
    });
    
    // 返回错误率（每分钟错误数）
    return recentErrors / (timeWindow / 60000);
  }

  /**
   * 生成错误代码
   */
  private generateErrorCode(type: ErrorType): string {
    const timestamp = Date.now().toString(36);
    return `${type}_${timestamp}`;
  }

  /**
   * 确定错误严重级别
   */
  private determineSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.NOT_FOUND_ERROR:
        return ErrorSeverity.LOW;
      case ErrorType.DUPLICATE_ERROR:
      case ErrorType.CIRCULAR_REFERENCE_ERROR:
        return ErrorSeverity.MEDIUM;
      case ErrorType.PERMISSION_ERROR:
      case ErrorType.RESOURCE_LIMIT_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.STORAGE_ERROR:
      case ErrorType.INTERNAL_ERROR:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * 分类错误
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found') || message.includes('不存在')) {
      return ErrorType.NOT_FOUND_ERROR;
    }
    if (message.includes('already exists') || message.includes('已存在')) {
      return ErrorType.DUPLICATE_ERROR;
    }
    if (message.includes('permission') || message.includes('权限')) {
      return ErrorType.PERMISSION_ERROR;
    }
    if (message.includes('circular') || message.includes('循环')) {
      return ErrorType.CIRCULAR_REFERENCE_ERROR;
    }
    if (message.includes('timeout') || message.includes('超时')) {
      return ErrorType.TIMEOUT_ERROR;
    }
    if (message.includes('network') || message.includes('网络')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('storage') || message.includes('存储')) {
      return ErrorType.STORAGE_ERROR;
    }
    
    return ErrorType.INTERNAL_ERROR;
  }

  /**
   * 获取建议
   */
  private getSuggestions(type: ErrorType): string[] {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return [
          '检查输入数据格式',
          '确保必需字段已提供',
          '验证数据类型'
        ];
      case ErrorType.NOT_FOUND_ERROR:
        return [
          '确认资源名称正确',
          '检查资源是否已创建',
          '验证访问权限'
        ];
      case ErrorType.DUPLICATE_ERROR:
        return [
          '使用不同的名称',
          '检查现有资源',
          '考虑更新而非创建'
        ];
      case ErrorType.CIRCULAR_REFERENCE_ERROR:
        return [
          '检查模块依赖关系',
          '避免循环引用',
          '重新设计模块结构'
        ];
      case ErrorType.STORAGE_ERROR:
        return [
          '检查磁盘空间',
          '验证文件权限',
          '检查存储服务状态'
        ];
      default:
        return [
          '检查系统日志',
          '联系技术支持',
          '重试操作'
        ];
    }
  }

  /**
   * 记录错误
   */
  private logError(error: StandardError): void {
    const logData = {
      code: error.code,
      type: error.type,
      severity: error.severity,
      context: error.context,
      details: error.details
    };
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`错误发生: ${error.message}`, 'ErrorHandler', undefined, logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`错误发生: ${error.message}`, 'ErrorHandler', undefined, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`错误发生: ${error.message}`, 'ErrorHandler', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info(`错误发生: ${error.message}`, 'ErrorHandler', logData);
        break;
      default:
        this.logger.error(`错误发生: ${error.message}`, 'ErrorHandler', undefined, logData);
    }
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'info';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'warn';
    }
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(errorCode: string): void {
    const currentCount = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, currentCount + 1);
    this.lastErrors.set(errorCode, Date.now());
  }

  /**
   * 执行带错误处理的操作
   */
  private async executeWithErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      // 记录未处理的错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('未处理的错误:', 'ErrorHandler', error instanceof Error ? error : undefined, { originalError: error });
      throw error;
    }
  }
}

/**
 * 错误处理装饰器
 */
export function HandleErrors(
  errorType?: ErrorType,
  context?: StandardError['context']
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const errorHandler = ErrorHandler.getInstance();
      
      try {
        return await method.apply(this, args);
      } catch (error) {
        const standardError = errorHandler.handleError(error, {
          ...context,
          method: propertyName,
          class: target.constructor.name
        });
        
        throw standardError;
      }
    };
    
    return descriptor;
  };
}

/**
 * 验证装饰器
 */
export function ValidateInput<T>(
  schema: z.ZodSchema<T>,
  paramIndex: number = 0
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const errorHandler = ErrorHandler.getInstance();
      const validation = errorHandler.validate(schema, args[paramIndex], {
        method: propertyName,
        class: target.constructor.name
      });
      
      if (!validation.isValid) {
        throw validation.errors[0];
      }
      
      return await method.apply(this, args);
    };
    
    return descriptor;
  };
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance();