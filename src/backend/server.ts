/**
 * Express服务器 - 提供HTTP RESTful API服务
 * 集成MOD005人类交互接口模块
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as mime from 'mime-types';
import * as humanInterface from './human-interface';
import * as moduleManager from './module-manager';
import * as storage from './storage';

// 日志接口
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

// 日志实例
let serverLogger: Logger | null = null;

/**
 * 设置服务器日志实例
 * @param logger 日志实例
 */
export function setServerLogger(logger: Logger): void {
  serverLogger = logger;
}

/**
 * 获取日志实例，如果未设置则使用默认实现
 */
function getLogger(): Logger {
  return serverLogger || {
    debug: () => {}, // 默认不输出
    info: () => {},  // 默认不输出
    warn: () => {},  // 默认不输出
    error: () => {} // 默认不输出
  };
}

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务配置 - 通过命令行参数配置
let staticDir: string | null = null;
let staticMiddlewareConfigured = false;

/**
 * 配置静态文件服务目录
 * @param dir 静态文件目录路径
 */
export function setStaticDirectory(dir: string): void {
  staticDir = dir;
  const logger = getLogger();
  logger.info(`配置静态文件服务目录: ${dir}`);
  
  // 如果已经配置过静态中间件，不要重复配置
  if (staticMiddlewareConfigured) {
    logger.warn('静态文件中间件已配置，跳过重复配置');
    return;
  }
  
  // 1. 静态文件服务必须在API路由之前配置
  app.use('/', express.static(dir, {
    // 设置静态文件选项
    setHeaders: (res: Response, filePath: string) => {
      const ext = path.extname(filePath);
      let mimeType = mime.lookup(ext);
      
      // 特别处理JavaScript模块文件
      if (ext === '.js') {
        mimeType = 'application/javascript; charset=utf-8';
      } else if (ext === '.css') {
        mimeType = 'text/css; charset=utf-8';
      } else if (ext === '.html') {
        mimeType = 'text/html; charset=utf-8';
      }
      
      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
        logger.debug(`设置静态文件MIME类型: ${filePath} -> ${mimeType}`);
      }
    }
  }));
  
  staticMiddlewareConfigured = true;
  logger.info('静态文件中间件配置完成');
  
  // 2. 在静态文件中间件配置完成后，设置API路由
  setupRoutes();
  
  // 3. SPA fallback路由 - 处理前端路由，必须在404处理之前
  app.use((req: Request, res: Response, next: any) => {
    // 如果是API请求，跳过此处理
    if (req.originalUrl.startsWith('/api/') || req.originalUrl === '/health') {
      return next();
    }
    
    // 只处理GET请求
    if (req.method !== 'GET') {
      return next();
    }
    
    // 跳过静态资源文件（有文件扩展名的请求）
    const ext = path.extname(req.originalUrl);
    if (ext) {
      // 有扩展名的请求，应该已经被静态文件中间件处理了
      // 如果到了这里说明文件不存在，继续到404处理
      return next();
    }
    
    // 如果配置了静态文件目录，返回index.html
    if (staticDir) {
      const indexPath = path.join(staticDir, 'index.html');
      logger.debug(`SPA fallback: ${req.originalUrl} -> ${indexPath}`);
      return res.sendFile(indexPath);
    }
    
    // 如果没有配置静态文件目录，继续到404处理
    next();
  });
  
  // 4. 错误处理中间件 - 必须在所有路由之后，404处理之前
  app.use((err: any, req: Request, res: Response, next: any) => {
    const errorMsg = `服务器内部错误: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(`${errorMsg} - ${req.method} ${req.originalUrl}`);
    
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  });
  
  // 5. 404处理 - 必须在最后
  app.use((req: Request, res: Response) => {
    logger.debug(`404处理: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      message: `接口不存在: ${req.method} ${req.originalUrl}`
    });
  });
  
  logger.info('所有中间件配置完成');
}

// API路由前缀
const apiRouter = express.Router();

// 路由是否已设置的标志
let routesConfigured = false;

// 注意：错误处理中间件必须在所有路由定义之后配置

