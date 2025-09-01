/**
 * MCP服务器测试
 * 测试MCP服务器的启动和工具调用功能
 */

import MCPServer from '../src/backend/mcp-server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as humanInterface from '../src/backend/human-interface';
import * as moduleManager from '../src/backend/module-manager';
import * as storage from '../src/backend/storage';
import { jest } from '@jest/globals';

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../src/backend/human-interface');
jest.mock('../src/backend/module-manager');
jest.mock('../src/backend/storage');

describe('MCP服务器测试', () => {
  let server: MCPServer;
  let mockMCPServer: jest.Mocked<Server>;
  let mockTransport: jest.Mocked<StdioServerTransport>;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();

    // 创建mock实例
    mockMCPServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined as never),
    } as any;

    mockTransport = {
      // transport mock methods if needed
    } as any;

    // Mock构造函数
    (Server as jest.MockedClass<typeof Server>).mockImplementation(() => mockMCPServer);
    (StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>).mockImplementation(() => mockTransport);

    // Mock存储和模块管理器
    (storage.initialize_storage as jest.Mock).mockResolvedValue(undefined as never);
    (moduleManager.initialize_module_manager as jest.Mock).mockResolvedValue(undefined as never);

    server = new MCPServer();
  });

  describe('服务器初始化', () => {
    test('应该能够创建MCP服务器实例', () => {
      expect(server).toBeInstanceOf(MCPServer);
      expect(Server).toHaveBeenCalledWith(
        {
          name: 'code-struct-mcp-server',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
    });

    test('应该设置请求处理器', () => {
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('工具列表处理', () => {
    test('应该注册工具列表处理器', () => {
      // 检查是否调用了setRequestHandler两次（一次为list tools，一次为call tool）
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledTimes(2);
    });

    test('应该返回所有可用工具', async () => {
      // 获取第一个setRequestHandler调用（应该是ListToolsRequestSchema）
      const listToolsHandler = mockMCPServer.setRequestHandler.mock.calls[0]?.[1];
      
      expect(listToolsHandler).toBeDefined();
      
      if (listToolsHandler) {
        const result = await listToolsHandler({} as any, {} as any);
        
        expect((result as any).tools).toBeDefined();
        expect(Array.isArray((result as any).tools)).toBe(true);
        expect((result as any).tools.length).toBe(4);
        
        const toolNames = (result as any).tools.map((tool: any) => tool.name);
        expect(toolNames).toContain('add_module');
        expect(toolNames).toContain('get_module_by_name');
        expect(toolNames).toContain('smart_search');
        expect(toolNames).toContain('get_type_structure');
      }
    });
  });

  describe('工具调用处理', () => {
    let callToolHandler: any;
 
    beforeEach(() => {
      // 获取第二个setRequestHandler调用（应该是CallToolRequestSchema）
      callToolHandler = mockMCPServer.setRequestHandler.mock.calls[1]?.[1];
      expect(callToolHandler).toBeDefined();
    });

    test('应该能够处理add_module工具调用', async () => {
      const mockResult = {
        success: true,
        message: '模块添加成功',
        data: { hierarchical_name: 'test.module' }
      };
      
      (humanInterface.add_module as jest.Mock).mockReturnValue(mockResult);
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'add_module',
          arguments: {
            name: 'TestModule',
            type: 'class',
            description: '测试模块',
            file: '/test/path'
          }
        }
      };
      
      const result = await callToolHandler(request, {} as any);
      
      expect(humanInterface.add_module).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect((result as any).content).toBeDefined();
      expect((result as any).content[0].type).toBe('text');
      expect(JSON.parse((result as any).content[0].text)).toEqual(mockResult);
    });

    test('应该能够处理get_module_by_name工具调用', async () => {
      const mockResult = {
        success: true,
        data: { name: 'TestModule', type: 'class' }
      };
      
      (humanInterface.get_module_by_hierarchical_name as jest.Mock).mockReturnValue(mockResult);
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'get_module_by_name',
          arguments: {
            hierarchical_name: 'test.module'
          }
        }
      };
      
      const result = await callToolHandler(request, {} as any);
      
      expect(humanInterface.get_module_by_hierarchical_name).toHaveBeenCalledWith('test.module');
      expect((result as any).content[0].type).toBe('text');
      expect(JSON.parse((result as any).content[0].text)).toEqual(mockResult);
    });

    test('应该能够处理smart_search工具调用', async () => {
      const mockResult = {
        success: true,
        data: [{ name: 'TestModule' }]
      };
      
      (humanInterface.search_modules as jest.Mock).mockReturnValue(mockResult);
      
      const request = {
        method: 'tools/call',
        params: {
          name: 'smart_search',
          arguments: {
            keyword: 'test',
            type: 'class'
          }
        }
      };
      
      const result = await callToolHandler(request, {} as any);
      
      expect(humanInterface.search_modules).toHaveBeenCalledWith({
        keyword: 'test',
        type: 'class',
        limit: 50
      });
      expect((result as any).content[0].type).toBe('text');
      expect(JSON.parse((result as any).content[0].text)).toEqual(mockResult);
    });

    test('应该能够处理get_type_structure工具调用', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'get_type_structure',
          arguments: {
            type_name: 'class'
          }
        }
      };
      
      const result = await callToolHandler(request, {} as any);
      const parsedResult = JSON.parse((result as any).content[0].text);
      
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data.type_name).toBe('class');
      expect(parsedResult.data.description).toBeDefined();
      expect(Array.isArray(parsedResult.data.fields)).toBe(true);
    });
  });

  describe('错误处理', () => {
    let callToolHandler: any;

    beforeEach(() => {
      // 获取第二个setRequestHandler调用（应该是CallToolRequestSchema）
      callToolHandler = mockMCPServer.setRequestHandler.mock.calls[1]?.[1];
      expect(callToolHandler).toBeDefined();
    });

    test('应该处理无效的工具名称', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'invalid_tool',
          arguments: {}
        }
      };
      
      if (callToolHandler) {
        await expect(callToolHandler(request, {} as any)).rejects.toThrow();
      }
    });

    test('应该处理缺少必需参数的请求', async () => {
      const request = {
        method: 'tools/call',
        params: {
          name: 'add_module',
          arguments: {
            name: 'TestModule'
            // 缺少type和description
          }
        }
      };
      
      await expect(callToolHandler(request, {} as any)).rejects.toThrow();
    });
  });

  describe('服务器启动', () => {
    test('应该能够启动服务器', async () => {
      await expect(server.start()).resolves.not.toThrow();
      
      expect(storage.initialize_storage).toHaveBeenCalled();
      expect(moduleManager.initialize_module_manager).toHaveBeenCalled();
      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockMCPServer.connect).toHaveBeenCalledWith(mockTransport);
    });

    test('应该处理存储初始化失败', async () => {
      (storage.initialize_storage as jest.Mock).mockRejectedValue(new Error('存储初始化失败') as never);
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      await expect(server.start()).rejects.toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });

  describe('集成测试', () => {
    test('应该支持完整的工具调用流程', async () => {
      // 确保服务器已经初始化
      expect(mockMCPServer.setRequestHandler).toHaveBeenCalledTimes(2);
      
      // 获取第二个setRequestHandler调用（应该是CallToolRequestSchema）
      const integrationCallToolHandler = mockMCPServer.setRequestHandler.mock.calls[1]?.[1];
      
      expect(integrationCallToolHandler).toBeDefined();
      
      // Mock返回值
      const addResult = { success: true, data: { hierarchical_name: 'TestModule' } };
      const getResult = { success: true, data: { name: 'TestModule' } };
      const searchResult = { success: true, data: [{ name: 'TestModule' }] };
      
      (humanInterface.add_module as jest.Mock).mockReturnValue(addResult);
      (humanInterface.get_module_by_hierarchical_name as jest.Mock).mockReturnValue(getResult);
      (humanInterface.search_modules as jest.Mock).mockReturnValue(searchResult);
      
      // 1. 添加模块
      const addRequest = {
        method: 'tools/call',
        params: {
          name: 'add_module',
          arguments: {
            name: 'TestModule',
            type: 'class',
            description: '测试模块'
          }
        }
      };
      
      const addResponse = await integrationCallToolHandler!(addRequest, {} as any);
      expect(JSON.parse((addResponse as any).content[0].text)).toEqual(addResult);
      
      // 2. 查询模块
      const getRequest = {
        method: 'tools/call',
        params: {
          name: 'get_module_by_name',
          arguments: {
            hierarchical_name: 'TestModule'
          }
        }
      };
      
      const getResponse = await integrationCallToolHandler!(getRequest, {} as any);
      expect(JSON.parse((getResponse as any).content[0].text)).toEqual(getResult);
      
      // 3. 搜索模块
      const searchRequest = {
        method: 'tools/call',
        params: {
          name: 'smart_search',
          arguments: {
            keyword: 'Test'
          }
        }
      };
      
      const searchResponse = await integrationCallToolHandler!(searchRequest, {} as any);
      expect(JSON.parse((searchResponse as any).content[0].text)).toEqual(searchResult);
      
      // 4. 获取类型结构
      const typeRequest = {
        method: 'tools/call',
        params: {
          name: 'get_type_structure',
          arguments: {
            type_name: 'class'
          }
        }
      };
      
      const typeResponse = await integrationCallToolHandler!(typeRequest, {} as any);
      const typeResult = JSON.parse((typeResponse as any).content[0].text);
      expect(typeResult.success).toBe(true);
      expect(typeResult.data.type_name).toBe('class');
    });
  });
});