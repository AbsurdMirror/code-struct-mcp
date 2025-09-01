"use strict";
/**
 * 数据存储模块主入口文件
 * 导出所有核心功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_ID = exports.MODULE_NAME = exports.MODULE_VERSION = exports.get_storage_root_path = exports.validate_data = exports.save_modules = exports.load_modules = exports.initialize_storage = void 0;
var storage_1 = require("./storage");
Object.defineProperty(exports, "initialize_storage", { enumerable: true, get: function () { return storage_1.initialize_storage; } });
Object.defineProperty(exports, "load_modules", { enumerable: true, get: function () { return storage_1.load_modules; } });
Object.defineProperty(exports, "save_modules", { enumerable: true, get: function () { return storage_1.save_modules; } });
Object.defineProperty(exports, "validate_data", { enumerable: true, get: function () { return storage_1.validate_data; } });
Object.defineProperty(exports, "get_storage_root_path", { enumerable: true, get: function () { return storage_1.get_storage_root_path; } });
/**
 * 模块版本信息
 */
exports.MODULE_VERSION = '1.0.0';
exports.MODULE_NAME = '数据存储模块';
exports.MODULE_ID = 'MOD001';
//# sourceMappingURL=index.js.map