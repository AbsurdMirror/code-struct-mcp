import { load_modules, save_modules, initialize_storage } from './storage';
import { Logger } from './app';

/**
 * 模块管理模块
 * 负责代码模块的创建、读取、更新和删除操作，支持多种代码元素类型的管理
 * 维护模块之间的层级和关联关系，确保代码文档的完整性和一致性
 */

// 模块管理器的日志实例
let moduleManagerLogger: Logger | null = null;

/**
 * 设置模块管理器的日志实例
 * @param logger 日志实例
 */
export function setModuleManagerLogger(logger: Logger): void {
  moduleManagerLogger = logger;
}

/**
 * 获取日志实例，如果未设置则返回空操作的日志对象
 */
function getLogger(): Logger {
  if (moduleManagerLogger) {
    return moduleManagerLogger;
  }
  // 返回空操作的日志对象，避免错误
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

// 参数接口定义
export interface Parameter {
  name: string;           // 参数名称
  type: string;           // 参数类型
  defaultValue?: string;  // 默认值
  description?: string;   // 参数描述
}

// 基础模块接口定义
export interface Module {
  name: string;                // 模块名称（非唯一标识符）
  hierarchical_name: string;   // 层次化唯一标识符（点号分隔路径）
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  description: string;         // 模块描述
  parent?: string;            // 父模块的hierarchical_name
  file?: string;              // 所属文件路径
}

// 类模块扩展接口
export interface ClassModule extends Module {
  type: 'class';
  parentClass?: string;       // 父类名称
  functions?: string[];       // 类中的函数列表
  variables?: string[];       // 类中的变量列表
  classes?: string[];         // 类中的嵌套类列表
  access?: 'public' | 'private' | 'protected'; // 访问权限
}

// 函数模块扩展接口
export interface FunctionModule extends Module {
  type: 'function';
  parameters: Parameter[];    // 函数参数列表
  returnType: string;         // 返回值类型
  access?: 'public' | 'private' | 'protected'; // 访问权限
}

// 变量模块扩展接口
export interface VariableModule extends Module {
  type: 'variable';
  dataType: string;           // 变量数据类型
  initialValue?: string;      // 初始值
  access?: 'public' | 'private' | 'protected'; // 访问权限
}

// 搜索条件接口定义
export interface SearchCriteria {
  hierarchical_name?: string; // 精确匹配的层次化名称
  type?: 'class' | 'function' | 'variable' | 'file' | 'functionGroup'; // 模块类型
  keyword?: string;           // 关键字搜索（匹配描述）
}

// 模块关系接口定义
export interface ModuleRelationship {
  hierarchical_name: string;  // 模块的hierarchical_name
  children: string[];         // 子模块的name列表
  references: string[];       // 引用该模块的模块列表
}

// VAR001. supported_types - 支持的模块类型列表
const supported_types: Array<'class' | 'function' | 'variable' | 'file' | 'functionGroup'> = [
  'class', 'function', 'variable', 'file', 'functionGroup'
];

// VAR002. modules_cache - 内存中的模块数据缓存，键为hierarchical_name，值为模块详情
let modules_cache: { [key: string]: Module } = {};

// VAR003. relationships - 模块关系映射，基于hierarchical_name
let relationships: Record<string, ModuleRelationship> = {};

/**
 * 初始化模块管理器
 * 加载现有的模块数据到缓存中
 */
export function initialize_module_manager(): void {
  const logger = getLogger();
  logger.info('开始初始化模块管理器');
  
  // 加载现有模块数据（存储环境应该已经在外部初始化）
  const loaded_data = load_modules();
  if (loaded_data && loaded_data.modules) {
    modules_cache = loaded_data.modules;
    const moduleCount = Object.keys(modules_cache).length;
    logger.info(`加载了 ${moduleCount} 个模块到缓存`);
    
    // 重建关系映射
    rebuild_relationships();
    logger.debug('模块关系映射重建完成');
  } else {
    logger.info('未找到现有模块数据，使用空缓存');
  }
  
  logger.info('模块管理器初始化完成');
}

/**
 * 清理模块管理器状态（仅用于测试）
 */
export function clear_module_manager(): void {
  modules_cache = {};
  relationships = {};
}

/**
 * 重建模块关系映射
 */
function rebuild_relationships(): void {
  relationships = {};
  
  // 为每个模块初始化关系对象
  for (const [hierarchical_name, module] of Object.entries(modules_cache)) {
    if (!relationships[hierarchical_name]) {
      relationships[hierarchical_name] = {
        hierarchical_name,
        children: [],
        references: []
      };
    }
  }
  
  // 构建父子关系
  for (const [hierarchical_name, module] of Object.entries(modules_cache)) {
    if (module.parent && relationships[module.parent]) {
      if (!relationships[module.parent].children.includes(module.name)) {
        relationships[module.parent].children.push(module.name);
      }
    }
  }
}

/**
 * 验证模块名称格式
 * @param name 模块名称
 * @returns 是否有效
 */
function validate_name_format(name: string): boolean {
  // 只支持字母、数字、下划线，不能以数字开头
  const name_pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return name_pattern.test(name);
}

/**
 * 验证层次化名称格式
 * @param hierarchical_name 层次化名称
 * @returns 是否有效
 */
function validate_hierarchical_name_format(hierarchical_name: string): boolean {
  const parts = hierarchical_name.split('.');
  
  // 检查层数是否超过5层
  if (parts.length > 5) {
    return false;
  }
  
  // 检查每个部分是否符合name格式
  for (const part of parts) {
    if (!validate_name_format(part)) {
      return false;
    }
  }
  
  return true;
}

/**
 * 检查循环引用
 * @param hierarchical_name 当前模块名称
 * @param parent 父模块名称
 * @returns 是否存在循环引用
 */
function check_circular_reference(hierarchical_name: string, parent?: string): boolean {
  if (!parent) {
    return false;
  }
  
  // 检查是否引用自身
  if (parent === hierarchical_name) {
    return true;
  }
  
  // 遍历parent链检查循环
  const visited = new Set<string>();
  let current: string | undefined = parent;
  
  while (current && !visited.has(current)) {
    visited.add(current);
    const current_module: Module | undefined = modules_cache[current];
    if (!current_module) {
      break;
    }
    
    if (current_module.parent === hierarchical_name) {
      return true; // 检测到循环
    }
    
    current = current_module.parent;
  }
  
  return false;
}

/**
 * FUNC001. add_module - 新增模块
 * @param module 模块数据对象
 * @returns 操作结果
 */
export function add_module(module: Module): { success: boolean; message: string } {
  const logger = getLogger();
  logger.info(`开始添加模块: ${module.hierarchical_name}`);
  
  try {
    // 1. CHECK module.name格式
    if (!validate_name_format(module.name)) {
      const errorMsg = `模块名称格式无效: ${module.name}，只支持字母、数字、下划线，不能以数字开头`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`模块名称格式验证通过: ${module.name}`);
    
    // 2. CHECK module.hierarchical_name格式
    const parts = module.hierarchical_name.split('.');
    if (!validate_hierarchical_name_format(module.hierarchical_name)) {
      // 如果是深度超过5层的问题，返回特定的错误消息
      if (parts.length > 5) {
        const errorMsg = '模块嵌套深度不能超过5层';
        logger.warn(errorMsg);
        return {
          success: false,
          message: errorMsg
        };
      }
      const errorMsg = `层次化名称格式无效: ${module.hierarchical_name}，点号分隔，每段符合name格式规范，最大深度5层。实际层数: ${parts.length}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`层级名称格式验证通过: ${module.hierarchical_name}`);
    
    // 3. CHECK module.hierarchical_name在modules_cache中是否已存在
    if (modules_cache[module.hierarchical_name]) {
      const errorMsg = `模块已存在: ${module.hierarchical_name}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`模块不存在，可以添加: ${module.hierarchical_name}`);
    
    // 4. CHECK module.type是否在supported_types中
    if (!supported_types.includes(module.type)) {
      const errorMsg = `不支持的模块类型: ${module.type}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`模块类型验证通过: ${module.type}`);
    
    // 5. CHECK 自引用（优先检查）
    if (module.parent === module.hierarchical_name) {
      const errorMsg = '模块不能引用自身作为父模块';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    // 6. CHECK module.parent是否存在（如果指定了父模块）
    if (module.parent && !modules_cache[module.parent]) {
      const errorMsg = `父模块不存在: ${module.parent}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    if (module.parent) {
      logger.debug(`父模块验证通过: ${module.parent}`);
    } else {
      logger.debug('根模块，无需父模块验证');
    }
    
    // 7. CHECK module.parent是否存在循环引用
    if (check_circular_reference(module.hierarchical_name, module.parent)) {
      const errorMsg = '检测到循环引用';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    // 8. CHECK层次深度是否超过5层
    const depth = module.hierarchical_name.split('.').length;
    if (depth > 5) {
      const errorMsg = '模块嵌套深度不能超过5层';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    
    // 9. 添加模块到缓存
    modules_cache[module.hierarchical_name] = module;
    logger.debug(`模块已添加到缓存: ${module.hierarchical_name}`);
    
    // 10. 更新relationships映射
    if (!relationships[module.hierarchical_name]) {
      relationships[module.hierarchical_name] = {
        hierarchical_name: module.hierarchical_name,
        children: [],
        references: []
      };
    }
    
    // 更新父模块的children列表
    if (module.parent) {
      // 确保父模块的relationships存在
      if (!relationships[module.parent]) {
        relationships[module.parent] = {
          hierarchical_name: module.parent,
          children: [],
          references: []
        };
      }
      
      if (!relationships[module.parent].children.includes(module.name)) {
        relationships[module.parent].children.push(module.name);
      }
    }
    logger.debug('关系映射已更新');
    
    // 11. 调用MOD001.save_modules保存数据
    const save_success = save_modules({ modules: modules_cache });
    if (!save_success) {
      // 回滚操作
      delete modules_cache[module.hierarchical_name];
      delete relationships[module.hierarchical_name];
      const errorMsg = '保存数据失败';
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug('模块数据已保存到存储');
    
    // 12. 返回成功结果
    const successMsg = '模块添加成功';
    logger.info(`${successMsg}: ${module.hierarchical_name}`);
    return {
      success: true,
      message: successMsg
    };
  } catch (error) {
    const errorMsg = `添加模块时发生错误: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC002. find_modules - 查找模块
 * @param criteria 查询条件对象
 * @returns 匹配的模块列表
 */
export function find_modules(criteria: SearchCriteria): Module[] {
  try {
    // 1. 初始化结果数组
    const result: Module[] = [];
    
    // 2. 如果criteria.hierarchical_name存在，直接返回匹配的模块
    if (criteria.hierarchical_name) {
      const module = modules_cache[criteria.hierarchical_name];
      return module ? [module] : [];
    }
    
    // 3. 否则遍历所有模块进行筛选
    for (const module of Object.values(modules_cache)) {
      let matches = true;
      
      // CHECK criteria.type
      if (criteria.type && module.type !== criteria.type) {
        matches = false;
      }
      
      // CHECK criteria.keyword
      if (criteria.keyword && matches) {
        const keyword_lower = criteria.keyword.toLowerCase();
        const name_matches = module.name.toLowerCase().includes(keyword_lower);
        const desc_matches = module.description.toLowerCase().includes(keyword_lower);
        if (!name_matches && !desc_matches) {
          matches = false;
        }
      }
      
      // 4. 将匹配的模块添加到result数组
      if (matches) {
        result.push(module);
      }
    }
    
    // 5. 返回result
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * FUNC003. update_module - 更新模块
 * @param hierarchical_name 要更新的模块hierarchical_name
 * @param updates 要更新的字段和值
 * @returns 操作结果
 */
export function update_module(hierarchical_name: string, updates: Partial<Module>): { success: boolean; message: string } {
  const logger = getLogger();
  logger.info(`开始更新模块: ${hierarchical_name}`);
  
  try {
    // 1. CHECK hierarchical_name是否在modules_cache中
    if (!modules_cache[hierarchical_name]) {
      const errorMsg = `模块不存在: ${hierarchical_name}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug(`模块存在，可以更新: ${hierarchical_name}`);
    
    // 2. CHECK updates是否包含hierarchical_name字段
    if ('hierarchical_name' in updates) {
      const errorMsg = '不允许修改模块的hierarchical_name';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    // 2.1 CHECK updates是否包含name字段
    if ('name' in updates) {
      const errorMsg = '不允许修改模块的name';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    // 2.2 CHECK updates是否包含type字段
    if ('type' in updates) {
      const errorMsg = '不允许修改模块类型';
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    // 3. 如果更新了name，需要验证格式
    if (updates.name && !validate_name_format(updates.name)) {
      const errorMsg = `模块名称格式无效: ${updates.name}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    if (updates.name) {
      logger.debug(`模块名称格式验证通过: ${updates.name}`);
    }

    // 4. 如果更新了type，需要验证是否支持
    if (updates.type && !supported_types.includes(updates.type)) {
      const errorMsg = `不支持的模块类型: ${updates.type}`;
      logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    if (updates.type) {
      logger.debug(`模块类型验证通过: ${updates.type}`);
    }
    
    // 5. CHECK parent是否会产生循环引用
    if ('parent' in updates && updates.parent) {
      const has_circular = check_circular_reference(hierarchical_name, updates.parent);
      if (has_circular) {
        const errorMsg = '检测到循环引用';
        logger.warn(errorMsg);
        return {
          success: false,
          message: errorMsg
        };
      }
      logger.debug(`父模块引用检查通过: ${updates.parent}`);
    }
    
    // 6. 更新模块数据
    Object.assign(modules_cache[hierarchical_name], updates);
    logger.debug(`模块已更新到缓存: ${hierarchical_name}`);
    
    // 7. 更新关系映射
    rebuild_relationships();
    logger.debug('关系映射已更新');
    
    // 8. 调用MOD001.save_modules保存数据
    const save_success = save_modules({ modules: modules_cache });
    if (!save_success) {
      const errorMsg = '保存数据失败';
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }
    logger.debug('模块数据已保存到存储');
    
    // 9. 返回成功结果
    const successMsg = '模块更新成功';
    logger.info(successMsg);
    return {
      success: true,
      message: successMsg
    };
  } catch (error) {
    const errorMsg = `更新模块时发生错误: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);
    return {
      success: false,
      message: errorMsg
    };
  }
}

/**
 * FUNC004. delete_module - 删除模块
 * @param hierarchical_name 要删除的模块hierarchical_name
 * @returns 操作结果
 */
export function delete_module(hierarchical_name: string): { success: boolean; message: string } {
  try {
    // 1. CHECK hierarchical_name是否在modules_cache中
    if (!modules_cache[hierarchical_name]) {
      return {
        success: false,
        message: `模块不存在: ${hierarchical_name}`
      };
    }
    
    // 2. CHECK relationships中是否有子模块
    const module_relationship = relationships[hierarchical_name];
    if (module_relationship && module_relationship.children.length > 0) {
      return {
        success: false,
        message: `模块包含子模块，无法删除: ${hierarchical_name}`
      };
    }
    
    // 3. CHECK relationships中是否有模块引用hierarchical_name
    if (module_relationship && module_relationship.references.length > 0) {
      return {
        success: false,
        message: `模块被引用，无法删除: ${hierarchical_name}`
      };
    }
    
    // 4. 获取要删除的模块信息
    const deleted_module = modules_cache[hierarchical_name];
    
    // 从父模块的children列表中移除
    if (deleted_module && deleted_module.parent && relationships[deleted_module.parent]) {
      const parent_children = relationships[deleted_module.parent].children;
      const index = parent_children.indexOf(deleted_module.name);
      if (index > -1) {
        parent_children.splice(index, 1);
      }
    }
    
    // 删除模块和关系数据
    delete modules_cache[hierarchical_name];
    delete relationships[hierarchical_name];
    
    // 6. 调用MOD001.save_modules保存数据
    const save_success = save_modules({ modules: modules_cache });
    if (!save_success) {
      return {
        success: false,
        message: '保存数据失败'
      };
    }
    
    // 7. 返回成功结果
    return {
      success: true,
      message: '模块删除成功'
    };
  } catch (error) {
    return {
      success: false,
      message: `删除模块失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * FUNC005. get_module_types - 获取模块类型
 * @returns 模块类型列表
 */
export function get_module_types(): Array<'class' | 'function' | 'variable' | 'file' | 'functionGroup'> {
  // 1. 返回supported_types的副本
  return [...supported_types];
}

/**
 * FUNC006. get_module_relationships - 获取模块关系
 * @param hierarchical_name 模块hierarchical_name
 * @returns 模块关系信息
 */
export function get_module_relationships(hierarchical_name: string): ModuleRelationship {
  // 1. CHECK hierarchical_name是否在modules_cache中
  if (!modules_cache[hierarchical_name]) {
    return {
      hierarchical_name,
      children: [],
      references: []
    };
  }
  
  // 2. 返回relationships中的数据或默认值
  return relationships[hierarchical_name] || {
    hierarchical_name,
    children: [],
    references: []
  };
}

// 自动初始化模块管理器
initialize_module_manager();