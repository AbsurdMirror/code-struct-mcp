/**
 * Express API服务器实现
 * 基于MOD005 人类交互接口的设计文档
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ModuleManager } from './modules/module-manager.js';
import { YamlStorage } from './storage/yaml-storage.js';
import { MCPServer } from './mcp/mcp-server.js';
import modulesRouter from './routes/modules.js';
import {
  ApiResponse,
  HttpStatus,
  ApiErrorCode,
  API_ERROR_MESSAGES,
  CreateModuleRequest,
  UpdateModuleRequest,
  SearchParams,
  ModuleResponse,
  ModuleListResponse,
  SearchResponse,
  TypeStructureResponse,
  StatsResponse,
  HealthResponse,
  ConfigResponse
} from './types/api.js';
import { StorageConfig, AppConfig, DEFAULT_CONFIG } from './types/config.js';
import { AnyModule, SearchCriteria } from './types/module.js';

/**
 * API服务器类
 * 提供RESTful API接口供前端和外部系统调用
 */
export class ApiServer {
  private app: express.Application;
  private moduleManager: ModuleManager;
  private storage: YamlStorage;
  private mcpServer: MCPServer;
  private config: AppConfig;
  private server?: any;

  constructor(config: AppConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.app = express();
    
    // 初始化存储和管理器
    this.storage = new YamlStorage(config.storage);
    this.moduleManager = new ModuleManager(this.storage);
    this.mcpServer = new MCPServer(config.storage);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // CORS配置
    if (this.config.http_server.cors.enabled) {
      this.app.use(cors({
        origin: this.config.http_server.cors.origins,
        methods: this.config.http_server.cors.methods,
        allowedHeaders: this.config.http_server.cors.headers,
        credentials: true
      }));
    }

    // 请求解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
      });
      
      next();
    });

    // 请求ID生成
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      (req as any).requestId = Math.random().toString(36).substring(2, 15);
      next();
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    const router = express.Router();

    // 健康检查
    router.get('/health', this.handleHealth.bind(this));
    
    // 配置信息
    router.get('/config', this.handleGetConfig.bind(this));
    
    // 统计信息
    router.get('/stats', this.handleGetStats.bind(this));

    // 模块管理路由
    router.use('/modules', modulesRouter);
    
    // 类型结构路由
    router.get('/types/:typeName/structure', this.handleGetTypeStructure.bind(this));
    
    // 存储管理路由
    router.post('/storage/backup', this.handleCreateBackup.bind(this));
    router.get('/storage/integrity', this.handleCheckIntegrity.bind(this));
    router.get('/storage/events', this.handleGetStorageEvents.bind(this));
    
    // MCP服务器管理路由
    router.get('/mcp/status', this.handleGetMCPStatus.bind(this));
    router.post('/mcp/cache/clear', this.handleClearMCPCache.bind(this));

    // 挂载路由
    this.app.use('/api/v1', router);
    
    // 静态文件服务（用于前端）
    this.app.use(express.static('dist'));
    
    // SPA路由处理
    this.app.get('*', (req: Request, res: Response) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  /**
   * 设置错误处理
   */
  private setupErrorHandling(): void {
    // 404处理
    this.app.use((req: Request, res: Response) => {
      this.sendErrorResponse(res, HttpStatus.NOT_FOUND, ApiErrorCode.MODULE_NOT_FOUND, '接口不存在');
    });

    // 全局错误处理
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('服务器错误:', error);
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '服务器内部错误',
        error.message
      );
    });
  }

  /**
   * 发送成功响应
   */
  private sendSuccessResponse<T>(res: Response, data: T, status: HttpStatus = HttpStatus.OK): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      request_id: (res.req as any).requestId
    };
    res.status(status).json(response);
  }

  /**
   * 发送错误响应
   */
  private sendErrorResponse(
    res: Response,
    status: HttpStatus,
    code: ApiErrorCode,
    message: string,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: new Date().toISOString(),
      request_id: (res.req as any).requestId
    };
    res.status(status).json(response);
  }

  /**
   * 健康检查处理器
   */
  private async handleHealth(req: Request, res: Response): Promise<void> {
    try {
      const storageStats = await this.storage.getStats();
      const mcpStatus = this.mcpServer.getStatus();
      
      const health: HealthResponse = {
        status: 'healthy',
        version: '1.0.0',
        uptime: process.uptime(),
        services: {
          storage: storageStats ? 'up' : 'down',
          mcp_server: mcpStatus.isRunning ? 'up' : 'down',
          validation: 'up'
        },
        last_check: new Date().toISOString()
      };
      
      this.sendSuccessResponse(res, health);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '健康检查失败'
      );
    }
  }

  /**
   * 获取配置处理器
   */
  private handleGetConfig(req: Request, res: Response): void {
    const config: ConfigResponse = {
      storage: {
        data_path: this.config.storage.data_path,
        backup_enabled: this.config.storage.auto_backup,
        backup_interval: this.config.storage.backup_interval
      },
      validation: {
        strict_mode: this.config.validation.strict_mode,
        auto_fix: this.config.validation.auto_fix
      },
      cache: {
        enabled: this.config.cache.enabled,
        ttl: this.config.cache.ttl
      },
      server: {
        port: this.config.http_server.port,
        cors_enabled: this.config.http_server.cors.enabled,
        rate_limit: {
          enabled: this.config.http_server.rate_limit.enabled,
          max_requests: this.config.http_server.rate_limit.max_requests,
          window_ms: this.config.http_server.rate_limit.window_ms
        }
      }
    };
    
    this.sendSuccessResponse(res, config);
  }

  /**
   * 获取统计信息处理器
   */
  private async handleGetStats(req: Request, res: Response): Promise<void> {
    try {
      const storageStats = await this.storage.getStats();
      const mcpStatus = this.mcpServer.getStatus();
      
      // 计算模块类型分布
      const modulesByType: { [key: string]: number } = {};
      const modulesByFile: { [key: string]: number } = {};
      const modulesByAccess: { [key: string]: number } = {};
      
      for (const [fileName, fileInfo] of Object.entries(storageStats.file_distribution)) {
        modulesByFile[fileName] = fileInfo.modules_count;
      }
      
      const stats: StatsResponse = {
        total_modules: storageStats.total_modules,
        modules_by_type: modulesByType,
        modules_by_file: modulesByFile,
        modules_by_access: modulesByAccess,
        recent_activity: {
          created: 0, // 这里需要从存储事件中统计
          updated: 0,
          deleted: 0
        },
        storage_info: {
          total_files: storageStats.total_files,
          total_size: storageStats.total_size,
          last_backup: storageStats.last_backup
        }
      };
      
      this.sendSuccessResponse(res, stats);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '获取统计信息失败'
      );
    }
  }

  /**
   * 创建模块处理器
   */
  private async handleCreateModule(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateModuleRequest = req.body;
      
      // 基本验证
      if (!request.name || !request.type || !request.file_path || !request.access_modifier) {
        this.sendErrorResponse(
          res,
          HttpStatus.BAD_REQUEST,
          ApiErrorCode.VALIDATION_ERROR,
          '缺少必需参数'
        );
        return;
      }
      
      const result = await this.moduleManager.createModule(request);
      
      if (!result.success) {
        this.sendErrorResponse(
          res,
          HttpStatus.BAD_REQUEST,
          ApiErrorCode.VALIDATION_ERROR,
          result.error || '创建模块失败'
        );
        return;
      }
      
      this.sendSuccessResponse(res, result.data, HttpStatus.CREATED);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '创建模块失败'
      );
    }
  }

  /**
   * 获取模块列表处理器
   */
  private async handleListModules(req: Request, res: Response): Promise<void> {
    try {
      const params: SearchParams = req.query as any;
      
      const searchCriteria: SearchCriteria = {};
      if (params.name) searchCriteria.name = params.name;
      if (params.type) searchCriteria.type = params.type as any;
      if (params.parent_module) searchCriteria.parent_module = params.parent_module;
      if (params.file_path) searchCriteria.file_path = params.file_path;
      if (params.access_modifier) searchCriteria.access_modifier = params.access_modifier as any;
      if (params.description) searchCriteria.description = params.description;
      if (params.limit) searchCriteria.limit = parseInt(params.limit.toString());
      if (params.offset) searchCriteria.offset = parseInt(params.offset.toString());
      
      const searchResult = await this.moduleManager.smartSearch(searchCriteria);
      
      const page = params.page ? parseInt(params.page.toString()) : 1;
      const limit = params.limit ? parseInt(params.limit.toString()) : 50;
      const totalPages = Math.ceil(searchResult.total / limit);
      
      const response: ModuleListResponse = {
        items: searchResult.modules,
        total: searchResult.total,
        page,
        limit,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
        filters: params
      };
      
      this.sendSuccessResponse(res, response);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '获取模块列表失败'
      );
    }
  }

  /**
   * 搜索模块处理器
   */
  private async handleSearchModules(req: Request, res: Response): Promise<void> {
    try {
      const params: SearchParams = req.query as any;
      
      const searchCriteria: SearchCriteria = {};
      const searchName = params.q || params.name;
      if (searchName) searchCriteria.name = searchName;
      if (params.type) searchCriteria.type = params.type as any;
      if (params.parent_module) searchCriteria.parent_module = params.parent_module;
      if (params.file_path) searchCriteria.file_path = params.file_path;
      if (params.access_modifier) searchCriteria.access_modifier = params.access_modifier as any;
      if (params.description) searchCriteria.description = params.description;
      if (params.limit) searchCriteria.limit = parseInt(params.limit.toString());
      if (params.offset) searchCriteria.offset = parseInt(params.offset.toString());
      
      const searchResult = await this.moduleManager.smartSearch(searchCriteria);
      
      const response: SearchResponse = {
        results: searchResult.modules,
        total: searchResult.total,
        query: searchResult.query,
        suggestions: [], // 可以添加搜索建议逻辑
        facets: {
          types: {},
          files: {},
          access_modifiers: {}
        }
      };
      
      // 计算分面统计
      for (const module of searchResult.modules) {
        response.facets!.types[module.type] = (response.facets!.types[module.type] || 0) + 1;
        response.facets!.access_modifiers[module.access_modifier] = 
          (response.facets!.access_modifiers[module.access_modifier] || 0) + 1;
        
        const fileName = module.file_path.split('/').pop() || module.file_path;
        response.facets!.files[fileName] = (response.facets!.files[fileName] || 0) + 1;
      }
      
      this.sendSuccessResponse(res, response);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '搜索模块失败'
      );
    }
  }

  /**
   * 获取单个模块处理器
   */
  private async handleGetModule(req: Request, res: Response): Promise<void> {
    try {
      const hierarchicalName = decodeURIComponent(req.params.hierarchicalName);
      
      const module = await this.moduleManager.getModuleByName(hierarchicalName);
      if (!module) {
        this.sendErrorResponse(
          res,
          HttpStatus.NOT_FOUND,
          ApiErrorCode.MODULE_NOT_FOUND,
          `模块 ${hierarchicalName} 未找到`
        );
        return;
      }
      
      // 获取子模块
      const childrenResult = await this.moduleManager.smartSearch({
        parent_module: hierarchicalName,
        limit: 100
      });
      
      const response: ModuleResponse = {
        module,
        children: childrenResult.modules,
        relationships: [] // 可以添加关系查询逻辑
      };
      
      this.sendSuccessResponse(res, response);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '获取模块失败'
      );
    }
  }

  /**
   * 更新模块处理器
   */
  private async handleUpdateModule(req: Request, res: Response): Promise<void> {
    try {
      const hierarchicalName = decodeURIComponent(req.params.hierarchicalName);
      const request: UpdateModuleRequest = req.body;
      
      const result = await this.moduleManager.updateModule(hierarchicalName, request);
      
      if (!result.success) {
        const status = result.error?.includes('不存在') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        const code = result.error?.includes('不存在') ? ApiErrorCode.MODULE_NOT_FOUND : ApiErrorCode.VALIDATION_ERROR;
        
        this.sendErrorResponse(res, status, code, result.error || '更新模块失败');
        return;
      }
      
      this.sendSuccessResponse(res, { message: result.message });
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '更新模块失败'
      );
    }
  }

  /**
   * 删除模块处理器
   */
  private async handleDeleteModule(req: Request, res: Response): Promise<void> {
    try {
      const hierarchicalName = decodeURIComponent(req.params.hierarchicalName);
      
      const result = await this.moduleManager.deleteModule(hierarchicalName);
      
      if (!result.success) {
        const status = result.error?.includes('不存在') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        const code = result.error?.includes('不存在') ? ApiErrorCode.MODULE_NOT_FOUND : ApiErrorCode.VALIDATION_ERROR;
        
        this.sendErrorResponse(res, status, code, result.error || '删除模块失败');
        return;
      }
      
      this.sendSuccessResponse(res, { message: result.message }, HttpStatus.NO_CONTENT);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '删除模块失败'
      );
    }
  }

  /**
   * 获取类型结构处理器
   */
  private async handleGetTypeStructure(req: Request, res: Response): Promise<void> {
    try {
      const typeName = decodeURIComponent(req.params.typeName);
      
      const result = await this.moduleManager.getTypeStructure(typeName);
      
      const response: TypeStructureResponse = {
        type_name: result.type_name,
        hierarchy: result.hierarchy,
        related_modules: result.related_modules,
        relationships: result.relationships,
        inheritance_tree: {
          parents: [],
          children: [],
          siblings: []
        }
      };
      
      this.sendSuccessResponse(res, response);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '获取类型结构失败'
      );
    }
  }

  /**
   * 创建备份处理器
   */
  private async handleCreateBackup(req: Request, res: Response): Promise<void> {
    try {
      const { fileName } = req.body;
      
      if (!fileName) {
        this.sendErrorResponse(
          res,
          HttpStatus.BAD_REQUEST,
          ApiErrorCode.VALIDATION_ERROR,
          '缺少fileName参数'
        );
        return;
      }
      
      const result = await this.storage.createBackup(fileName);
      
      if (!result.success) {
        this.sendErrorResponse(
          res,
          HttpStatus.INTERNAL_SERVER_ERROR,
          ApiErrorCode.STORAGE_ERROR,
          result.error?.message || '创建备份失败'
        );
        return;
      }
      
      this.sendSuccessResponse(res, result.data, HttpStatus.CREATED);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '创建备份失败'
      );
    }
  }

  /**
   * 检查数据完整性处理器
   */
  private async handleCheckIntegrity(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.storage.checkIntegrity();
      this.sendSuccessResponse(res, result);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '检查数据完整性失败'
      );
    }
  }

  /**
   * 获取存储事件处理器
   */
  private handleGetStorageEvents(req: Request, res: Response): void {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit.toString()) : 100;
      const events = this.storage.getEvents(limit);
      this.sendSuccessResponse(res, events);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '获取存储事件失败'
      );
    }
  }

  /**
   * 获取MCP状态处理器
   */
  private handleGetMCPStatus(req: Request, res: Response): void {
    try {
      const status = this.mcpServer.getStatus();
      this.sendSuccessResponse(res, status);
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '获取MCP状态失败'
      );
    }
  }

  /**
   * 清除MCP缓存处理器
   */
  private handleClearMCPCache(req: Request, res: Response): void {
    try {
      this.mcpServer.clearCache();
      this.sendSuccessResponse(res, { message: 'MCP缓存已清除' });
    } catch (error) {
      this.sendErrorResponse(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_ERROR,
        '清除MCP缓存失败'
      );
    }
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.http_server.port, () => {
          // MCP模式下使用stderr输出，避免干扰MCP协议通信
          if (process.env.MCP_MODE === 'true') {
            process.stderr.write(`API服务器已启动，端口: ${this.config.http_server.port}\n`);
            process.stderr.write(`健康检查: http://localhost:${this.config.http_server.port}/api/v1/health\n`);
          } else {
            console.log(`API服务器已启动，端口: ${this.config.http_server.port}`);
            console.log(`健康检查: http://localhost:${this.config.http_server.port}/api/v1/health`);
          }
          resolve();
        });
        
        this.server.on('error', (error: Error) => {
          if (process.env.MCP_MODE === 'true') {
            process.stderr.write(`服务器启动失败: ${error}\n`);
          } else {
            console.error('服务器启动失败:', error);
          }
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('API服务器已停止');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 获取Express应用实例
   */
  getApp(): express.Application {
    return this.app;
  }
}

/**
 * 创建并启动API服务器的便捷函数
 */
export async function createAndStartApiServer(config?: AppConfig): Promise<ApiServer> {
  const server = new ApiServer(config);
  await server.start();
  return server;
}