/**
 * TESTMOD005. 服务器测试
 * 测试服务器启动和HTTP API接口功能
 */

import request from 'supertest';
import express from 'express';
import * as storage from '../src/backend/storage';
import * as moduleManager from '../src/backend/module-manager';
import app, { start_server } from '../src/backend/server';
import fs from 'fs';
import path from 'path';

describe('MOD005 服务器测试', () => {
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
   * TESTCASE001. 获取根模块列表API测试
   */
  describe('TESTCASE001: 获取根模块列表API测试', () => {
    /**
     * TEST001.1 空列表情况下的正确响应
     */
    test('TEST001.1 空列表情况下的正确响应', async () => {
      const response = await request(app)
        .get('/api/modules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.message).toBe('成功获取根模块列表');
    });

    /**
     * TEST001.2 有根模块时的正确响应
     */
    test('TEST001.2 有根模块时的正确响应', async () => {
      // 通过API添加测试模块
      const rootModuleData = {
        name: 'RootModule',
        type: 'class',
        description: '根模块测试'
      };
      
      const childModuleData = {
        name: 'ChildModule',
        type: 'function',
        description: '子模块测试',
        parent: 'RootModule'
      };
      
      // 添加根模块
      await request(app)
        .post('/api/modules')
        .send(rootModuleData)
        .expect(201);
      
      // 添加子模块
      await request(app)
        .post('/api/modules')
        .send(childModuleData)
        .expect(201);
      
      const response = await request(app)
        .get('/api/modules')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('RootModule');
      expect(response.body.data[0].parent).toBeUndefined();
    });

    /**
     * TEST001.3 缓存机制测试
     */
    test('TEST001.3 缓存机制测试', async () => {
      // 清理缓存确保测试环境干净
      const humanInterface = require('../src/backend/human-interface');
      humanInterface.clear_cache();
      
      // 第一次请求
      const firstResponse = await request(app)
        .get('/api/modules')
        .expect(200);
      
      expect(firstResponse.body.success).toBe(true);
      expect(firstResponse.body.message).toBe('成功获取根模块列表');
      
      // 第二次请求应该使用缓存
      const secondResponse = await request(app)
        .get('/api/modules')
        .expect(200);
      
      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.message).toBe('成功获取根模块列表（缓存）');
    });
  });

  /**
   * TESTCASE002. 按层次名称获取模块信息API测试
   */
  describe('TESTCASE002: 按层次名称获取模块信息API测试', () => {
    /**
     * TEST002.1 存在模块返回正确信息
     */
    test('TEST002.1 存在模块返回正确信息', async () => {
      // 通过API添加测试模块
      const testModuleData = {
        name: 'ExistingModule',
        type: 'class',
        description: '测试已存在的模块'
      };
      
      await request(app)
        .post('/api/modules')
        .send(testModuleData)
        .expect(201);
      
      const response = await request(app)
        .get('/api/modules/get?name=ExistingModule')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('ExistingModule');
      expect(response.body.data.hierarchical_name).toBe('ExistingModule');
      expect(response.body.data.type).toBe('class');
      expect(response.body.data.description).toBe('测试已存在的模块');
    });

    /**
     * TEST002.2 不存在模块返回404
     */
    test('TEST002.2 不存在模块返回404', async () => {
      const response = await request(app)
        .get('/api/modules/get?name=com.example.NonExistentModule')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('模块未找到');
    });

    /**
     * TEST002.3 无效层次名称返回400
     */
    test('TEST002.3 无效层次名称返回400', async () => {
      const response = await request(app)
        .get('/api/modules/get?name=invalid..name')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('无效的层次名称格式');
    });
  });

  /**
   * TESTCASE003. 关键词搜索模块API测试
   */
  describe('TESTCASE003: 关键词搜索模块API测试', () => {
    beforeEach(async () => {
      // 通过API添加测试数据
      const modules = [
        {
          name: 'UserService',
          type: 'class',
          description: '用户服务类'
        },
        {
          name: 'getUserById',
          type: 'function',
          description: '根据ID获取用户信息',
          parent: 'UserService'
        },
        {
          name: 'ProductService',
          type: 'class',
          description: '产品服务类'
        }
      ];
      
      for (const module of modules) {
        await request(app)
          .post('/api/modules')
          .send(module)
          .expect(201);
      }
    });

    /**
     * TEST003.1 基本关键词搜索
     */
    test('TEST003.1 基本关键词搜索', async () => {
      const response = await request(app)
        .get('/api/modules/search?keyword=User')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.some((m: any) => m.name.includes('User'))).toBe(true);
    });

    /**
     * TEST003.2 类型筛选搜索
     */
    test('TEST003.2 类型筛选搜索', async () => {
      const response = await request(app)
        .get('/api/modules/search?keyword=Service&type=class')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every((m: any) => m.type === 'class')).toBe(true);
    });

    /**
     * TEST003.3 分页功能测试
     */
    test('TEST003.3 分页功能测试', async () => {
      const response = await request(app)
        .get('/api/modules/search?keyword=Service&limit=1&offset=0')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    /**
     * TEST003.4 空关键词错误
     */
    test('TEST003.4 空关键词错误', async () => {
      const response = await request(app)
        .get('/api/modules/search?keyword=')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('搜索关键词不能为空');
    });

    /**
     * TEST003.5 缓存机制提高性能
     */
    test('TEST003.5 缓存机制提高性能', async () => {
      const searchParams = '?keyword=Service&type=class';
      
      // 第一次搜索
      const firstResponse = await request(app)
        .get(`/api/modules/search${searchParams}`)
        .expect(200);
      
      expect(firstResponse.body.success).toBe(true);
      
      // 第二次搜索（应该使用缓存）
      const secondResponse = await request(app)
        .get(`/api/modules/search${searchParams}`)
        .expect(200);
      
      expect(secondResponse.body.success).toBe(true);
    });
  });

  /**
   * TESTCASE004. 添加新模块API测试
   */
  describe('TESTCASE004: 添加新模块API测试', () => {
    /**
     * TEST004.1 成功添加模块
     */
    test('TEST004.1 成功添加模块', async () => {
      const moduleRequest = {
        name: 'NewModule',
        type: 'class',
        description: '新添加的模块'
      };
      
      const response = await request(app)
        .post('/api/modules')
        .send(moduleRequest)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('NewModule');
      expect(response.body.data.type).toBe('class');
      expect(response.body.message).toBe('模块添加成功');
    });

    /**
     * TEST004.2 重复添加模块失败
     */
    test('TEST004.2 重复添加模块失败', async () => {
      const moduleRequest = {
        name: 'DuplicateModule',
        type: 'class',
        description: '重复模块测试'
      };
      
      // 第一次添加成功
      await request(app)
        .post('/api/modules')
        .send(moduleRequest)
        .expect(201);
      
      // 第二次添加失败
      const response = await request(app)
        .post('/api/modules')
        .send(moduleRequest)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('已存在');
    });

    /**
     * TEST004.3 无效参数错误
     */
    test('TEST004.3 无效参数错误', async () => {
      const invalidRequest = {
        name: '',
        type: 'invalid_type',
        description: '无效参数测试'
      };
      
      const response = await request(app)
        .post('/api/modules')
        .send(invalidRequest)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });

    /**
     * TEST004.4 父模块不存在返回400错误
     */
    test('TEST004.4 父模块不存在返回400错误', async () => {
      const moduleWithInvalidParent = {
        name: 'ChildModule',
        type: 'class',
        description: '子模块测试',
        parent: 'NonExistentParent'
      };
      
      const response = await request(app)
        .post('/api/modules')
        .send(moduleWithInvalidParent)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('父模块不存在');
    });
  });

  /**
   * TESTCASE005. 修改模块信息API测试
   */
  describe('TESTCASE005: 修改模块信息API测试', () => {
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
    test('TEST005.1 成功修改模块', async () => {
      const updateData = {
        description: '已修改的模块描述'
      };
      
      const response = await request(app)
        .put('/api/modules/update?name=ModifiableModule')
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('已修改的模块描述');
      expect(response.body.message).toBe('模块更新成功');
    });

    /**
     * TEST005.2 模块未找到错误
     */
    test('TEST005.2 模块未找到错误', async () => {
      const updateData = {
        description: '修改不存在的模块'
      };
      
      const response = await request(app)
        .put('/api/modules/update?name=NonExistentModule')
        .send(updateData)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('模块未找到');
    });

    /**
     * TEST005.3 无效修改数据错误
     */
    test('TEST005.3 无效修改数据错误', async () => {
      const response = await request(app)
        .put('/api/modules/update?name=ModifiableModule')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('更新数据不能为空');
    });

    /**
     * TEST005.4 循环引用返回400错误
     */
    test('TEST005.4 循环引用返回400错误', async () => {
      const selfReferenceData = {
        parent: 'ModifiableModule' // 自引用
      };
      
      const response = await request(app)
        .put('/api/modules/update?name=ModifiableModule')
        .send(selfReferenceData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('循环引用');
    });
  });

  /**
   * TESTCASE006. 删除模块API测试
   */
  describe('TESTCASE006: 删除模块API测试', () => {
    /**
     * TEST006.1 成功删除模块
     */
    test('TEST006.1 成功删除模块', async () => {
      // 添加测试模块
      const testModule: moduleManager.Module = {
        name: 'DeletableModule',
        hierarchical_name: 'DeletableModule',
        type: 'class',
        description: '可删除的模块',
        parent: undefined
      };
      moduleManager.add_module(testModule);
      
      const response = await request(app)
        .delete('/api/modules/delete?name=DeletableModule')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('模块删除成功');
      
      // 验证模块已被删除
      const verifyResponse = await request(app)
        .get('/api/modules/get?name=DeletableModule')
        .expect(200);
      
      expect(verifyResponse.body.success).toBe(false);
    });

    /**
     * TEST006.2 删除不存在的模块
     */
    test('TEST006.2 删除不存在的模块', async () => {
      const response = await request(app)
        .delete('/api/modules/delete?name=NonExistentModule')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('模块未找到');
    });

    /**
     * TEST006.3 删除有子模块的模块失败
     */
    test('TEST006.3 删除有子模块的模块失败', async () => {
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
      
      const response = await request(app)
        .delete('/api/modules/delete?name=ParentModule')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('模块包含子模块');
    });
  });

  /**
   * TESTCASE007. RESTful API完整流程测试
   */
  describe('TESTCASE007: RESTful API完整流程测试', () => {
    /**
     * TEST007.1 完整生命周期测试
     */
    test('TEST007.1 完整生命周期测试', async () => {
      const moduleName = 'LifecycleTestModule';
      
      // 1. 创建模块
      const createResponse = await request(app)
        .post('/api/modules')
        .send({
          name: moduleName,
          type: 'class',
          description: '生命周期测试模块'
        })
        .expect(201);
      
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(moduleName);
      
      // 2. 查询模块
      const getResponse = await request(app)
        .get(`/api/modules/get?name=${moduleName}`)
        .expect(200);
      
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.name).toBe(moduleName);
      expect(getResponse.body.data.description).toBe('生命周期测试模块');
      
      // 3. 更新模块
      const updateResponse = await request(app)
        .put(`/api/modules/update?name=${moduleName}`)
        .send({
          description: '更新后的生命周期测试模块'
        })
        .expect(200);
      
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.description).toBe('更新后的生命周期测试模块');
      
      // 4. 搜索模块
      const searchResponse = await request(app)
        .get('/api/modules/search?keyword=lifecycle')
        .expect(200);
      
      expect(searchResponse.body.success).toBe(true);
      const foundModule = searchResponse.body.data.find(
        (m: any) => m.name === moduleName
      );
      expect(foundModule).toBeDefined();
      
      // 5. 删除模块
      const deleteResponse = await request(app)
        .delete(`/api/modules/delete?name=${moduleName}`)
        .expect(200);
      
      expect(deleteResponse.body.success).toBe(true);
      
      // 6. 验证删除后查询失败
      const verifyDeleteResponse = await request(app)
        .get(`/api/modules/get?name=${moduleName}`)
        .expect(200);
      
      expect(verifyDeleteResponse.body.success).toBe(false);
      
      // 7. 验证根模块列表更新
      const rootModulesResponse = await request(app)
        .get('/api/modules')
        .expect(200);
      
      expect(rootModulesResponse.body.success).toBe(true);
      const deletedModule = rootModulesResponse.body.data.find(
        (m: any) => m.name === moduleName
      );
      expect(deletedModule).toBeUndefined();
    });

    /**
     * TEST007.2 服务器功能测试
     */
    test('TEST007.2 健康检查接口', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('服务器运行正常');
      expect(response.body.timestamp).toBeDefined();
    });

    /**
      * TEST007.3 404错误处理
      */
    test('TEST007.3 404错误处理', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
       
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('接口不存在');
    });

    /**
      * TEST007.4 缺少必需参数的错误处理
      */
    test('TEST007.4 缺少必需参数的错误处理', async () => {
      // 测试获取模块时缺少name参数
      const getResponse = await request(app)
        .get('/api/modules/get')
        .expect(400);
       
      expect(getResponse.body.success).toBe(false);
      expect(getResponse.body.message).toBe('缺少必需的参数: name');

      // 测试更新模块时缺少name参数
      const updateResponse = await request(app)
        .put('/api/modules/update')
        .send({ description: '测试' })
        .expect(400);
       
      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.message).toBe('缺少必需的参数: name');

      // 测试删除模块时缺少name参数
      const deleteResponse = await request(app)
        .delete('/api/modules/delete')
        .expect(400);
       
      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.message).toBe('缺少必需的参数: name');
    });

    /**
      * TEST007.5 搜索模块功能测试
      */
    test('TEST007.5 搜索模块功能测试', async () => {
      // 先添加一个测试模块
      const testModule = {
        name: 'SearchTest',
        type: 'function' as const,
        description: '搜索测试模块'
      };
       
      await request(app)
        .post('/api/modules')
        .send(testModule)
        .expect(201);
       
      // 测试关键词搜索
      const searchResponse = await request(app)
        .get('/api/modules/search?keyword=Search&type=function')
        .expect(200);
       
      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toBeDefined();
       
      // 清理测试数据
      await request(app)
        .delete('/api/modules/delete?name=SearchTest')
        .expect(200);
    });
  });
});