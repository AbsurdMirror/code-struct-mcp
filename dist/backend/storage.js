"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialize_storage = initialize_storage;
exports.load_modules = load_modules;
exports.save_modules = save_modules;
exports.validate_data = validate_data;
exports.get_storage_root_path = get_storage_root_path;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
/**
 * 数据存储模块
 * 负责代码文档数据的持久化存储和管理，采用YAML格式存储，提供数据的读写、验证和备份功能
 */
// VAR001. storage_root_path - 存储文档数据的根目录路径
let storage_root_path = '';
// VAR002. config_file - 配置文件路径，固定为"config.yaml"
const config_file = 'config.yaml';
// VAR003. data_file - 主数据文件路径，固定为"modules.yaml"
const data_file = 'modules.yaml';
/**
 * FUNC001. initialize_storage - 初始化存储环境
 * @param custom_path 自定义存储路径，默认为undefined
 * @returns [success: boolean, message: string] - 初始化结果
 */
function initialize_storage(custom_path) {
    try {
        // 1. CHECK custom_path参数有值
        if (custom_path) {
            storage_root_path = custom_path;
        }
        else {
            storage_root_path = path.join(process.cwd(), '.code-doc-mcp');
        }
        // 2. CHECK storage_root_path目录是否存在
        if (!fs.existsSync(storage_root_path)) {
            fs.mkdirSync(storage_root_path, { recursive: true });
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
        }
        // 4. CHECK data_file文件是否存在
        const data_file_path = path.join(storage_root_path, data_file);
        if (!fs.existsSync(data_file_path)) {
            // 创建空的数据文件
            const empty_data = { modules: {} };
            fs.writeFileSync(data_file_path, yaml.dump(empty_data), 'utf8');
        }
        // 5. 返回初始化结果
        return [true, `存储环境初始化成功，路径: ${storage_root_path}`];
    }
    catch (error) {
        return [false, `存储环境初始化失败: ${error instanceof Error ? error.message : String(error)}`];
    }
}
/**
 * FUNC002. load_modules - 加载所有模块数据
 * @returns modules - 模块数据字典
 */
function load_modules() {
    try {
        // 1. 构建完整文件路径
        const data_file_path = path.join(storage_root_path, data_file);
        // 2. CHECK data_file文件是否存在
        if (!fs.existsSync(data_file_path)) {
            return {};
        }
        // 3. 读取文件内容并解析YAML格式数据
        const file_content = fs.readFileSync(data_file_path, 'utf8');
        const parsed_data = yaml.load(file_content);
        // 4. 调用validate_data函数验证数据完整性
        const [is_valid, errors] = validate_data(parsed_data || {});
        if (!is_valid) {
            console.warn('数据验证失败:', errors);
            return {};
        }
        // 5. 返回解析后的modules数据字典
        return parsed_data || {};
    }
    catch (error) {
        console.error('加载模块数据失败:', error);
        return {};
    }
}
/**
 * FUNC003. save_modules - 保存模块数据
 * @param modules 要保存的模块数据
 * @returns success - 保存是否成功
 */
function save_modules(modules) {
    try {
        // 1. 调用validate_data函数验证modules数据格式
        const [is_valid, errors] = validate_data(modules);
        if (!is_valid) {
            console.error('数据验证失败:', errors);
            return false;
        }
        // 2. 构建完整文件路径
        const data_file_path = path.join(storage_root_path, data_file);
        // 3. CHECK data_file文件是否存在，如果存在则创建备份
        if (fs.existsSync(data_file_path)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backup_path = path.join(storage_root_path, `modules_backup_${timestamp}.yaml`);
            fs.copyFileSync(data_file_path, backup_path);
        }
        // 4. 将modules数据序列化为YAML格式字符串
        const yaml_content = yaml.dump(modules);
        // 5. 写入YAML字符串到data_file文件
        fs.writeFileSync(data_file_path, yaml_content, 'utf8');
        // 6. 返回保存结果
        return true;
    }
    catch (error) {
        console.error('保存模块数据失败:', error);
        return false;
    }
}
/**
 * FUNC004. validate_data - 验证数据完整性
 * @param data 待验证的数据
 * @returns [is_valid: boolean, errors: string[]] - 验证结果
 */
function validate_data(data) {
    const errors = [];
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
        const module_obj = module_data;
        // CHECK每个模块是否包含"name"字段
        if (!('name' in module_obj)) {
            errors.push(`模块 ${module_id} 缺少必需的name字段`);
        }
        // CHECK每个模块是否包含"type"字段
        if (!('type' in module_obj)) {
            errors.push(`模块 ${module_id} 缺少必需的type字段`);
        }
        else {
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
function get_storage_root_path() {
    return storage_root_path;
}
//# sourceMappingURL=storage.js.map