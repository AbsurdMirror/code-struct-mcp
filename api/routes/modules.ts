import { Router, Request, Response } from 'express';
import { ModuleManager } from '../modules/module-manager.js';
import { AnyModule } from '../types/module.js';
import { YamlStorage } from '../storage/yaml-storage.js';

// 定义API响应接口
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 定义模块请求接口
interface ModuleRequest {
  name: string;
  description?: string;
  type?: string;
  parent_module?: string;
  file_path?: string;
  line_start?: number;
  line_end?: number;
  dependencies?: string[];
  exports?: string[];
  metadata?: Record<string, any>;
}

// 定义搜索查询接口
interface SearchQuery {
  keyword: string;
  type?: string;
  limit?: number;
}

const router: Router = Router();

// 这些将通过依赖注入传入，暂时使用默认配置
const storage = new YamlStorage({ 
  root_path: './data',
  data_path: './data',
  backup_path: './data/backups',
  max_backups: 10,
  backup_interval: 3600,
  backup_enabled: true,
  auto_backup: true,
  compression: false,
  encryption: { enabled: false },
  validation: { enabled: true, schema_validation: true, data_integrity_check: true }
});
const moduleManager = new ModuleManager(storage);

/**
 * GET /api/modules
 * 获取根模块列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 获取所有模块
    const allModules = await moduleManager.getAllModules();
    
    // 筛选出根模块（没有父模块的模块）
    const rootModules = allModules.filter((module: AnyModule) => !module.parent_module);
    
    const response: APIResponse<AnyModule[]> = {
      success: true,
      data: rootModules,
      message: `成功获取${rootModules.length}个根模块`
    };
    
    return res.status(200).json(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : '获取根模块列表失败'
    };
    
    return res.status(500).json(response);
  }
});

/**
 * GET /api/modules/search
 * 关键词搜索模块
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword, type, limit } = req.query as Partial<SearchQuery>;
    
    // 验证必需参数
    if (!keyword) {
      const response: APIResponse = {
        success: false,
        error: '缺少必需参数: keyword'
      };
      return res.status(400).json(response);
    }
    
    // 执行搜索
    const validTypes = ['class', 'function', 'variable', 'file', 'functionGroup'];
    const searchResult = await moduleManager.smartSearch({
      name: keyword as string,
      type: type && validTypes.includes(type as string) ? type as any : undefined,
      limit: limit ? parseInt(limit as unknown as string) : 50
    });
    
    const response: APIResponse<AnyModule[]> = {
      success: true,
      data: searchResult.modules,
      message: `搜索到${searchResult.modules.length}个匹配的模块`
    };

    return res.status(200).json(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : '搜索模块失败'
    };

    return res.status(500).json(response);
  }
});

/**
 * GET /api/modules/:hierarchical_name
 * 按层次名称获取模块信息
 */
router.get('/:hierarchical_name', async (req: Request, res: Response) => {
  try {
    const { hierarchical_name } = req.params;
    
    // 验证参数
    if (!hierarchical_name) {
      const response: APIResponse = {
        success: false,
        error: '缺少必需参数: hierarchical_name'
      };
      return res.status(400).json(response);
    }
    
    // 按层次名称查找模块
    const module = await moduleManager.getModuleByName(hierarchical_name);
    
    if (!module) {
      const response: APIResponse = {
        success: false,
        error: `未找到层次名称为 '${hierarchical_name}' 的模块`
      };
      return res.status(404).json(response);
    }
    
    const response: APIResponse<AnyModule> = {
      success: true,
      data: module,
      message: `成功获取模块 '${hierarchical_name}' 的信息`
    };
    
    return res.status(200).json(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : '获取模块信息失败'
    };

    return res.status(500).json(response);
  }
});

