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

/**
 * 模块版本信息
 */
export const MODULE_VERSION = '1.0.0';
export const MODULE_NAME = '数据存储模块';
export const MODULE_ID = 'MOD001';