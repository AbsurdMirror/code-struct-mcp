/**
 * MOD005. 人类交互接口
 * 为人类用户提供基于HTTP的Web接口，通过RESTful API方式实现模块的CRUD操作
 */

import { Module, SearchCriteria } from './module-manager';
import * as moduleManager from './module-manager';

// 数据结构定义

/**
 * API响应接口定义
 */
export interface APIResponse<T = any> {
  success: boolean;  // 操作是否成功
  data?: T;         // 返回数据
  message?: string; // 提示信息或错误详情
}

/**
 * 模块请求接口定义
 */
export interface ModuleRequest {
  name: string;         // 模块名称
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  description?: string; // 模块描述
  content?: string;     // 模块内容
  parent?: string;      // 父模块层次名称
}

/**
 * 搜索查询接口定义
 */
export interface SearchQuery {
  keyword: string;                                                    // 搜索关键词（匹配模块名称和描述）
  type?: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型筛选
  limit?: number;                                                     // 返回结果数量限制，默认20
  offset?: number;                                                    // 结果偏移量，默认0
}

// 变量列表

/**
 * VAR001. request_cache
 * 请求缓存，存储常用查询结果以提高响应速度
 */
const request_cache: Record<string, any> = {};

// 辅助函数

/**
 * 验证层次名称格式
 */
function validate_hierarchical_name(hierarchical_name: string): boolean {
  if (!hierarchical_name || typeof hierarchical_name !== 'string') {
    return false;
  }
  // 验证层次化名称格式：点号分隔，每段符合name格式规范，最大深度5层
  const parts = hierarchical_name.split('.');
  if (parts.length > 5) {
    return false;
  }
  const name_pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return parts.every(part => name_pattern.test(part));
}

/**
 * 生成缓存键
 */
function generate_cache_key(prefix: string, params: any): string {
  return `${prefix}_${JSON.stringify(params)}`;
}

/**
 * 设置缓存
 */
function set_cache(key: string, value: any, ttl: number = 300000): void { // 默认5分钟TTL
  request_cache[key] = {
    value,
    expires: Date.now() + ttl
  };
}

/**
 * 获取缓存
 */
function get_cache(key: string): any {
  const cached = request_cache[key];
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  // 清理过期缓存
  if (cached) {
    delete request_cache[key];
  }
  return null;
}

/**
 * 清理所有缓存（仅用于测试）
 */
export function clear_cache(): void {
  Object.keys(request_cache).forEach(key => {
    delete request_cache[key];
  });
}

// 函数列表

/**
 * FUNC001. get_root_modules
 * 获取根模块列表
 */
