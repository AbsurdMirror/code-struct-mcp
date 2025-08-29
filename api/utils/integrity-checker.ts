/**
 * 数据完整性检查器
 * 提供数据一致性验证、备份验证和修复功能
 */

import { createHash } from 'crypto';
import { readFile, writeFile, access, stat } from 'fs/promises';
import { Logger } from './logger.js';
import { ErrorHandler, ErrorType } from './error-handler.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { Module } from '../types/index.js';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

/**
 * 完整性检查结果接口
 */
export interface IntegrityCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checkedItems: number;
  corruptedItems: number;
  repairedItems: number;
  checksum?: string;
  timestamp: Date;
}

/**
 * 数据一致性问题接口
 */
export interface ConsistencyIssue {
  type: 'missing_reference' | 'circular_dependency' | 'invalid_data' | 'checksum_mismatch' | 'orphaned_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedItems: string[];
  suggestedFix?: string;
  autoFixable: boolean;
}

/**
 * 备份验证结果接口
 */
export interface BackupValidationResult {
  isValid: boolean;
  backupPath: string;
  size: number;
  checksum: string;
  createdAt: Date;
  issues: string[];
  canRestore: boolean;
}

/**
 * 修复操作结果接口
 */
export interface RepairResult {
  success: boolean;
  repairedIssues: ConsistencyIssue[];
  failedRepairs: ConsistencyIssue[];
  backupCreated?: string;
  message: string;
}

/**
 * 数据完整性检查器类
 */
export class IntegrityChecker {
  private static instance: IntegrityChecker;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private checksumCache: Map<string, { checksum: string; timestamp: Date }> = new Map();
  
  // 检查配置
  private readonly CHECK_CONFIG = {
    maxDepth: 10,
    checksumAlgorithm: 'sha256',
    cacheTimeout: 5 * 60 * 1000, // 5分钟
    maxRepairAttempts: 3
  };

  private constructor() {
    this.logger = new Logger();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): IntegrityChecker {
    if (!IntegrityChecker.instance) {
      IntegrityChecker.instance = new IntegrityChecker();
    }
    return IntegrityChecker.instance;
  }

  /**
   * 检查数据完整性
   */
  async checkIntegrity(
    modules: Module[],
    options: {
      checkReferences?: boolean;
      checkCircularDeps?: boolean;
      validateData?: boolean;
      generateChecksum?: boolean;
      autoRepair?: boolean;
    } = {}
  ): Promise<IntegrityCheckResult> {
    const startTime = Date.now();
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedItems: 0,
      corruptedItems: 0,
      repairedItems: 0,
      timestamp: new Date()
    };
    
    this.logger.info('开始数据完整性检查');
    
