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
 * 日志接口
 */
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/**
 * MCP服务器日志实例
 */
let mcpServerLogger: Logger | null = null;

/**
 * 设置MCP服务器日志实例
 * @param logger 日志实例
 */
export function setMCPServerLogger(logger: Logger): void {
  mcpServerLogger = logger;
}

/**
 * 获取日志实例
 * @returns 日志实例
 */
function getLogger(): Logger {
  return mcpServerLogger || {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {}
  };
}

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
      const logger = getLogger();
      logger.info(`MCP工具调用: ${name}`);
      logger.debug(`工具参数: ${JSON.stringify(args)}`);

      try {
        let result;
        switch (name) {
        case 'add_module':
          result = await this.handleAddModule(args);
          break;
        case 'get_module_by_name':
          result = await this.handleGetModuleByName(args);
          break;
        case 'smart_search':
          result = await this.handleSmartSearch(args);
          break;
        case 'get_type_structure':
          result = await this.handleGetTypeStructure(args);
          break;
        default:
          logger.error(`未知工具: ${name}`);
          throw new McpError(
            ErrorCode.MethodNotFound,
            `未知工具: ${name}`
          );
        }
        logger.debug(`MCP工具调用成功: ${name}`);
        return result;
      } catch (error) {
        const errorMsg = `MCP工具调用失败: ${name} - ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
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
    const logger = getLogger();
    logger.debug(`处理add_module工具: name=${args.name}, type=${args.type}`);
    
    // 验证必需参数
    if (!args.name || !args.type || !args.description) {
      const errorMsg = '缺少必需参数: name, type, description';
      logger.warn(`add_module参数验证失败: ${errorMsg}`);
      throw new McpError(
        ErrorCode.InvalidParams,
        errorMsg
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
        const errorMsg = 'function类型需要parameters和returnType参数';
        logger.warn(`add_module function类型参数验证失败: ${errorMsg}`);
        throw new McpError(
          ErrorCode.InvalidParams,
          errorMsg
        );
      }
      moduleData.parameters = args.parameters;
      moduleData.returnType = args.returnType;
      if (args.access) moduleData.access = args.access;
    } else if (args.type === 'variable') {
      if (!args.dataType) {
        const errorMsg = 'variable类型需要dataType参数';
        logger.warn(`add_module variable类型参数验证失败: ${errorMsg}`);
        throw new McpError(
          ErrorCode.InvalidParams,
          errorMsg
        );
      }
      moduleData.dataType = args.dataType;
      if (args.initialValue) moduleData.initialValue = args.initialValue;
      if (args.access) moduleData.access = args.access;
    }

    logger.debug(`构造的模块数据: ${JSON.stringify(moduleData)}`);
    // 调用人类接口模块
    const result = await humanInterface.add_module(moduleData);
    logger.debug(`add_module调用结果: ${result.success ? '成功' : '失败'}`);
    if (!result.success) {
      logger.warn(`add_module失败: ${result.message}`);
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
   * 处理get_module_by_name工具调用
   */
  private async handleGetModuleByName(args: any) {
    const logger = getLogger();
    logger.debug(`处理get_module_by_name工具: hierarchical_name=${args.hierarchical_name}`);
    
    if (!args.hierarchical_name) {
      const errorMsg = '缺少必需参数: hierarchical_name';
      logger.warn(`get_module_by_name参数验证失败: ${errorMsg}`);
      throw new McpError(
        ErrorCode.InvalidParams,
        errorMsg
      );
    }

    const result = await humanInterface.get_module_by_hierarchical_name(args.hierarchical_name);
    logger.debug(`get_module_by_name调用结果: ${result.success ? '成功' : '失败'}`);
    if (!result.success) {
      logger.warn(`get_module_by_name失败: ${result.message}`);
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
   * 处理smart_search工具调用
   */
  private async handleSmartSearch(args: any) {
    const logger = getLogger();
    const limit = args.limit || 50;
    logger.debug(`处理smart_search工具: keyword=${args.keyword}, name=${args.name}, limit=${limit}`);
    
    if (args.keyword || args.name) {
      // 使用人类接口的搜索功能
      logger.debug(`使用人类接口搜索: ${args.keyword || args.name}`);
      const result = await humanInterface.search_modules({
        keyword: args.keyword || args.name,
        type: args.type,
        limit: limit
      });
      
      logger.debug(`smart_search人类接口调用结果: ${result.success ? '成功' : '失败'}`);
      if (result.success && result.data) {
        logger.debug(`搜索到${result.data.length || 0}个模块`);
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            data: result.data,
            message: result.message
          }, null, 2)
        }]
      };
    } else {
      // 使用模块管理器的查找功能
      logger.debug('使用模块管理器查找所有模块');
      const modules = await moduleManager.find_modules({});
      const limitedModules = modules.slice(0, limit);
      
      logger.debug(`模块管理器查找到${modules.length}个模块，返回前${limitedModules.length}个`);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            data: {
              modules: limitedModules,
              total: modules.length,
              page: 1,
              pageSize: limit
            }
          }, null, 2)
        }]
      };
    }
  }

  /**
   * 处理get_type_structure工具调用
   */
  private async handleGetTypeStructure(args: any) {
    const logger = getLogger();
    logger.debug(`处理get_type_structure工具: type_name=${args.type_name}`);
    
    if (!args.type_name) {
      const errorMsg = '缺少必需参数: type_name';
      logger.warn(`get_type_structure参数验证失败: ${errorMsg}`);
      throw new McpError(
        ErrorCode.InvalidParams,
        errorMsg
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
      const errorMsg = `不支持的类型: ${args.type_name}`;
      logger.warn(`get_type_structure不支持的类型: ${errorMsg}`);
      throw new McpError(
        ErrorCode.InvalidParams,
        errorMsg
      );
    }
    
    logger.debug(`get_type_structure成功返回类型结构: ${args.type_name}`);

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
    const logger = getLogger();
    logger.info('启动MCP服务器');
    
    try {
      // 注意：存储模块和模块管理器的初始化已在app.ts中完成
      // 这里只需要连接MCP传输层
      logger.debug('连接MCP传输层');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('MCP服务器启动成功');
    } catch (error) {
      const errorMsg = `MCP服务器启动失败: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMsg);
      
      // 如果是存储初始化失败，退出进程
      if (error instanceof Error && error.message.includes('存储初始化失败')) {
        process.exit(1);
      }
      
      throw error;
    }
  }
}

// 如果直接运行此文件，则启动MCP服务器
if (require.main === module) {
  // 导入app模块来处理命令行参数和初始化
  import('./app').then(async (app) => {
    try {
      // 解析命令行参数
      const args = process.argv.slice(2);
      let mode = 'mcp';
      let dataPath = '.code-doc-mcp';
      
      // 解析命令行参数
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--mode') {
          mode = args[i + 1];
          i++;
        } else if (arg === '--data-path') {
          dataPath = args[i + 1];
          i++;
        }
      }
      
      // 如果不是MCP模式，退出
      if (mode !== 'mcp') {
        process.stderr.write('MCP服务器只能在mcp模式下运行\n');
        process.exit(1);
      }
      
      // 调用app.ts中的初始化逻辑
      const { initializeApp } = await import('./app');
      await initializeApp({ mode: 'mcp', dataPath });
      
      // 创建并启动MCP服务器
      const mcpServer = new MCPServer();
      await mcpServer.start();
    } catch (error) {
      process.stderr.write(`MCP服务器启动失败: ${error}\n`);
      process.exit(1);
    }
  }).catch(error => {
    process.stderr.write(`导入app模块失败: ${error}\n`);
    process.exit(1);
  });
}

export default MCPServer;