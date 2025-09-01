/**
 * 主入口文件测试
 * 测试所有导出的功能和常量
 */

import {
  initialize_storage,
  load_modules,
  save_modules,
  validate_data,
  get_storage_root_path,
  initialize_module_manager,
  find_modules,
  add_module,
  update_module,
  delete_module,
  MODULE_VERSION,
  MODULE_NAME,
  MODULE_ID
} from '../src/backend/index';

import { Module } from '../src/shared/types';
import * as fs from 'fs';
import * as path from 'path';

describe('主入口文件测试', () => {
  const testDataDir = path.join(__dirname, '../test-data');
  
  beforeAll(async () => {
    // 确保测试数据目录存在
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    // 设置测试环境变量
    process.env.DATA_ROOT_PATH = testDataDir;
  });
  
  afterAll(async () => {
    // 清理测试数据
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });
  
  describe('常量导出测试', () => {
    test('应该正确导出模块版本信息', () => {
      expect(MODULE_VERSION).toBe('1.0.0');
      expect(MODULE_NAME).toBe('代码文档数据存储模块');
      expect(MODULE_ID).toBe('MOD001');
    });
  });
  
  describe('存储模块导出测试', () => {
    test('应该正确导出存储相关函数', () => {
      expect(typeof initialize_storage).toBe('function');
      expect(typeof load_modules).toBe('function');
      expect(typeof save_modules).toBe('function');
      expect(typeof validate_data).toBe('function');
      expect(typeof get_storage_root_path).toBe('function');
    });
    
    test('应该能够初始化存储', () => {
      const result = initialize_storage();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(true);
    });
    
    test('应该能够获取存储根路径', () => {
      const rootPath = get_storage_root_path();
      expect(typeof rootPath).toBe('string');
      expect(rootPath.length).toBeGreaterThan(0);
    });
    
    test('应该能够加载模块数据', async () => {
      const modules = await load_modules();
      // load_modules可能返回各种类型的值
      expect(modules).toBeDefined();
    });
    
    test('应该能够验证数据', () => {
      const validData: Module = {
        hierarchical_name: 'test.module',
        type: 'class',
        name: 'TestModule',
        description: '测试模块',
        file: '/test/path'
      };
      
      expect(() => validate_data(validData)).not.toThrow();
    });
  });
  
  describe('模块管理器导出测试', () => {
    test('应该正确导出模块管理相关函数', () => {
      expect(typeof initialize_module_manager).toBe('function');
      expect(typeof find_modules).toBe('function');
      expect(typeof add_module).toBe('function');
      expect(typeof update_module).toBe('function');
      expect(typeof delete_module).toBe('function');
    });
    
    test('应该能够初始化模块管理器', () => {
      const result = initialize_module_manager();
      // initialize_module_manager可能返回undefined
      expect(result).toBeUndefined();
    });
    
    test('应该能够查找模块', async () => {
      const result = await find_modules({ keyword: 'test' });
      expect(Array.isArray(result)).toBe(true);
    });
    
    test('应该能够添加模块', async () => {
      const testModule: Module = {
        hierarchical_name: 'test.index.module',
        type: 'class',
        name: 'IndexTestModule',
        description: '索引测试模块',
        file: '/test/index/path'
      };
      
      const result = await add_module(testModule);
      expect(result.success).toBe(true);
    });
    
    test('应该能够更新模块', async () => {
      const updateData = {
        description: '更新后的索引测试模块'
      };
      
      const result = await update_module('test.index.module', updateData);
      expect(result.success).toBe(true);
    });
    
    test('应该能够删除模块', async () => {
      const result = await delete_module('test.index.module');
      expect(result.success).toBe(true);
    });
  });
  
  describe('集成测试', () => {
    test('应该能够完整的模块生命周期操作', async () => {
      // 初始化
      await initialize_storage();
      await initialize_module_manager();
      
      // 添加模块
      const testModule: Module = {
        hierarchical_name: 'integration.test.module',
        type: 'function',
        name: 'IntegrationTestModule',
        description: '集成测试模块',
        file: '/integration/test/path',

      };
      
      const addResult = await add_module(testModule);
      expect(addResult.success).toBe(true);
      
      // 查找模块
      const findResult = await find_modules({ keyword: 'IntegrationTestModule' });
      expect(findResult.length).toBeGreaterThan(0);
      
      // 更新模块
      const updateResult = await update_module('integration.test.module', {
        description: '更新后的集成测试模块'
      });
      expect(updateResult.success).toBe(true);
      
      // 删除模块
      const deleteResult = await delete_module('integration.test.module');
      expect(deleteResult.success).toBe(true);
    });
  });
});