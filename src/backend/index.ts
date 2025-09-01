/**
 * 数据存储模块主入口文件
 * 导出所有核心功能
 */

export {
  initialize_storage,
  load_modules,
  save_modules,
  validate_data,
  get_storage_root_path
} from './storage';

export {
  initialize_module_manager,
  find_modules,
  add_module,
  update_module,
  delete_module
} from './module-manager';

// human-interface模块的函数通过server.ts启动

/**
 * 模块版本信息
 */
export const MODULE_VERSION = '1.0.0';
export const MODULE_NAME = '代码文档数据存储模块';
export const MODULE_ID = 'MOD001';

// 主启动逻辑已移至server.ts文件