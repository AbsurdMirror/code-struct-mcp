/**
 * MOD005. 人类交互接口
 * 为人类用户提供基于HTTP的Web接口，通过RESTful API方式实现模块的CRUD操作
 */

import { Module, SearchCriteria } from './module-manager';
import { APIResponse } from '../shared/types';
import * as moduleManager from './module-manager';

// 日志接口定义
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

// 人类交互接口的日志实例
let humanInterfaceLogger: Logger | null = null;

/**
 * 设置人类交互接口的日志实例
 * @param logger 日志实例
 */
export function setHumanInterfaceLogger(logger: Logger): void {
  humanInterfaceLogger = logger;
}

/**
 * 获取日志实例，如果未设置则返回空操作的日志对象
 */
function getLogger(): Logger {
  if (humanInterfaceLogger) {
    return humanInterfaceLogger;
  }
  // 返回空操作的日志对象，避免错误
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

// 数据结构定义

// 参数接口定义（与module-manager.ts保持一致）
export interface Parameter {
  name: string;               // 参数名称
  type: string;               // 参数类型
  defaultValue?: string;      // 默认值
  description?: string;       // 参数描述
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
  
  // function类型特定字段
  parameters?: Parameter[];   // 函数参数列表
  returnType?: string;        // 返回值类型
  class?: string;             // 所属类的hierarchical_name（如果是类成员函数）
  
  // class类型特定字段
  parentClass?: string;       // 父类名称
  functions?: string[];       // 类中的函数列表
  variables?: string[];       // 类中的变量列表
  classes?: string[];         // 类中的嵌套类列表
  
  // variable类型特定字段
  dataType?: string;          // 变量数据类型
  initialValue?: string;      // 初始值
  
  // file类型特定字段
  path?: string;              // 文件完整路径
  // 注意：file的classes、functions、variables字段与class类型字段重复，使用相同字段
  
  // functionGroup类型特定字段
  // 注意：functionGroup的functions字段与class的functions字段重复，使用相同字段
  
  // 通用字段
  access?: 'public' | 'private' | 'protected'; // 访问权限
  file?: string;              // 所属文件路径
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

// 函数列表

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
 * FUNC001. get_root_modules
 * 获取根模块列表
 */
export async function get_root_modules(): Promise<APIResponse<(Module & { hasChildren: boolean })[]>> {
  const logger = getLogger();
  logger.info('开始获取根模块列表');
  
  try {
    // 调用MOD002.find_modules查询parent为空的模块
    const search_criteria: SearchCriteria = {};
    const all_modules = await moduleManager.find_modules(search_criteria);
    logger.debug(`查询到 ${all_modules.length} 个模块`);
    
    // 筛选根模块（parent为空）
    const root_modules = all_modules.filter(module => !module.parent);
    logger.debug(`筛选出 ${root_modules.length} 个根模块`);
    
    // 为每个根模块添加hasChildren字段
    const root_modules_with_children = root_modules.map(module => {
      // 检查是否有子模块
      const hasChildren = all_modules.some(child => child.parent === module.hierarchical_name);
      return {
        ...module,
        hasChildren
      };
    });
    
    const successMsg = '成功获取根模块列表';
    logger.info(successMsg);
    return {
      success: true,
      data: root_modules_with_children,
      message: successMsg
    };
  } catch (error) {
    const errorMsg = `获取根模块列表失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC002. get_module_by_hierarchical_name
 * 按层次名称获取模块信息
 */
export async function get_module_by_hierarchical_name(hierarchical_name: string): Promise<APIResponse<Module>> {
  const logger = getLogger();
  logger.info(`开始获取模块信息: ${hierarchical_name}`);
  
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      const errorMsg = '无效的层次名称格式';
      logger.warn(`${errorMsg}: ${hierarchical_name}`);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`层次名称格式验证通过: ${hierarchical_name}`);

    // 调用MOD002.get_module_by_name查询模块
    const search_criteria: SearchCriteria = {
      hierarchical_name: hierarchical_name
    };
    const modules = await moduleManager.find_modules(search_criteria);
    logger.debug(`查询结果: 找到 ${modules.length} 个匹配的模块`);
    
    // 如果模块不存在：返回404错误
    if (modules.length === 0) {
      const errorMsg = `模块未找到: ${hierarchical_name}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    // 返回模块详细信息
    const successMsg = '成功获取模块信息';
    logger.info(`${successMsg}: ${hierarchical_name}`);
    return {
      success: true,
      data: modules[0],
      message: successMsg
    };
  } catch (error) {
    const errorMsg = `获取模块信息失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`${errorMsg} - ${hierarchical_name}`);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC003. search_modules
 * 关键词搜索模块
 */
export async function search_modules(query: SearchQuery): Promise<APIResponse<Module[]>> {
  const logger = getLogger();
  logger.info(`开始搜索模块: ${JSON.stringify(query)}`);
  
  try {
    // 验证query参数格式
    if (!query.keyword || typeof query.keyword !== 'string' || query.keyword.trim() === '') {
      const errorMsg = '搜索关键词不能为空';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    // 设置默认值
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    logger.debug(`搜索参数: keyword=${query.keyword}, type=${query.type}, limit=${limit}, offset=${offset}`);
    


    // 构建SearchCriteria对象
    const search_criteria: SearchCriteria = {
      keyword: query.keyword.trim(),
      type: query.type
    };
    logger.debug(`构建搜索条件: ${JSON.stringify(search_criteria)}`);
    
    // 调用MOD002.find_modules传入SearchCriteria执行搜索
    const all_results = await moduleManager.find_modules(search_criteria);
    logger.debug(`搜索到 ${all_results.length} 个匹配结果`);
    
    // 应用limit和offset分页
    const paginated_results = all_results.slice(offset, offset + limit);
    logger.debug(`分页处理: 返回 ${paginated_results.length} 个结果`);
    

    
    const successMsg = `搜索完成，找到 ${all_results.length} 个结果，返回 ${paginated_results.length} 个`;
    logger.info(successMsg);
    return {
      success: true,
      data: paginated_results,
      message: successMsg,
      pagination: {
        offset: offset,
        limit: limit,
        total: all_results.length,
        totalPages: Math.ceil(all_results.length / limit)
      }
    };
  } catch (error) {
    const errorMsg = `搜索模块失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC004. add_module
 * 添加新模块
 */
export async function add_module(module_data: ModuleRequest): Promise<APIResponse<Module>> {
  const logger = getLogger();
  logger.info(`开始添加模块: ${module_data.name}`);
  
  try {
    // 验证输入数据的完整性和格式
    if (!module_data.name || typeof module_data.name !== 'string' || module_data.name.trim() === '') {
      const errorMsg = '模块名称不能为空';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    if (!module_data.type || typeof module_data.type !== 'string' || module_data.type.trim() === '') {
      const errorMsg = '模块类型不能为空';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`输入数据验证通过: name=${module_data.name}, type=${module_data.type}`);

    // 构建hierarchical_name
    let hierarchical_name: string;
    if (module_data.parent) {
      hierarchical_name = `${module_data.parent}.${module_data.name}`;
    } else {
      hierarchical_name = module_data.name;
    }
    logger.debug(`构建层次名称: ${hierarchical_name}`);

    // 构建模块对象，根据类型添加特定字段
    const module_obj: any = {
      name: module_data.name,
      hierarchical_name: hierarchical_name,
      type: module_data.type,
      description: module_data.description || '',
      parent: module_data.parent
    };
    
    // 根据模块类型添加特定字段
    if (module_data.type === 'function') {
      if (module_data.parameters) {
        module_obj.parameters = module_data.parameters;
      }
      if (module_data.returnType) {
        module_obj.returnType = module_data.returnType;
      }
    } else if (module_data.type === 'class') {
      if (module_data.parentClass) {
        module_obj.parentClass = module_data.parentClass;
      }
      if (module_data.functions) {
        module_obj.functions = module_data.functions;
      }
      if (module_data.variables) {
        module_obj.variables = module_data.variables;
      }
      if (module_data.classes) {
        module_obj.classes = module_data.classes;
      }
    } else if (module_data.type === 'variable') {
      if (module_data.dataType) {
        module_obj.dataType = module_data.dataType;
      }
      if (module_data.initialValue) {
        module_obj.initialValue = module_data.initialValue;
      }
    }
    
    // 添加通用的access字段
    if (module_data.access) {
      module_obj.access = module_data.access;
    }
    
    logger.debug(`构建模块对象: ${JSON.stringify(module_obj)}`);

    // 调用MOD002.add_module添加模块
    const result = await moduleManager.add_module(module_obj);
    logger.debug(`模块管理器返回结果: ${JSON.stringify(result)}`);
    

    
    if (!result.success) {
      logger.error(`添加模块失败: ${result.message}`);
      return {
        success: false,
        message: result.message,
        data: undefined
      };
    }
    
    // 获取添加的模块数据
    const added_modules = await moduleManager.find_modules({ hierarchical_name: module_obj.hierarchical_name });
    const added_module = added_modules[0];
    logger.debug(`获取添加的模块数据: ${JSON.stringify(added_module)}`);
    
    const successMsg = '模块添加成功';
    logger.info(`${successMsg}: ${hierarchical_name}`);
    return {
      success: true,
      message: successMsg,
      data: added_module
    };
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    logger.error(`添加模块异常: ${error_message}`);
    
    // 根据错误类型返回不同状态码对应的消息
    if (error_message.includes('已存在') || error_message.includes('重复')) {
      const errorMsg = `模块已存在: ${error_message}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    const errorMsg = `添加模块失败: ${error_message}`;
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC005. update_module
 * 修改模块信息
 */
export async function update_module(hierarchical_name: string, update_data: Partial<ModuleRequest>): Promise<APIResponse<Module>> {
  const logger = getLogger();
  logger.info(`开始更新模块: ${hierarchical_name}`);
  
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      const errorMsg = '无效的层次名称格式';
      logger.warn(`${errorMsg}: ${hierarchical_name}`);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`层次名称格式验证通过: ${hierarchical_name}`);

    // 验证更新数据的格式
    if (!update_data || Object.keys(update_data).length === 0) {
      const errorMsg = '更新数据不能为空';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`更新数据: ${JSON.stringify(update_data)}`);

    // 检查模块是否存在
    const search_criteria: SearchCriteria = {
      hierarchical_name: hierarchical_name
    };
    const existing_modules = await moduleManager.find_modules(search_criteria);
    logger.debug(`查询现有模块: 找到 ${existing_modules.length} 个匹配的模块`);
    
    if (existing_modules.length === 0) {
      const errorMsg = `模块未找到: ${hierarchical_name}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    // 构建更新对象（排除name和type字段）
    const update_obj: any = {};
    if (update_data.description !== undefined) {
      update_obj.description = update_data.description;
    }
    if (update_data.parent !== undefined) {
      update_obj.parent = update_data.parent;
    }
    
    // 获取现有模块以确定类型
    const existing_module = existing_modules[0];
    
    // 根据模块类型处理特定字段
    if (existing_module.type === 'function') {
      if (update_data.parameters !== undefined) {
        update_obj.parameters = update_data.parameters;
      }
      if (update_data.returnType !== undefined) {
        update_obj.returnType = update_data.returnType;
      }
    } else if (existing_module.type === 'class') {
      if (update_data.parentClass !== undefined) {
        update_obj.parentClass = update_data.parentClass;
      }
      if (update_data.functions !== undefined) {
        update_obj.functions = update_data.functions;
      }
      if (update_data.variables !== undefined) {
        update_obj.variables = update_data.variables;
      }
      if (update_data.classes !== undefined) {
        update_obj.classes = update_data.classes;
      }
    } else if (existing_module.type === 'variable') {
      if (update_data.dataType !== undefined) {
        update_obj.dataType = update_data.dataType;
      }
      if (update_data.initialValue !== undefined) {
        update_obj.initialValue = update_data.initialValue;
      }
    }
    
    // 处理通用的access字段
    if (update_data.access !== undefined) {
      update_obj.access = update_data.access;
    }
    
    logger.debug(`构建更新对象: ${JSON.stringify(update_obj)}`);

    // 调用MOD002.update_module更新模块
    const result = await moduleManager.update_module(hierarchical_name, update_obj);
    logger.debug(`模块管理器返回结果: ${JSON.stringify(result)}`);
    

    
    if (!result.success) {
      logger.error(`更新模块失败: ${result.message}`);
      return {
        success: false,
        message: result.message,
        data: undefined
      };
    }
    
    // 获取更新后的模块数据
    const updated_modules = await moduleManager.find_modules({ hierarchical_name: hierarchical_name });
    const updated_module = updated_modules[0];
    logger.debug(`获取更新后的模块数据: ${JSON.stringify(updated_module)}`);
    
    const successMsg = '模块更新成功';
    logger.info(`${successMsg}: ${hierarchical_name}`);
    return {
      success: true,
      message: successMsg,
      data: updated_module
    };
  } catch (error) {
    const errorMsg = `更新模块失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`${errorMsg} - ${hierarchical_name}`);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC006. get_module_children
 * 获取指定模块的子模块列表
 */
export async function get_module_children(hierarchical_name: string): Promise<APIResponse<Module[]>> {
  const logger = getLogger();
  logger.info(`开始获取模块子模块: ${hierarchical_name}`);
  
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      const errorMsg = '无效的层次名称格式';
      logger.warn(`${errorMsg}: ${hierarchical_name}`);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`层次名称格式验证通过: ${hierarchical_name}`);



    // 调用MOD002.get_module_relationships获取模块关系
    const relationships = await moduleManager.get_module_relationships(hierarchical_name);
    logger.debug(`获取到关系信息: ${JSON.stringify(relationships)}`);
    
    // 根据子模块名称获取完整的子模块信息
    const children_modules: Module[] = [];
    for (const child_name of relationships.children) {
      const child_hierarchical_name = `${hierarchical_name}.${child_name}`;
      const search_criteria: SearchCriteria = {
        hierarchical_name: child_hierarchical_name
      };
      const child_modules = await moduleManager.find_modules(search_criteria);
      if (child_modules.length > 0) {
        children_modules.push(child_modules[0]);
      }
    }
    logger.debug(`获取到 ${children_modules.length} 个子模块`);
    

    
    const successMsg = `成功获取子模块列表，共 ${children_modules.length} 个子模块`;
    logger.info(`${successMsg}: ${hierarchical_name}`);
    return {
      success: true,
      data: children_modules,
      message: successMsg
    };
  } catch (error) {
    const errorMsg = `获取子模块列表失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(`${errorMsg} - ${hierarchical_name}`);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC007. delete_module
 * 删除模块
 */
export async function delete_module(hierarchical_name: string): Promise<APIResponse<void>> {
  const logger = getLogger();
  logger.info(`开始删除模块: ${hierarchical_name}`);
  
  try {
    // 验证hierarchical_name格式
    if (!validate_hierarchical_name(hierarchical_name)) {
      const errorMsg = '无效的层次名称格式';
      logger.warn(`${errorMsg}: ${hierarchical_name}`);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`层次名称格式验证通过: ${hierarchical_name}`);

    // 检查模块是否存在
    const search_criteria: SearchCriteria = {
      hierarchical_name: hierarchical_name
    };
    const existing_modules = await moduleManager.find_modules(search_criteria);
    logger.debug(`查询现有模块: 找到 ${existing_modules.length} 个匹配的模块`);
    
    if (existing_modules.length === 0) {
      const errorMsg = `模块未找到: ${hierarchical_name}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    // 调用MOD002.delete_module删除模块
    const result = await moduleManager.delete_module(hierarchical_name);
    logger.debug(`模块管理器返回结果: ${JSON.stringify(result)}`);
    

    
    if (!result.success) {
      logger.error(`删除模块失败: ${result.message}`);
      return {
        success: false,
        message: result.message,
        data: undefined
      };
    }
    
    const successMsg = result.message || '模块删除成功';
    logger.info(`${successMsg}: ${hierarchical_name}`);
    return {
      success: true,
      message: successMsg,
      data: undefined
    };
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    logger.error(`删除模块异常: ${error_message} - ${hierarchical_name}`);
    
    // 根据错误类型返回不同状态码对应的消息
    if (error_message.includes('子模块') || error_message.includes('引用') || error_message.includes('依赖')) {
      const errorMsg = `无法删除模块，存在依赖关系: ${error_message}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    const errorMsg = `删除模块失败: ${error_message}`;
    return {
      success: false,
      message: errorMsg
    };
  }
}

// 模块信息
export const MODULE_VERSION = '1.0.0';
export const MODULE_NAME = 'human-interface';
export const MODULE_ID = 'MOD005';