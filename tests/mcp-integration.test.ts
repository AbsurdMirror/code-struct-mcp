/**
 * MCP集成测试 - 使用@modelcontextprotocol/sdk进行程序化测试
 * 基于TEST_MCP接口测试文档的测试要求
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { clear_module_manager } from '../src/backend/module-manager';

/**
 * MCP集成测试类
 */
class MCPIntegrationTester {
  private client: Client;
  private transport!: StdioClientTransport;
  private testTimestamp: number;

  constructor() {
    this.client = new Client(
      {
        name: 'mcp-integration-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
    this.testTimestamp = Date.now();
  }

  /**
   * 启动MCP服务器进程
   */
  async startMCPServer(): Promise<void> {
    // 启动MCP服务器进程
    
    // 创建stdio传输，使用测试专用的数据目录
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: ['ts-node', './src/backend/app.ts', '--mode', 'mcp', '--data-path', 'test_integration_data']
    });

    // 连接客户端
    await this.client.connect(this.transport);
    
    // MCP客户端连接成功
  }

  /**
   * 停止MCP服务器进程
   */
  async stopMCPServer(): Promise<void> {
    if (this.client) {
      await this.client.close();
    }
  }

  /**
   * TESTCASE001: 添加模块接口测试
   */
  async testAddModule(): Promise<void> {
    // TESTCASE001: 添加模块接口测试
    
    // 测试添加一个新的类模块
    const testModule = {
      name: 'TestUserService',
      type: 'class',
      description: '测试用户服务类，用于处理用户相关的业务逻辑',
      parent: '',
      file: 'src/services/TestUserService.ts',
      parentClass: '',
      functions: ['getUserById', 'createUser', 'updateUser', 'deleteUser'],
      variables: ['userRepository', 'logger'],
      classes: [],
      access: 'public'
    };
    
    const addResult = await this.client.callTool({
      name: 'add_module',
      arguments: testModule,
    });
    
    // TESTCASE001 通过: 添加模块接口测试成功
    const result = JSON.parse((addResult.content as any)[0].text);
    
    if (!result.success) {
      throw new Error(`添加模块失败: ${result.message}`);
    }
    
    if (!result.data || result.data.name !== testModule.name) {
      throw new Error('添加的模块信息不正确');
    }
    
    // TESTCASE001 通过: 添加模块接口测试成功
  }

  /**
   * TESTCASE002: 获取模块接口测试
   */
  async testGetModuleByName(): Promise<void> {
    // TESTCASE002: 获取模块接口测试
    
    // 首先添加一个测试模块
    const addResult = await this.client.callTool({
      name: 'add_module',
      arguments: {
        name: 'TestGetModule',
        type: 'class',
        description: '用于获取测试的模块',
        file: '/test/get-module.ts',
        parentClass: 'BaseService',
        functions: ['getUser', 'updateUser'],
        variables: ['userId', 'userName']
      },
    });
    
    // 验证添加结果
    const addParsed = JSON.parse((addResult.content as any)[0].text);
    if (!addParsed.success) {
      throw new Error(`添加测试模块失败: ${addParsed.message}`);
    }
    
    // 测试获取刚添加的TestGetModule模块
    const getResult = await this.client.callTool({
      name: 'get_module_by_name',
      arguments: {
        hierarchical_name: 'TestGetModule',
      },
    });
    
    // 获取模块结果
    const result = JSON.parse((getResult.content as any)[0].text);
    
    if (!result.success) {
      throw new Error(`获取模块失败: ${result.message}`);
    }
    
    if (!result.data || result.data.name !== 'TestGetModule') {
      throw new Error('获取的模块信息不正确');
    }
    
    // 测试获取不存在的模块
    const notFoundResult = await this.client.callTool({
      name: 'get_module_by_name',
      arguments: {
        hierarchical_name: 'NonExistentModule12345',
      },
    });
    
    // 不存在模块的结果
    const notFoundParsed = JSON.parse((notFoundResult.content as any)[0].text);
    
    if (notFoundParsed.success) {
      throw new Error('获取不存在的模块应该返回失败');
    }
    
    // TESTCASE002 通过: 获取模块接口测试成功
  }

