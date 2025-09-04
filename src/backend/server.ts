/**
 * Express服务器 - 提供HTTP RESTful API服务
 * 集成MOD005人类交互接口模块
 */

import * as express from 'express';
import { Request, Response } from 'express';
import * as cors from 'cors';
import * as path from 'path';
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

const app = express.default();

// 中间件配置
app.use(cors.default());
app.use(express.default.json());
app.use(express.default.urlencoded({ extended: true }));

// 静态文件服务配置 - 通过命令行参数配置
let staticDir: string | null = null;

/**
 * 配置静态文件服务目录
 * @param dir 静态文件目录路径
 */
export function setStaticDirectory(dir: string): void {
  staticDir = dir;
  const logger = getLogger();
  logger.info(`配置静态文件服务目录: ${dir}`);
  app.use(express.default.static(dir));
}

// API路由前缀
const apiRouter = express.default.Router();

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: any) => {
  const logger = getLogger();
  const errorMsg = `服务器内部错误: ${err instanceof Error ? err.message : String(err)}`;
  logger.error(`${errorMsg} - ${req.method} ${req.originalUrl}`);
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

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

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `接口不存在: ${req.method} ${req.originalUrl}`
  });
});

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