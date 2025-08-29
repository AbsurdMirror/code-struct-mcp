/**
 * TESTMOD005 人类交互接口测试
 * 测试RESTful API接口的完整功能
 */

import { ApiServer } from '../api/server.js';
import { AppConfig, DEFAULT_CONFIG, StorageConfig } from '../api/types/config.js';
import { AnyModule } from '../api/types/module.js';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

// 测试配置
const TEST_CONFIG: AppConfig = {
  ...DEFAULT_CONFIG,
  storage: {
    ...DEFAULT_CONFIG.storage,
    root_path: './test-data'
  },
  http_server: {
    ...DEFAULT_CONFIG.http_server,
    port: 3005
  }
};

const BASE_URL = `http://localhost:${TEST_CONFIG.http_server.port}/api/v1`;

// API响应接口
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  request_id: string;
}

// 测试用的模块数据
const TEST_MODULES = [
  {
    name: 'TestClass',
    type: 'class' as const,
    description: '测试类模块',
    file_path: '/test/class.ts',
    line_number: 1,
    parent_module: null,
    access_modifier: 'public' as const,
    properties: {
      methods: ['constructor', 'testMethod'],
      fields: ['testField']
    }
  },
  {
    name: 'TestFunction',
    type: 'function' as const,
    description: '测试函数模块',
    file_path: '/test/function.ts',
    line_number: 10,
    parent_module: null,
    access_modifier: 'public' as const,
    parameters: [
      { name: 'param1', type: 'string', description: '参数1' }
    ],
    return_type: 'void'
  },
  {
    name: 'ChildFunction',
    type: 'function' as const,
    description: '子函数模块',
    file_path: '/test/child.ts',
    line_number: 5,
    parent_module: 'TestClass',
    access_modifier: 'private' as const,
    parameters: [],
    return_type: 'boolean'
  }
];

class TestMod005HumanInterface {
  private server: ApiServer;
  private serverInstance: any;

  constructor() {
    this.server = new ApiServer(TEST_CONFIG);
  }

