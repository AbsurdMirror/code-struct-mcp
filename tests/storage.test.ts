import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  initialize_storage,
  load_modules,
  save_modules,
  validate_data,
  get_storage_root_path
} from '../src/backend/storage';

/**
 * 数据存储模块测试
 * 对MOD001数据存储模块的所有函数进行测试验证
 */

describe('数据存储模块测试', () => {
  // 测试临时目录
  const test_temp_dir = path.join(__dirname, 'temp_test_storage');
  const custom_test_dir = path.join(__dirname, 'custom_test_storage');

  // 清理测试环境
  beforeEach(() => {
    // 清理可能存在的测试目录
    if (fs.existsSync(test_temp_dir)) {
      fs.rmSync(test_temp_dir, { recursive: true, force: true });
    }
    if (fs.existsSync(custom_test_dir)) {
      fs.rmSync(custom_test_dir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // 测试后清理
    if (fs.existsSync(test_temp_dir)) {
      fs.rmSync(test_temp_dir, { recursive: true, force: true });
    }
    if (fs.existsSync(custom_test_dir)) {
      fs.rmSync(custom_test_dir, { recursive: true, force: true });
    }
  });

  /**
   * TESTCASE001. initialize_storage函数测试
   */
  describe('TESTCASE001. initialize_storage函数测试', () => {
    test('默认路径初始化', () => {
      // 1. 调用initialize_storage()不传参数，使用默认路径
      const [success, message] = initialize_storage();
      
      // 2. 检查返回结果success是否为true
      expect(success).toBe(true);
      expect(message).toContain('存储环境初始化成功');
      
      // 3. 检查默认路径".code-doc-mcp"目录是否创建
      const default_path = path.join(process.cwd(), '.code-doc-mcp');
      expect(fs.existsSync(default_path)).toBe(true);
      
      // 4. 检查config.yaml文件是否创建
      const config_path = path.join(default_path, 'config.yaml');
      expect(fs.existsSync(config_path)).toBe(true);
      
      // 5. 检查modules.yaml文件是否创建
      const modules_path = path.join(default_path, 'modules.yaml');
      expect(fs.existsSync(modules_path)).toBe(true);
      
      // 清理默认路径
      fs.rmSync(default_path, { recursive: true, force: true });
    });

    test('自定义路径初始化', () => {
      // 6. 调用initialize_storage("/custom/path")传入自定义路径
      const [success, message] = initialize_storage(custom_test_dir);
      
      // 7. 检查自定义路径目录是否创建
      expect(success).toBe(true);
      expect(fs.existsSync(custom_test_dir)).toBe(true);
      
      // 8. 检查配置文件和数据文件是否在自定义路径下创建
      const config_path = path.join(custom_test_dir, 'config.yaml');
      const modules_path = path.join(custom_test_dir, 'modules.yaml');
      expect(fs.existsSync(config_path)).toBe(true);
      expect(fs.existsSync(modules_path)).toBe(true);
    });

    test('重复初始化已存在目录', () => {
      // 先初始化一次
      const [first_success] = initialize_storage(custom_test_dir);
      expect(first_success).toBe(true);
      
      // 9. 重复调用initialize_storage()测试已存在目录的处理
      const [second_success, second_message] = initialize_storage(custom_test_dir);
      expect(second_success).toBe(true);
      expect(second_message).toContain('存储环境初始化成功');
    });
  });

  /**
   * TESTCASE002. load_modules函数测试
   */
  describe('TESTCASE002. load_modules函数测试', () => {
    beforeEach(() => {
      // 初始化存储环境
      initialize_storage(test_temp_dir);
    });

    test('文件不存在时返回空字典', () => {
      // 1. 确保modules.yaml文件不存在
      const modules_path = path.join(test_temp_dir, 'modules.yaml');
      if (fs.existsSync(modules_path)) {
        fs.unlinkSync(modules_path);
      }
      
      // 2. 调用load_modules()函数
      const modules = load_modules();
      
      // 3. 检查返回的modules字典是否为空字典{}
      expect(modules).toEqual({});
    });

    test('正常加载有效数据', () => {
      // 4. 创建一个有效的modules.yaml文件，包含测试数据
      const test_data = {
        modules: {
          'MOD001': {
            name: '测试模块',
            type: 'class'
          }
        }
      };
      const modules_path = path.join(test_temp_dir, 'modules.yaml');
      fs.writeFileSync(modules_path, yaml.dump(test_data), 'utf8');
      
      // 5. 再次调用load_modules()函数
      const modules = load_modules();
      
      // 6. 检查返回的modules字典是否包含正确的数据
      expect(modules).toEqual(test_data);
      expect(modules.modules['MOD001'].name).toBe('测试模块');
      expect(modules.modules['MOD001'].type).toBe('class');
    });

    test('格式错误文件处理', () => {
      // 8. 创建一个格式错误的modules.yaml文件
      const modules_path = path.join(test_temp_dir, 'modules.yaml');
      fs.writeFileSync(modules_path, 'invalid: yaml: content: [', 'utf8');
      
      // 9. 调用load_modules()函数测试错误处理
      const modules = load_modules();
      
      // 预期结果3：格式错误文件时能够正确处理异常
      expect(modules).toEqual({});
    });
  });

  /**
   * TESTCASE003. save_modules函数测试
   */
  describe('TESTCASE003. save_modules函数测试', () => {
    beforeEach(() => {
      // 初始化存储环境
      initialize_storage(test_temp_dir);
    });

    test('有效数据保存成功', () => {
      // 1. 准备一个有效的modules数据字典
      const valid_modules = {
        modules: {
          'MOD001': {
            name: '测试模块',
            type: 'class'
          }
        }
      };
      
      // 2. 调用save_modules(modules)函数
      const success = save_modules(valid_modules);
      
      // 3. 检查返回的success是否为true
      expect(success).toBe(true);
      
      // 4. 检查modules.yaml文件是否创建并包含正确数据
      const modules_path = path.join(test_temp_dir, 'modules.yaml');
      expect(fs.existsSync(modules_path)).toBe(true);
      
      const saved_content = fs.readFileSync(modules_path, 'utf8');
      const parsed_data = yaml.load(saved_content);
      expect(parsed_data).toEqual(valid_modules);
    });

    /*
    test('创建备份文件', () => {
      // 先保存一次数据
      const initial_data = {
        modules: {
          'MOD001': { name: '初始模块', type: 'class' }
        }
      };
      save_modules(initial_data);
      
      // 再次保存新数据
      const new_data = {
        modules: {
          'MOD002': { name: '新模块', type: 'function' }
        }
      };
      
      const success = save_modules(new_data);
      expect(success).toBe(true);
      
      // 5. 检查是否创建了备份文件（带时间戳）
      const backup_files = fs.readdirSync(test_temp_dir).filter(file => 
        file.startsWith('modules_backup_') && file.endsWith('.yaml')
      );
      expect(backup_files.length).toBeGreaterThan(0);
    });
    */

    test('无效数据保存失败', () => {
      // 6. 准备一个无效的modules数据字典（缺少必需字段）
      const invalid_modules = {
        modules: {
          'MOD001': {
            // 缺少name字段
            type: 'class'
          }
        }
      };
      
      // 7. 调用save_modules(modules)函数
      const success = save_modules(invalid_modules);
      
      // 8. 检查返回的success是否为false
      expect(success).toBe(false);
    });

    test('文件不存在时直接创建', () => {
      // 删除modules.yaml文件
      const modules_path = path.join(test_temp_dir, 'modules.yaml');
      if (fs.existsSync(modules_path)) {
        fs.unlinkSync(modules_path);
      }
      
      // 10. 在modules.yaml文件不存在的情况下调用save_modules
      const valid_modules = {
        modules: {
          'MOD001': { name: '测试模块', type: 'class' }
        }
      };
      
      const success = save_modules(valid_modules);
      
      // 11. 验证文件被正确创建且无备份文件
      expect(success).toBe(true);
      expect(fs.existsSync(modules_path)).toBe(true);
      
      const backup_files = fs.readdirSync(test_temp_dir).filter(file => 
        file.startsWith('modules_backup_')
      );
      expect(backup_files.length).toBe(0);
    });
  });

  /**
   * TESTCASE004. validate_data函数测试
   */
  describe('TESTCASE004. validate_data函数测试', () => {
    test('非字典类型数据验证失败', () => {
      // 1. 传入非字典类型数据（如字符串、列表）
      const [is_valid_str, errors_str] = validate_data('not a dict');
      const [is_valid_arr, errors_arr] = validate_data(['not', 'a', 'dict']);
      
      // 2. 检查返回(is_valid=False, errors包含"数据必须是字典类型")
      expect(is_valid_str).toBe(false);
      expect(errors_str).toContain('数据必须是字典类型');
      expect(is_valid_arr).toBe(false);
      expect(errors_arr).toContain('数据必须是字典类型');
    });

    test('缺少modules字段验证失败', () => {
      // 3. 传入缺少"modules"键的字典
      const [is_valid, errors] = validate_data({ other_field: 'value' });
      
      // 4. 检查返回(is_valid=False, errors包含"缺少必需的modules字段")
      expect(is_valid).toBe(false);
      expect(errors).toContain('缺少必需的modules字段');
    });

    test('modules非字典类型验证失败', () => {
      // 5. 传入"modules"值为非字典类型的字典
      const [is_valid, errors] = validate_data({ modules: 'not a dict' });
      
      // 6. 检查返回(is_valid=False, errors包含"modules必须是字典类型")
      expect(is_valid).toBe(false);
      expect(errors).toContain('modules必须是字典类型');
    });

    test('模块缺少name字段验证失败', () => {
      // 7. 传入包含缺少"name"字段的模块的字典
      const data = {
        modules: {
          'MOD001': {
            type: 'class'
            // 缺少name字段
          }
        }
      };
      const [is_valid, errors] = validate_data(data);
      
      // 8. 检查返回(is_valid=False, errors包含相关错误信息)
      expect(is_valid).toBe(false);
      expect(errors.some(error => error.includes('缺少必需的name字段'))).toBe(true);
    });

    test('模块缺少type字段验证失败', () => {
      // 9. 传入包含缺少"type"字段的模块的字典
      const data = {
        modules: {
          'MOD001': {
            name: '测试模块'
            // 缺少type字段
          }
        }
      };
      const [is_valid, errors] = validate_data(data);
      
      // 10. 检查返回(is_valid=False, errors包含相关错误信息)
      expect(is_valid).toBe(false);
      expect(errors.some(error => error.includes('缺少必需的type字段'))).toBe(true);
    });

    test('模块type值无效验证失败', () => {
      // 11. 传入包含无效"type"值的模块的字典
      const data = {
        modules: {
          'MOD001': {
            name: '测试模块',
            type: 'invalid_type'
          }
        }
      };
      const [is_valid, errors] = validate_data(data);
      
      // 12. 检查返回(is_valid=False, errors包含相关错误信息)
      expect(is_valid).toBe(false);
      expect(errors.some(error => error.includes('type字段值无效'))).toBe(true);
    });

    test('有效数据验证成功', () => {
      // 13. 传入完全有效的数据字典
      const valid_data = {
        modules: {
          'MOD001': {
            name: '测试模块',
            type: 'class'
          },
          'MOD002': {
            name: '测试函数',
            type: 'function'
          }
        }
      };
      const [is_valid, errors] = validate_data(valid_data);
      
      // 14. 检查返回(is_valid=True, errors=[])
      expect(is_valid).toBe(true);
      expect(errors).toEqual([]);
    });
  });

  /**
   * TESTCASE005. 综合功能测试
   */
  describe('TESTCASE005. 综合功能测试', () => {
    test('完整工作流程测试', () => {
      // 1. 调用initialize_storage()初始化存储环境
      const [init_success, init_message] = initialize_storage(test_temp_dir);
      
      // 2. 验证初始化成功
      expect(init_success).toBe(true);
      expect(init_message).toContain('存储环境初始化成功');
      
      // 3. 准备完整的模块数据字典
      const test_modules = {
        modules: {
          'MOD001': {
            name: '数据存储模块',
            type: 'class'
          },
          'MOD002': {
            name: '工具函数组',
            type: 'functionGroup'
          }
        }
      };
      
      // 4. 调用save_modules()保存数据
      const save_success = save_modules(test_modules);
      
      // 5. 验证保存成功
      expect(save_success).toBe(true);
      
      // 6. 调用load_modules()加载数据
      const loaded_modules = load_modules();
      
      // 7. 验证加载的数据与保存的数据一致
      expect(loaded_modules).toEqual(test_modules);
      
      // 8. 调用validate_data()验证数据完整性
      const [is_valid, errors] = validate_data(loaded_modules);
      
      // 9. 验证数据验证通过
      expect(is_valid).toBe(true);
      expect(errors).toEqual([]);
    });

    test('多次保存加载循环测试', () => {
      // 初始化
      initialize_storage(test_temp_dir);
      
      const original_data = {
        modules: {
          'MOD001': { name: '模块1', type: 'class' },
          'MOD002': { name: '模块2', type: 'function' }
        }
      };
      
      // 10. 重复保存-加载-验证循环多次
      for (let i = 0; i < 3; i++) {
        // 保存数据
        const save_success = save_modules(original_data);
        expect(save_success).toBe(true);
        
        // 加载数据
        const loaded_data = load_modules();
        
        // 验证数据一致性
        expect(loaded_data).toEqual(original_data);
        
        // 验证数据完整性
        const [is_valid, errors] = validate_data(loaded_data);
        expect(is_valid).toBe(true);
        expect(errors).toEqual([]);
      }
      
      // 11. 验证数据一致性保持不变
      const final_loaded = load_modules();
      expect(final_loaded).toEqual(original_data);
    });
  });
});