/**
 * Express服务器 - 提供HTTP RESTful API服务
 * 集成MOD005人类交互接口模块
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
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
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get('/api/modules', (req: Request, res: Response) => {
  const logger = getLogger();
  logger.info('API请求: GET /api/modules');
  
  try {
    const result = humanInterface.get_root_modules();
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
app.get('/api/modules/search', (req: Request, res: Response) => {
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
    
    const query = {
      keyword: keyword,
      type: req.query.type as 'class' | 'function' | 'variable' | 'file' | 'functionGroup'
    };
    logger.debug(`搜索参数: ${JSON.stringify(query)}`);
    
    const result = humanInterface.search_modules(query);
    
    // 处理分页参数
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    logger.debug(`分页参数: page=${page}, limit=${limit}`);
    
    if (result.success && result.data) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = result.data.slice(startIndex, endIndex);
      
      logger.debug(`API响应: GET /api/modules/search - 成功，返回 ${paginatedData.length}/${result.data.length} 个结果`);
      return res.json({
        success: true,
        message: result.message,
        data: paginatedData,
        pagination: {
          page: page,
          limit: limit,
          total: result.data.length,
          totalPages: Math.ceil(result.data.length / limit)
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
app.get('/api/modules/get', (req: Request, res: Response) => {
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
    const result = humanInterface.get_module_by_hierarchical_name(hierarchical_name);
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
 * POST /api/modules - 添加新模块
 * 对应 FUNC004. add_module
 */
app.post('/api/modules', (req: Request, res: Response) => {
  const logger = getLogger();
  const module_data = req.body;
  logger.info(`API请求: POST /api/modules - name: ${module_data?.name}`);
  logger.debug(`请求数据: ${JSON.stringify(module_data)}`);
  
  try {
    const result = humanInterface.add_module(module_data);
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
app.put('/api/modules/update', (req: Request, res: Response) => {
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
    const result = humanInterface.update_module(hierarchical_name, updates);
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
app.delete('/api/modules/delete', (req: Request, res: Response) => {
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
    const result = humanInterface.delete_module(hierarchical_name);
    
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
export async function start_server(port?: number): Promise<void> {
  const logger = getLogger();
  const serverPort = port || PORT;
  
  try {
    logger.info(`开始启动Express服务器，端口: ${serverPort}`);
    await initialize_server();
    
    app.listen(serverPort, () => {
      logger.info(`Express服务器启动成功，监听端口: ${serverPort}`);
      logger.info(`健康检查接口: http://localhost:${serverPort}/health`);
      logger.info(`API接口前缀: http://localhost:${serverPort}/api`);
    });
  } catch (error) {
    const errorMsg = `Express服务器启动失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    process.exit(1);
  }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  start_server();
}

export default app;