  /**
   * 启动测试服务器
   */
  async startServer(): Promise<void> {
    try {
      this.serverInstance = await this.server.start();
      console.log('✅ 测试服务器启动成功');
      
      // 等待一段时间确保服务器完全启动
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('❌ 服务器启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止测试服务器
   */
  async stopServer(): Promise<void> {
    if (this.serverInstance) {
      await this.server.stop();
      console.log('✅ 测试服务器已停止');
    }
  }

  /**
   * 清理测试数据
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(TEST_CONFIG.storage.root_path, { recursive: true, force: true });
      console.log('✅ 测试数据清理完成');
    } catch (error) {
      console.warn('⚠️ 清理测试数据时出现警告:', error);
    }
  }

  /**
   * 测试用例1: 获取根模块列表
   */
  async testGetRootModules(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例1: 获取根模块列表');
      
      // 先添加一些测试模块
      for (const module of TEST_MODULES) {
        try {
          await axios.post(`${BASE_URL}/modules`, module);
        } catch (error: any) {
          // 如果模块已存在，忽略错误
          if (error.response?.status !== 400 || !error.response?.data?.error?.includes('已存在')) {
            throw error;
          }
        }
      }
      
      // 获取根模块列表
      const response: AxiosResponse<APIResponse<AnyModule[]>> = await axios.get(`${BASE_URL}/modules`);
      
      // 验证响应
      if (response.status !== 200) {
        throw new Error(`HTTP状态码错误: ${response.status}`);
      }
      
      if (!response.data.success) {
        throw new Error(`API调用失败: ${response.data.error?.message}`);
      }
      
      const modules = response.data.data!;
      const rootModules = modules.filter(m => !m.parent_module);
      
      if (rootModules.length < 2) {
        throw new Error(`根模块数量不正确，期望至少2个，实际${rootModules.length}个`);
      }
      
      console.log(`✅ 成功获取${rootModules.length}个根模块`);
      console.log(`   模块列表: ${rootModules.map(m => m.name).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ 测试用例1失败:', error);
      return false;
    }
  }

  /**
   * 测试用例2: 按层次名称获取模块
   */
  async testGetModuleByHierarchicalName(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例2: 按层次名称获取模块');
      
      const hierarchicalName = 'TestClass';
      const response: AxiosResponse<APIResponse<AnyModule>> = await axios.get(
        `${BASE_URL}/modules/${encodeURIComponent(hierarchicalName)}`
      );
      
      // 验证响应
      if (response.status !== 200) {
        throw new Error(`HTTP状态码错误: ${response.status}`);
      }
      
      if (!response.data.success) {
        throw new Error(`API调用失败: ${response.data.error?.message}`);
      }
      
      const module = response.data.data!;
      
      if (module.name !== hierarchicalName) {
        throw new Error(`模块名称不匹配，期望${hierarchicalName}，实际${module.name}`);
      }
      
      console.log(`✅ 成功获取模块: ${module.name}`);
      console.log(`   类型: ${module.type}, 描述: ${module.description}`);
      
      return true;
    } catch (error) {
      console.error('❌ 测试用例2失败:', error);
      return false;
    }
  }

  /**
   * 测试用例3: 关键词搜索模块
   */
  async testSearchModules(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例3: 关键词搜索模块');
      
      const searchParams = {
        keyword: 'Test',
        type: 'function',
        limit: 10
      };
      
      const response: AxiosResponse<APIResponse<AnyModule[]>> = await axios.get(
        `${BASE_URL}/modules/search`,
        { params: searchParams }
      );
      
      // 验证响应
      if (response.status !== 200) {
        throw new Error(`HTTP状态码错误: ${response.status}`);
      }
      
      if (!response.data.success) {
        throw new Error(`API调用失败: ${response.data.error?.message}`);
      }
      
      const modules = response.data.data!;
      
      // 验证搜索结果
      const functionModules = modules.filter(m => m.type === 'function');
      if (functionModules.length === 0) {
        throw new Error('搜索结果中没有找到function类型的模块');
      }
      
      console.log(`✅ 搜索成功，找到${modules.length}个模块`);
      console.log(`   函数模块: ${functionModules.map(m => m.name).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ 测试用例3失败:', error);
      return false;
    }
  }

  /**
   * 测试用例4: 添加新模块
   */
  async testAddModule(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例4: 添加新模块');
      
      const newModule = {
        name: 'NewTestModule',
        type: 'variable' as const,
        description: '新添加的测试模块',
        file_path: '/test/new.ts',
        line_number: 1,
        parent_module: null,
        access_modifier: 'public' as const,
        variable_type: 'string',
        initial_value: 'test'
      };
      
      const response: AxiosResponse<APIResponse<AnyModule>> = await axios.post(
        `${BASE_URL}/modules`,
        newModule
      );
      
      // 验证响应
      if (response.status !== 201) {
        throw new Error(`HTTP状态码错误: ${response.status}`);
      }
      
      if (!response.data.success) {
        throw new Error(`API调用失败: ${response.data.error?.message}`);
      }
      
      const createdModule = response.data.data!;
      
      if (createdModule.name !== newModule.name) {
        throw new Error(`模块名称不匹配，期望${newModule.name}，实际${createdModule.name}`);
      }
      
      console.log(`✅ 成功添加模块: ${createdModule.name}`);
      console.log(`   层次化名称: ${createdModule.hierarchical_name}, 类型: ${createdModule.type}`);
      
      return true;
    } catch (error) {
      console.error('❌ 测试用例4失败:', error);
      return false;
    }
  }

  /**
   * 测试用例5: 修改模块信息
   */
  async testUpdateModule(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例5: 修改模块信息');
      
      const hierarchicalName = 'TestFunction';
      const updateData = {
        description: '更新后的测试函数描述',
        return_type: 'string'
      };
      
      const response: AxiosResponse<APIResponse<AnyModule>> = await axios.put(
        `${BASE_URL}/modules/${encodeURIComponent(hierarchicalName)}`,
        updateData
      );
      
      // 验证响应
      if (response.status !== 200) {
        throw new Error(`HTTP状态码错误: ${response.status}`);
      }
      
      if (!response.data.success) {
        throw new Error(`API调用失败: ${response.data.error?.message}`);
      }
      
      const updatedModule = response.data.data!;
      
      if (updatedModule.description !== updateData.description) {
        throw new Error(`描述更新失败，期望"${updateData.description}"，实际"${updatedModule.description}"`);
      }
      
      console.log(`✅ 成功更新模块: ${updatedModule.name}`);
      console.log(`   新描述: ${updatedModule.description}`);
      
      return true;
    } catch (error) {
      console.error('❌ 测试用例5失败:', error);
      return false;
    }
  }

  /**
   * 测试用例6: 删除模块
   */
  async testDeleteModule(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例6: 删除模块');
      
      const hierarchicalName = 'NewTestModule';
      
      const response: AxiosResponse<APIResponse> = await axios.delete(
        `${BASE_URL}/modules/${encodeURIComponent(hierarchicalName)}`
      );
      
      // 验证响应
      if (response.status !== 200) {
        throw new Error(`HTTP状态码错误: ${response.status}`);
      }
      
      if (!response.data.success) {
        throw new Error(`API调用失败: ${response.data.error?.message}`);
      }
      
      // 验证模块已被删除
      try {
        await axios.get(`${BASE_URL}/modules/${encodeURIComponent(hierarchicalName)}`);
        throw new Error('模块删除后仍然可以访问');
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log(`✅ 成功删除模块: ${hierarchicalName}`);
          return true;
        } else {
          throw error;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ 测试用例6失败:', error);
      return false;
    }
  }

  /**
   * 测试用例7: RESTful API完整流程测试
   */
  async testCompleteAPIFlow(): Promise<boolean> {
    try {
      console.log('\n🧪 测试用例7: RESTful API完整流程测试');
      
      // 使用时间戳确保模块名唯一
      const timestamp = Date.now();
      const moduleName = `FlowTestModule_${timestamp}`;
      
      // 1. 创建模块
      const newModule = {
        name: moduleName,
        type: 'class' as const,
        description: '流程测试模块',
        file_path: '/test/flow.ts',
        line_number: 1,
        parent_module: null,
        access_modifier: 'public' as const,
        properties: {
          methods: ['flowMethod'],
          fields: ['flowField']
        }
      };
      
      console.log('   步骤1: 创建模块');
      const createResponse = await axios.post(`${BASE_URL}/modules`, newModule);
      if (createResponse.status !== 201 || !createResponse.data.success) {
        throw new Error('创建模块失败');
      }
      
      // 2. 获取模块
      console.log('   步骤2: 获取模块');
      const getResponse = await axios.get(`${BASE_URL}/modules/${encodeURIComponent(moduleName)}`);
      if (getResponse.status !== 200 || !getResponse.data.success) {
        throw new Error('获取模块失败');
      }
      
      // 3. 更新模块
      console.log('   步骤3: 更新模块');
      const updateData = { description: '更新后的流程测试模块' };
      const updateResponse = await axios.put(`${BASE_URL}/modules/${encodeURIComponent(moduleName)}`, updateData);
      if (updateResponse.status !== 200 || !updateResponse.data.success) {
        throw new Error('更新模块失败');
      }
      
      // 4. 搜索模块
      console.log('   步骤4: 搜索模块');
      const searchResponse = await axios.get(`${BASE_URL}/modules/search`, {
        params: { keyword: 'FlowTest', type: 'class' }
      });
      if (searchResponse.status !== 200 || !searchResponse.data.success) {
        throw new Error('搜索模块失败');
      }
      
      const foundModules = searchResponse.data.data!;
      const flowModule = foundModules.find((m: AnyModule) => m.name === moduleName);
      if (!flowModule) {
        throw new Error('搜索结果中未找到创建的模块');
      }
      
      // 5. 删除模块
      console.log('   步骤5: 删除模块');
      const deleteResponse = await axios.delete(`${BASE_URL}/modules/${encodeURIComponent(moduleName)}`);
      if (deleteResponse.status !== 200 || !deleteResponse.data.success) {
        throw new Error('删除模块失败');
      }
      
      // 6. 验证删除
      console.log('   步骤6: 验证删除');
      try {
        await axios.get(`${BASE_URL}/modules/${encodeURIComponent(moduleName)}`);
        throw new Error('模块删除后仍然存在');
      } catch (error: any) {
        if (error.response?.status !== 404) {
          throw new Error('删除验证失败');
        }
      }
      
      console.log('✅ RESTful API完整流程测试成功');
      return true;
    } catch (error) {
      console.error('❌ 测试用例7失败:', error);
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 开始TESTMOD005人类交互接口测试\n');
    
    const results: { [key: string]: boolean } = {};
    
    try {
      // 启动服务器
      await this.startServer();
      
      // 运行测试用例
      results['获取根模块列表'] = await this.testGetRootModules();
      results['按层次名称获取模块'] = await this.testGetModuleByHierarchicalName();
      results['关键词搜索模块'] = await this.testSearchModules();
      results['添加新模块'] = await this.testAddModule();
      results['修改模块信息'] = await this.testUpdateModule();
      results['删除模块'] = await this.testDeleteModule();
      results['RESTful API完整流程'] = await this.testCompleteAPIFlow();
      
    } finally {
      // 停止服务器和清理
      await this.stopServer();
      await this.cleanup();
    }
    
    // 输出测试结果
    console.log('\n📊 TESTMOD005测试结果汇总:');
    console.log('=' .repeat(50));
    
    let passCount = 0;
    let totalCount = 0;
    
    for (const [testName, passed] of Object.entries(results)) {
      totalCount++;
      if (passed) {
        passCount++;
        console.log(`✅ ${testName}: 通过`);
      } else {
        console.log(`❌ ${testName}: 失败`);
      }
    }
    
    console.log('=' .repeat(50));
    console.log(`📈 总计: ${passCount}/${totalCount} 个测试通过`);
    
    if (passCount === totalCount) {
      console.log('🎉 所有TESTMOD005测试用例均通过！');
      process.exit(0);
    } else {
      console.log('⚠️ 部分测试用例失败，请检查实现');
      process.exit(1);
    }
  }
}

// 运行测试
if (process.argv[1] && process.argv[1].endsWith('testmod005-human-interface.ts')) {
  const tester = new TestMod005HumanInterface();
  tester.runAllTests().catch(console.error);
}

export { TestMod005HumanInterface };