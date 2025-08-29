/**
 * MCP服务器实现
 * 基于MOD004 AI模型MCP接口的设计文档
 */

import { z } from 'zod';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ModuleManager } from '../modules/module-manager.js';
import { YamlStorage } from '../storage/yaml-storage.js';
import { 
  Logger, 
  ErrorHandler, 
  InputValidator, 
  AccessControlManager, 
  IntegrityChecker
} from '../utils/index.js';
import { Permission, Role } from '../utils/access-control.js';
import type { Module } from '../types/index.js';
import { Parameter } from '../types/module.js';
import {
  MCPRequest,
  MCPResponse,
  MCP_TOOLS,
  MCPErrorCode,
  MCP_ERROR_MESSAGES,
  AddModuleSchema,
  GetModuleByNameSchema,
  SmartSearchSchema,
  GetTypeStructureSchema,
  AddModuleParams,
  GetModuleByNameParams,
  SmartSearchParams,
  GetTypeStructureParams
} from '../types/mcp.js';
import { StorageConfig } from '../types/config.js';

/**
 * MCP服务器类
 * 实现Model Context Protocol，为AI模型提供代码文档管理功能
 */
export class MCPServer {
  private server: Server;
  private moduleManager: ModuleManager;
  private storage: YamlStorage;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private inputValidator: InputValidator;
  private accessControl: AccessControlManager;
  private integrityChecker: IntegrityChecker;
  private isRunning: boolean = false;
  private transport?: StdioServerTransport;

