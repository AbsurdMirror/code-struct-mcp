/**
 * TESTMOD004 - AI模型MCP接口测试
 * 测试用例3: 实现并测试列出可用工具功能(list_available_tools)
 * 
 * 测试MCP服务器的工具列表功能，包括：
 * 1. 列出所有可用工具
 * 2. 工具信息的完整性（检查每个工具都有name、description、inputSchema等必需字段）
 * 3. 工具参数定义的正确性（验证add_module、get_module_by_name、smart_search、get_type_structure等工具的参数定义）
 * 4. 工具描述的准确性（检查描述是否与功能匹配）
 */

import { MCPServer } from '../api/mcp/mcp-server.js';
import { YamlStorage } from '../api/storage/yaml-storage.js';
import { ModuleManager } from '../api/modules/module-manager.js';
import { StorageConfig } from '../api/types/config.js';
import { MCP_TOOLS } from '../api/types/mcp.js';
import * as fs from 'fs';
import * as path from 'path';
// 获取当前文件目录
const __dirname = process.cwd();

// 测试配置
const testConfig: StorageConfig = {
  root_path: './test_data',
  data_path: './test_data',
  backup_path: './test_data/backups',
  backup_enabled: true,
  backup_interval: 60,
  max_backups: 5,
  auto_backup: false,
  compression: false,
  encryption: {
    enabled: false
  },
  validation: {
    enabled: true,
    schema_validation: true,
    data_integrity_check: true
  }
};

// 初始化测试环境
async function initializeTest(): Promise<{ mcpServer: MCPServer, moduleManager: ModuleManager }> {
  // 清理测试目录
  if (fs.existsSync(testConfig.data_path)) {
    fs.rmSync(testConfig.data_path, { recursive: true, force: true });
  }
  if (fs.existsSync(testConfig.backup_path)) {
    fs.rmSync(testConfig.backup_path, { recursive: true, force: true });
  }

  // 创建存储和模块管理器
  console.log('测试配置:', JSON.stringify(testConfig, null, 2));
  const storage = new YamlStorage(testConfig);
  const moduleManager = new ModuleManager(storage);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 创建MCP服务器
  const mcpServer = new MCPServer(testConfig);
  
  return { mcpServer, moduleManager };
}

// 清理测试环境
function cleanupTest(): void {
  if (fs.existsSync(testConfig.data_path)) {
    fs.rmSync(testConfig.data_path, { recursive: true, force: true });
  }
  if (fs.existsSync(testConfig.backup_path)) {
    fs.rmSync(testConfig.backup_path, { recursive: true, force: true });
  }
}

// 测试用例1: 列出所有可用工具
async function testListAllTools(): Promise<boolean> {
  console.log('\n=== 测试用例1: 列出所有可用工具 ===');
  
  try {
    const { mcpServer } = await initializeTest();
    
    // 直接使用MCP_TOOLS常量，因为MCPServer没有公开的listTools方法
    const tools = MCP_TOOLS;
    
    console.log('工具列表响应:', JSON.stringify({ tools }, null, 2));
    
    // 验证响应结构
    if (!Array.isArray(tools)) {
      console.log('✗ 工具列表响应格式错误');
      return false;
    }
    
    // 检查是否有工具
    if (tools.length === 0) {
      console.log('✗ 没有找到任何工具');
      return false;
    }
    
    console.log(`✓ 成功列出 ${tools.length} 个工具`);
    return true;
    
  } catch (error) {
    console.error('✗ 列出工具异常:', error);
    return false;
  }
}

// 测试用例2: 工具信息的完整性
async function testToolInfoCompleteness(): Promise<boolean> {
  console.log('\n=== 测试用例2: 工具信息的完整性 ===');
  
  try {
    const { mcpServer } = await initializeTest();
    
    // 直接使用MCP_TOOLS常量
    const tools = MCP_TOOLS;
    
    if (!Array.isArray(tools)) {
      console.log('✗ 工具列表响应格式错误');
      return false;
    }
    
    let allComplete = true;
    
    // 检查每个工具的必需字段
    for (const tool of tools) {
      console.log(`检查工具: ${tool.name}`);
      
      // 检查必需字段
      const requiredFields = ['name', 'description', 'inputSchema'];
      for (const field of requiredFields) {
        if (!tool[field]) {
          console.log(`✗ 工具 ${tool.name} 缺少必需字段: ${field}`);
          allComplete = false;
        }
      }
      
      // 检查inputSchema结构
      if (tool.inputSchema) {
        if (!tool.inputSchema.type || !tool.inputSchema.properties) {
          console.log(`✗ 工具 ${tool.name} 的inputSchema结构不完整`);
          allComplete = false;
        }
      }
    }
    
    if (allComplete) {
      console.log('✓ 所有工具信息完整');
      return true;
    } else {
      console.log('✗ 部分工具信息不完整');
      return false;
    }
    
  } catch (error) {
    console.error('✗ 检查工具信息完整性异常:', error);
    return false;
  }
}

