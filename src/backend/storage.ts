import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from './app';

/**
 * 数据存储模块
 * 负责代码文档数据的持久化存储和管理，采用YAML格式存储，提供数据的读写、验证和备份功能
 */

// 存储模块的日志实例
let storageLogger: Logger | null = null;

/**
 * 设置存储模块的日志实例
 * @param logger 日志实例
 */
export function setStorageLogger(logger: Logger): void {
  storageLogger = logger;
}

/**
 * 获取日志实例，如果未设置则返回空操作的日志对象
 */
function getLogger(): Logger {
  if (storageLogger) {
    return storageLogger;
  }
  // 返回空操作的日志对象，避免错误
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

// VAR001. storage_root_path - 存储文档数据的根目录路径
let storage_root_path: string = '';

// VAR002. config_file - 配置文件路径，固定为"config.yaml"
const config_file: string = 'config.yaml';

// VAR003. data_file - 主数据文件路径，固定为"modules.yaml"
const data_file: string = 'modules.yaml';

/**
 * FUNC001. initialize_storage - 初始化存储环境
 * @param custom_path 自定义存储路径，默认为undefined
 * @returns [success: boolean, message: string] - 初始化结果
 */
export function initialize_storage(custom_path?: string): [boolean, string] {
  const logger = getLogger();
  
  try {
    logger.info('开始初始化存储环境');
    
    // 1. CHECK custom_path参数有值
    if (custom_path) {
      storage_root_path = custom_path;
      logger.info(`使用自定义存储路径: ${custom_path}`);
    } else {
      storage_root_path = path.join(process.cwd(), '.code-doc-mcp');
      logger.info(`使用默认存储路径: ${storage_root_path}`);
    }

    // 2. CHECK storage_root_path目录是否存在
    if (!fs.existsSync(storage_root_path)) {
      fs.mkdirSync(storage_root_path, { recursive: true });
      logger.info(`创建存储目录: ${storage_root_path}`);
    } else {
      logger.info(`存储目录已存在: ${storage_root_path}`);
    }

    // 3. CHECK config_file文件是否存在
    const config_file_path = path.join(storage_root_path, config_file);
    if (!fs.existsSync(config_file_path)) {
      // 创建空的配置文件
      const default_config = {
        version: '1.0.0',
        created_at: new Date().toISOString()
      };
      fs.writeFileSync(config_file_path, yaml.dump(default_config), 'utf8');
      logger.info(`创建配置文件: ${config_file_path}`);
    } else {
      logger.info(`配置文件已存在: ${config_file_path}`);
    }

    // 4. CHECK data_file文件是否存在
    const data_file_path = path.join(storage_root_path, data_file);
    if (!fs.existsSync(data_file_path)) {
      // 创建空的数据文件
      const empty_data = { modules: {} };
      fs.writeFileSync(data_file_path, yaml.dump(empty_data), 'utf8');
      logger.info(`创建数据文件: ${data_file_path}`);
    } else {
      logger.info(`数据文件已存在: ${data_file_path}`);
    }

    // 5. 返回初始化结果
    const successMessage = `存储环境初始化成功，路径: ${storage_root_path}`;
    logger.info(successMessage);
    return [true, successMessage];
  } catch (error) {
    const errorMessage = `存储环境初始化失败: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMessage);
    return [false, errorMessage];
  }
}

/**
 * FUNC002. load_modules - 加载所有模块数据
 * @returns modules - 模块数据字典
 */
export function load_modules(): Record<string, any> {
  const logger = getLogger();
  
  try {
    logger.debug('开始加载模块数据');
    
    // 1. 构建完整文件路径
    const data_file_path = path.join(storage_root_path, data_file);
    logger.debug(`数据文件路径: ${data_file_path}`);

    // 2. CHECK data_file文件是否存在
    if (!fs.existsSync(data_file_path)) {
      logger.warn(`数据文件不存在: ${data_file_path}`);
      return {};
    }

    // 3. 读取文件内容并解析YAML格式数据
    const file_content = fs.readFileSync(data_file_path, 'utf8');
    const parsed_data = yaml.load(file_content) as Record<string, any>;
    logger.debug('成功解析YAML数据');

    // 4. 调用validate_data函数验证数据完整性
    const [is_valid, errors] = validate_data(parsed_data || {});
    if (!is_valid) {
      logger.error(`数据验证失败: ${errors.join(', ')}`);
      return {};
    }

    // 5. 返回解析后的modules数据字典
    const moduleCount = parsed_data?.modules ? Object.keys(parsed_data.modules).length : 0;
    logger.info(`成功加载 ${moduleCount} 个模块`);
    return parsed_data || {};
  } catch (error) {
    logger.error(`加载模块数据失败: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

/**
 * FUNC003. save_modules - 保存模块数据
 * @param modules 要保存的模块数据
 * @returns success - 保存是否成功
 */
export function save_modules(modules: Record<string, any>): boolean {
  const logger = getLogger();
  
  try {
    logger.debug('开始保存模块数据');
    
    // 1. 调用validate_data函数验证modules数据格式
    const [is_valid, errors] = validate_data(modules);
    if (!is_valid) {
      logger.error(`数据验证失败: ${errors.join(', ')}`);
      return false;
    }
    logger.debug('数据验证通过');

    // 2. 构建完整文件路径
    const data_file_path = path.join(storage_root_path, data_file);
    logger.debug(`数据文件路径: ${data_file_path}`);

    // 3. CHECK data_file文件是否存在，如果存在则创建备份
    if (fs.existsSync(data_file_path)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backup_path = path.join(storage_root_path, `modules_backup_${timestamp}.yaml`);
      fs.copyFileSync(data_file_path, backup_path);
      logger.info(`创建备份文件: ${backup_path}`);
    }

    // 4. 将modules数据序列化为YAML格式字符串
    const yaml_content = yaml.dump(modules);
    logger.debug('成功序列化数据为YAML格式');

    // 5. 写入YAML字符串到data_file文件
    fs.writeFileSync(data_file_path, yaml_content, 'utf8');
    
    const moduleCount = modules?.modules ? Object.keys(modules.modules).length : 0;
    logger.info(`成功保存 ${moduleCount} 个模块到文件: ${data_file_path}`);

    // 6. 返回保存结果
    return true;
  } catch (error) {
    logger.error(`保存模块数据失败: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * FUNC004. validate_data - 验证数据完整性
 * @param data 待验证的数据
 * @returns [is_valid: boolean, errors: string[]] - 验证结果
 */
export function validate_data(data: any): [boolean, string[]] {
  const errors: string[] = [];

  // 1. CHECK data是否为字典类型
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    errors.push('数据必须是字典类型');
    return [false, errors];
  }

  // 2. CHECK data是否包含"modules"键
  if (!('modules' in data)) {
    errors.push('缺少必需的modules字段');
    return [false, errors];
  }

  // 3. CHECK data["modules"]是否为字典类型
  if (typeof data.modules !== 'object' || data.modules === null || Array.isArray(data.modules)) {
    errors.push('modules必须是字典类型');
    return [false, errors];
  }

  // 4. 遍历每个模块验证必需字段
  const valid_types = ['class', 'function', 'variable', 'file', 'functionGroup'];
  
  for (const [module_id, module_data] of Object.entries(data.modules)) {
    if (typeof module_data !== 'object' || module_data === null || Array.isArray(module_data)) {
      errors.push(`模块 ${module_id} 必须是对象类型`);
      continue;
    }

    const module_obj = module_data as Record<string, any>;

    // CHECK每个模块是否包含"name"字段
    if (!('name' in module_obj)) {
      errors.push(`模块 ${module_id} 缺少必需的name字段`);
    }

    // CHECK每个模块是否包含"type"字段
    if (!('type' in module_obj)) {
      errors.push(`模块 ${module_id} 缺少必需的type字段`);
    } else {
      // CHECK type字段值是否在有效范围内
      if (!valid_types.includes(module_obj.type)) {
        errors.push(`模块 ${module_id} 的type字段值无效，必须是: ${valid_types.join(', ')} 中的一个`);
      }
    }
  }

  // 5. 返回验证结果
  const is_valid = errors.length === 0;
  return [is_valid, errors];
}

/**
 * 获取当前存储根路径
 * @returns 存储根路径
 */
export function get_storage_root_path(): string {
  return storage_root_path;
}