    try {
      // 1. 检查模块引用完整性
      if (options.checkReferences !== false) {
        const refResult = await this.checkReferences(modules);
        result.errors.push(...refResult.errors);
        result.warnings.push(...refResult.warnings);
        result.checkedItems += refResult.checkedItems;
        result.corruptedItems += refResult.corruptedItems;
      }
      
      // 2. 检查循环依赖
      if (options.checkCircularDeps !== false) {
        const circularResult = await this.checkCircularDependencies(modules);
        result.errors.push(...circularResult.errors);
        result.warnings.push(...circularResult.warnings);
        result.checkedItems += circularResult.checkedItems;
        result.corruptedItems += circularResult.corruptedItems;
      }
      
      // 3. 验证数据格式
      if (options.validateData !== false) {
        const dataResult = await this.validateModuleData(modules);
        result.errors.push(...dataResult.errors);
        result.warnings.push(...dataResult.warnings);
        result.checkedItems += dataResult.checkedItems;
        result.corruptedItems += dataResult.corruptedItems;
      }
      
      // 4. 生成校验和
      if (options.generateChecksum !== false) {
        result.checksum = await this.generateDataChecksum(modules);
      }
      
      // 5. 自动修复（如果启用）
      if (options.autoRepair && result.corruptedItems > 0) {
        const repairResult = await this.autoRepair(modules);
        result.repairedItems = repairResult.repairedIssues.length;
        if (repairResult.success) {
          result.warnings.push(`自动修复了 ${result.repairedItems} 个问题`);
        }
      }
      
      result.isValid = result.errors.length === 0;
      
      const duration = Date.now() - startTime;
      this.logger.info(
        `完整性检查完成: ${result.checkedItems} 项检查, ` +
        `${result.corruptedItems} 项损坏, ${result.repairedItems} 项修复, ` +
        `耗时 ${duration}ms`
      );
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`完整性检查失败: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.error('完整性检查过程中发生错误', 'IntegrityChecker', error instanceof Error ? error : new Error(String(error)));
    }
    
    return result;
  }

  /**
   * 检查模块引用完整性
   */
  async checkReferences(modules: Module[]): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedItems: 0,
      corruptedItems: 0,
      repairedItems: 0,
      timestamp: new Date()
    };
    
    const moduleMap = new Map(modules.map(m => [m.name, m]));
    
    for (const module of modules) {
      result.checkedItems++;
      
      // 检查父模块引用
      if (module.parent_module) {
        if (!moduleMap.has(module.parent_module)) {
          result.errors.push(`模块 "${module.name}" 引用了不存在的父模块 "${module.parent_module}"`);
          result.corruptedItems++;
        }
      }
      
      // 检查子模块引用
      if (module.children && module.children.length > 0) {
        for (const childName of module.children) {
          if (!moduleMap.has(childName)) {
            result.errors.push(`模块 "${module.name}" 引用了不存在的子模块 "${childName}"`);
            result.corruptedItems++;
          }
        }
      }
      
      // 检查依赖引用
      if (module.dependencies && module.dependencies.length > 0) {
        for (const depName of module.dependencies) {
          if (!moduleMap.has(depName)) {
            result.warnings.push(`模块 "${module.name}" 依赖了不存在的模块 "${depName}"`);
          }
        }
      }
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 检查循环依赖
   */
  async checkCircularDependencies(modules: Module[]): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedItems: 0,
      corruptedItems: 0,
      repairedItems: 0,
      timestamp: new Date()
    };
    
    const moduleMap = new Map(modules.map(m => [m.name, m]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const detectCycle = (moduleName: string, path: string[]): string[] | null => {
      if (recursionStack.has(moduleName)) {
        // 找到循环
        const cycleStart = path.indexOf(moduleName);
        return path.slice(cycleStart).concat([moduleName]);
      }
      
      if (visited.has(moduleName)) {
        return null;
      }
      
      visited.add(moduleName);
      recursionStack.add(moduleName);
      path.push(moduleName);
      
      const module = moduleMap.get(moduleName);
      if (module) {
        // 检查依赖
        if (module.dependencies) {
          for (const depName of module.dependencies) {
            const cycle = detectCycle(depName, [...path]);
            if (cycle) {
              return cycle;
            }
          }
        }
        
        // 检查父子关系
        if (module.parent_module) {
          const cycle = detectCycle(module.parent_module, [...path]);
          if (cycle) {
            return cycle;
          }
        }
      }
      
      recursionStack.delete(moduleName);
      path.pop();
      return null;
    };
    
    for (const module of modules) {
      result.checkedItems++;
      
      if (!visited.has(module.name)) {
        const cycle = detectCycle(module.name, []);
        if (cycle) {
          result.errors.push(`检测到循环依赖: ${cycle.join(' -> ')}`);
          result.corruptedItems++;
        }
      }
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 验证模块数据格式
   */
  async validateModuleData(modules: Module[]): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedItems: 0,
      corruptedItems: 0,
      repairedItems: 0,
      timestamp: new Date()
    };
    
    for (const module of modules) {
      result.checkedItems++;
      
      // 检查必需字段
      if (!module.name || typeof module.name !== 'string') {
        result.errors.push(`模块缺少有效的名称字段`);
        result.corruptedItems++;
        continue;
      }
      
      if (!module.type || typeof module.type !== 'string') {
        result.errors.push(`模块 "${module.name}" 缺少有效的类型字段`);
        result.corruptedItems++;
      }
      
      // 检查层次化名称格式
      if (module.hierarchical_name) {
        const parts = module.hierarchical_name.split('.');
        if (parts.length > this.CHECK_CONFIG.maxDepth) {
          result.warnings.push(`模块 "${module.name}" 的层次化名称深度过深 (${parts.length} > ${this.CHECK_CONFIG.maxDepth})`);
        }
        
        for (const part of parts) {
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
            result.errors.push(`模块 "${module.name}" 的层次化名称包含无效字符: "${part}"`);
            result.corruptedItems++;
          }
        }
      }
      
      // 检查文件路径格式
      if (module.file_path && !/^[a-zA-Z0-9._\-\/\\]+$/.test(module.file_path)) {
        result.errors.push(`模块 "${module.name}" 的文件路径包含无效字符`);
        result.corruptedItems++;
      }
      
      // 检查时间戳格式
      if (module.created_at) {
        if (!((module.created_at as any) instanceof Date) && typeof module.created_at === 'string' && isNaN(Date.parse(module.created_at))) {
          result.errors.push(`模块 "${module.name}" 的创建时间格式无效`);
          result.corruptedItems++;
        }
      }
      
      if (module.updated_at) {
        if (!((module.updated_at as any) instanceof Date) && typeof module.updated_at === 'string' && isNaN(Date.parse(module.updated_at))) {
          result.errors.push(`模块 "${module.name}" 的更新时间格式无效`);
          result.corruptedItems++;
        }
      }
    }
    
    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 生成数据校验和
   */
  async generateDataChecksum(modules: Module[]): Promise<string> {
    // 创建标准化的数据表示
    const normalizedData = modules
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(module => ({
        name: module.name,
        type: module.type,
        hierarchicalName: module.hierarchical_name,
        filePath: module.file_path,
        parentName: module.parent_module,
        children: module.children?.sort(),
        dependencies: module.dependencies?.sort()
      }));
    
    const dataString = JSON.stringify(normalizedData, null, 0);
    return createHash(this.CHECK_CONFIG.checksumAlgorithm)
      .update(dataString, 'utf8')
      .digest('hex');
  }

  /**
   * 验证备份文件
   */
  async validateBackup(backupPath: string): Promise<BackupValidationResult> {
    const result: BackupValidationResult = {
      isValid: false,
      backupPath,
      size: 0,
      checksum: '',
      createdAt: new Date(),
      issues: [],
      canRestore: false
    };
    
    try {
      // 检查文件是否存在
      await access(backupPath);
      
      // 获取文件信息
      const stats = await stat(backupPath);
      result.size = stats.size;
      result.createdAt = stats.mtime;
      
      // 检查文件大小
      if (stats.size === 0) {
        result.issues.push('备份文件为空');
        return result;
      }
      
      if (stats.size > 100 * 1024 * 1024) { // 100MB
        result.issues.push('备份文件过大，可能存在问题');
      }
      
      // 读取并验证内容
      const content = await readFile(backupPath, 'utf8');
      
      // 生成校验和
      result.checksum = createHash(this.CHECK_CONFIG.checksumAlgorithm)
        .update(content, 'utf8')
        .digest('hex');
      
      // 尝试解析JSON
      try {
        const data = JSON.parse(content);
        
        // 检查数据结构
        if (!Array.isArray(data)) {
          result.issues.push('备份数据不是有效的数组格式');
          return result;
        }
        
        // 验证每个模块
        for (let i = 0; i < data.length; i++) {
          const module = data[i];
          if (!module.name || !module.type) {
            result.issues.push(`第 ${i + 1} 个模块缺少必需字段`);
          }
        }
        
        result.isValid = result.issues.length === 0;
        result.canRestore = result.isValid;
        
      } catch (parseError) {
        result.issues.push('备份文件不是有效的JSON格式');
      }
      
    } catch (error) {
      result.issues.push(`无法访问备份文件: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return result;
  }

