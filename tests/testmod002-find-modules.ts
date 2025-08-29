/**
 * TESTMOD002-测试用例2: find_modules函数测试
 * 测试模块查找功能的各种场景
 */

import { ModuleManager } from '../api/modules/module-manager.ts';
import { YamlStorage } from '../api/storage/yaml-storage.ts';
import { AnyModule, SearchCriteria } from '../api/types/module.ts';
import { StorageConfig } from '../api/storage/storage.ts';
import * as fs from 'fs';
import * as path from 'path';

// 测试数据目录
const TEST_DATA_DIR = './test-data/testmod002-find';

// 全局变量
let storage: YamlStorage;
let moduleManager: ModuleManager;

/**
 * 初始化测试环境
 */
async function initializeTestEnvironment(): Promise<void> {
  // 创建测试目录
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // 创建存储配置
  const storageConfig: StorageConfig = {
    root_path: './test-data',
    data_path: './test-data/modules',
    backup_path: './test-data/backups',
    backup_enabled: true,
    backup_interval: 60,
    max_backups: 5,
    auto_backup: true,
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

  // 初始化存储和模块管理器
  storage = new YamlStorage(storageConfig);
  await storage.initialize_storage();
  moduleManager = new ModuleManager(storage);

  // 创建测试数据
  await createTestData();
}

/**
 * 创建测试数据
 */
async function createTestData(): Promise<void> {
  const testModules: AnyModule[] = [
    {
      name: 'UserService',
      type: 'class',
      hierarchical_name: 'UserService',
      parent_module: undefined,
      file_path: '/src/services/user.ts',
      access_modifier: 'public',
      description: '用户服务类，处理用户相关业务逻辑',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      name: 'getUserById',
      type: 'function',
      hierarchical_name: 'UserService.getUserById',
      parent_module: 'UserService',
      file_path: '/src/services/user.ts',
      access_modifier: 'public',
      description: '根据ID获取用户信息',
      parameters: [
        {
          name: 'id',
          data_type: 'string',
          is_required: true,
          description: '用户ID'
        }
      ],
      return_type: 'Promise<User>',
      is_async: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      name: 'ProductService',
      type: 'class',
      hierarchical_name: 'ProductService',
      parent_module: undefined,
      file_path: '/src/services/product.ts',
      access_modifier: 'public',
      description: '产品服务类，处理产品相关业务逻辑',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      name: 'getProductList',
      type: 'function',
      hierarchical_name: 'ProductService.getProductList',
      parent_module: 'ProductService',
      file_path: '/src/services/product.ts',
      access_modifier: 'public',
      description: '获取产品列表',
      parameters: [],
      return_type: 'Promise<Product[]>',
      is_async: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      name: 'API_BASE_URL',
      type: 'variable',
      hierarchical_name: 'API_BASE_URL',
      parent_module: undefined,
      file_path: '/src/config/constants.ts',
      access_modifier: 'public',
      description: 'API基础URL配置',
      data_type: 'string',
      initial_value: 'https://api.example.com',
      is_constant: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    {
      name: 'DatabaseHelper',
      type: 'class',
      hierarchical_name: 'DatabaseHelper',
      parent_module: undefined,
      file_path: '/src/utils/database.ts',
      access_modifier: 'public',
      description: '数据库辅助工具类',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }
  ];

  // 添加测试模块
  for (const moduleRequest of testModules) {
    const result = await moduleManager.createModule(moduleRequest);
    if (!result.success) {
      console.error(`创建测试模块失败: ${moduleRequest.name}`, result.error);
    }
  }
}

/**
 * 清理测试环境
 */
function cleanupTestEnvironment(): void {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

/**
 * 测试用例1: 精确查找 - 根据模块名称精确查找
 */
async function testExactSearch(): Promise<boolean> {
  console.log('\n=== 测试用例1: 精确查找 ===');
  
  try {
    const criteria: SearchCriteria = {
      name: 'UserService'
    };
    
    const result = await moduleManager.find_modules(criteria);
    
    console.log(`查找结果: 找到 ${result.total} 个模块`);
    
    if (result.total === 1 && result.modules[0].name === 'UserService') {
      console.log('✅ 精确查找测试通过');
      return true;
    } else {
      console.log('❌ 精确查找测试失败: 未找到预期的模块');
      return false;
    }
  } catch (error) {
    console.error('❌ 精确查找测试失败:', error);
    return false;
  }
}

/**
 * 测试用例2: 类型筛选 - 根据模块类型筛选
 */
async function testTypeFilter(): Promise<boolean> {
  console.log('\n=== 测试用例2: 类型筛选 ===');
  
  try {
    const criteria: SearchCriteria = {
      type: 'class'
    };
    
    const result = await moduleManager.find_modules(criteria);
    
    console.log(`查找结果: 找到 ${result.total} 个class类型模块`);
    
    // 验证所有结果都是class类型
    const allAreClasses = result.modules.every(module => module.type === 'class');
    
    if (result.total >= 3 && allAreClasses) {
      console.log('✅ 类型筛选测试通过');
      return true;
    } else {
      console.log('❌ 类型筛选测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ 类型筛选测试失败:', error);
    return false;
  }
}

/**
 * 测试用例3: 关键字搜索 - 根据描述关键字搜索
 */
async function testKeywordSearch(): Promise<boolean> {
  console.log('\n=== 测试用例3: 关键字搜索 ===');
  
  try {
    const criteria: SearchCriteria = {
      description: '服务'
    };
    
    const result = await moduleManager.find_modules(criteria);
    
    console.log(`查找结果: 找到 ${result.total} 个包含"服务"关键字的模块`);
    
    // 验证所有结果的描述都包含"服务"
    const allContainKeyword = result.modules.every(module => 
      module.description && module.description.includes('服务')
    );
    
    if (result.total >= 2 && allContainKeyword) {
      console.log('✅ 关键字搜索测试通过');
      return true;
    } else {
      console.log('❌ 关键字搜索测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ 关键字搜索测试失败:', error);
    return false;
  }
}

/**
 * 测试用例4: 组合条件查找 - 多个条件组合查找
 */
async function testCombinedSearch(): Promise<boolean> {
  console.log('\n=== 测试用例4: 组合条件查找 ===');
  
  try {
    const criteria: SearchCriteria = {
      type: 'function',
      parent_module: 'UserService'
    };
    
    const result = await moduleManager.find_modules(criteria);
    
    console.log(`查找结果: 找到 ${result.total} 个UserService下的function类型模块`);
    
    // 验证结果符合组合条件
    const allMatch = result.modules.every(module => 
      module.type === 'function' && module.parent_module === 'UserService'
    );
    
    if (result.total >= 1 && allMatch) {
      console.log('✅ 组合条件查找测试通过');
      return true;
    } else {
      console.log('❌ 组合条件查找测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ 组合条件查找测试失败:', error);
    return false;
  }
}

/**
 * 测试用例5: 无条件查找 - 获取所有模块
 */
async function testUnconditionalSearch(): Promise<boolean> {
  console.log('\n=== 测试用例5: 无条件查找 ===');
  
  try {
    const criteria: SearchCriteria = {};
    
    const result = await moduleManager.find_modules(criteria);
    
    console.log(`查找结果: 找到 ${result.total} 个模块`);
    
    if (result.total >= 6) {
      console.log('✅ 无条件查找测试通过');
      return true;
    } else {
      console.log('❌ 无条件查找测试失败: 模块数量不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ 无条件查找测试失败:', error);
    return false;
  }
}

/**
 * 测试用例6: 查找不存在模块 - 查找不存在的模块
 */
async function testNonExistentSearch(): Promise<boolean> {
  console.log('\n=== 测试用例6: 查找不存在模块 ===');
  
  try {
    const criteria: SearchCriteria = {
      name: 'NonExistentModule'
    };
    
    const result = await moduleManager.find_modules(criteria);
    
    console.log(`查找结果: 找到 ${result.total} 个模块`);
    
    if (result.total === 0) {
      console.log('✅ 查找不存在模块测试通过');
      return true;
    } else {
      console.log('❌ 查找不存在模块测试失败: 应该返回空结果');
      return false;
    }
  } catch (error) {
    console.error('❌ 查找不存在模块测试失败:', error);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests(): Promise<void> {
  console.log('开始执行 find_modules 函数测试...');
  
  try {
    // 初始化测试环境
    await initializeTestEnvironment();
    
    // 执行所有测试用例
    const testResults = [
      await testExactSearch(),
      await testTypeFilter(),
      await testKeywordSearch(),
      await testCombinedSearch(),
      await testUnconditionalSearch(),
      await testNonExistentSearch()
    ];
    
    // 统计测试结果
    const passedTests = testResults.filter(result => result).length;
    const totalTests = testResults.length;
    
    console.log('\n=== 测试结果汇总 ===');
    console.log(`总测试用例: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有 find_modules 测试用例均通过!');
    } else {
      console.log('⚠️  部分 find_modules 测试用例失败，请检查实现');
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
  } finally {
    // 清理测试环境
    cleanupTestEnvironment();
  }
}

// 运行测试
runTests().catch(console.error);