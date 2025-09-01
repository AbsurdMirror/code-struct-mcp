/**
 * MCP接口模块测试
 * 测试所有MCP相关的接口和工具处理功能
 */

import {
  MCPRequest,
  MCPResponse,
  ToolCall,
  ValidationRule,
  mcp_tools_registry,
  parameter_validation_rules,
  type_structures,
  parse_tool_parameters,
  handle_mcp_tools,
  list_available_tools,
  generate_hierarchical_name
} from '../src/backend/mcp-interface';

import { initialize_storage } from '../src/backend/storage';
import { initialize_module_manager } from '../src/backend/module-manager';
import * as fs from 'fs';
import * as path from 'path';

describe('MCP接口模块测试', () => {
  const testDataDir = path.join(__dirname, '../test-data-mcp');
  
  beforeAll(async () => {
    // 确保测试数据目录存在
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    // 设置测试环境变量
    process.env.DATA_ROOT_PATH = testDataDir;
    
    // 初始化存储和模块管理器
    await initialize_storage();
    await initialize_module_manager();
  });
  
  afterAll(async () => {
    // 清理测试数据
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });
  
  describe('类型定义测试', () => {
    test('MCPRequest接口应该有正确的结构', () => {
      const request: MCPRequest = {
        id: 'test-id',
        method: 'test-method',
        params: { test: 'value' }
      };
      
      expect(request.id).toBe('test-id');
      expect(request.method).toBe('test-method');
      expect(request.params).toEqual({ test: 'value' });
    });
    
    test('MCPResponse接口应该有正确的结构', () => {
      const response: MCPResponse = {
        id: 'test-id',
        result: { success: true },
        error: {
          code: 400,
          message: 'Test error',
          data: { detail: 'error detail' }
        }
      };
      
      expect(response.id).toBe('test-id');
      expect(response.result).toEqual({ success: true });
      expect(response.error?.code).toBe(400);
    });
    
    test('ToolCall接口应该有正确的结构', () => {
      const toolCall: ToolCall = {
        name: 'test-tool',
        parameters: { param1: 'value1' }
      };
      
      expect(toolCall.name).toBe('test-tool');
      expect(toolCall.parameters).toEqual({ param1: 'value1' });
    });
  });
  
  describe('工具注册表测试', () => {
    test('应该包含所有必需的工具', () => {
      const expectedTools = ['add_module', 'get_module_by_name', 'smart_search', 'get_type_structure'];
      
      for (const toolName of expectedTools) {
        expect(mcp_tools_registry[toolName]).toBeDefined();
        expect(mcp_tools_registry[toolName].name).toBe(toolName);
        expect(typeof mcp_tools_registry[toolName].description).toBe('string');
        expect(Array.isArray(mcp_tools_registry[toolName].parameters)).toBe(true);
        expect(typeof mcp_tools_registry[toolName].handler).toBe('function');
      }
    });
    
    test('参数验证规则应该正确映射', () => {
      for (const toolName in mcp_tools_registry) {
        expect(parameter_validation_rules[toolName]).toBeDefined();
        expect(parameter_validation_rules[toolName]).toEqual(mcp_tools_registry[toolName].parameters);
      }
    });
  });
  
  describe('类型结构定义测试', () => {
    test('应该包含Module类型结构', () => {
      expect(type_structures.Module).toBeDefined();
      expect(type_structures.Module.name).toBe('Module');
      expect(type_structures.Module.type).toBe('interface');
      expect(Array.isArray(type_structures.Module.properties)).toBe(true);
    });
    
    test('应该包含SearchResult类型结构', () => {
      expect(type_structures.SearchResult).toBeDefined();
      expect(type_structures.SearchResult.name).toBe('SearchResult');
      expect(type_structures.SearchResult.type).toBe('interface');
      expect(Array.isArray(type_structures.SearchResult.properties)).toBe(true);
    });
  });
  
  describe('参数解析和验证测试', () => {
    test('应该正确验证add_module工具的参数', async () => {
      const validParams = {
        name: 'TestModule',
        type: 'class',
        file_path: '/test/path.ts',
        start_line: 1,
        end_line: 10
      };
      
      const result = await parse_tool_parameters('add_module', validParams);
      expect(result.name).toBe('TestModule');
      expect(result.type).toBe('class');
      expect(result.access_level).toBe('public'); // 默认值
    });
    
    test('应该拒绝缺少必需参数的请求', async () => {
      const invalidParams = {
        name: 'TestModule'
        // 缺少必需的type参数
      };
      
      await expect(parse_tool_parameters('add_module', invalidParams))
        .rejects.toThrow('缺少必需参数');
    });
    
    test('应该验证枚举值', async () => {
      const invalidParams = {
        name: 'TestModule',
        type: 'invalid_type', // 无效的枚举值
        file_path: '/test/path.ts',
        start_line: 1,
        end_line: 10
      };
      
      await expect(parse_tool_parameters('add_module', invalidParams))
        .rejects.toThrow('值无效');
    });
    
    test('应该验证数值范围', async () => {
      const invalidParams = {
        name: 'TestModule',
        type: 'class',
        file_path: '/test/path.ts',
        start_line: 0, // 小于最小值1
        end_line: 10
      };
      
      await expect(parse_tool_parameters('add_module', invalidParams))
        .rejects.toThrow('值过小');
    });
    
    test('应该拒绝未知工具', async () => {
      await expect(parse_tool_parameters('unknown_tool', {}))
        .rejects.toThrow('未知的工具');
    });
  });
  
  describe('工具处理测试', () => {
    test('应该成功处理add_module工具调用', async () => {
      const toolCall: ToolCall = {
        name: 'add_module',
        parameters: {
          name: 'MCPTestModule',
          type: 'class',
          description: 'MCP测试模块',
          file_path: '/mcp/test/path.ts',
          start_line: 1,
          end_line: 20
        }
      };
      
      const result = await handle_mcp_tools(toolCall);
      expect(result.success).toBe(true);
      expect(result.tool_name).toBe('add_module');
      expect(result.timestamp).toBeDefined();
    });
    
    test('应该成功处理get_module_by_name工具调用', async () => {
      const toolCall: ToolCall = {
        name: 'get_module_by_name',
        parameters: {
          name: 'MCPTestModule'
        }
      };
      
      const result = await handle_mcp_tools(toolCall);
      expect(result.success).toBe(true);
      expect(result.tool_name).toBe('get_module_by_name');
    });
    
    test('应该成功处理smart_search工具调用', async () => {
      const toolCall: ToolCall = {
        name: 'smart_search',
        parameters: {
          query: 'MCP',
          type: 'class',
          limit: 5
        }
      };
      
      const result = await handle_mcp_tools(toolCall);
      expect(result.success).toBe(true);
      expect(result.tool_name).toBe('smart_search');
      expect(Array.isArray(result.result)).toBe(true);
    });
    
    test('应该成功处理get_type_structure工具调用', async () => {
      const toolCall: ToolCall = {
        name: 'get_type_structure',
        parameters: {
          type_name: 'class'
        }
      };
      
      const result = await handle_mcp_tools(toolCall);
      expect(result.success).toBe(true);
      expect(result.tool_name).toBe('get_type_structure');
      expect(result.result.name).toBe('class');
    });
    
    test('应该处理未知工具调用', async () => {
      const toolCall: ToolCall = {
        name: 'unknown_tool',
        parameters: {}
      };
      
      const result = await handle_mcp_tools(toolCall);
      expect(result.success).toBe(false);
      expect(result.error).toContain('未知的工具');
    });
    
    test('应该处理参数验证错误', async () => {
      const toolCall: ToolCall = {
        name: 'add_module',
        parameters: {
          // 缺少必需参数
        }
      };
      
      const result = await handle_mcp_tools(toolCall);
      expect(result.success).toBe(false);
      expect(result.error).toContain('参数验证失败');
    });
  });
  
  describe('工具列表测试', () => {
    test('应该返回所有可用工具的信息', async () => {
      const tools = await list_available_tools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      for (const tool of tools) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(Array.isArray(tool.parameters)).toBe(true);
      }
      
      // 检查特定工具是否存在
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('add_module');
      expect(toolNames).toContain('get_module_by_name');
      expect(toolNames).toContain('smart_search');
      expect(toolNames).toContain('get_type_structure');
    });
  });
  
  describe('层次化名称生成测试', () => {
    test('应该为没有父模块的模块生成简单名称', async () => {
      const name = await generate_hierarchical_name('TestModule');
      expect(name).toBe('TestModule');
    });
    
    test('应该为有父模块的模块生成层次化名称', async () => {
      const name = await generate_hierarchical_name('ChildModule', 'ParentModule');
      expect(name).toBe('ParentModule.ChildModule');
    });
  });
  
  describe('集成测试', () => {
    test('应该能够完整的工具调用流程', async () => {
      // 1. 添加模块
      const addResult = await handle_mcp_tools({
        name: 'add_module',
        parameters: {
          name: 'IntegrationTestModule',
          type: 'function',
          description: 'MCP集成测试模块',
          file_path: '/integration/test.ts',
          start_line: 1,
          end_line: 15
        }
      });
      expect(addResult.success).toBe(true);
      
      // 2. 搜索模块
      const searchResult = await handle_mcp_tools({
        name: 'smart_search',
        parameters: {
          query: 'IntegrationTestModule'
        }
      });
      expect(searchResult.success).toBe(true);
      expect(searchResult.result.length).toBeGreaterThan(0);
      
      // 3. 获取模块信息
      const getResult = await handle_mcp_tools({
        name: 'get_module_by_name',
        parameters: {
          name: 'IntegrationTestModule'
        }
      });
      expect(getResult.success).toBe(true);
      
      // 4. 获取类型结构
      const typeResult = await handle_mcp_tools({
        name: 'get_type_structure',
        parameters: {
          type_name: 'function'
        }
      });
      expect(typeResult.success).toBe(true);
    });
  });
});