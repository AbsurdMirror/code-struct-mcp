/**
 * MCP服务器实现 - 基于@modelcontextprotocol/sdk
 * 提供MCP协议支持，实现add_module、get_module_by_name、smart_search、get_type_structure工具
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import * as humanInterface from './human-interface';
import * as moduleManager from './module-manager';
import * as storage from './storage';
import { Module, SearchCriteria } from '../shared/types';

/**
 * MCP服务器类
 */
class MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
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

    this.setupToolHandlers();
  }

  /**
   * 设置工具处理器
   */
  private setupToolHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'add_module',
            description: '添加新模块到代码文档系统，支持添加class、function、variable、file、functionGroup五种类型模块',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: '模块名称（非唯一标识符）',
                },
                parent: {
                  type: 'string',
                  description: '父模块的hierarchical_name',
                },
                type: {
                  type: 'string',
                  enum: ['class', 'function', 'variable', 'file', 'functionGroup'],
                  description: '模块类型',
                },
                description: {
                  type: 'string',
                  description: '模块描述',
                },
                file: {
                  type: 'string',
                  description: '所属文件路径',
                },
                // class类型特有参数
                parentClass: {
                  type: 'string',
                  description: '父类名称（仅class类型）',
                },
                functions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '类中的函数列表（仅class类型）',
                },
                variables: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '类中的变量列表（仅class类型）',
                },
                classes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '类中的嵌套类列表（仅class类型）',
                },
                access: {
                  type: 'string',
                  enum: ['public', 'private', 'protected'],
                  description: '访问权限',
                },
                // function类型特有参数
                parameters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      defaultValue: { type: 'string' },
                      description: { type: 'string' },
                    },
                    required: ['name', 'type'],
                  },
                  description: '函数参数列表（仅function类型）',
                },
                returnType: {
                  type: 'string',
                  description: '返回值类型（仅function类型）',
                },
                // variable类型特有参数
                dataType: {
                  type: 'string',
                  description: '变量数据类型（仅variable类型）',
                },
                initialValue: {
                  type: 'string',
                  description: '初始值（仅variable类型）',
                },
              },
              required: ['name', 'type', 'description'],
            },
          },
          {
            name: 'get_module_by_name',
            description: '通过模块的hierarchical_name精准查询单个模块信息',
            inputSchema: {
              type: 'object',
              properties: {
                hierarchical_name: {
                  type: 'string',
                  description: '模块的层次化唯一标识符',
                },
              },
              required: ['hierarchical_name'],
            },
          },
          {
            name: 'smart_search',
            description: '智能搜索功能，支持基于模块名称、类型、描述的模糊匹配',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: '模块名称（模糊匹配）',
                },
                type: {
                  type: 'string',
                  enum: ['class', 'function', 'variable', 'file', 'functionGroup'],
                  description: '模块类型过滤',
                },
                keyword: {
                  type: 'string',
                  description: '关键字搜索（匹配描述）',
                },
              },
            },
          },
          {
            name: 'get_type_structure',
            description: '获取指定模块类型的数据结构规范',
            inputSchema: {
              type: 'object',
              properties: {
                type_name: {
                  type: 'string',
                  enum: ['class', 'function', 'variable', 'file', 'functionGroup'],
                  description: '类型名称',
                },
              },
              required: ['type_name'],
            },
          },
        ],
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
        case 'add_module':
          return await this.handleAddModule(args);
        case 'get_module_by_name':
          return await this.handleGetModuleByName(args);
        case 'smart_search':
          return await this.handleSmartSearch(args);
        case 'get_type_structure':
          return await this.handleGetTypeStructure(args);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `未知工具: ${name}`
          );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `工具执行错误: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * 处理add_module工具调用
   */
  private async handleAddModule(args: any) {
    // 验证必需参数
    if (!args.name || !args.type || !args.description) {
      throw new McpError(
        ErrorCode.InvalidParams,
        '缺少必需参数: name, type, description'
      );
    }

    // 构造模块数据
    const moduleData: any = {
      name: args.name,
      type: args.type as 'class' | 'function' | 'variable' | 'file' | 'functionGroup',
      description: args.description,
      parent: args.parent || '',
      file: args.file || '',
    };

    // 根据类型添加特有参数
    if (args.type === 'class') {
      if (args.parentClass) moduleData.parentClass = args.parentClass;
      if (args.functions) moduleData.functions = args.functions;
      if (args.variables) moduleData.variables = args.variables;
      if (args.classes) moduleData.classes = args.classes;
      if (args.access) moduleData.access = args.access;
    } else if (args.type === 'function') {
      if (!args.parameters || !args.returnType) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'function类型需要parameters和returnType参数'
        );
      }
      moduleData.parameters = args.parameters;
      moduleData.returnType = args.returnType;
      if (args.access) moduleData.access = args.access;
    } else if (args.type === 'variable') {
      if (!args.dataType) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'variable类型需要dataType参数'
        );
      }
      moduleData.dataType = args.dataType;
      if (args.initialValue) moduleData.initialValue = args.initialValue;
      if (args.access) moduleData.access = args.access;
    }

    // 调用人类接口模块
    const result = humanInterface.add_module(moduleData);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理get_module_by_name工具调用
   */
  private async handleGetModuleByName(args: any) {
    if (!args.hierarchical_name) {
      throw new McpError(
        ErrorCode.InvalidParams,
        '缺少必需参数: hierarchical_name'
      );
    }

    const result = humanInterface.get_module_by_hierarchical_name(args.hierarchical_name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理smart_search工具调用
   */
  private async handleSmartSearch(args: any) {
    let result: any;
    
    // 如果有keyword，使用search_modules进行关键词搜索
    if (args.keyword || args.name) {
      const searchQuery: any = {
        keyword: args.keyword || args.name,
        type: args.type as 'class' | 'function' | 'variable' | 'file' | 'functionGroup' | undefined,
        limit: 50
      };
      result = humanInterface.search_modules(searchQuery);
    } else {
      // 如果只有type或其他条件，直接使用find_modules
      const searchCriteria: any = {};
      if (args.type) {
        searchCriteria.type = args.type;
      }
      
      const modules = moduleManager.find_modules(searchCriteria);
      result = {
        success: true,
        message: '搜索成功',
        data: modules.slice(0, 50) // 限制返回数量
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 处理get_type_structure工具调用
   */
  private async handleGetTypeStructure(args: any) {
    if (!args.type_name) {
      throw new McpError(
        ErrorCode.InvalidParams,
        '缺少必需参数: type_name'
      );
    }

    // 定义类型结构信息
    const typeStructures: Record<string, any> = {
      class: {
        type_name: 'class',
        description: '类模块的数据结构',
        fields: [
          { name: 'name', type: 'string', required: true, description: '类名称' },
          { name: 'description', type: 'string', required: true, description: '类描述' },
          { name: 'parent', type: 'string', required: false, description: '父模块' },
          { name: 'file', type: 'string', required: false, description: '所属文件' },
          { name: 'parentClass', type: 'string', required: false, description: '父类名称' },
          { name: 'functions', type: 'string[]', required: false, description: '函数列表' },
          { name: 'variables', type: 'string[]', required: false, description: '变量列表' },
          { name: 'classes', type: 'string[]', required: false, description: '嵌套类列表' },
          { name: 'access', type: 'string', required: false, description: '访问权限' },
        ],
        structure: {
          required: ['name', 'type', 'description'],
          optional: ['parent', 'file', 'parentClass', 'functions', 'variables', 'classes', 'access'],
        },
      },
      function: {
        type_name: 'function',
        description: '函数模块的数据结构',
        fields: [
          { name: 'name', type: 'string', required: true, description: '函数名称' },
          { name: 'description', type: 'string', required: true, description: '函数描述' },
          { name: 'parameters', type: 'Parameter[]', required: true, description: '参数列表' },
          { name: 'returnType', type: 'string', required: true, description: '返回值类型' },
          { name: 'parent', type: 'string', required: false, description: '父模块' },
          { name: 'file', type: 'string', required: false, description: '所属文件' },
          { name: 'access', type: 'string', required: false, description: '访问权限' },
        ],
        structure: {
          required: ['name', 'type', 'description', 'parameters', 'returnType'],
          optional: ['parent', 'file', 'access'],
        },
      },
      variable: {
        type_name: 'variable',
        description: '变量模块的数据结构',
        fields: [
          { name: 'name', type: 'string', required: true, description: '变量名称' },
          { name: 'description', type: 'string', required: true, description: '变量描述' },
          { name: 'dataType', type: 'string', required: true, description: '数据类型' },
          { name: 'parent', type: 'string', required: false, description: '父模块' },
          { name: 'file', type: 'string', required: false, description: '所属文件' },
          { name: 'initialValue', type: 'string', required: false, description: '初始值' },
          { name: 'access', type: 'string', required: false, description: '访问权限' },
        ],
        structure: {
          required: ['name', 'type', 'description', 'dataType'],
          optional: ['parent', 'file', 'initialValue', 'access'],
        },
      },
      file: {
        type_name: 'file',
        description: '文件模块的数据结构',
        fields: [
          { name: 'name', type: 'string', required: true, description: '文件名称' },
          { name: 'description', type: 'string', required: true, description: '文件描述' },
          { name: 'parent', type: 'string', required: false, description: '父模块' },
          { name: 'file', type: 'string', required: false, description: '文件路径' },
        ],
        structure: {
          required: ['name', 'type', 'description'],
          optional: ['parent', 'file'],
        },
      },
      functionGroup: {
        type_name: 'functionGroup',
        description: '函数组模块的数据结构',
        fields: [
          { name: 'name', type: 'string', required: true, description: '函数组名称' },
          { name: 'description', type: 'string', required: true, description: '函数组描述' },
          { name: 'parent', type: 'string', required: false, description: '父模块' },
          { name: 'file', type: 'string', required: false, description: '所属文件' },
        ],
        structure: {
          required: ['name', 'type', 'description'],
          optional: ['parent', 'file'],
        },
      },
    };

    const typeStructure = typeStructures[args.type_name];
    if (!typeStructure) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `不支持的类型: ${args.type_name}`
      );
    }

    const result = {
      success: true,
      message: '获取类型结构成功',
      data: typeStructure,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * 初始化并启动MCP服务器
   */
  async start(): Promise<void> {
    try {
      // 初始化存储模块
      await storage.initialize_storage();
      
      // 初始化模块管理器
      await moduleManager.initialize_module_manager();
      
      // MCP服务器初始化完成
      
      // 创建stdio传输
      const transport = new StdioServerTransport();
      
      // 连接服务器和传输
      await this.server.connect(transport);
      
      // MCP服务器启动成功，等待客户端连接
    } catch (error) {
      // MCP服务器启动失败
      process.exit(1);
    }
  }
}

// 如果直接运行此文件，则启动MCP服务器
if (require.main === module) {
  const mcpServer = new MCPServer();
  mcpServer.start();
}

export default MCPServer;