  /**
   * 自动修复数据问题
   */
  async autoRepair(modules: Module[]): Promise<RepairResult> {
    const result: RepairResult = {
      success: false,
      repairedIssues: [],
      failedRepairs: [],
      message: ''
    };
    
    try {
      // 创建备份
      const backupPath = `backup_${Date.now()}.json`;
      await writeFile(backupPath, JSON.stringify(modules, null, 2), 'utf8');
      result.backupCreated = backupPath;
      
      const issues = await this.detectConsistencyIssues(modules);
      const autoFixableIssues = issues.filter(issue => issue.autoFixable);
      
      for (const issue of autoFixableIssues) {
        try {
          await this.repairIssue(modules, issue);
          result.repairedIssues.push(issue);
        } catch (repairError) {
          result.failedRepairs.push(issue);
          this.logger.error(`修复问题失败: ${issue.description}`, 'IntegrityChecker', repairError instanceof Error ? repairError : new Error(String(repairError)));
        }
      }
      
      result.success = result.failedRepairs.length === 0;
      result.message = `修复了 ${result.repairedIssues.length} 个问题，${result.failedRepairs.length} 个修复失败`;
      
    } catch (error) {
      result.message = `自动修复失败: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    return result;
  }

  /**
   * 检测一致性问题
   */
  async detectConsistencyIssues(modules: Module[]): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    const moduleMap = new Map(modules.map(m => [m.name, m]));
    
    for (const module of modules) {
      // 检查缺失的引用
      if (module.parent_module && !moduleMap.has(module.parent_module)) {
        issues.push({
          type: 'missing_reference',
          severity: 'high',
          description: `模块 "${module.name}" 引用了不存在的父模块 "${module.parent_module}"`,
          affectedItems: [module.name],
          suggestedFix: '移除无效的父模块引用',
          autoFixable: true
        });
      }
      
      // 检查孤立数据
      if (module.children) {
        const missingChildren = module.children.filter(child => !moduleMap.has(child));
        if (missingChildren.length > 0) {
          issues.push({
            type: 'orphaned_data',
            severity: 'medium',
            description: `模块 "${module.name}" 包含不存在的子模块引用: ${missingChildren.join(', ')}`,
            affectedItems: [module.name, ...missingChildren],
            suggestedFix: '移除无效的子模块引用',
            autoFixable: true
          });
        }
      }
      
      // 检查无效数据
      if (!module.name || typeof module.name !== 'string') {
        issues.push({
          type: 'invalid_data',
          severity: 'critical',
          description: '模块缺少有效的名称字段',
          affectedItems: [module.name || 'unknown'],
          suggestedFix: '删除无效模块或修复名称字段',
          autoFixable: false
        });
      }
    }
    
    return issues;
  }

  /**
   * 修复单个问题
   */
  private async repairIssue(modules: Module[], issue: ConsistencyIssue): Promise<void> {
    switch (issue.type) {
      case 'missing_reference':
        // 移除无效的父模块引用
        for (const module of modules) {
          if (issue.affectedItems.includes(module.name) && module.parent_module) {
            const moduleMap = new Map(modules.map(m => [m.name, m]));
            if (!moduleMap.has(module.parent_module)) {
              delete module.parent_module;
              this.logger.info(`已移除模块 "${module.name}" 的无效父模块引用`);
            }
          }
        }
        break;
        
      case 'orphaned_data':
        // 移除无效的子模块引用
        for (const module of modules) {
          if (issue.affectedItems.includes(module.name) && module.children) {
            const moduleMap = new Map(modules.map(m => [m.name, m]));
            module.children = module.children.filter(child => moduleMap.has(child));
            this.logger.info(`已清理模块 "${module.name}" 的无效子模块引用`);
          }
        }
        break;
        
      default:
        throw new Error(`不支持的修复类型: ${issue.type}`);
    }
  }

  /**
   * 计算文件校验和
   */
  async calculateFileChecksum(filePath: string): Promise<string> {
    // 检查缓存
    const cached = this.checksumCache.get(filePath);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CHECK_CONFIG.cacheTimeout) {
      return cached.checksum;
    }
    
    try {
      const content = await readFile(filePath, 'utf8');
      const checksum = createHash(this.CHECK_CONFIG.checksumAlgorithm)
        .update(content, 'utf8')
        .digest('hex');
      
      // 更新缓存
      this.checksumCache.set(filePath, {
        checksum,
        timestamp: new Date()
      });
      
      return checksum;
    } catch (error) {
      throw new Error(`计算文件校验和失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.checksumCache.clear();
    this.logger.info('校验和缓存已清理');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    cacheSize: number;
    cacheHitRate: number;
  } {
    return {
      cacheSize: this.checksumCache.size,
      cacheHitRate: 0 // 需要实现命中率统计
    };
  }
}

// 导出单例实例
export const integrityChecker = IntegrityChecker.getInstance();