/**
 * TESTMOD001 - 测试用例3: save_modules函数测试
 * 测试模块数据保存功能，包括正常保存、数据验证和备份功能
 */

import { YamlStorage } from '../api/storage/yaml-storage.ts';
import { StorageConfig } from '../api/types/config.ts';
import { AnyModule } from '../api/types/module.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

// 测试配置
const TEST_CONFIG: StorageConfig = {
  root_path: './test_data_save_modules',
  data_path: './test_data_save_modules',
  backup_path: './test_data_save_modules/backups',
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
 * 创建有效的模块数据
 */
function createValidModulesData(): Record<string, AnyModule> {
  return {
    'module1': {
      id: 'mod_001',
      name: 'TestClass',
      type: 'class',
      hierarchical_name: 'TestClass',
      parent_module: undefined,
      file_path: '/test/path/TestClass.ts',
      description: '测试类模块',
      access_modifier: 'public',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    },
    'module2': {
      id: 'mod_002',
      name: 'testFunction',
      type: 'function',
      hierarchical_name: 'testFunction',
      parent_module: undefined,
      file_path: '/test/path/testFunction.ts',
      description: '测试函数模块',
      access_modifier: 'public',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z'
    }
  };
}

/**
 * 创建无效的模块数据（缺少必需字段）
 */
function createInvalidModulesData() {
  return {
    'module1': {
      id: 'mod_001',
      // 缺少name字段
      type: 'class',
      file_path: '/test/path/TestClass.ts'
    },
    'module2': {
      id: 'mod_002',
      name: 'testFunction',
      // 缺少type字段
      file_path: '/test/path/testFunction.ts'
    }
  };
}

/**
 * 检查备份文件是否存在
 */
async function checkBackupExists(storage: YamlStorage, fileName: string): Promise<boolean> {
  try {
    const backupFiles = await fs.readdir(TEST_CONFIG.backup_path);
    return backupFiles.some(file => file.includes(fileName));
  } catch {
    return false;
  }
}

/**
 * 测试用例1: 有效数据保存成功
 */
async function testSaveModulesValidData() {
  console.log('\n=== 测试用例1: 有效数据保存成功 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 准备有效数据
  const validData = createValidModulesData();
  
  // 保存数据
  const result = await storage.save_modules(validData);
  
  // 验证结果
  if (result.success) {
    console.log('✓ 保存成功，返回success=true');
    
    // 检查文件是否创建
    const filePath = path.join(TEST_CONFIG.data_path, 'modules.yaml');
    try {
      await fs.access(filePath);
      console.log('✓ modules.yaml文件已创建');
      
      // 验证文件内容
      const loadResult = await storage.load_modules();
      if (loadResult.success && loadResult.data) {
        const loadedModules = loadResult.data;
        if (Object.keys(loadedModules).length === 2) {
          console.log('✓ 文件包含正确的模块数据');
        } else {
          console.log('✗ 文件数据不正确');
        }
      } else {
        console.log('✗ 无法加载保存的数据');
      }
    } catch {
      console.log('✗ modules.yaml文件未创建');
    }
  } else {
    console.log('✗ 保存失败:', result.error?.message);
  }
}

/**
 * 测试用例2: 无效数据保存失败
 */
async function testSaveModulesInvalidData() {
  console.log('\n=== 测试用例2: 无效数据保存失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 先保存有效数据作为原文件
  const validData = createValidModulesData();
  await storage.save_modules(validData);
  
  // 获取原文件内容
  const originalResult = await storage.load_modules();
  
  // 准备无效数据
  const invalidData = createInvalidModulesData();
  
  // 尝试保存无效数据
  const result = await storage.save_modules(invalidData);
  
  // 验证结果
  if (!result.success) {
    console.log('✓ 无效数据保存失败，返回success=false');
    console.log('✓ 错误信息:', result.error?.message);
    
    // 验证原文件未被破坏
    const currentResult = await storage.load_modules();
    if (currentResult.success && originalResult.success) {
      const originalCount = Object.keys(originalResult.data!).length;
      const currentCount = Object.keys(currentResult.data!).length;
      if (originalCount === currentCount) {
        console.log('✓ 原文件保持不变');
      } else {
        console.log('✗ 原文件被破坏');
      }
    }
  } else {
    console.log('✗ 无效数据保存成功（应该失败）');
  }
}

/**
 * 测试用例3: 文件不存在时直接创建，不生成备份
 */
async function testSaveModulesNewFile() {
  console.log('\n=== 测试用例3: 文件不存在时直接创建，不生成备份 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 确保文件不存在
  const filePath = path.join(TEST_CONFIG.data_path, 'modules.yaml');
  try {
    await fs.unlink(filePath);
  } catch {
    // 文件本来就不存在
  }
  
  // 准备有效数据
  const validData = createValidModulesData();
  
  // 保存数据
  const result = await storage.save_modules(validData);
  
  // 验证结果
  if (result.success) {
    console.log('✓ 文件不存在时创建成功');
    
    // 检查是否没有创建备份文件
    const hasBackup = await checkBackupExists(storage, 'modules');
    if (!hasBackup) {
      console.log('✓ 没有创建备份文件（符合预期）');
    } else {
      console.log('✗ 创建了备份文件（不符合预期）');
    }
  } else {
    console.log('✗ 文件创建失败:', result.error?.message);
  }
}

/**
 * 测试用例4: 文件存在时创建备份文件
 */
async function testSaveModulesWithBackup() {
  console.log('\n=== 测试用例4: 文件存在时创建备份文件 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 初始化存储
  await storage.initialize_storage();
  
  // 先保存一次数据，创建原文件
  const initialData = createValidModulesData();
  await storage.save_modules(initialData);
  
  // 等待一小段时间确保时间戳不同
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 再次保存数据，应该创建备份
  const newData = {
    'module3': {
      id: 'mod_003',
      name: 'NewModule',
      type: 'interface',
      file_path: '/test/path/NewModule.ts',
      description: '新模块',
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z'
    }
  };
  
  const result = await storage.save_modules(newData);
  
  // 验证结果
  if (result.success) {
    console.log('✓ 文件存在时保存成功');
    
    // 检查是否创建了备份文件
    const hasBackup = await checkBackupExists(storage, 'modules');
    if (hasBackup) {
      console.log('✓ 创建了备份文件');
    } else {
      console.log('✗ 没有创建备份文件');
    }
  } else {
    console.log('✗ 保存失败:', result.error?.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('开始执行 TESTMOD001 - save_modules函数测试');
  
  try {
    // 清理测试环境
    await cleanup();
    
    // 执行测试用例
    await testSaveModulesValidData();
    await cleanup();
    
    await testSaveModulesInvalidData();
    await cleanup();
    
    await testSaveModulesNewFile();
    await cleanup();
    
    await testSaveModulesWithBackup();
    await cleanup();
    
    console.log('\n=== 所有测试完成 ===');
    
  } catch (error) {
    console.error('测试执行失败:', error);
  } finally {
    // 最终清理
    await cleanup();
  }
}

// 运行测试
runTests();