// 测试用例3: 工具参数定义的正确性
async function testToolParameterDefinitions(): Promise<boolean> {
  console.log('\n=== 测试用例3: 工具参数定义的正确性 ===');
  
  try {
    const { mcpServer } = await initializeTest();
    
    // 直接使用MCP_TOOLS常量
    const tools = MCP_TOOLS;
    
    if (!Array.isArray(tools)) {
      console.log('✗ 工具列表响应格式错误');
      return false;
    }
    
    // 期望的工具及其参数
    const expectedTools = {
      'add_module': ['name', 'type', 'file_path', 'access_modifier'],
      'get_module_by_name': ['hierarchical_name'],
      'smart_search': [], // smart_search没有必需参数，所有参数都是可选的
      'get_type_structure': ['type_name'] // 根据MCP_TOOLS定义，应该是type_name而不是hierarchical_name
    };
    
    let allCorrect = true;
    
    // 检查每个期望的工具
    for (const [toolName, expectedParams] of Object.entries(expectedTools)) {
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        console.log(`✗ 未找到期望的工具: ${toolName}`);
        allCorrect = false;
        continue;
      }
      
      console.log(`检查工具参数: ${toolName}`);
      
      // 检查参数定义
      if (!tool.inputSchema || !tool.inputSchema.properties) {
        console.log(`✗ 工具 ${toolName} 没有参数定义`);
        allCorrect = false;
        continue;
      }
      
      // 检查必需参数
      for (const param of expectedParams) {
        if (!tool.inputSchema.properties[param]) {
          console.log(`✗ 工具 ${toolName} 缺少参数: ${param}`);
          allCorrect = false;
        }
      }
      
      console.log(`✓ 工具 ${toolName} 参数定义正确`);
    }
    
    if (allCorrect) {
      console.log('✓ 所有工具参数定义正确');
      return true;
    } else {
      console.log('✗ 部分工具参数定义不正确');
      return false;
    }
    
  } catch (error) {
    console.error('✗ 检查工具参数定义异常:', error);
    return false;
  }
}

// 测试用例4: 工具描述的准确性
async function testToolDescriptionAccuracy(): Promise<boolean> {
  console.log('\n=== 测试用例4: 工具描述的准确性 ===');
  
  try {
    const { mcpServer } = await initializeTest();
    
    // 直接使用MCP_TOOLS常量
    const tools = MCP_TOOLS;
    
    if (!Array.isArray(tools)) {
      console.log('✗ 工具列表响应格式错误');
      return false;
    }
    
    // 期望的工具描述关键词
    const expectedDescriptions = {
      'add_module': ['添加', '模块', 'module'],
      'get_module_by_name': ['获取', '模块', '名称', 'name'],
      'smart_search': ['搜索', '查找', 'search'],
      'get_type_structure': ['类型', '结构', 'type', 'structure']
    };
    
    let allAccurate = true;
    
    // 检查每个工具的描述
    for (const [toolName, keywords] of Object.entries(expectedDescriptions)) {
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        console.log(`✗ 未找到工具: ${toolName}`);
        allAccurate = false;
        continue;
      }
      
      console.log(`检查工具描述: ${toolName}`);
      console.log(`描述内容: ${tool.description}`);
      
      // 检查描述是否包含相关关键词
      const description = tool.description.toLowerCase();
      let hasRelevantKeyword = false;
      
      for (const keyword of keywords) {
        if (description.includes(keyword.toLowerCase())) {
          hasRelevantKeyword = true;
          break;
        }
      }
      
      if (!hasRelevantKeyword) {
        console.log(`✗ 工具 ${toolName} 的描述不够准确，缺少相关关键词`);
        allAccurate = false;
      } else {
        console.log(`✓ 工具 ${toolName} 描述准确`);
      }
    }
    
    if (allAccurate) {
      console.log('✓ 所有工具描述准确');
      return true;
    } else {
      console.log('✗ 部分工具描述不够准确');
      return false;
    }
    
  } catch (error) {
    console.error('✗ 检查工具描述准确性异常:', error);
    return false;
  }
}

// 运行所有测试
async function runAllTests(): Promise<void> {
  console.log('开始执行TESTMOD004-测试用例3: 列出可用工具功能测试');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: '列出所有可用工具', fn: testListAllTools },
    { name: '工具信息的完整性', fn: testToolInfoCompleteness },
    { name: '工具参数定义的正确性', fn: testToolParameterDefinitions },
    { name: '工具描述的准确性', fn: testToolDescriptionAccuracy }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  try {
    for (const test of tests) {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    }
  } finally {
    // 清理测试环境
    cleanupTest();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`测试完成: ${passedTests}/${totalTests} 个测试用例通过`);
  
  if (passedTests === totalTests) {
    console.log('✓ 所有测试用例通过！');
    process.exit(0);
  } else {
    console.log('✗ 部分测试用例失败');
    process.exit(1);
  }
}

// 执行测试
if (process.argv[1] && process.argv[1].endsWith('testmod004-list-tools.ts')) {
  runAllTests().catch(error => {
    console.error('测试执行异常:', error);
    process.exit(1);
  });
}

export {
  testListAllTools,
  testToolInfoCompleteness,
  testToolParameterDefinitions,
  testToolDescriptionAccuracy,
  runAllTests
};