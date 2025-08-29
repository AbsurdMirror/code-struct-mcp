/**
 * YAML存储系统实现
 * 基于MOD002 数据存储模块的设计文档
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { AnyModule } from '../types/module.js';
import {
  YamlFileStructure,
  StorageResult,
  BackupInfo,
  StorageStats,
  IntegrityCheckResult,
  StorageEvent,
  FileOperation
} from '../types/storage.js';
import { StorageConfig } from '../types/config.js';

/**
 * YAML存储系统类
 * 负责模块数据的持久化存储和管理
 */
export class YamlStorage {
  private config: StorageConfig;
  private events: StorageEvent[] = [];
  private locks: Map<string, { type: 'read' | 'write'; timestamp: number }> = new Map();

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * 初始化存储系统
   * 根据TESTMOD001测试用例要求实现
   */
  async initialize_storage(): Promise<StorageResult<boolean>> {
    try {
      // 确保必要的目录存在
      await this.ensureDirectories();
      
      // 记录初始化事件
      this.recordEvent({
        type: 'file_created',
        file_path: this.config.data_path || this.config.root_path,
        details: {
          operation: 'create',
          success: true,
          metadata: {
            data_path: this.config.data_path || this.config.root_path,
            backup_path: this.config.backup_path || path.join(this.config.root_path, 'backups')
          }
        }
      });
      
      return {
        success: true,
        data: true,
        operation: 'create',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.recordEvent({
        type: 'file_created',
        file_path: this.config.data_path || this.config.root_path,
        details: {
          operation: 'create',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });
      
      return {
        success: false,
        error: {
          code: 'INITIALIZATION_ERROR',
          message: '存储系统初始化失败',
          details: error instanceof Error ? error.message : '未知错误'
        },
        operation: 'create',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 加载模块数据
   * 根据TESTMOD001测试用例要求实现
   */
  async load_modules(fileName: string = 'modules'): Promise<StorageResult<{ [key: string]: AnyModule }>> {
    const filePath = this.getFilePath(fileName);
    
    try {
      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        // 文件不存在，返回空字典
        this.recordEvent({
          type: 'file_updated',
          file_path: filePath,
          details: {
            operation: 'read',
            success: true,
            metadata: { modules_count: 0 }
          }
        });
        
        return {
          success: true,
          data: {},
          operation: 'read',
          timestamp: new Date().toISOString()
        };
      }
      
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');
      
      // 解析YAML内容
      let parsedData: any;
      try {
        parsedData = yaml.load(content);
      } catch (yamlError) {
        // YAML格式错误
        this.recordEvent({
          type: 'file_updated',
          file_path: filePath,
          details: {
            operation: 'read',
            success: false,
            error: 'YAML格式错误: ' + (yamlError instanceof Error ? yamlError.message : '未知错误')
          }
        });
        
        return {
          success: false,
          error: {
            code: 'YAML_PARSE_ERROR',
            message: 'YAML格式错误',
            details: yamlError instanceof Error ? yamlError.message : '未知错误'
          },
          operation: 'read',
          timestamp: new Date().toISOString()
        };
      }
      
      // 处理模块数据格式
      let modulesDict: { [key: string]: AnyModule } = {};
      if (parsedData && parsedData.modules) {
        if (Array.isArray(parsedData.modules)) {
          // 兼容旧的数组格式
          parsedData.modules.forEach((module: any) => {
            if (module && module.id) {
              modulesDict[module.id] = module;
            }
          });
        } else if (typeof parsedData.modules === 'object') {
          // 新的字典格式，直接使用
          modulesDict = parsedData.modules;
        }
      }
      
      // 记录加载事件
      this.recordEvent({
        type: 'file_updated',
        file_path: filePath,
        details: {
          operation: 'read',
          success: true,
          metadata: { modules_count: Object.keys(modulesDict).length }
        }
      });
      
      return {
        success: true,
        data: modulesDict,
        operation: 'read',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.recordEvent({
        type: 'file_updated',
        file_path: filePath,
        details: {
          operation: 'read',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });
      
      return {
        success: false,
        error: {
          code: 'LOAD_ERROR',
          message: '模块加载失败',
          details: error instanceof Error ? error.message : '未知错误'
        },
        operation: 'read',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 确保必要的目录存在
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.config.root_path, { recursive: true });
      const backupPath = path.join(this.config.root_path, 'backups');
      await fs.mkdir(backupPath, { recursive: true });
    } catch (error) {
      console.error('创建目录失败:', error);
    }
  }

  /**
   * 生成文件路径
   */
  private getFilePath(fileName: string): string {
    return path.join(this.config.root_path, `${fileName}.yaml`);
  }

  /**
   * 生成备份文件路径
   */
  private getBackupPath(fileName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.config.root_path, 'backups');
    return path.join(backupPath, `${fileName}_${timestamp}.yaml`);
  }

  /**
   * 记录存储事件
   */
  private recordEvent(event: Omit<StorageEvent, 'id' | 'timestamp'>): void {
    const storageEvent: StorageEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };
    this.events.push(storageEvent);
    
    // 保持事件历史在合理范围内
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  /**
   * 获取文件锁
   */
  private async acquireLock(filePath: string, type: 'read' | 'write'): Promise<boolean> {
    const existingLock = this.locks.get(filePath);
    
    if (existingLock) {
      // 检查锁是否过期（5分钟超时）
      if (Date.now() - existingLock.timestamp > 5 * 60 * 1000) {
        this.locks.delete(filePath);
      } else if (existingLock.type === 'write' || type === 'write') {
        return false; // 写锁互斥
      }
    }
    
    this.locks.set(filePath, { type, timestamp: Date.now() });
    return true;
  }

  /**
   * 释放文件锁
   */
  private releaseLock(filePath: string): void {
    this.locks.delete(filePath);
  }

  /**
   * 读取YAML文件
   */
  async readFile(fileName: string): Promise<StorageResult<YamlFileStructure>> {
    const filePath = this.getFilePath(fileName);
    
    try {
      // 获取读锁
      const lockAcquired = await this.acquireLock(filePath, 'read');
      if (!lockAcquired) {
        return {
          success: false,
          error: {
            code: 'LOCK_ERROR',
            message: '无法获取文件读锁'
          },
          operation: 'read',
          timestamp: new Date().toISOString()
        };
      }

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        // 文件不存在，返回空结构
        this.releaseLock(filePath);
        return {
          success: true,
          data: {
            metadata: {
              version: '1.0.0',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              total_modules: 0
            },
            modules: []
          },
          operation: 'read',
          timestamp: new Date().toISOString()
        };
      }

      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content) as YamlFileStructure;

      // 验证数据结构
      if (this.config.validation.enabled) {
        const validationResult = this.validateFileStructure(data);
        if (!validationResult.isValid) {
          this.releaseLock(filePath);
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '文件结构验证失败',
              details: validationResult.errors
            },
            operation: 'read',
            timestamp: new Date().toISOString()
          };
        }
      }

      this.releaseLock(filePath);
      this.recordEvent({
        type: 'file_updated',
        file_path: filePath,
        details: {
          operation: 'read',
          success: true
        }
      });

      return {
        success: true,
        data,
        operation: 'read',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.releaseLock(filePath);
      this.recordEvent({
        type: 'file_updated',
        file_path: filePath,
        details: {
          operation: 'read',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });

      return {
        success: false,
        error: {
          code: 'READ_ERROR',
          message: error instanceof Error ? error.message : '读取文件失败'
        },
        operation: 'read',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 写入YAML文件
   */
  async writeFile(fileName: string, data: YamlFileStructure): Promise<StorageResult<void>> {
    const filePath = this.getFilePath(fileName);
    
    try {
      // 获取写锁
      const lockAcquired = await this.acquireLock(filePath, 'write');
      if (!lockAcquired) {
        return {
          success: false,
          error: {
            code: 'LOCK_ERROR',
            message: '无法获取文件写锁'
          },
          operation: 'update',
          timestamp: new Date().toISOString()
        };
      }

      // 验证数据结构
      if (this.config.validation.enabled) {
        const validationResult = this.validateFileStructure(data);
        if (!validationResult.isValid) {
          this.releaseLock(filePath);
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: '数据结构验证失败',
              details: validationResult.errors
            },
            operation: 'update',
            timestamp: new Date().toISOString()
          };
        }
      }

      // 创建备份（如果文件存在）
      try {
        await fs.access(filePath);
        if (this.config.auto_backup) {
          await this.createBackup(fileName);
        }
      } catch {
        // 文件不存在，无需备份
      }

      // 更新元数据
      data.metadata.updated_at = new Date().toISOString();
      data.metadata.total_modules = Array.isArray(data.modules) ? data.modules.length : Object.keys(data.modules).length;
      data.metadata.version = data.metadata.version || '1.0.0';

      // 转换为YAML格式
      const yamlContent = yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });

      // 写入文件
      await fs.writeFile(filePath, yamlContent, 'utf-8');

      this.releaseLock(filePath);
      this.recordEvent({
        type: 'file_updated',
        file_path: filePath,
        details: {
          operation: 'write',
          success: true,
          metadata: {
            modules_count: Array.isArray(data.modules) ? data.modules.length : Object.keys(data.modules).length
          }
        }
      });

      return {
        success: true,
        operation: 'update',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.releaseLock(filePath);
      this.recordEvent({
        type: 'file_updated',
        file_path: filePath,
        details: {
          operation: 'write',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });

      return {
        success: false,
        error: {
          code: 'WRITE_ERROR',
          message: error instanceof Error ? error.message : '写入文件失败'
        },
        operation: 'update',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 创建备份
   */
  async createBackup(fileName: string): Promise<StorageResult<BackupInfo>> {
    const sourceFile = this.getFilePath(fileName);
    const backupFile = this.getBackupPath(fileName);
    
    try {
      // 检查源文件是否存在
      const stats = await fs.stat(sourceFile);
      
      // 复制文件到备份目录
      await fs.copyFile(sourceFile, backupFile);
      
      // 读取文件内容以获取模块数量
      const content = await fs.readFile(sourceFile, 'utf-8');
      const data = yaml.load(content) as YamlFileStructure;
      
      const backupInfo: BackupInfo = {
        id: uuidv4(),
        filename: path.basename(backupFile),
        path: backupFile,
        size: stats.size,
        created_at: new Date().toISOString(),
        modules_count: data.modules ? (Array.isArray(data.modules) ? data.modules.length : Object.keys(data.modules).length) : 0,
        checksum: await this.calculateChecksum(sourceFile),
        description: `自动备份 - ${fileName}`
      };

      this.recordEvent({
        type: 'backup_created',
        file_path: sourceFile,
        details: {
          operation: 'backup',
          success: true,
          metadata: {
            backup_path: backupFile,
            backup_id: backupInfo.id
          }
        }
      });

      // 清理旧备份
      await this.cleanupOldBackups(fileName);

      return {
        success: true,
        data: backupInfo,
        operation: 'backup',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.recordEvent({
        type: 'backup_created',
        file_path: sourceFile,
        details: {
          operation: 'backup',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });

      return {
        success: false,
        error: {
          code: 'BACKUP_ERROR',
          message: error instanceof Error ? error.message : '创建备份失败'
        },
        operation: 'backup',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 清理旧备份文件
   */
  private async cleanupOldBackups(fileName: string): Promise<void> {
    try {
      const files = await fs.readdir(this.config.backup_path);
      const backupFiles = files
        .filter(file => file.startsWith(fileName) && file.endsWith('.yaml'))
        .map(file => ({
          name: file,
          path: path.join(this.config.backup_path, file)
        }));

      if (backupFiles.length > this.config.max_backups) {
        // 按修改时间排序，删除最旧的文件
        const filesWithStats = await Promise.all(
          backupFiles.map(async file => ({
            ...file,
            stats: await fs.stat(file.path)
          }))
        );

        filesWithStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());
        
        const filesToDelete = filesWithStats.slice(0, filesWithStats.length - this.config.max_backups);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('清理备份文件失败:', error);
    }
  }

  /**
   * 计算文件校验和
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const crypto = await import('crypto');
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 验证文件结构
   */
  private validateFileStructure(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('数据必须是对象');
      return { isValid: false, errors };
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      errors.push('缺少metadata字段');
    } else {
      if (!data.metadata.version) errors.push('metadata.version字段必填');
      if (!data.metadata.created_at) errors.push('metadata.created_at字段必填');
      if (!data.metadata.updated_at) errors.push('metadata.updated_at字段必填');
    }

    if (!data.modules || (typeof data.modules !== 'object')) {
      errors.push('modules字段必须是数组或对象');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<StorageStats> {
    try {
      const files = await fs.readdir(this.config.root_path);
      const yamlFiles = files.filter(file => file.endsWith('.yaml'));
      
      let totalModules = 0;
      let totalSize = 0;
      let lastModified = new Date(0).toISOString();
      const fileDistribution: StorageStats['file_distribution'] = {};

      for (const file of yamlFiles) {
        const filePath = path.join(this.config.root_path, file);
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content) as YamlFileStructure;
        
        const modulesCount = data.modules ? (Array.isArray(data.modules) ? data.modules.length : Object.keys(data.modules).length) : 0;
        totalModules += modulesCount;
        totalSize += stats.size;
        
        if (stats.mtime.toISOString() > lastModified) {
          lastModified = stats.mtime.toISOString();
        }
        
        fileDistribution[file] = {
          modules_count: modulesCount,
          size: stats.size,
          last_modified: stats.mtime.toISOString()
        };
      }

      // 获取备份数量
      const backupPath = path.join(this.config.root_path, 'backups');
      const backupFiles = await fs.readdir(backupPath);
      const backupCount = backupFiles.filter(file => file.endsWith('.yaml')).length;
      
      // 获取最新备份时间
      let lastBackup = new Date(0).toISOString();
      for (const file of backupFiles) {
        const filePath = path.join(backupPath, file);
        const stats = await fs.stat(filePath);
        if (stats.mtime.toISOString() > lastBackup) {
          lastBackup = stats.mtime.toISOString();
        }
      }

      return {
        total_files: yamlFiles.length,
        total_modules: totalModules,
        total_size: totalSize,
        last_modified: lastModified,
        backup_count: backupCount,
        last_backup: lastBackup,
        file_distribution: fileDistribution
      };

    } catch (error) {
      throw new Error(`获取存储统计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 数据完整性检查
   */
  async checkIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      is_valid: true,
      errors: [],
      warnings: [],
      summary: {
        total_files: 0,
        valid_files: 0,
        corrupted_files: 0,
        missing_files: 0
      },
      checked_at: new Date().toISOString()
    };

    try {
      const files = await fs.readdir(this.config.root_path);
      const yamlFiles = files.filter(file => file.endsWith('.yaml'));
      result.summary.total_files = yamlFiles.length;

      for (const file of yamlFiles) {
        const filePath = path.join(this.config.root_path, file);
        
        try {
          // 检查文件是否可读
          const content = await fs.readFile(filePath, 'utf-8');
          
          // 检查YAML格式
          const data = yaml.load(content) as YamlFileStructure;
          
          // 验证数据结构
          const validation = this.validateFileStructure(data);
          if (!validation.isValid) {
            result.errors.push({
              file_path: filePath,
              error_type: 'schema_violation',
              message: `数据结构验证失败: ${validation.errors.join(', ')}`,
              severity: 'high'
            });
            result.summary.corrupted_files++;
          } else {
            result.summary.valid_files++;
          }
          
        } catch (error) {
          result.errors.push({
            file_path: filePath,
            error_type: 'corrupted_data',
            message: `文件损坏: ${error instanceof Error ? error.message : '未知错误'}`,
            severity: 'critical'
          });
          result.summary.corrupted_files++;
        }
      }

      result.is_valid = result.errors.length === 0;
      return result;

    } catch (error) {
      result.is_valid = false;
      result.errors.push({
        file_path: this.config.root_path,
        error_type: 'missing_file',
        message: `无法访问数据目录: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'critical'
      });
      return result;
    }
  }

  /**
   * 保存模块数据
   * 根据TESTMOD001测试用例要求实现
   */
  async save_modules(modules: { [key: string]: AnyModule }, fileName: string = 'modules'): Promise<StorageResult<boolean>> {
    try {
      // 首先验证数据
      const validationResult = this.validate_data({ modules });
      if (!validationResult.is_valid) {
        this.recordEvent({
          type: 'file_updated',
          file_path: this.getFilePath(fileName),
          details: {
            operation: 'update',
            success: false,
            error: `数据验证失败: ${validationResult.errors.join(', ')}`
          }
        });
        
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validationResult.errors
          },
          operation: 'update',
          timestamp: new Date().toISOString()
        };
      }

      // 构建YAML文件结构，直接保存字典格式以保持键名映射
      const fileData: YamlFileStructure = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          total_modules: Object.keys(modules).length
        },
        modules: modules // 直接保存字典格式
      };

      // 调用writeFile保存数据
      const writeResult = await this.writeFile(fileName, fileData);
      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error || {
            code: 'WRITE_ERROR',
            message: '写入文件失败'
          },
          operation: 'update',
          timestamp: new Date().toISOString()
        };
      }

      this.recordEvent({
        type: 'file_updated',
        file_path: this.getFilePath(fileName),
        details: {
          operation: 'update',
          success: true,
          metadata: {
            modules_count: Object.keys(modules).length
          }
        }
      });

      return {
        success: true,
        data: true,
        operation: 'update',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.recordEvent({
        type: 'file_updated',
        file_path: this.getFilePath(fileName),
        details: {
          operation: 'update',
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      });

      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: error instanceof Error ? error.message : '保存模块失败'
        },
        operation: 'update',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 验证数据
   * 根据TESTMOD001测试用例要求实现
   */
  validate_data(data: any): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查数据是否为字典类型
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      errors.push('数据必须是字典类型');
      return { is_valid: false, errors };
    }

    // 检查是否包含modules字段
    if (!('modules' in data)) {
      errors.push('缺少必需的modules字段');
      return { is_valid: false, errors };
    }

    // 检查modules是否为字典类型
    if (!data.modules || typeof data.modules !== 'object' || Array.isArray(data.modules)) {
      errors.push('modules必须是字典类型');
      return { is_valid: false, errors };
    }

    // 验证每个模块的结构
    const modules = data.modules as { [key: string]: any };
    for (const [moduleId, module] of Object.entries(modules)) {
      if (!module || typeof module !== 'object') {
        errors.push(`模块 ${moduleId} 必须是对象类型`);
        continue;
      }

      // 检查必需字段
      if (!module.name || typeof module.name !== 'string') {
        errors.push(`模块 ${moduleId} 缺少name字段或name字段不是字符串类型`);
      }

      if (!module.type || typeof module.type !== 'string') {
        errors.push(`模块 ${moduleId} 缺少type字段或type字段不是字符串类型`);
      } else {
        // 检查type值是否有效
        const validTypes = ['class', 'function', 'variable', 'interface', 'enum', 'namespace', 'functionGroup'];
        if (!validTypes.includes(module.type)) {
          errors.push(`模块 ${moduleId} 的type值无效，必须是以下之一: ${validTypes.join(', ')}`);
        }
      }

      if (!module.id || typeof module.id !== 'string') {
        errors.push(`模块 ${moduleId} 缺少id字段或id字段不是字符串类型`);
      }

      if (!module.file_path || typeof module.file_path !== 'string') {
        errors.push(`模块 ${moduleId} 缺少file_path字段或file_path字段不是字符串类型`);
      }
    }

    return {
      is_valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取存储事件历史
   */
  getEvents(limit: number = 100): StorageEvent[] {
    return this.events.slice(-limit);
  }
}