/**
 * Express服务器 - 提供HTTP RESTful API服务
 * 集成MOD005人类交互接口模块
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as humanInterface from './human-interface';
import * as moduleManager from './module-manager';
import * as storage from './storage';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: any) => {
  // 服务器错误
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 初始化函数
async function initialize_server(): Promise<void> {
  // 初始化存储模块
  await storage.initialize_storage();
  
  // 初始化模块管理器
  await moduleManager.initialize_module_manager();
  
  // 服务器初始化完成
}

// API路由定义

/**
 * GET /api/modules - 获取根模块列表
 * 对应 FUNC001. get_root_modules
 */
app.get('/api/modules', (req: Request, res: Response) => {
  try {
    const result = humanInterface.get_root_modules();
    return res.json(result);
  } catch (error) {
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
  try {
    const keyword = req.query.keyword as string;
    
    // 验证关键词不能为空
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '搜索关键词不能为空',
        data: null
      });
    }
    
    const query = {
      keyword: keyword,
      type: req.query.type as 'class' | 'function' | 'variable' | 'file' | 'functionGroup'
    };
    
    const result = humanInterface.search_modules(query);
    
    // 处理分页参数
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (result.success && result.data) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = result.data.slice(startIndex, endIndex);
      
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
    
    return res.json(result);
  } catch (error) {
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
  try {
    const hierarchical_name = req.query.name as string;
    if (!hierarchical_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: name',
        data: null
      });
    }
    const result = humanInterface.get_module_by_hierarchical_name(hierarchical_name);
    return res.json(result);
  } catch (error) {
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
  try {
    const module_data = req.body;
    const result = humanInterface.add_module(module_data);
    if (result.success) {
      return res.status(201).json(result);
    } else {
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
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

/**
 * PUT /api/modules/update?name={hierarchical_name} - 修改模块信息
 * 对应 FUNC005. update_module
 */
app.put('/api/modules/update', (req: Request, res: Response) => {
  try {
    const hierarchical_name = req.query.name as string;
    if (!hierarchical_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: name',
        data: null
      });
    }
    const update_data = req.body;
    const result = humanInterface.update_module(hierarchical_name, update_data);
    
    if (result.success) {
      return res.json(result);
    } else {
      // 根据错误类型返回不同状态码
      if (result.message && (result.message.includes('循环引用') || result.message.includes('无效') || result.message.includes('不存在'))) {
        return res.status(400).json(result);
      } else if (result.message && result.message.includes('未找到')) {
        return res.status(404).json(result);
      } else {
        return res.status(400).json(result);
      }
    }
  } catch (error) {
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
  try {
    const hierarchical_name = req.query.name as string;
    if (!hierarchical_name) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的参数: name',
        data: null
      });
    }
    const result = humanInterface.delete_module(hierarchical_name);
    
    if (result.success) {
      return res.json(result);
    } else {
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
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      data: null
    });
  }
});

// 健康检查接口
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
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
export async function start_server(): Promise<void> {
  try {
    await initialize_server();
    
    app.listen(PORT, () => {
      // 服务器启动成功
    });
  } catch (error) {
    // 服务器启动失败
    process.exit(1);
  }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  start_server();
}

export default app;