  /**
   * TESTCASE003: 智能搜索接口测试
   */
  async testSmartSearch(): Promise<void> {
    // TESTCASE003: 智能搜索接口测试
    
    // 首先添加一个测试模块用于搜索
    const addResult = await this.client.callTool({
      name: 'add_module',
      arguments: {
        name: 'TestSearchModule',
        type: 'class',
        description: '用于搜索测试的模块',
        file: '/test/search-module.ts',
        parentClass: 'BaseService',
        functions: ['searchUser', 'findUser'],
        variables: ['searchQuery', 'results']
      },
    });
    
    // 验证添加结果
    const addParsed = JSON.parse((addResult.content as any)[0].text);
    if (!addParsed.success) {
      throw new Error(`添加搜索测试模块失败: ${addParsed.message}`);
    }
    
    // 测试按名称搜索（搜索刚添加的TestSearchModule）
    const nameSearchResult = await this.client.callTool({
      name: 'smart_search',
      arguments: {
        name: 'TestSearch',
      },
    });
    
    // 按名称搜索结果
    const nameResult = JSON.parse((nameSearchResult.content as any)[0].text);
    
    if (!nameResult.success) {
      throw new Error(`按名称搜索失败: ${nameResult.message}`);
    }
    
    // 测试按类型搜索
    const typeSearchResult = await this.client.callTool({
      name: 'smart_search',
      arguments: {
        type: 'class',
      },
    });
    
    // 按类型搜索结果
    const typeResult = JSON.parse((typeSearchResult.content as any)[0].text);
    
    if (!typeResult.success) {
      throw new Error(`按类型搜索失败: ${typeResult.message}`);
    }
    
    // 测试按关键词搜索
    const keywordSearchResult = await this.client.callTool({
      name: 'smart_search',
      arguments: {
        keyword: '测试',
      },
    });
    
    // 按关键词搜索结果
    const keywordResult = JSON.parse((keywordSearchResult.content as any)[0].text);
    
    if (!keywordResult.success) {
      throw new Error(`按关键词搜索失败: ${keywordResult.message}`);
    }
    
    // 测试无匹配结果的搜索
    const noMatchResult = await this.client.callTool({
      name: 'smart_search',
      arguments: {
        keyword: 'NonExistentKeyword12345',
      },
    });
    
    // 无匹配搜索结果
    const noMatchParsed = JSON.parse((noMatchResult.content as any)[0].text);
    
    if (!noMatchParsed.success || (noMatchParsed.data && noMatchParsed.data.length > 0)) {
      throw new Error('无匹配搜索应该返回空列表');
    }
    
    // TESTCASE003 通过: 智能搜索接口测试成功
  }

  /**
   * TESTCASE004: 类型结构接口测试
   */
  async testGetTypeStructure(): Promise<void> {
    // TESTCASE004: 类型结构接口测试
    
    const moduleTypes = ['class', 'function', 'variable', 'file', 'functionGroup'];
    
    for (const moduleType of moduleTypes) {
      const typeStructureResult = await this.client.callTool({
        name: 'get_type_structure',
        arguments: {
          type_name: moduleType,
        },
      });
      
      // 类型结构结果
      const result = JSON.parse((typeStructureResult.content as any)[0].text);
      
      if (!result.success) {
        throw new Error(`获取${moduleType}类型结构失败: ${result.message}`);
      }
      
      if (!result.data || result.data.type_name !== moduleType) {
        throw new Error(`${moduleType}类型结构信息不正确`);
      }
      
      if (!result.data.fields || !Array.isArray(result.data.fields)) {
        throw new Error(`${moduleType}类型结构缺少字段定义`);
      }
    }
    
    // 测试不存在的类型
    try {
      await this.client.callTool({
        name: 'get_type_structure',
        arguments: {
          type_name: 'invalidType',
        },
      });
      throw new Error('获取不存在的类型应该抛出错误');
    } catch (error: any) {
      if (!error.message.includes('不支持的类型')) {
        throw error;
      }
    }
    
    // TESTCASE004 通过: 类型结构接口测试成功
  }

  /**
   * 运行所有测试用例
   */
  async runAllTests(): Promise<void> {
    // 开始MCP集成测试
    
    try {
      await this.startMCPServer();
      
      // 等待服务器启动
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.testAddModule();
      await this.testGetModuleByName();
      await this.testSmartSearch();
      await this.testGetTypeStructure();
      
      // 所有MCP集成测试通过
    } finally {
      await this.stopMCPServer();
    }
  }
}

/**
 * Jest测试套件
 */
describe('MCP集成测试', () => {
  let tester: MCPIntegrationTester;
  
  beforeEach(async () => {
    // 清理模块管理器的内存缓存
    clear_module_manager();
    
    // 清理存储数据，确保每个测试都从干净的状态开始
    const fs = require('fs');
    const path = require('path');
    const storageDir = path.join(process.cwd(), 'test_integration_data');
    
    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);
      for (const file of files) {
        if (file.endsWith('.yaml') && file !== 'config.yaml') {
          fs.unlinkSync(path.join(storageDir, file));
        }
      }
      
      // 重新创建空的modules.yaml文件
      const modulesFile = path.join(storageDir, 'modules.yaml');
      const yaml = require('js-yaml');
      const emptyData = { modules: {} };
      fs.writeFileSync(modulesFile, yaml.dump(emptyData), 'utf8');
    }
    
    // 等待一下确保清理完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 为每个测试创建新的tester实例并启动MCP服务器
    tester = new MCPIntegrationTester();
    await tester.startMCPServer();
  });
  
  afterEach(async () => {
    // 在每个测试后停止MCP服务器
    if (tester) {
      await tester.stopMCPServer();
    }
  });
  
  test('TESTCASE001: 添加模块接口测试', async () => {
    await tester.testAddModule();
  });
  
  test('TESTCASE002: 获取模块接口测试', async () => {
    await tester.testGetModuleByName();
  });
  
  test('TESTCASE003: 智能搜索接口测试', async () => {
    await tester.testSmartSearch();
  });
  
  test('TESTCASE004: 类型结构接口测试', async () => {
    await tester.testGetTypeStructure();
  });
  
  afterAll(async () => {
    if (tester) {
      await tester.stopMCPServer();
    }
  });
});

// 如果直接运行此文件，则执行所有测试
if (require.main === module) {
  const mcpTest = new MCPIntegrationTester();
  mcpTest.runAllTests().catch((error) => {
    // 测试执行失败
    process.exit(1);
  });
}

export default MCPIntegrationTester;