/**
 * POST /api/modules
 * 添加新模块
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const moduleData: ModuleRequest = req.body;
    
    // 验证必需参数
    if (!moduleData.name) {
      const response: APIResponse = {
        success: false,
        error: '缺少必需参数: name'
      };
      return res.status(400).json(response);
    }
    
    // 构造模块对象
    const hierarchicalName = moduleData.parent_module ? 
      `${moduleData.parent_module}.${moduleData.name}` : moduleData.name;
    
    const validTypes = ['class', 'function', 'variable', 'file', 'functionGroup'];
    const moduleType = moduleData.type && validTypes.includes(moduleData.type) ? moduleData.type as any : 'file';
    
    const newModule: Partial<AnyModule> = {
      name: moduleData.name,
      hierarchical_name: hierarchicalName,
      description: moduleData.description || '',
      type: moduleType,
      file_path: moduleData.file_path || './default.ts',
      ...(moduleData.parent_module && { parent_module: moduleData.parent_module })
    };
    
    // 添加模块
    const result = await moduleManager.add_module(newModule as AnyModule);
    
    if (!result.success) {
      const response: APIResponse = {
        success: false,
        error: result.error || '添加模块失败'
      };
      return res.status(400).json(response);
    }
    
    // 重新获取添加的模块
    const addedModule = await moduleManager.getModuleByName(hierarchicalName);
    
    if (!addedModule) {
      const response: APIResponse = {
        success: false,
        error: '模块添加后无法找到'
      };
      return res.status(500).json(response);
    }
    
    const response: APIResponse<AnyModule> = {
      success: true,
      data: addedModule,
      message: `成功添加模块 '${addedModule.name}'`
    };
    
    return res.status(201).json(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : '添加模块失败'
    };

    return res.status(500).json(response);
  }
});

/**
 * PUT /api/modules/:hierarchical_name
 * 修改模块信息
 */
router.put('/:hierarchical_name', async (req: Request, res: Response) => {
  try {
    const { hierarchical_name } = req.params;
    const updateData: Partial<ModuleRequest> = req.body;
    
    // 验证参数
    if (!hierarchical_name) {
      const response: APIResponse = {
        success: false,
        error: '缺少必需参数: hierarchical_name'
      };
      return res.status(400).json(response);
    }
    
    // 检查模块是否存在
    const existingModule = await moduleManager.getModuleByName(hierarchical_name);
    if (!existingModule) {
      const response: APIResponse = {
        success: false,
        error: `未找到层次名称为 '${hierarchical_name}' 的模块`
      };
      return res.status(404).json(response);
    }
    
    // 构造更新数据
    const validTypes = ['class', 'function', 'variable', 'file', 'functionGroup'];
    const moduleUpdate: Partial<AnyModule> = {
      ...updateData,
      ...(updateData.type && validTypes.includes(updateData.type) && { type: updateData.type as any })
    };
    
    // 如果提供了无效的type，移除它
    if (updateData.type && !validTypes.includes(updateData.type)) {
      delete (moduleUpdate as any).type;
    }
    
    // 更新模块
    const updateResult = await moduleManager.update_module(hierarchical_name, moduleUpdate);
    
    if (!updateResult.success) {
      const response: APIResponse = {
        success: false,
        error: updateResult.error || '更新模块失败'
      };
      return res.status(500).json(response);
    }
    
    // 重新获取更新后的模块
    const updatedModule = await moduleManager.getModuleByName(hierarchical_name);
    
    if (!updatedModule) {
      const response: APIResponse = {
        success: false,
        error: '模块更新后无法找到'
      };
      return res.status(500).json(response);
    }
    
    const response: APIResponse<AnyModule> = {
      success: true,
      data: updatedModule,
      message: `成功更新模块 '${hierarchical_name}'`
    };
    
    return res.status(200).json(response);
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : '更新模块失败'
    };

    return res.status(500).json(response);
  }
});

/**
 * DELETE /api/modules/:hierarchical_name
 * 删除模块
 */
router.delete('/:hierarchical_name', async (req: Request, res: Response) => {
  try {
    const { hierarchical_name } = req.params;
    
    // 验证参数
    if (!hierarchical_name) {
      const response: APIResponse = {
        success: false,
        error: '缺少必需参数: hierarchical_name'
      };
      return res.status(400).json(response);
    }
    
    // 检查模块是否存在
    const existingModule = await moduleManager.getModuleByName(hierarchical_name);
    if (!existingModule) {
      const response: APIResponse = {
        success: false,
        error: `未找到层次名称为 '${hierarchical_name}' 的模块`
      };
      return res.status(404).json(response);
    }
    
    // 删除模块
    const deleteResult = await moduleManager.delete_module(hierarchical_name);
    const success = deleteResult.success;
    
    if (success) {
      const response: APIResponse = {
        success: true,
        message: `成功删除模块 '${hierarchical_name}'`
      };
      
      return res.status(200).json(response);
    } else {
      const response: APIResponse = {
        success: false,
        error: `删除模块 '${hierarchical_name}' 失败`
      };
      
      return res.status(500).json(response);
    }
  } catch (error) {
    const response: APIResponse = {
      success: false,
      error: error instanceof Error ? error.message : '删除模块失败'
    };
    
    return res.status(500).json(response);
  }
});

export default router;