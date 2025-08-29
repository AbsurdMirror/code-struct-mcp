/**
 * TESTMOD002 - 模块管理模块测试
 * 测试用例1: add_module函数测试
 * 
 * 测试目标: MOD002.FUNC001
 * 测试add_module函数的各种场景，包括正常添加、格式验证、重复检查、循环引用检测等
 */

import { YamlStorage } from '../api/storage/yaml-storage.ts';
import { ModuleManager } from '../api/modules/module-manager.ts';
import { StorageConfig } from '../api/storage/storage.ts';
import { AnyModule, ModuleType } from '../api/types/module.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

// 测试数据目录
const TEST_DATA_DIR = './test-data/testmod002';
const TEST_FILE = 'test-modules.yaml';

/**
 * 创建测试用的模块数据
 */
function createTestModule(overrides: Partial<AnyModule> = {}): AnyModule {
  return {
    name: 'TestClass',
    hierarchical_name: 'com.example.TestClass',
    parent_module: undefined,
    type: 'class' as ModuleType,
    description: '测试类模块',
    file_path: '/test/TestClass.java',
    access_modifier: 'public',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * 清理测试环境
 */
async function cleanupTestEnvironment(): Promise<void> {
  try {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 初始化测试环境
 */
async function initializeTestEnvironment(): Promise<{ storage: YamlStorage; manager: ModuleManager }> {
  await cleanupTestEnvironment();
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
  
  // 创建完整的存储配置
  const storageConfig: StorageConfig = {
    root_path: TEST_DATA_DIR,
    data_path: TEST_DATA_DIR,
    backup_path: path.join(TEST_DATA_DIR, 'backups'),
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
  
  const storage = new YamlStorage(storageConfig);
  await storage.initialize_storage(); // 初始化存储系统
  
  const manager = new ModuleManager(storage);
  
  return { storage, manager };
}

/**
 * 测试用例1: 正常添加有效模块
 */
async function testAddValidModule(): Promise<boolean> {
  console.log('\n=== 测试用例1: 正常添加有效模块 ===');
  
  const { manager } = await initializeTestEnvironment();
  
  const testModule = createTestModule();
  
  console.log('添加模块:', testModule.hierarchical_name);
  const result = await manager.add_module(testModule);
  
  console.log('添加结果:', result);
  
  if (!result.success) {
    console.error('❌ 添加有效模块失败:', result.error);
    return false;
  }
  
  // 验证模块是否被正确添加
  const retrievedModule = await manager.getModuleByName(testModule.hierarchical_name);
  if (!retrievedModule) {
    console.error('❌ 添加的模块无法检索到');
    return false;
  }
  
  console.log('✅ 有效模块添加成功');
  return true;
}

/**
 * 测试用例2: 重复添加相同模块
 */
async function testAddDuplicateModule(): Promise<boolean> {
  console.log('\n=== 测试用例2: 重复添加相同模块 ===');
  
  const { manager } = await initializeTestEnvironment();
  
  const testModule = createTestModule();
  
  // 第一次添加
  console.log('第一次添加模块:', testModule.hierarchical_name);
  const firstResult = await manager.add_module(testModule);
  
  if (!firstResult.success) {
    console.error('❌ 第一次添加失败:', firstResult.error);
    return false;
  }
  
  // 第二次添加相同模块
  console.log('第二次添加相同模块');
  const secondResult = await manager.add_module(testModule);
  
  console.log('第二次添加结果:', secondResult);
  
  if (secondResult.success) {
    console.error('❌ 重复添加应该失败但却成功了');
    return false;
  }
  
  if (!secondResult.error?.includes('模块已存在')) {
    console.error('❌ 错误信息不正确，期望包含"模块已存在"，实际:', secondResult.error);
    return false;
  }
  
  console.log('✅ 重复添加正确被阻止');
  return true;
}

/**
 * 测试用例3: 添加无效名称格式的模块
 */
async function testAddInvalidNameModule(): Promise<boolean> {
  console.log('\n=== 测试用例3: 添加无效名称格式的模块 ===');
  
  const { manager } = await initializeTestEnvironment();
  
  // 测试以数字开头的名称
  const invalidModule1 = createTestModule({
    name: '123InvalidName',
    hierarchical_name: 'com.example.123InvalidName'
  });
  
  console.log('添加以数字开头的模块:', invalidModule1.name);
  const result1 = await manager.add_module(invalidModule1);
  
  console.log('添加结果:', result1);
  
  if (result1.success) {
    console.error('❌ 以数字开头的名称应该被拒绝');
    return false;
  }
  
  if (!result1.error?.includes('模块名称不能以数字开头')) {
    console.error('❌ 错误信息不正确，期望包含"模块名称不能以数字开头"，实际:', result1.error);
    return false;
  }
  
  // 测试空名称
  const invalidModule2 = createTestModule({
    name: '',
    hierarchical_name: 'com.example.EmptyName'
  });
  
  console.log('添加空名称模块');
  const result2 = await manager.add_module(invalidModule2);
  
  console.log('添加结果:', result2);
  
  if (result2.success) {
    console.error('❌ 空名称应该被拒绝');
    return false;
  }
  
  if (!result2.error?.includes('模块名称不能为空')) {
    console.error('❌ 错误信息不正确，期望包含"模块名称不能为空"，实际:', result2.error);
    return false;
  }
  
  console.log('✅ 无效名称格式正确被拒绝');
  return true;
}

/**
 * 测试用例4: 添加不支持的模块类型
 */
async function testAddUnsupportedTypeModule(): Promise<boolean> {
  console.log('\n=== 测试用例4: 添加不支持的模块类型 ===');
  
  const { manager } = await initializeTestEnvironment();
  
  const invalidModule = createTestModule({
    type: 'unsupported' as ModuleType
  });
  
  console.log('添加不支持类型的模块:', invalidModule.type);
  const result = await manager.add_module(invalidModule);
  
  console.log('添加结果:', result);
  
  if (result.success) {
    console.error('❌ 不支持的类型应该被拒绝');
    return false;
  }
  
  if (!result.error?.includes('不支持的模块类型')) {
    console.error('❌ 错误信息不正确，期望包含"不支持的模块类型"，实际:', result.error);
    return false;
  }
  
  console.log('✅ 不支持的模块类型正确被拒绝');
  return true;
}

/**
 * 测试用例5: 添加循环引用的模块
 */
async function testAddCircularReferenceModule(): Promise<boolean> {
  console.log('\n=== 测试用例5: 添加循环引用的模块 ===');
  
  const { manager } = await initializeTestEnvironment();
  
  // 测试自引用
  const selfRefModule = createTestModule({
    hierarchical_name: 'com.example.SelfRef',
    parent_module: 'com.example.SelfRef'
  });
  
  console.log('添加自引用模块:', selfRefModule.hierarchical_name);
  const result = await manager.add_module(selfRefModule);
  
  console.log('添加结果:', result);
  
  if (result.success) {
    console.error('❌ 自引用模块应该被拒绝');
    return false;
  }
  
  if (!result.error?.includes('模块不能引用自身作为父模块')) {
    console.error('❌ 错误信息不正确，期望包含"模块不能引用自身作为父模块"，实际:', result.error);
    return false;
  }
  
  console.log('✅ 循环引用正确被阻止');
  return true;
}

/**
 * 测试用例6: 添加超过嵌套深度限制的模块
 */
async function testAddDeepNestedModule(): Promise<boolean> {
  console.log('\n=== 测试用例6: 添加超过嵌套深度限制的模块 ===');
  
  const { manager } = await initializeTestEnvironment();
  
  // 创建超过5层嵌套的模块
  const deepModule = createTestModule({
    name: 'DeepModule',
    hierarchical_name: 'level1.level2.level3.level4.level5.level6.DeepModule'
  });
  
  console.log('添加超深度嵌套模块:', deepModule.hierarchical_name);
  const result = await manager.add_module(deepModule);
  
  console.log('添加结果:', result);
  
  if (result.success) {
    console.error('❌ 超深度嵌套模块应该被拒绝');
    return false;
  }
  
  if (!result.error?.includes('模块嵌套深度不能超过5层')) {
    console.error('❌ 错误信息不正确，期望包含"模块嵌套深度不能超过5层"，实际:', result.error);
    return false;
  }
  
  console.log('✅ 超深度嵌套正确被阻止');
  return true;
}

/**
 * 运行所有测试用例
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 开始执行 TESTMOD002-add_module 测试用例');
  
  const tests = [
    { name: '正常添加有效模块', fn: testAddValidModule },
    { name: '重复添加相同模块', fn: testAddDuplicateModule },
    { name: '添加无效名称格式的模块', fn: testAddInvalidNameModule },
    { name: '添加不支持的模块类型', fn: testAddUnsupportedTypeModule },
    { name: '添加循环引用的模块', fn: testAddCircularReferenceModule },
    { name: '添加超过嵌套深度限制的模块', fn: testAddDeepNestedModule }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) {
        passedTests++;
      }
    } catch (error) {
      console.error(`❌ 测试 "${test.name}" 执行异常:`, error);
    }
  }
  
  // 清理测试环境
  await cleanupTestEnvironment();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`总测试用例: ${totalTests}`);
  console.log(`通过测试: ${passedTests}`);
  console.log(`失败测试: ${totalTests - passedTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有 add_module 测试用例通过!');
  } else {
    console.log('❌ 部分测试用例失败，请检查实现');
    process.exit(1);
  }
}

// 执行测试
if (process.argv[1] && process.argv[1].endsWith('testmod002-add-module.ts')) {
  runAllTests().catch(console.error);
}

export { runAllTests };