  constructor(config: StorageConfig) {
    this.logger = new Logger();
    this.errorHandler = ErrorHandler.getInstance();
    this.inputValidator = InputValidator.getInstance();
    this.accessControl = AccessControlManager.getInstance();
    this.integrityChecker = IntegrityChecker.getInstance();
    // 初始化存储和模块管理器
    this.storage = new YamlStorage(config);
    this.moduleManager = new ModuleManager(this.storage);
    
    // 创建MCP服务器实例
    this.server = new Server(
      {
        name: 'code-structure-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * 设置MCP处理器
   */
  private setupHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_module_by_name',
            description: '根据层次化名称获取模块信息',
            inputSchema: {
              type: 'object',
              properties: {
                hierarchical_name: {
                  type: 'string',
                  description: '模块的层次化名称，如 "parent.child"'
                }
              },
              required: ['hierarchical_name']
            }
          },
          {
            name: 'get_type_structure',
            description: '获取指定类型的结构信息',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  description: '类型名称'
                }
              },
              required: ['type_name']
            }
          },
          {
            name: 'add_module',
            description: '添加新的代码模块，支持class、function、variable等类型，自动生成层次化名称',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: '模块名称',
                  minLength: 1,
                  maxLength: 100
                },
                type: {
                  type: 'string',
                  enum: ['class', 'function', 'variable', 'file', 'functionGroup'],
                  description: '模块类型'
                },
                parent_module: {
                  type: 'string',
                  description: '父模块层次化名称（可选）'
                },
                file_path: {
                  type: 'string',
                  description: '文件路径',
                  minLength: 1
                },
                access_modifier: {
                  type: 'string',
                  enum: ['public', 'private', 'protected'],
                  description: '访问修饰符'
                },
                description: {
                  type: 'string',
                  description: '模块描述（可选）'
                },
                // 类型特定字段
                inheritance: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '继承关系（仅用于class类型）'
                },
                interfaces: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '实现的接口（仅用于class类型）'
                },
                parameters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      data_type: { type: 'string' },
                      default_value: { type: 'string' },
                      is_required: { type: 'boolean' },
                      description: { type: 'string' }
                    },
                    required: ['name', 'data_type', 'is_required']
                  },
                  description: '参数列表（仅用于function类型）'
                },
                return_type: {
                  type: 'string',
                  description: '返回值类型（仅用于function类型）'
                },
                is_async: {
                  type: 'boolean',
                  description: '是否异步函数（仅用于function类型）'
                },
                data_type: {
                  type: 'string',
                  description: '数据类型（仅用于variable类型）'
                },
                initial_value: {
                  type: 'string',
                  description: '初始值（仅用于variable类型）'
                },
                is_constant: {
                  type: 'boolean',
                  description: '是否常量（仅用于variable类型）'
                },
                functions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '函数列表（仅用于functionGroup类型）'
                }
              },
              required: ['name', 'type', 'file_path', 'access_modifier']
            }
          },
          {
            name: 'smart_search',
            description: '智能搜索模块',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: '搜索查询'
                }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'add_module':
            return await this.handleAddModule(args);
          case 'get_module_by_name':
            return await this.handleGetModuleByName(args);
          case 'smart_search':
            return await this.handleSmartSearch(args);
          case 'get_type_structure':
            return await this.handleGetTypeStructure(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知的工具: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        console.error(`工具调用错误 [${name}]:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `工具执行失败: ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    });
  }

  /**
   * 处理添加模块工具调用
   */
  private async handleAddModule(args: unknown) {
      // 输入验证
      const validationResult = this.inputValidator.validateModuleName((args as any).name);
      if (!validationResult.isValid) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `模块名称验证失败: ${validationResult.errors.join(', ')}`
        );
      }

      // 权限检查
      const hasPermission = this.accessControl.checkPermission(
        { 
          user: { 
            id: 'system', 
            name: 'System', 
            roles: [Role.ADMIN], 
            permissions: [], 
            isActive: true, 
            createdAt: new Date() 
          },
          timestamp: new Date()
        },
        Permission.MODULE_CREATE
      );
      if (!hasPermission.granted) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `权限不足: ${hasPermission.reason}`
        );
      }

      // 验证参数
      const validatedArgs = AddModuleSchema.parse(args) as AddModuleParams;
      
      // 数据完整性检查
        if (validatedArgs.parent_module) {
          const modulesResult = await this.storage.load_modules();
          if (modulesResult.success && modulesResult.data) {
            const modulesArray = Object.values(modulesResult.data);
            const integrityResult = await this.integrityChecker.checkIntegrity(modulesArray);
            if (!integrityResult.isValid) {
              this.logger.warn(`数据完整性问题: ${JSON.stringify(integrityResult.errors)}`);
            }
          }
        }
      
      // 调用模块管理器创建模块
      const moduleData: any = {
        name: validatedArgs.name,
        type: validatedArgs.type,
        file_path: validatedArgs.file_path,
        access_modifier: validatedArgs.access_modifier,
        // 函数特定字段
        parameters: validatedArgs.parameters?.map(p => ({
          name: p.name,
          data_type: p.data_type,
          default_value: p.default_value,
          is_required: p.is_required,
          description: p.description
        })),
        return_type: validatedArgs.return_type,
        is_async: validatedArgs.is_async,
        // 变量特定字段
        data_type: validatedArgs.data_type,
        initial_value: validatedArgs.initial_value,
        is_constant: validatedArgs.is_constant,
        // 类特定字段
        inheritance: validatedArgs.inheritance,
        interfaces: validatedArgs.interfaces,
        // 函数组特定字段
        functions: validatedArgs.functions
      };
      
      // 只在存在时添加可选字段
      if (validatedArgs.parent_module) {
        moduleData.parent_module = validatedArgs.parent_module;
      }
      if (validatedArgs.description) {
        moduleData.description = validatedArgs.description;
      }
      
      const result = await this.moduleManager.createModule(moduleData);

      if (!result.success) {
        throw new McpError(
          ErrorCode.InvalidParams,
          result.error || '创建模块失败'
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: result.data
          }, null, 2)
        }]
      };
  }

  /**
   * 处理根据名称获取模块工具调用
   */
  private async handleGetModuleByName(args: unknown) {
      // 验证参数
      const validatedArgs = GetModuleByNameSchema.parse(args) as GetModuleByNameParams;
      
      // 输入验证
      const validationResult = this.inputValidator.validateModuleName(validatedArgs.hierarchical_name);
      if (!validationResult.isValid) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `模块名称验证失败: ${validationResult.errors.join(', ')}`
        );
      }

      // 权限检查
      const hasPermission = this.accessControl.checkPermission(
        {
          user: {
            id: 'system',
            name: 'System',
            roles: [Role.ADMIN],
            permissions: [],
            isActive: true,
            createdAt: new Date()
          },
          timestamp: new Date()
        },
        Permission.MODULE_READ
      );
      if (!hasPermission.granted) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `权限不足: ${hasPermission.reason}`
        );
      }
      
      // 调用模块管理器获取模块
      const module = await this.moduleManager.getModuleByName(validatedArgs.hierarchical_name);
      
      if (!module) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `模块 ${validatedArgs.hierarchical_name} 未找到`
        );
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              module: module
            }
          }, null, 2)
        }]
      };
  }

  /**
   * 处理智能搜索工具调用
   */
  private async handleSmartSearch(args: unknown) {
      // 输入验证和清理
      const sanitizedQuery = this.inputValidator.sanitize((args as any).query || '', {
        removeHtmlTags: true,
        trimWhitespace: true,
        escapeHtml: true
      });

      // 安全检查
      const securityResult = this.inputValidator.performSecurityCheck(sanitizedQuery);
      if (!securityResult.isSafe) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `查询包含不安全内容: ${securityResult.threats.join(', ')}`
        );
      }

      // 权限检查
        const hasPermission = this.accessControl.checkPermission(
          {
            user: {
              id: 'system',
              name: 'System',
              roles: [Role.ADMIN],
              permissions: [],
              isActive: true,
              createdAt: new Date()
            },
            timestamp: new Date(),
            action: 'smartSearch',
            resource: 'module',
            metadata: { query: sanitizedQuery }
          },
          Permission.MODULE_SEARCH
        );
      if (!hasPermission.granted) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `权限不足: ${hasPermission.reason}`
        );
      }

      // 验证参数
      const validatedArgs = SmartSearchSchema.parse({
        ...(args as object),
        query: sanitizedQuery
      }) as SmartSearchParams;
      
      // 调用模块管理器进行搜索
      const searchCriteria: any = {};
      if (validatedArgs.name !== undefined) searchCriteria.name = validatedArgs.name;
      if (validatedArgs.type !== undefined) searchCriteria.type = validatedArgs.type;
      if (validatedArgs.parent_module !== undefined) searchCriteria.parent_module = validatedArgs.parent_module;
      if (validatedArgs.file_path !== undefined) searchCriteria.file_path = validatedArgs.file_path;
      if (validatedArgs.access_modifier !== undefined) searchCriteria.access_modifier = validatedArgs.access_modifier;
      if (validatedArgs.description !== undefined) searchCriteria.description = validatedArgs.description;
      if (validatedArgs.limit !== undefined) searchCriteria.limit = validatedArgs.limit;
      if (validatedArgs.offset !== undefined) searchCriteria.offset = validatedArgs.offset;
      
      const result = await this.moduleManager.smartSearch(searchCriteria);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              modules: result.modules,
              total: result.total,
              query: result.query
            }
          }, null, 2)
        }]
      };
  }

  /**
   * 处理获取类型结构工具调用
   */
  private async handleGetTypeStructure(args: unknown) {
      // 输入验证
      const validationResult = this.inputValidator.validateModuleName((args as any).type_name);
      if (!validationResult.isValid) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `类型名称验证失败: ${validationResult.errors.join(', ')}`
        );
      }

      // 权限检查
      const hasPermission = await this.accessControl.checkPermission(
        { 
          user: { 
            id: 'system', 
            name: 'System', 
            roles: [Role.USER], 
            permissions: [], 
            isActive: true, 
            createdAt: new Date() 
          },
          timestamp: new Date()
        },
        Permission.MODULE_READ
      );
      if (!hasPermission.granted) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `权限不足: ${hasPermission.reason}`
        );
      }

      // 验证参数
      const validatedArgs = GetTypeStructureSchema.parse(args) as GetTypeStructureParams;
      
      // 调用模块管理器获取类型结构
      const result = await this.moduleManager.getTypeStructure(validatedArgs.type_name);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              type_name: result.type_name,
              hierarchy: result.hierarchy,
              related_modules: result.related_modules,
              relationships: result.relationships
            }
          }, null, 2)
        }]
      };
  }

  /**
   * 启动MCP服务器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      // 使用stderr输出警告信息，避免干扰MCP协议通信
      process.stderr.write('警告: MCP服务器已在运行中\n');
      return;
    }

    try {
      // 创建标准输入输出传输
      const transport = new StdioServerTransport();
      
      // 连接服务器和传输
      await this.server.connect(transport);
      
      this.isRunning = true;
      // 使用stderr输出启动信息，避免干扰MCP协议通信
      process.stderr.write('MCP服务器已启动，等待连接...\n');
      
      // 监听进程退出信号
      process.on('SIGINT', () => this.stop());
      process.on('SIGTERM', () => this.stop());
      
    } catch (error) {
      // 使用stderr输出错误信息，避免干扰MCP协议通信
      process.stderr.write(`启动MCP服务器失败: ${error}\n`);
      throw error;
    }
  }

  /**
   * 停止MCP服务器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.server.close();
      this.isRunning = false;
      console.log('MCP服务器已停止');
    } catch (error) {
      console.error('停止MCP服务器失败:', error);
    }
  }

  /**
   * 获取服务器状态
   */
  getStatus(): {
    isRunning: boolean;
    tools: string[];
    cacheStats: { size: number; hitRate: number };
  } {
    return {
      isRunning: this.isRunning,
      tools: MCP_TOOLS.map(tool => tool.name),
      cacheStats: this.moduleManager.getCacheStats()
    };
  }

  /**
   * 获取服务器统计信息
   */
  async getStats() {
    return {
      isRunning: this.isRunning,
      moduleCount: await this.moduleManager.getModuleCount(),
      storageStats: await this.storage.getStats(),
      cacheStats: this.moduleManager.getCacheStats(),
      errorStats: this.errorHandler.getErrorStats(),
      accessStats: this.accessControl.getStats()
    };
  }

  /**
   * 执行系统完整性检查
   */
  async performIntegrityCheck() {
    try {
      const modulesResult = await this.storage.load_modules();
      if (!modulesResult.success) {
        throw new Error(`加载模块失败: ${modulesResult.error}`);
      }
      
      const modules = Object.values(modulesResult.data || {});
      const integrityResult = await this.integrityChecker.checkIntegrity(modules);
      
      if (!integrityResult.isValid) {
        this.logger.warn('发现数据完整性问题', 'IntegrityChecker', { 
          errors: integrityResult.errors,
          checksum: integrityResult.checksum 
        });
        
        // 尝试自动修复
        const repairResult = await this.integrityChecker.autoRepair(modules);
        if (repairResult.success) {
          this.logger.info('自动修复完成', 'IntegrityChecker', { 
            repairedIssues: repairResult.repairedIssues 
          });
        }
      }
      
      return {
        success: true,
        data: integrityResult
      };
    } catch (error) {
      this.logger.error('完整性检查失败', 'MCPServer', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取系统健康状态
   */
  async getHealthStatus() {
    try {
      const stats = await this.getStats();
      const integrityCheckResult = await this.performIntegrityCheck();
      const errorRate = this.errorHandler.getErrorRate();
      
      // integrityCheckResult是OperationResult类型，需要检查其data属性
      const integrityData = integrityCheckResult.success ? integrityCheckResult.data : null;
      
      return {
        status: integrityData?.isValid && errorRate < 0.1 ? 'healthy' : 'warning',
        timestamp: new Date().toISOString(),
        checks: {
          dataIntegrity: integrityData?.isValid || false,
          errorRate: errorRate,
          storage: stats.storageStats,
          modules: stats.moduleCount
        },
        issues: integrityData?.errors || []
      };
    } catch (error) {
      this.logger.error('获取健康状态失败', 'MCPServer', error instanceof Error ? error : new Error(String(error)));
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        checks: {
          dataIntegrity: false,
          errorRate: 1.0,
          storage: null,
          modules: 0
        },
        issues: ['健康检查失败']
      };
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.moduleManager.clearAllCache();
    // 使用stderr输出缓存清除信息，避免干扰MCP协议通信
    process.stderr.write('MCP服务器缓存已清除\n');
  }

  /**
   * 获取存储统计信息
   */
  async getStorageStats() {
    return await this.storage.getStats();
  }

  /**
   * 执行数据完整性检查
   */
  async checkIntegrity() {
    return await this.storage.checkIntegrity();
  }

  /**
   * 创建备份
   */
  async createBackup(fileName: string) {
    return await this.storage.createBackup(fileName);
  }

  /**
   * 获取存储事件历史
   */
  getStorageEvents(limit?: number) {
    return this.storage.getEvents(limit);
  }
}

/**
 * 创建并启动MCP服务器的便捷函数
 */
export async function createAndStartMCPServer(config: StorageConfig): Promise<MCPServer> {
  const server = new MCPServer(config);
  await server.start();
  return server;
}

/**
 * 默认配置的MCP服务器启动函数
 */
export async function startDefaultMCPServer(): Promise<MCPServer> {
  const defaultConfig: StorageConfig = {
    root_path: './data',
    data_path: './data',
    backup_path: './data/backups',
    backup_enabled: true,
    backup_interval: 60, // 60分钟
    max_backups: 10,
    auto_backup: true,
    compression: false,
    encryption: {
      enabled: false
    },
    validation: {
      enabled: true,
      schema_validation: true,
      data_integrity_check: true
    }
  };

  return await createAndStartMCPServer(defaultConfig);
}