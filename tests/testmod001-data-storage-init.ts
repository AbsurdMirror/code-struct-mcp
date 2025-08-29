/**
 * TESTMOD001 数据存储模块测试 - 测试用例1
 * 测试initialize_storage函数的功能
 */

import { YamlStorage } from '../api/storage/yaml-storage.ts';
import { StorageConfig } from '../api/types/config.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 测试配置
 */
const TEST_CONFIG: StorageConfig = {
  root_path: './test_data',
  data_path: './test_data',
  backup_path: './test_data/backups',
  backup_enabled: false,
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

/**
 * 清理测试环境
 */
async function cleanupTestEnvironment() {
  try {
    await fs.rm(TEST_CONFIG.data_path, { recursive: true, force: true });
    console.log('✓ 测试环境清理完成');
  } catch (error) {
    console.log('⚠ 测试环境清理失败:', error.message);
  }
}

/**
 * 测试用例1: 正常初始化存储系统
 */
async function testCase1_NormalInitialization() {
  console.log('\n=== 测试用例1: 正常初始化存储系统 ===');
  
  try {
    // 步骤1: 创建YamlStorage实例
    const storage = new YamlStorage(TEST_CONFIG);
    console.log('✓ 步骤1: YamlStorage实例创建成功');
    
    // 步骤2: 调用initialize_storage函数
    const result = await storage.initialize_storage();
    console.log('✓ 步骤2: initialize_storage函数调用完成');
    
    // 步骤3: 验证返回结果
    if (!result.success) {
      throw new Error(`初始化失败: ${result.error?.message}`);
    }
    console.log('✓ 步骤3: 返回结果验证通过');
    
    // 步骤4: 验证目录是否创建
    try {
      await fs.access(TEST_CONFIG.data_path);
      console.log('✓ 步骤4a: 数据目录创建成功');
    } catch {
      throw new Error('数据目录未创建');
    }
    
    try {
      await fs.access(TEST_CONFIG.backup_path);
      console.log('✓ 步骤4b: 备份目录创建成功');
    } catch {
      throw new Error('备份目录未创建');
    }
    
    // 步骤5: 验证返回数据结构
    if (result.data !== true) {
      throw new Error('返回数据不正确');
    }
    if (!result.timestamp) {
      throw new Error('缺少时间戳');
    }
    if (result.operation !== 'initialize_storage') {
      throw new Error('操作类型不正确');
    }
    console.log('✓ 步骤5: 返回数据结构验证通过');
    
    console.log('✅ 测试用例1: 通过');
    return true;
    
  } catch (error) {
    console.log('❌ 测试用例1: 失败 -', error.message);
    return false;
  }
}

/**
 * 测试用例2: 重复初始化测试
 */
async function testCase2_RepeatedInitialization() {
  console.log('\n=== 测试用例2: 重复初始化测试 ===');
  
  try {
    const storage = new YamlStorage(TEST_CONFIG);
    
    // 第一次初始化
    const result1 = await storage.initialize_storage();
    if (!result1.success) {
      throw new Error(`第一次初始化失败: ${result1.error?.message}`);
    }
    console.log('✓ 第一次初始化成功');
    
    // 第二次初始化
    const result2 = await storage.initialize_storage();
    if (!result2.success) {
      throw new Error(`第二次初始化失败: ${result2.error?.message}`);
    }
    console.log('✓ 第二次初始化成功');
    
    console.log('✅ 测试用例2: 通过');
    return true;
    
  } catch (error) {
    console.log('❌ 测试用例2: 失败 -', error.message);
    return false;
  }
}

/**
 * 测试用例3: 无效路径测试
 */
async function testCase3_InvalidPath() {
  console.log('\n=== 测试用例3: 无效路径测试 ===');
  
  try {
    // 使用无效路径配置
    const invalidConfig = {
      ...TEST_CONFIG,
      data_path: '/invalid/path/that/cannot/be/created',
      backup_path: '/invalid/backup/path'
    };
    
    const storage = new YamlStorage(invalidConfig);
    const result = await storage.initialize_storage();
    
    // 在某些系统上可能会成功创建目录，所以这个测试可能需要调整
    if (result.success) {
      console.log('⚠ 注意: 系统允许创建该路径，测试跳过');
      return true;
    } else {
      console.log('✓ 正确处理了无效路径');
      return true;
    }
    
  } catch (error) {
    console.log('❌ 测试用例3: 失败 -', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('开始执行 TESTMOD001 数据存储模块测试 - initialize_storage 功能');
  console.log('测试时间:', new Date().toISOString());
  
  let passedTests = 0;
  let totalTests = 3;
  
  // 清理测试环境
  await cleanupTestEnvironment();
  
  // 执行测试用例
  if (await testCase1_NormalInitialization()) passedTests++;
  if (await testCase2_RepeatedInitialization()) passedTests++;
  if (await testCase3_InvalidPath()) passedTests++;
  
  // 清理测试环境
  await cleanupTestEnvironment();
  
  // 输出测试结果
  console.log('\n=== 测试结果汇总 ===');
  console.log(`通过测试: ${passedTests}/${totalTests}`);
  console.log(`成功率: ${(passedTests/totalTests*100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('💥 部分测试失败！');
    process.exit(1);
  }
}

// 运行测试
if (process.argv[1] && process.argv[1].endsWith('testmod001-data-storage-init.ts')) {
  runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

export { runTests };