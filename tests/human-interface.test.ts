/**
 * TESTMOD005. 人类交互接口测试
 * 测试MOD005模块的所有功能
 */

import * as humanInterface from '../src/backend/human-interface';
import * as storage from '../src/backend/storage';
import * as moduleManager from '../src/backend/module-manager';
import fs from 'fs';
import path from 'path';

describe('MOD005 人类交互接口测试', () => {
  beforeEach(async () => {
    // 清理测试数据目录
    const test_data_dir = path.join(__dirname, '../test_data');
    if (fs.existsSync(test_data_dir)) {
      fs.rmSync(test_data_dir, { recursive: true, force: true });
    }
    fs.mkdirSync(test_data_dir, { recursive: true });

    // 初始化存储和模块管理器
    storage.initialize_storage(test_data_dir);
    moduleManager.initialize_module_manager();
    moduleManager.clear_module_manager();
  });

  afterEach(() => {
    // 清理测试数据
    const test_data_dir = path.join(__dirname, '../test_data');
    if (fs.existsSync(test_data_dir)) {
      fs.rmSync(test_data_dir, { recursive: true, force: true });
    }
  });

  /**
   * TESTCASE001. 获取根模块列表功能测试
   */
  describe('TESTCASE001: 获取根模块列表功能测试', () => {
    /**
     * TEST001.1 空列表情况下的正确响应
     */
    test('TEST001.1 空列表情况下的正确响应', () => {
      const response = humanInterface.get_root_modules();

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.message).toBe('成功获取根模块列表');
    });

    /**
     * TEST001.2 有根模块时的正确响应
     */
    test('TEST001.2 有根模块时的正确响应', () => {
      // 清理缓存
      humanInterface.clear_cache();
      
      // 添加测试数据
      const rootModule: moduleManager.Module = {
        name: 'RootModule',
        hierarchical_name: 'RootModule',
        type: 'class',
        description: '根模块',
        parent: undefined
      };
      
      const childModule: moduleManager.Module = {
        name: 'ChildModule',
        hierarchical_name: 'RootModule.ChildModule',
        type: 'function',
        description: '子模块',
        parent: 'RootModule'
      };
      
      moduleManager.add_module(rootModule);
      moduleManager.add_module(childModule);
      
      const response = humanInterface.get_root_modules();
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data![0].name).toBe('RootModule');
      expect(response.data![0].parent).toBeUndefined();
    });
  });

  /**
   * TESTCASE002. 按层次名称获取模块信息功能测试
   */
  describe('TESTCASE002: 按层次名称获取模块信息功能测试', () => {
    /**
     * TEST002.1 存在模块返回正确信息
     */
    test('TEST002.1 存在模块返回正确信息', () => {
      // 添加测试模块
      const testModule: moduleManager.Module = {
        name: 'ExistingModule',
        hierarchical_name: 'com.example.ExistingModule',
        type: 'class',
        description: '测试已存在的模块',
        parent: undefined
      };
      
      moduleManager.add_module(testModule);
      
      const response = humanInterface.get_module_by_hierarchical_name('com.example.ExistingModule');
      
      expect(response.success).toBe(true);
      expect(response.data!.name).toBe('ExistingModule');
      expect(response.data!.hierarchical_name).toBe('com.example.ExistingModule');
      expect(response.data!.type).toBe('class');
      expect(response.data!.description).toBe('测试已存在的模块');
    });

    /**
     * TEST002.2 不存在模块返回404
     */
    test('TEST002.2 不存在模块返回404', () => {
      const response = humanInterface.get_module_by_hierarchical_name('com.example.NonExistentModule');

      expect(response.success).toBe(false);
      expect(response.message).toContain('模块未找到');
    });

    /**
     * TEST002.3 无效层次名称返回400
     */
    test('TEST002.3 无效层次名称返回400', () => {
      const response = humanInterface.get_module_by_hierarchical_name('invalid..name');

      expect(response.success).toBe(false);
      expect(response.message).toContain('无效的层次名称格式');
    });
  });

  /**
   * TESTCASE003. 关键词搜索模块功能测试
   */
  describe('TESTCASE003: 关键词搜索模块功能测试', () => {
    beforeEach(() => {
      // 添加测试数据
      const modules: moduleManager.Module[] = [
        {
          name: 'UserService',
          hierarchical_name: 'com.example.UserService',
          type: 'class',
          description: '用户服务类',
          parent: undefined
        },
        {
          name: 'getUserById',
          hierarchical_name: 'com.example.UserService.getUserById',
          type: 'function',
          description: '根据ID获取用户信息',
          parent: 'com.example.UserService'
        },
        {
          name: 'ProductService',
          hierarchical_name: 'com.example.ProductService',
          type: 'class',
          description: '产品服务类',
          parent: undefined
        }
      ];
      
      modules.forEach(module => moduleManager.add_module(module));
    });

    /**
     * TEST003.1 基本关键词搜索
     */
    test('TEST003.1 基本关键词搜索', () => {
      const response = humanInterface.search_modules({ keyword: 'User' });
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.length).toBeGreaterThan(0);
      expect(response.data!.some(m => m.name.includes('User'))).toBe(true);
    });

    /**
     * TEST003.2 类型筛选搜索
     */
    test('TEST003.2 类型筛选搜索', () => {
      const response = humanInterface.search_modules({ 
        keyword: 'Service',
        type: 'class'
      });
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.every(m => m.type === 'class')).toBe(true);
    });

    /**
     * TEST003.3 分页功能测试
     */
    test('TEST003.3 分页功能测试', () => {
      const response = humanInterface.search_modules({ 
        keyword: 'Service',
        limit: 1,
        offset: 0
      });
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.length).toBeLessThanOrEqual(1);
    });

    /**
     * TEST003.4 空关键词错误
     */
    test('TEST003.4 空关键词错误', () => {
      const response = humanInterface.search_modules({ keyword: '' });
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('搜索关键词不能为空');
    });
  });

  /**
   * TESTCASE004. 添加新模块功能测试
   */
  describe('TESTCASE004: 添加新模块功能测试', () => {
    /**
     * TEST004.1 成功添加模块
     */
    test('TEST004.1 成功添加模块', () => {
      const moduleRequest: humanInterface.ModuleRequest = {
        name: 'NewModule',
        type: 'class',
        description: '新添加的模块',
        parent: undefined
      };
      
      const response = humanInterface.add_module(moduleRequest);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.name).toBe('NewModule');
      expect(response.data!.type).toBe('class');
    });

    /**
     * TEST004.2 重复添加模块失败
     */
    test('TEST004.2 重复添加模块失败', () => {
      const moduleRequest: humanInterface.ModuleRequest = {
        name: 'DuplicateModule',
        type: 'class',
        description: '重复模块测试',
        parent: undefined
      };
      
      // 第一次添加成功
      const firstResponse = humanInterface.add_module(moduleRequest);
      expect(firstResponse.success).toBe(true);
      
      // 第二次添加失败
      const secondResponse = humanInterface.add_module(moduleRequest);
      expect(secondResponse.success).toBe(false);
      expect(secondResponse.message).toContain('模块已存在');
    });

    /**
     * TEST004.3 无效参数错误
     */
    test('TEST004.3 无效参数错误', () => {
      const invalidRequest = {
        name: '',
        type: 'invalid_type' as any,
        description: '无效参数测试'
      };
      
      const response = humanInterface.add_module(invalidRequest);
      
      expect(response.success).toBe(false);
    });
  });

  /**
   * TESTCASE005. 修改模块信息功能测试
   */
  describe('TESTCASE005: 修改模块信息功能测试', () => {
    beforeEach(() => {
      // 添加测试模块
      const testModule: moduleManager.Module = {
        name: 'ModifiableModule',
        hierarchical_name: 'ModifiableModule',
        type: 'class',
        description: '可修改的模块',
        parent: undefined
      };
      moduleManager.add_module(testModule);
    });

    /**
     * TEST005.1 成功修改模块
     */
    test('TEST005.1 成功修改模块', () => {
      const updateData = {
        description: '已修改的模块描述'
      };
      
      const response = humanInterface.update_module('ModifiableModule', updateData);
      
      expect(response.success).toBe(true);
      expect(response.data!.description).toBe('已修改的模块描述');
    });

    /**
     * TEST005.2 模块未找到错误
     */
    test('TEST005.2 模块未找到错误', () => {
      const updateData = {
        description: '修改不存在的模块'
      };
      
      const response = humanInterface.update_module('NonExistentModule', updateData);
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('模块未找到');
    });

    /**
     * TEST005.3 无效修改数据错误
     */
    test('TEST005.3 无效修改数据错误', () => {
      const response = humanInterface.update_module('ModifiableModule', {});
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('更新数据不能为空');
    });
  });

  /**
   * TESTCASE006. 删除模块功能测试
   */
  describe('TESTCASE006: 删除模块功能测试', () => {
    /**
     * TEST006.1 成功删除模块
     */
    test('TEST006.1 成功删除模块', () => {
      // 添加测试模块
      const testModule: moduleManager.Module = {
        name: 'DeletableModule',
        hierarchical_name: 'DeletableModule',
        type: 'class',
        description: '可删除的模块',
        parent: undefined
      };
      moduleManager.add_module(testModule);
      
      const response = humanInterface.delete_module('DeletableModule');
      
      expect(response.success).toBe(true);
      
      // 验证模块已被删除
      const getResponse = humanInterface.get_module_by_hierarchical_name('DeletableModule');
      expect(getResponse.success).toBe(false);
    });

    /**
     * TEST006.2 删除不存在的模块
     */
    test('TEST006.2 删除不存在的模块', () => {
      const response = humanInterface.delete_module('NonExistentModule');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('模块未找到');
    });

    /**
     * TEST006.3 删除有子模块的模块失败
     */
    test('TEST006.3 删除有子模块的模块失败', () => {
      // 添加父模块和子模块
      const parentModule: moduleManager.Module = {
        name: 'ParentModule',
        hierarchical_name: 'ParentModule',
        type: 'class',
        description: '父模块',
        parent: undefined
      };
      
      const childModule: moduleManager.Module = {
        name: 'ChildModule',
        hierarchical_name: 'ParentModule.ChildModule',
        type: 'function',
        description: '子模块',
        parent: 'ParentModule'
      };
      
      moduleManager.add_module(parentModule);
      moduleManager.add_module(childModule);
      
      const response = humanInterface.delete_module('ParentModule');
      
      expect(response.success).toBe(false);
      expect(response.message).toContain('子模块');
    });
  });

  /**
   * TESTCASE007. 缓存机制测试
   */
  describe('TESTCASE007: 缓存机制测试', () => {
    /**
     * TEST007.1 根模块列表缓存测试
     */
    test('TEST007.1 根模块列表缓存测试', () => {
      // 第一次调用
      const firstResponse = humanInterface.get_root_modules();
      expect(firstResponse.success).toBe(true);
      expect(firstResponse.message).toBe('成功获取根模块列表');
      
      // 第二次调用应该使用缓存
      const secondResponse = humanInterface.get_root_modules();
      expect(secondResponse.success).toBe(true);
      expect(secondResponse.message).toBe('成功获取根模块列表（缓存）');
    });
  });
});