/**
 * FUNC001. initialize_storage - 初始化存储环境
 * @param custom_path 自定义存储路径，默认为undefined
 * @returns [success: boolean, message: string] - 初始化结果
 */
export declare function initialize_storage(custom_path?: string): [boolean, string];
/**
 * FUNC002. load_modules - 加载所有模块数据
 * @returns modules - 模块数据字典
 */
export declare function load_modules(): Record<string, any>;
/**
 * FUNC003. save_modules - 保存模块数据
 * @param modules 要保存的模块数据
 * @returns success - 保存是否成功
 */
export declare function save_modules(modules: Record<string, any>): boolean;
/**
 * FUNC004. validate_data - 验证数据完整性
 * @param data 待验证的数据
 * @returns [is_valid: boolean, errors: string[]] - 验证结果
 */
export declare function validate_data(data: any): [boolean, string[]];
/**
 * 获取当前存储根路径
 * @returns 存储根路径
 */
export declare function get_storage_root_path(): string;
//# sourceMappingURL=storage.d.ts.map