// 初始化函数
async function initialize_server(): Promise<void> {
  const logger = getLogger();
  logger.info('开始初始化Express服务器');
  
  try {
    // 注意：存储模块和模块管理器的初始化已在app.ts中完成
    // 这里只需要验证模块是否已正确初始化
    logger.debug('验证存储模块和模块管理器已初始化');
    
    logger.info('Express服务器初始化完成');
  } catch (error) {
    const errorMsg = `服务器初始化失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    throw error;
  }
}

// 设置API路由的函数
function setupRoutes(): void {
  const logger = getLogger();
  
  if (routesConfigured) {
    logger.warn('API路由已配置，跳过重复配置');
    return;
  }
  
  logger.info('开始配置API路由');

  // API路由定义

  /**
   * GET /api/modules - 获取根模块列表
   * 对应 FUNC001. get_root_modules
   */
  app.get('/api/modules', async (req: Request, res: Response) => {
    const logger = getLogger();
    logger.info('API请求: GET /api/modules');
    
    try {
      const result = await humanInterface.get_root_modules();
      logger.debug(`API响应: GET /api/modules - ${result.success ? '成功' : '失败'}`);
      return res.json(result);
    } catch (error) {
      const errorMsg = `API异常: GET /api/modules - ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMsg);
      return res.status(500).json({
        success: false,
        message: '服务器内部错误',
        data: null
      });
    }
  });

  /**
   * GET /api/modules/search - 关键词搜索模块
   * 对应 FUNC003. search_modules
   */
  app.get('/api/modules/search', async (req: Request, res: Response) => {
  const logger = getLogger();
  const keyword = req.query.keyword as string;
  logger.info(`API请求: GET /api/modules/search - keyword: ${keyword}`);
  
  try {
    // 验证关键词不能为空
    if (!keyword || keyword.trim() === '') {
      const errorMsg = '搜索关键词不能为空';
      logger.warn(`API参数错误: GET /api/modules/search - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    
    // 处理分页参数
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;
    logger.debug(`分页参数: offset=${offset}, limit=${limit}`);
    
    const query = {
      keyword: keyword,
      type: req.query.type as 'class' | 'function' | 'variable' | 'file' | 'functionGroup',
      offset: offset,
      limit: limit
    };
    logger.debug(`搜索参数: ${JSON.stringify(query)}`);
    
    const result = await humanInterface.search_modules(query);
    
    if (result.success && result.data) {
      logger.debug(`API响应: GET /api/modules/search - 成功，返回 ${result.data.length} 个结果`);
      return res.json({
        success: true,
        message: result.message,
        data: result.data,
        pagination: {
          offset: offset,
          limit: limit,
          total: result.pagination?.total || 0,
          totalPages: Math.ceil((result.pagination?.total || 0) / limit)
        }
      });
    }
    
    logger.debug(`API响应: GET /api/modules/search - ${result.success ? '成功' : '失败'}`);
    return res.json(result);
  } catch (error) {
    const errorMsg = `API异常: GET /api/modules/search - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * GET /api/modules/get?name={hierarchical_name} - 按层次名称获取模块信息
 * 对应 FUNC002. get_module_by_hierarchical_name
 */
app.get('/api/modules/get', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.query.name as string;
  logger.info(`API请求: GET /api/modules/get - name: ${hierarchical_name}`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: name';
      logger.warn(`API参数错误: GET /api/modules/get - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    const result = await humanInterface.get_module_by_hierarchical_name(hierarchical_name);
    logger.debug(`API响应: GET /api/modules/get - ${result.success ? '成功' : '失败'}`);
    return res.json(result);
  } catch (error) {
    const errorMsg = `API异常: GET /api/modules/get - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * GET /api/modules/:id - 获取指定模块信息（RESTful风格）
 * 对应 FUNC002. get_module_by_hierarchical_name
 */
app.get('/api/modules/:id', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.params.id;
  logger.info(`API请求: GET /api/modules/${hierarchical_name}`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: id';
      logger.warn(`API参数错误: GET /api/modules/:id - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    const result = await humanInterface.get_module_by_hierarchical_name(hierarchical_name);
    logger.debug(`API响应: GET /api/modules/${hierarchical_name} - ${result.success ? '成功' : '失败'}`);
    
    if (result.success) {
      return res.json(result);
    } else {
      // 如果模块不存在，返回404
      if (result.message && (result.message.includes('未找到') || result.message.includes('不存在'))) {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
    const errorMsg = `API异常: GET /api/modules/${hierarchical_name} - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * PUT /api/modules/:id - 修改模块信息（RESTful风格）
 * 对应 FUNC005. update_module
 */
app.put('/api/modules/:id', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.params.id;
  const updates = req.body;
  logger.info(`API请求: PUT /api/modules/${hierarchical_name}`);
  logger.debug(`更新数据: ${JSON.stringify(updates)}`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: id';
      logger.warn(`API参数错误: PUT /api/modules/:id - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      const errorMsg = '更新数据不能为空';
      logger.warn(`API参数错误: PUT /api/modules/${hierarchical_name} - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    
    const result = await humanInterface.update_module(hierarchical_name, updates);
    if (result.success) {
      logger.debug(`API响应: PUT /api/modules/${hierarchical_name} - 成功更新模块`);
      return res.json(result);
    } else {
      logger.warn(`API响应: PUT /api/modules/${hierarchical_name} - 失败: ${result.message}`);
      // 根据错误类型返回不同状态码
      if (result.message && (result.message.includes('未找到') || result.message.includes('不存在'))) {
        return res.status(404).json(result);
      } else if (result.message && result.message.includes('无效')) {
        return res.status(400).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
    const errorMsg = `API异常: PUT /api/modules/${hierarchical_name} - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * GET /api/modules/:moduleId/children - 获取指定模块的子模块列表
 * 对应 FUNC006. get_module_children
 */
app.get('/api/modules/:moduleId/children', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.params.moduleId;
  logger.info(`API请求: GET /api/modules/${hierarchical_name}/children`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: moduleId';
      logger.warn(`API参数错误: GET /api/modules/:moduleId/children - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    
    const result = await humanInterface.get_module_children(hierarchical_name);
    logger.debug(`API响应: GET /api/modules/${hierarchical_name}/children - ${result.success ? '成功' : '失败'}`);
    return res.json(result);
  } catch (error) {
    const errorMsg = `API异常: GET /api/modules/${hierarchical_name}/children - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * POST /api/modules - 添加新模块
 * 对应 FUNC004. add_module
 */
app.post('/api/modules', async (req: Request, res: Response) => {
  const logger = getLogger();
  const module_data = req.body;
  logger.info(`API请求: POST /api/modules - name: ${module_data?.name}`);
  logger.debug(`请求数据: ${JSON.stringify(module_data)}`);
  
  try {
    const result = await humanInterface.add_module(module_data);
    if (result.success) {
      logger.debug('API响应: POST /api/modules - 成功创建模块');
      return res.status(201).json(result);
    } else {
      logger.warn(`API响应: POST /api/modules - 失败: ${result.message}`);
      // 根据错误类型返回不同状态码
      if (result.message && result.message.includes('已存在')) {
        return res.status(409).json(result);
      } else if (result.message && (result.message.includes('无效') || result.message.includes('不存在'))) {
        return res.status(400).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
    const errorMsg = `API异常: POST /api/modules - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * PUT /api/modules/update - 修改模块信息
 * 对应 FUNC005. update_module
 */
app.put('/api/modules/update', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.query.name as string;
  const updates = req.body;
  logger.info(`API请求: PUT /api/modules/update - name: ${hierarchical_name}`);
  logger.debug(`更新数据: ${JSON.stringify(updates)}`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: name';
      logger.warn(`API参数错误: PUT /api/modules/update - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      const errorMsg = '更新数据不能为空';
      logger.warn(`API参数错误: PUT /api/modules/update - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    const result = await humanInterface.update_module(hierarchical_name, updates);
    if (result.success) {
      logger.debug('API响应: PUT /api/modules/update - 成功更新模块');
      return res.json(result);
    } else {
      logger.warn(`API响应: PUT /api/modules/update - 失败: ${result.message}`);
      // 根据错误类型返回不同状态码
      if (result.message && (result.message.includes('未找到') || result.message.includes('不存在'))) {
        return res.status(404).json(result);
      } else if (result.message && result.message.includes('无效')) {
        return res.status(400).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
    const errorMsg = `API异常: PUT /api/modules/update - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * DELETE /api/modules/delete?name={hierarchical_name} - 删除模块
 * 对应 FUNC006. delete_module
 */
app.delete('/api/modules/delete', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.query.name as string;
  logger.info(`API请求: DELETE /api/modules/delete - name: ${hierarchical_name}`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: name';
      logger.warn(`API参数错误: DELETE /api/modules/delete - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    const result = await humanInterface.delete_module(hierarchical_name);
    
    if (result.success) {
      logger.debug('API响应: DELETE /api/modules/delete - 成功删除模块');
      return res.json(result);
    } else {
      logger.warn(`API响应: DELETE /api/modules/delete - 失败: ${result.message}`);
      // 根据错误类型返回不同状态码
      if (result.message && (result.message.includes('子模块') || result.message.includes('引用') || result.message.includes('依赖'))) {
        return res.status(400).json(result);
      } else if (result.message && result.message.includes('未找到')) {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
    const errorMsg = `API异常: DELETE /api/modules/delete - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * DELETE /api/modules/:id - 删除指定模块（RESTful风格）
 * 对应 FUNC007. delete_module
 */
app.delete('/api/modules/:id', async (req: Request, res: Response) => {
  const logger = getLogger();
  const hierarchical_name = req.params.id;
  logger.info(`API请求: DELETE /api/modules/${hierarchical_name}`);
  
  try {
    if (!hierarchical_name) {
      const errorMsg = '缺少必需的参数: id';
      logger.warn(`API参数错误: DELETE /api/modules/:id - ${errorMsg}`);
      return res.status(400).json({
        success: false,
        message: errorMsg,
        data: null
      });
    }
    
    const result = await humanInterface.delete_module(hierarchical_name);
    logger.debug(`API响应: DELETE /api/modules/${hierarchical_name} - ${result.success ? '成功' : '失败'}`);
    
    if (result.success) {
      logger.info(`API响应: DELETE /api/modules/${hierarchical_name} - 成功删除模块`);
      return res.json(result);
    } else {
      logger.warn(`API响应: DELETE /api/modules/${hierarchical_name} - 失败: ${result.message}`);
      // 根据错误类型返回不同状态码
      if (result.message && (result.message.includes('子模块') || result.message.includes('引用') || result.message.includes('依赖'))) {
        return res.status(400).json(result);
      } else if (result.message && (result.message.includes('未找到') || result.message.includes('不存在'))) {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
    const errorMsg = `API异常: DELETE /api/modules/${hierarchical_name} - ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

  // 健康检查接口
  app.get('/health', (req: Request, res: Response) => {
    const logger = getLogger();
    logger.debug('API请求: GET /health - 健康检查');
    res.json({
      success: true,
      message: '服务器运行正常',
      timestamp: new Date().toISOString()
    });
  });

  routesConfigured = true;
  logger.info('API路由配置完成');
}

// 注意：SPA fallback路由、错误处理和404处理将在setStaticDirectory函数中配置
// 这样可以确保正确的中间件顺序：静态文件 -> API路由 -> SPA fallback -> 404处理

// 启动服务器
export async function start_server(port: number = 3000): Promise<void> {
  const logger = getLogger();
  
  try {
    logger.info(`开始启动Express服务器，端口: ${port}`);
    await initialize_server();
    
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(port, () => {
        logger.info(`Express服务器启动成功，监听端口: ${port}`);
        logger.info(`健康检查接口: http://localhost:${port}/health`);
        logger.info(`API接口前缀: http://localhost:${port}/api`);
        if (staticDir) {
          logger.info(`静态文件服务: http://localhost:${port}/ -> ${staticDir}`);
        }
        resolve();
      });
      
      server.on('error', (error) => {
        const errorMsg = `Express服务器启动失败: ${error.message}`;
        logger.error(errorMsg);
        reject(error);
      });
    });
  } catch (error) {
    const errorMsg = `Express服务器启动失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    throw error;
  }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  start_server();
}

export default app;