export function get_root_modules(): APIResponse<Module[]> {
  try {
    // 检查缓存中是否存在根模块列表
    const cache_key = generate_cache_key('root_modules', {});
    const cached_result = get_cache(cache_key);
    if (cached_result) {
      return {
        success: true,
        data: cached_result,
        message: '成功获取根模块列表（缓存）'
      };
    }

    // 调用MOD002.find_modules查询parent为空的模块
    const search_criteria: SearchCriteria = {};
    const all_modules = moduleManager.find_modules(search_criteria);
    
    // 筛选根模块（parent为空）
    const root_modules = all_modules.filter(module => !module.parent);
    
    // 缓存查询结果
    set_cache(cache_key, root_modules);
    
    return {
      success: true,
      data: root_modules,
      message: '成功获取根模块列表'
    };
  } catch (error) {
    return {
      success: false,
      message: `获取根模块列表失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * FUNC002. get_module_by_hierarchical_name
 * 按层次名称获取模块信息
 */
export function get_module_by_hierarchical_name(hierarchical_name: string): APIResponse<Module> {
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      return {
        success: false,
        message: '无效的层次名称格式'
      };
    }

    // 调用MOD002.get_module_by_name查询模块
    const search_criteria: SearchCriteria = {
      hierarchical_name: hierarchical_name
    };
    const modules = moduleManager.find_modules(search_criteria);
    
    // 如果模块不存在：返回404错误
    if (modules.length === 0) {
      return {
        success: false,
        message: `模块未找到: ${hierarchical_name}`
      };
    }
    
    // 返回模块详细信息
    return {
      success: true,
      data: modules[0],
      message: '成功获取模块信息'
    };
  } catch (error) {
    return {
      success: false,
      message: `获取模块信息失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * FUNC003. search_modules
 * 关键词搜索模块
 */
export function search_modules(query: SearchQuery): APIResponse<Module[]> {
  try {
    // 验证query参数格式
    if (!query.keyword || typeof query.keyword !== 'string' || query.keyword.trim() === '') {
      return {
        success: false,
        message: '搜索关键词不能为空'
      };
    }

    // 设置默认值
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    
    // 检查缓存中是否存在搜索结果
    const cache_key = generate_cache_key('search', { keyword: query.keyword, type: query.type, limit, offset });
    const cached_result = get_cache(cache_key);
    if (cached_result) {
      return {
        success: true,
        data: cached_result,
        message: '搜索完成（缓存）'
      };
    }

    // 构建SearchCriteria对象
    const search_criteria: SearchCriteria = {
      keyword: query.keyword.trim(),
      type: query.type
    };
    
    // 调用MOD002.find_modules传入SearchCriteria执行搜索
    const all_results = moduleManager.find_modules(search_criteria);
    
    // 应用limit和offset分页
    const paginated_results = all_results.slice(offset, offset + limit);
    
    // 缓存搜索结果
    set_cache(cache_key, paginated_results);
    
    return {
      success: true,
      data: paginated_results,
      message: `搜索完成，找到 ${all_results.length} 个结果，返回 ${paginated_results.length} 个`
    };
  } catch (error) {
    return {
      success: false,
      message: `搜索模块失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * FUNC004. add_module
 * 添加新模块
 */
export function add_module(module_data: ModuleRequest): APIResponse<Module> {
  try {
    // 验证输入数据的完整性和格式
    if (!module_data.name || typeof module_data.name !== 'string' || module_data.name.trim() === '') {
      return {
        success: false,
        message: '模块名称不能为空'
      };
    }
    
    if (!module_data.type || typeof module_data.type !== 'string' || module_data.type.trim() === '') {
      return {
        success: false,
        message: '模块类型不能为空'
      };
    }

    // 构建hierarchical_name
    let hierarchical_name: string;
    if (module_data.parent) {
      hierarchical_name = `${module_data.parent}.${module_data.name}`;
    } else {
      hierarchical_name = module_data.name;
    }

    // 构建模块对象
    const module_obj: Module = {
      name: module_data.name,
      hierarchical_name: hierarchical_name,
      type: module_data.type,
      description: module_data.description || '',
      parent: module_data.parent
    };

    // 调用MOD002.add_module添加模块
    const result = moduleManager.add_module(module_obj);
    
    // 清理相关缓存
    Object.keys(request_cache).forEach(key => {
      if (key.startsWith('root_modules') || key.startsWith('search')) {
        delete request_cache[key];
      }
    });
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
        data: undefined
      };
    }
    
    // 获取添加的模块数据
    const added_module = moduleManager.find_modules({ hierarchical_name: module_obj.hierarchical_name })[0];
    
    return {
      success: true,
      message: result.message,
      data: added_module
    };
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    
    // 根据错误类型返回不同状态码对应的消息
    if (error_message.includes('已存在') || error_message.includes('重复')) {
      return {
        success: false,
        message: `模块已存在: ${error_message}`
      };
    }
    
    return {
      success: false,
      message: `添加模块失败: ${error_message}`
    };
  }
}

/**
 * FUNC005. update_module
 * 修改模块信息
 */
export function update_module(hierarchical_name: string, update_data: Partial<ModuleRequest>): APIResponse<Module> {
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      return {
        success: false,
        message: '无效的层次名称格式'
      };
    }

    // 验证更新数据的格式
    if (!update_data || Object.keys(update_data).length === 0) {
      return {
        success: false,
        message: '更新数据不能为空'
      };
    }

    // 检查模块是否存在
    const search_criteria: SearchCriteria = {
      hierarchical_name: hierarchical_name
    };
    const existing_modules = moduleManager.find_modules(search_criteria);
    
    if (existing_modules.length === 0) {
      return {
        success: false,
        message: `模块未找到: ${hierarchical_name}`
      };
    }

    // 构建更新对象（排除name和type字段）
    const update_obj: Partial<Module> = {};
    if (update_data.description !== undefined) {
      update_obj.description = update_data.description;
    }
    if (update_data.parent !== undefined) {
      update_obj.parent = update_data.parent;
    }

    // 调用MOD002.update_module更新模块
    const result = moduleManager.update_module(hierarchical_name, update_obj);
    
    // 清理相关缓存
    Object.keys(request_cache).forEach(key => {
      if (key.startsWith('root_modules') || key.startsWith('search')) {
        delete request_cache[key];
      }
    });
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
        data: undefined
      };
    }
    
    // 获取更新后的模块数据
    const updated_module = moduleManager.find_modules({ hierarchical_name: hierarchical_name })[0];
    
    return {
      success: true,
      message: result.message,
      data: updated_module
    };
  } catch (error) {
    return {
      success: false,
      message: `更新模块失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * FUNC006. delete_module
 * 删除模块
 */
export function delete_module(hierarchical_name: string): APIResponse<void> {
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      return {
        success: false,
        message: '无效的层次名称格式'
      };
    }

    // 检查模块是否存在
    const search_criteria: SearchCriteria = {
      hierarchical_name: hierarchical_name
    };
    const existing_modules = moduleManager.find_modules(search_criteria);
    
    if (existing_modules.length === 0) {
      return {
        success: false,
        message: `模块未找到: ${hierarchical_name}`
      };
    }

    // 调用MOD002.delete_module删除模块
    const result = moduleManager.delete_module(hierarchical_name);
    
    // 清理相关缓存
    Object.keys(request_cache).forEach(key => {
      if (key.startsWith('root_modules') || key.startsWith('search')) {
        delete request_cache[key];
      }
    });
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
        data: undefined
      };
    }
    
    return {
      success: true,
      message: result.message,
      data: undefined
    };
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    
    // 根据错误类型返回不同状态码对应的消息
    if (error_message.includes('子模块') || error_message.includes('引用') || error_message.includes('依赖')) {
      return {
        success: false,
        message: `无法删除模块，存在依赖关系: ${error_message}`
      };
    }
    
    return {
      success: false,
      message: `删除模块失败: ${error_message}`
    };
  }
}

// 模块信息
export const MODULE_VERSION = '1.0.0';
export const MODULE_NAME = 'human-interface';
export const MODULE_ID = 'MOD005';