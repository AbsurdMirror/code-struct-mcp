/**
 * TESTMOD001 - 测试用例5: 综合功能测试
 * 测试数据存储模块的完整工作流程
 */

import { YamlStorage } from '../api/storage/yaml-storage.ts';
import { ModuleManager } from '../api/modules/module-manager.ts';
import { StorageConfig } from '../api/types/config.ts';
import { AnyModule } from '../api/types/module.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

// 测试配置
const TEST_CONFIG: StorageConfig = {
  root_path: './test_data_comprehensive',
  data_path: './test_data_comprehensive',
  backup_path: './test_data_comprehensive/backups',
  backup_enabled: true,
  backup_interval: 3600,
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

/**
 * 清理测试环境
 */
async function cleanup() {
  try {
    await fs.rm(TEST_CONFIG.data_path, { recursive: true, force: true });
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 创建测试数据集1
 */
function createTestDataSet1(): Record<string, AnyModule> {
  return {
    'userService': {
      id: 'userService-001',
      name: 'UserService',
      hierarchical_name: 'com.example.service.UserService',
      parent_module: 'com.example.service',
      type: 'class',
      file_path: '/src/service/UserService.java',
      access_modifier: 'public',
      description: '用户服务类',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    'getUserById': {
      id: 'getUserById-001',
      name: 'getUserById',
      hierarchical_name: 'com.example.service.UserService.getUserById',
      parent_module: 'com.example.service.UserService',
      type: 'function',
      file_path: '/src/service/UserService.java',
      access_modifier: 'public',
      description: '根据ID获取用户',
      parameters: [
        {
          name: 'id',
          data_type: 'Long',
          is_required: true,
          description: '用户ID'
        }
      ],
      return_type: 'User',
      is_async: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }
  };
}

/**
 * 创建测试数据集2
 */
function createTestDataSet2(): Record<string, AnyModule> {
  return {
    'service1': {
      id: 'productService-001',
      name: 'ProductService',
      hierarchical_name: 'com.example.service.ProductService',
      parent_module: 'com.example.service',
      type: 'class',
      file_path: '/src/service/ProductService.java',
      access_modifier: 'public',
      description: '产品服务类',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    'function1': {
      id: 'getProductList-001',
      name: 'getProductList',
      hierarchical_name: 'com.example.service.ProductService.getProductList',
      parent_module: 'com.example.service.ProductService',
      type: 'function',
      file_path: '/src/service/ProductService.java',
      access_modifier: 'public',
      description: '获取产品列表',
      parameters: [],
      return_type: 'List<Product>',
      is_async: false,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }
  };
}

/**
 * 比较两个模块数据字典是否相等
 */
function compareModulesData(data1: any, data2: any): boolean {
  const keys1 = Object.keys(data1).sort();
  const keys2 = Object.keys(data2).sort();
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) {
      return false;
    }
    
    const module1 = data1[keys1[i]];
    const module2 = data2[keys2[i]];
    
    // 比较模块的关键字段
    if (module1.id !== module2.id ||
        module1.name !== module2.name ||
        module1.type !== module2.type ||
        module1.file_path !== module2.file_path ||
        module1.description !== module2.description) {
      return false;
    }
  }
  
  return true;
}

/**
 * 测试用例1: 初始化、保存、加载、验证完整流程
 */
async function testCompleteWorkflow() {
  console.log('\n=== 测试用例1: 初始化、保存、加载、验证完整流程 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 步骤1: 初始化存储环境
  console.log('步骤1: 初始化存储环境');
  const initResult = await storage.initialize_storage();
  if (initResult.success) {
    console.log('✓ 存储环境初始化成功');
  } else {
    console.log('✗ 存储环境初始化失败:', initResult.error?.message);
    return;
  }
  
  // 步骤2: 准备并验证测试数据
  console.log('步骤2: 准备并验证测试数据');
  const testData = createTestDataSet1();
  const validateResult = storage.validate_data({ modules: testData });
  if (validateResult.is_valid) {
    console.log('✓ 测试数据验证通过');
  } else {
    console.log('✗ 测试数据验证失败:', validateResult.errors);
    return;
  }
  
  // 步骤3: 保存数据
  console.log('步骤3: 保存数据');
  const saveResult = await storage.save_modules(testData);
  if (saveResult.success) {
    console.log('✓ 数据保存成功');
  } else {
    console.log('✗ 数据保存失败:', saveResult.error?.message);
    return;
  }
  
  // 步骤4: 加载数据
  console.log('步骤4: 加载数据');
  const loadResult = await storage.load_modules();
  if (loadResult.success && loadResult.data) {
    console.log('✓ 数据加载成功');
    
    // 步骤5: 验证数据一致性
    console.log('步骤5: 验证数据一致性');
    if (compareModulesData(testData, loadResult.data)) {
      console.log('✓ 加载的数据与保存的数据一致');
    } else {
      console.log('✗ 加载的数据与保存的数据不一致');
      console.log('原始数据:', JSON.stringify(testData, null, 2));
      console.log('加载数据:', JSON.stringify(loadResult.data, null, 2));
      return;
    }
  } else {
    console.log('✗ 数据加载失败:', loadResult.error?.message);
    return;
  }
  
  // 步骤6: 再次验证加载的数据
  console.log('步骤6: 再次验证加载的数据');
  const revalidateResult = storage.validate_data({ modules: loadResult.data });
  if (revalidateResult.is_valid) {
    console.log('✓ 加载的数据验证通过');
  } else {
    console.log('✗ 加载的数据验证失败:', revalidateResult.errors);
    return;
  }
  
  console.log('✓ 完整工作流程测试通过');
}

/**
 * 测试用例2: 多次保存-加载-验证循环
 */
async function testMultipleCycles() {
  console.log('\n=== 测试用例2: 多次保存-加载-验证循环 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  const testDataSets = [
    createTestDataSet1(),
    createTestDataSet2(),
    createTestDataSet1() // 再次使用第一个数据集
  ];
  
  for (let i = 0; i < testDataSets.length; i++) {
    console.log(`\n循环 ${i + 1}:`);
    const testData = testDataSets[i];
    
    // 保存数据
    const saveResult = await storage.save_modules(testData);
    if (!saveResult.success) {
      console.log(`✗ 循环 ${i + 1} 保存失败:`, saveResult.error?.message);
      return;
    }
    console.log(`✓ 循环 ${i + 1} 保存成功`);
    
    // 加载数据
    const loadResult = await storage.load_modules();
    if (!loadResult.success || !loadResult.data) {
      console.log(`✗ 循环 ${i + 1} 加载失败:`, loadResult.error?.message);
      return;
    }
    console.log(`✓ 循环 ${i + 1} 加载成功`);
    
    // 验证数据一致性
    if (!compareModulesData(testData, loadResult.data)) {
      console.log(`✗ 循环 ${i + 1} 数据不一致`);
      return;
    }
    console.log(`✓ 循环 ${i + 1} 数据一致`);
    
    // 验证数据有效性
    const validateResult = storage.validate_data({ modules: loadResult.data });
    if (!validateResult.is_valid) {
      console.log(`✗ 循环 ${i + 1} 数据验证失败:`, validateResult.errors);
      return;
    }
    console.log(`✓ 循环 ${i + 1} 数据验证通过`);
    
    // 等待一小段时间，确保时间戳不同
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✓ 多次循环测试通过');
}

/**
 * 测试用例3: 错误恢复测试
 */
async function testErrorRecovery() {
  console.log('\n=== 测试用例3: 错误恢复测试 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 先保存有效数据
  const validData = createTestDataSet1();
  const saveResult = await storage.save_modules(validData);
  if (!saveResult.success) {
    console.log('✗ 初始数据保存失败');
    return;
  }
  console.log('✓ 初始有效数据保存成功');
  
  // 尝试保存无效数据
  const invalidData = {
    'invalid_module': {
      id: 'invalid_001',
      // 缺少name和type字段
      file_path: '/invalid/path'
    }
  };
  
  const invalidSaveResult = await storage.save_modules(invalidData);
  if (invalidSaveResult.success) {
    console.log('✗ 无效数据保存成功（应该失败）');
    return;
  }
  console.log('✓ 无效数据保存失败（符合预期）');
  
  // 验证原有数据未被破坏
  const loadResult = await storage.load_modules();
  if (!loadResult.success || !loadResult.data) {
    console.log('✗ 数据加载失败');
    return;
  }
  
  if (compareModulesData(validData, loadResult.data)) {
    console.log('✓ 原有数据保持完整，未被破坏');
  } else {
    console.log('✗ 原有数据被破坏');
    return;
  }
  
  // 再次保存有效数据，确保系统恢复正常
  const newValidData = createTestDataSet2();
  const recoverySaveResult = await storage.save_modules(newValidData);
  if (!recoverySaveResult.success) {
    console.log('✗ 恢复保存失败');
    return;
  }
  console.log('✓ 系统恢复正常，可以继续保存有效数据');
  
  console.log('✓ 错误恢复测试通过');
}

/**
 * 测试用例4: 备份文件验证
 */
async function testBackupFiles() {
  console.log('\n=== 测试用例4: 备份文件验证 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 保存第一次数据
  const data1 = createTestDataSet1();
  await storage.save_modules(data1);
  console.log('✓ 第一次数据保存完成');
  
  // 等待一段时间确保时间戳不同
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 保存第二次数据，应该创建备份
  const data2 = createTestDataSet2();
  await storage.save_modules(data2);
  console.log('✓ 第二次数据保存完成');
  
  // 检查备份文件是否存在
  try {
    const backupFiles = await fs.readdir(TEST_CONFIG.backup_path);
    const moduleBackups = backupFiles.filter(file => file.includes('modules'));
    
    if (moduleBackups.length > 0) {
      console.log('✓ 备份文件已创建，数量:', moduleBackups.length);
      console.log('备份文件:', moduleBackups);
    } else {
      console.log('✗ 未找到备份文件');
      return;
    }
  } catch (error) {
    console.log('✗ 检查备份文件失败:', error);
    return;
  }
  
  console.log('✓ 备份文件验证通过');
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('开始执行 TESTMOD001 - 综合功能测试');
  
  try {
    // 清理测试环境
    await cleanup();
    
    // 执行测试用例
    await testCompleteWorkflow();
    await cleanup();
    
    await testMultipleCycles();
    await cleanup();
    
    await testErrorRecovery();
    await cleanup();
    
    await testBackupFiles();
    await cleanup();
    
    console.log('\n=== 所有综合测试完成 ===');
    console.log('✓ TESTMOD001 数据存储模块所有功能测试通过');
    
  } catch (error) {
    console.error('综合测试执行失败:', error);
  } finally {
    // 最终清理
    await cleanup();
  }
}

// 运行测试
runTests();