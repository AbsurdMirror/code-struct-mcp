/**
 * 输入验证和数据清理工具类
 * 提供全面的输入验证、数据清理和安全检查功能
 */

import { z } from 'zod';
import { ErrorHandler, ErrorType, ValidationResult, StandardError } from './error-handler.js';
import { Logger } from './logger.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * 验证规则接口
 */
export interface ValidationRule {
  name: string;
  validator: (value: any) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * 清理选项接口
 */
export interface SanitizeOptions {
  trimWhitespace?: boolean;
  removeHtmlTags?: boolean;
  escapeHtml?: boolean;
  normalizeUnicode?: boolean;
  maxLength?: number;
  allowedChars?: RegExp;
  blockedPatterns?: RegExp[];
}

/**
 * 安全检查结果接口
 */
export interface SecurityCheckResult {
  isSafe: boolean;
  threats: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    pattern?: string;
  }[];
  sanitizedValue?: any;
}

/**
 * 输入验证器类
 */
export class InputValidator {
  private static instance: InputValidator;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private customRules: Map<string, ValidationRule[]> = new Map();
  
  // 危险模式列表
  private readonly DANGEROUS_PATTERNS = [
    {
      pattern: /<script[^>]*>.*?<\/script>/gi,
      type: 'XSS_SCRIPT',
      severity: 'critical' as const,
      description: '检测到潜在的XSS脚本注入'
    },
    {
      pattern: /javascript:/gi,
      type: 'JAVASCRIPT_PROTOCOL',
      severity: 'high' as const,
      description: '检测到JavaScript协议'
    },
    {
      pattern: /on\w+\s*=/gi,
      type: 'EVENT_HANDLER',
      severity: 'high' as const,
      description: '检测到HTML事件处理器'
    },
    {
      pattern: /(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      type: 'SQL_INJECTION',
      severity: 'critical' as const,
      description: '检测到潜在的SQL注入'
    },
    {
      pattern: /\.\.[\/\\]/g,
      type: 'PATH_TRAVERSAL',
      severity: 'high' as const,
      description: '检测到路径遍历攻击'
    },
    {
      pattern: /eval\s*\(/gi,
      type: 'CODE_INJECTION',
      severity: 'critical' as const,
      description: '检测到代码注入'
    },
    {
      pattern: /\${.*}/g,
      type: 'TEMPLATE_INJECTION',
      severity: 'medium' as const,
      description: '检测到模板注入'
    }
  ];
  
  // 文件路径验证模式
  private readonly FILE_PATH_PATTERNS = {
    VALID_PATH: /^[a-zA-Z0-9._\-\/\\]+$/,
    VALID_FILENAME: /^[a-zA-Z0-9._\-]+\.[a-zA-Z0-9]+$/,
    DANGEROUS_EXTENSIONS: /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)$/i
  };
  
  // 模块名称验证模式
  private readonly MODULE_NAME_PATTERNS = {
    VALID_NAME: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    RESERVED_WORDS: /^(abstract|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|var|void|volatile|while|with|yield)$/i
  };

  private constructor() {
    this.logger = new Logger();
    this.errorHandler = ErrorHandler.getInstance();
    this.initializeDefaultRules();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  /**
   * 验证模块名称
   */
  validateModuleName(name: string): ValidationResult {
    const errors = [];
    const warnings: StandardError[] = [];
    
    // 基本检查
    if (!name || typeof name !== 'string') {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '模块名称不能为空',
        { code: 'EMPTY_MODULE_NAME' }
      ));
      return { isValid: false, errors, warnings };
    }
    
    // 长度检查
    if (name.length > 100) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '模块名称长度不能超过100个字符',
        { code: 'MODULE_NAME_TOO_LONG' }
      ));
    }
    
    // 格式检查
    if (!this.MODULE_NAME_PATTERNS.VALID_NAME.test(name)) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '模块名称只能包含字母、数字和下划线，且必须以字母或下划线开头',
        { code: 'INVALID_MODULE_NAME_FORMAT' }
      ));
    }
    
    // 保留字检查
    if (this.MODULE_NAME_PATTERNS.RESERVED_WORDS.test(name)) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '模块名称不能使用保留关键字',
        { code: 'RESERVED_WORD_MODULE_NAME' }
      ));
    }
    
    // 安全检查
    const securityCheck = this.performSecurityCheck(name);
    if (!securityCheck.isSafe) {
      securityCheck.threats.forEach(threat => {
        errors.push(this.errorHandler.createError(
          ErrorType.VALIDATION_ERROR,
          `安全威胁: ${threat.description}`,
          { code: `SECURITY_${threat.type}` }
        ));
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证文件路径
   */
  validateFilePath(filePath: string): ValidationResult {
    const errors = [];
    const warnings: StandardError[] = [];
    
    if (!filePath || typeof filePath !== 'string') {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '文件路径不能为空',
        { code: 'EMPTY_FILE_PATH' }
      ));
      return { isValid: false, errors, warnings };
    }
    
    // 长度检查
    if (filePath.length > 260) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '文件路径长度不能超过260个字符',
        { code: 'FILE_PATH_TOO_LONG' }
      ));
    }
    
    // 格式检查
    if (!this.FILE_PATH_PATTERNS.VALID_PATH.test(filePath)) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '文件路径包含无效字符',
        { code: 'INVALID_FILE_PATH_FORMAT' }
      ));
    }
    
    // 危险扩展名检查
    if (this.FILE_PATH_PATTERNS.DANGEROUS_EXTENSIONS.test(filePath)) {
      warnings.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '文件扩展名可能存在安全风险',
        { code: 'DANGEROUS_FILE_EXTENSION' }
      ));
    }
    
    // 路径遍历检查
    if (filePath.includes('..')) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '文件路径不能包含路径遍历字符',
        { code: 'PATH_TRAVERSAL_DETECTED' }
      ));
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证层次化名称
   */
  validateHierarchicalName(hierarchicalName: string): ValidationResult {
    const errors = [];
    const warnings: StandardError[] = [];
    
    if (!hierarchicalName || typeof hierarchicalName !== 'string') {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '层次化名称不能为空',
        { code: 'EMPTY_HIERARCHICAL_NAME' }
      ));
      return { isValid: false, errors, warnings };
    }
    
    // 分割并验证每个部分
    const parts = hierarchicalName.split('.');
    
    // 深度检查
    if (parts.length > 10) {
      errors.push(this.errorHandler.createError(
        ErrorType.VALIDATION_ERROR,
        '层次化名称深度不能超过10层',
        { code: 'HIERARCHICAL_NAME_TOO_DEEP' }
      ));
    }
    
    // 验证每个部分
    parts.forEach((part, index) => {
      const partValidation = this.validateModuleName(part);
      if (!partValidation.isValid) {
        partValidation.errors.forEach(error => {
          errors.push(this.errorHandler.createError(
            ErrorType.VALIDATION_ERROR,
            `层次化名称第${index + 1}部分无效: ${error.message}`,
            { code: `HIERARCHICAL_PART_${index}_INVALID` }
          ));
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证描述文本
   */
  validateDescription(description: string): ValidationResult {
    const errors = [];
    const warnings: StandardError[] = [];
    
    if (description && typeof description === 'string') {
      // 长度检查
      if (description.length > 1000) {
        errors.push(this.errorHandler.createError(
          ErrorType.VALIDATION_ERROR,
          '描述长度不能超过1000个字符',
          { code: 'DESCRIPTION_TOO_LONG' }
        ));
      }
      
      // 安全检查
      const securityCheck = this.performSecurityCheck(description);
      if (!securityCheck.isSafe) {
        securityCheck.threats.forEach(threat => {
          if (threat.severity === 'critical' || threat.severity === 'high') {
            errors.push(this.errorHandler.createError(
              ErrorType.VALIDATION_ERROR,
              `描述中检测到安全威胁: ${threat.description}`,
              { code: `DESCRIPTION_SECURITY_${threat.type}` }
            ));
          } else {
            warnings.push(this.errorHandler.createError(
              ErrorType.VALIDATION_ERROR,
              `描述中检测到潜在安全问题: ${threat.description}`,
              { code: `DESCRIPTION_WARNING_${threat.type}` }
            ));
          }
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 数据清理
   */
  sanitize(value: any, options: SanitizeOptions = {}): any {
    if (typeof value !== 'string') {
      return value;
    }
    
    let sanitized = value;
    
    // 去除首尾空白
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }
    
    // 移除HTML标签
    if (options.removeHtmlTags) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    // HTML转义
    if (options.escapeHtml) {
      sanitized = this.escapeHtml(sanitized);
    }
    
    // Unicode标准化
    if (options.normalizeUnicode) {
      sanitized = sanitized.normalize('NFC');
    }
    
    // 长度限制
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    // 字符过滤
    if (options.allowedChars) {
      sanitized = sanitized.replace(new RegExp(`[^${options.allowedChars.source}]`, 'g'), '');
    }
    
    // 阻止模式
    if (options.blockedPatterns) {
      options.blockedPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
    }
    
    return sanitized;
  }

  /**
   * 执行安全检查
   */
  performSecurityCheck(value: string): SecurityCheckResult {
    const threats = [];
    
    for (const dangerousPattern of this.DANGEROUS_PATTERNS) {
      if (dangerousPattern.pattern.test(value)) {
        threats.push({
          type: dangerousPattern.type,
          severity: dangerousPattern.severity,
          description: dangerousPattern.description,
          pattern: dangerousPattern.pattern.source
        });
      }
    }
    
    // 清理值（移除检测到的威胁）
    let sanitizedValue = value;
    if (threats.length > 0) {
      for (const dangerousPattern of this.DANGEROUS_PATTERNS) {
        sanitizedValue = sanitizedValue.replace(dangerousPattern.pattern, '');
      }
    }
    
    return {
      isSafe: threats.length === 0,
      threats,
      sanitizedValue: threats.length > 0 ? sanitizedValue : undefined
    };
  }

  /**
   * 批量验证
   */
  validateBatch(data: Record<string, any>, rules: Record<string, z.ZodSchema>): ValidationResult {
    const errors = [];
    const warnings: StandardError[] = [];
    
    for (const [key, schema] of Object.entries(rules)) {
      if (data.hasOwnProperty(key)) {
        const validation = this.errorHandler.validate(schema, data[key], { field: key });
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 添加自定义验证规则
   */
  addCustomRule(category: string, rule: ValidationRule): void {
    if (!this.customRules.has(category)) {
      this.customRules.set(category, []);
    }
    this.customRules.get(category)!.push(rule);
  }

  /**
   * 应用自定义规则
   */
  applyCustomRules(category: string, value: any): ValidationResult {
    const rules = this.customRules.get(category) || [];
    const errors = [];
    const warnings: StandardError[] = [];
    
    for (const rule of rules) {
      if (!rule.validator(value)) {
        const error = this.errorHandler.createError(
          ErrorType.VALIDATION_ERROR,
          rule.message,
          { code: `CUSTOM_RULE_${rule.name.toUpperCase()}` }
        );
        
        if (rule.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 初始化默认规则
   */
  private initializeDefaultRules(): void {
    // 模块名称规则
    this.addCustomRule('moduleName', {
      name: 'no_leading_underscore',
      validator: (value: string) => !value.startsWith('_'),
      message: '模块名称不建议以下划线开头',
      severity: 'warning'
    });
    
    this.addCustomRule('moduleName', {
      name: 'camel_case',
      validator: (value: string) => /^[a-z][a-zA-Z0-9]*$/.test(value),
      message: '建议使用驼峰命名法',
      severity: 'warning'
    });
    
    // 文件路径规则
    this.addCustomRule('filePath', {
      name: 'no_spaces',
      validator: (value: string) => !value.includes(' '),
      message: '文件路径不建议包含空格',
      severity: 'warning'
    });
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
  }
}

// ValidateInput装饰器已在error-handler.ts中定义，此处不再重复定义

/**
 * 数据清理装饰器
 */
export function SanitizeInput(options: SanitizeOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const validator = InputValidator.getInstance();
      
      // 清理所有字符串参数
      const sanitizedArgs = args.map(arg => 
        typeof arg === 'string' ? validator.sanitize(arg, options) : arg
      );
      
      return await method.apply(this, sanitizedArgs);
    };
    
    return descriptor;
  };
}

// 导出单例实例
export const inputValidator = InputValidator.getInstance();