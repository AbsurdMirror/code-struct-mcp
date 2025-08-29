/**
 * 调试服务器启动和API功能的简化测试脚本
 */

import { ApiServer } from '../api/server.js';
import { DEFAULT_CONFIG, StorageConfig } from '../api/types/config.js';
import axios from 'axios';

const TEST_CONFIG = {
  ...DEFAULT_CONFIG,
  storage: {
    ...DEFAULT_CONFIG.storage,
    root_path: './debug-test-data'
  },
  http_server: {
    ...DEFAULT_CONFIG.http_server,
    port: 3006
  }
};

const BASE_URL = `http://localhost:${TEST_CONFIG.http_server.port}/api/v1`;

async function debugTest() {
  console.log('🚀 开始调试测试...');
  
  const server = new ApiServer(TEST_CONFIG);
  
  try {
    // 启动服务器
    console.log('📡 启动服务器...');
    await server.start();
    console.log('✅ 服务器启动成功');
    
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 测试健康检查
    console.log('🔍 测试健康检查...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ 健康检查成功:', healthResponse.data);
    } catch (error: any) {
      console.error('❌ 健康检查失败:', error.response?.data || error.message);
    }
    
    // 测试获取模块列表
    console.log('📋 测试获取模块列表...');
    try {
      const modulesResponse = await axios.get(`${BASE_URL}/modules`);
      console.log('✅ 获取模块列表成功:', modulesResponse.data);
    } catch (error: any) {
      console.error('❌ 获取模块列表失败:', error.response?.data || error.message);
    }
    
    // 测试添加模块
    console.log('➕ 测试添加模块...');
    try {
      const newModule = {
        hierarchical_name: 'TestModule',
        type: 'function',
        description: '测试模块',
        parameters: [],
        return_type: 'void'
      };
      
      const addResponse = await axios.post(`${BASE_URL}/modules`, newModule);
      console.log('✅ 添加模块成功:', addResponse.data);
    } catch (error: any) {
      console.error('❌ 添加模块失败:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  } finally {
    // 停止服务器
    console.log('🛑 停止服务器...');
    await server.stop();
    console.log('✅ 服务器已停止');
  }
}

// 运行调试测试
debugTest().catch(console.error);
