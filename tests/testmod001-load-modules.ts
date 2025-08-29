/**
 * TESTMOD001 - 测试用例2: load_modules函数测试
 * 测试模块数据加载功能，包括正常加载和文件不存在场景
 */

import { YamlStorage } from '../api/storage/yaml-storage.js';
import { StorageConfig } from '../api/types/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// 测试配置
const TEST_CONFIG: StorageConfig = {
  root_path: './test-data-load',
  data_path: './test-data-load',
  backup_path: './test-backup-load',
  backup_enabled: false,
  backup_interval: 3600,
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

/**
 * 清理测试环境
 */
async function cleanupTestEnvironment() {
  try {
    await fs.rm(TEST_CONFIG.data_path, { recursive: true, force: true });
    await fs.rm(TEST_CONFIG.backup_path, { recursive: true, force: true });
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 创建测试用的有效modules.yaml文件
 */
async function createValidModulesFile(storage: YamlStorage) {
  const testData = {
    modules: [
      {
        id: 'test-module-1',
        name: 'TestModule1',
        type: 'function',
        description: '测试模块1',
        file_path: '/test/path1.js',
        dependencies: [],
        exports: ['testFunction1']
      },
      {
        id: 'test-module-2',
        name: 'TestModule2',
        type: 'class',
        description: '测试模块2',
        file_path: '/test/path2.js',
        dependencies: ['test-module-1'],
        exports: ['TestClass2']
      }
    ],
    metadata: {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_modules: 2
    }
  };
  
  // 直接创建YAML文件
  const filePath = path.join(TEST_CONFIG.data_path, 'modules.yaml');
  const yamlContent = `modules:
  - id: test-module-1
    name: TestModule1
    type: function
    description: 测试模块1
    file_path: /test/path1.js
    dependencies: []
    exports:
      - testFunction1
  - id: test-module-2
    name: TestModule2
    type: class
    description: 测试模块2
    file_path: /test/path2.js
    dependencies:
      - test-module-1
    exports:
      - TestClass2
metadata:
  version: 1.0.0
  created_at: ${new Date().toISOString()}
  updated_at: ${new Date().toISOString()}
  total_modules: 2
`;
  
  await fs.writeFile(filePath, yamlContent, 'utf8');
}

/**
 * 创建格式错误的modules.yaml文件
 */
async function createInvalidModulesFile() {
  const filePath = path.join(TEST_CONFIG.data_path, 'modules.yaml');
  const invalidContent = 'invalid: yaml: content: [unclosed';
  await fs.writeFile(filePath, invalidContent, 'utf8');
}

/**
 * 测试用例1: 文件不存在时返回空字典
 */
async function testLoadModulesFileNotExists() {
  console.log('\n=== 测试用例1: 文件不存在时返回空字典 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 确保文件不存在
  await cleanupTestEnvironment();
  
  const result = await storage.load_modules();
  
  console.log('测试结果:', {
    success: result.success,
    dataIsEmpty: result.data && Object.keys(result.data).length === 0,
    operation: result.operation
  });
  
  // 验证结果
  if (result.success && result.data && Object.keys(result.data).length === 0) {
    console.log('✅ 测试通过: 文件不存在时返回空字典');
    return true;
  } else {
    console.log('❌ 测试失败: 文件不存在时应返回空字典');
    return false;
  }
}

/**
 * 测试用例2: 正常文件存在时返回正确的模块数据字典
 */
async function testLoadModulesValidFile() {
  console.log('\n=== 测试用例2: 正常文件存在时返回正确的模块数据字典 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储并创建有效文件
  await storage.initialize_storage();
  await createValidModulesFile(storage);
  
  const result = await storage.load_modules();
  
  console.log('测试结果:', {
    success: result.success,
    dataKeys: result.data ? Object.keys(result.data) : [],
    moduleCount: result.data ? Object.keys(result.data).length : 0,
    operation: result.operation
  });
  
  // 验证结果
  if (result.success && result.data) {
    const moduleIds = Object.keys(result.data);
    const hasExpectedModules = moduleIds.includes('test-module-1') && moduleIds.includes('test-module-2');
    const module1 = result.data['test-module-1'];
    const module2 = result.data['test-module-2'];
    
    if (hasExpectedModules && module1?.name === 'TestModule1' && module2?.name === 'TestModule2') {
      console.log('✅ 测试通过: 正常文件加载成功，数据正确');
      return true;
    } else {
      console.log('❌ 测试失败: 加载的数据不正确');
      console.log('模块1:', module1);
      console.log('模块2:', module2);
      return false;
    }
  } else {
    console.log('❌ 测试失败: 正常文件加载失败');
    return false;
  }
}

/**
 * 测试用例3: 格式错误文件时能够正确处理异常
 */
async function testLoadModulesInvalidFile() {
  console.log('\n=== 测试用例3: 格式错误文件时能够正确处理异常 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储并创建无效文件
  await storage.initialize_storage();
  await createInvalidModulesFile();
  
  const result = await storage.load_modules();
  
  console.log('测试结果:', {
    success: result.success,
    hasError: !!result.error,
    errorCode: result.error?.code,
    operation: result.operation
  });
  
  // 验证结果 - 格式错误应该被正确处理
  if (!result.success && result.error) {
    console.log('✅ 测试通过: 格式错误文件被正确处理');
    return true;
  } else {
    console.log('❌ 测试失败: 格式错误文件应该返回错误');
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('开始执行 TESTMOD001-测试用例2: load_modules函数测试');
  
  const results = [];
  
  try {
    // 执行所有测试用例
    results.push(await testLoadModulesFileNotExists());
    results.push(await testLoadModulesValidFile());
    results.push(await testLoadModulesInvalidFile());
    
    // 统计结果
    const passedTests = results.filter(result => result).length;
    const totalTests = results.length;
    
    console.log('\n=== 测试总结 ===');
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${totalTests - passedTests}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过!');
    } else {
      console.log('⚠️  部分测试失败');
    }
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
  } finally {
    // 清理测试环境
    await cleanupTestEnvironment();
  }
}

// 运行测试
runTests().catch(console.error);