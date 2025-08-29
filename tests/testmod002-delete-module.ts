/**
 * TESTMOD002-测试用例4: 删除模块功能测试
 * 测试ModuleManager的delete_module方法
 */

import { ModuleManager } from '../api/modules/module-manager.js';
import { YamlStorage } from '../api/storage/yaml-storage.js';
import { StorageConfig } from '../api/types/config.js';

// 测试配置
const storageConfig: StorageConfig = {
  root_path: './test-data',
  data_path: './test-data',
  backup_path: './test-data/backups',
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

/**
 * 创建测试模块数据
 */
async function createTestModules() {
  const storage = new YamlStorage(storageConfig);
  const manager = new ModuleManager(storage);
  
  // 初始化存储并清理现有数据
  await storage.initialize_storage();
  
  // 清理所有现有模块
  const searchResult = await manager.find_modules({});
  const existingModules = searchResult.modules || [];
  for (const module of existingModules) {
    await manager.delete_module(module.hierarchical_name);
  }
  
  // 首先确保src.services父级存在
     const srcResult = await manager.createModule({
        name: 'src',
        type: 'file',
        file_path: 'src/index.ts',
        description: '源代码目录',
        access_modifier: 'public'
      });
      if (!srcResult.success) {
        throw new Error(`创建src目录失败: ${srcResult.error}`);
      }
      console.log('✓ src目录创建成功');
      
      const servicesResult = await manager.createModule({
        name: 'services',
        type: 'file', 
        parent_module: 'src',
        file_path: 'src/services/index.ts',
        description: '服务目录',
        access_modifier: 'public'
      });
      if (!servicesResult.success) {
        throw new Error(`创建services目录失败: ${servicesResult.error}`);
      }
      console.log('✓ services目录创建成功');
  
  // 创建父模块
    const parentResult = await manager.createModule({
        name: 'ParentService',
        type: 'class',
        parent_module: 'src.services',
        file_path: 'src/services/ParentService.ts',
        description: '父服务模块',
        access_modifier: 'public'
      });
     if (!parentResult.success) {
       throw new Error(`创建父模块失败: ${parentResult.error}`);
     }
     console.log('✓ 父模块创建成功');
 
     // 创建子模块
     const childResult = await manager.createModule({
        name: 'ChildService',
        type: 'class',
        parent_module: 'src.services.ParentService',
        file_path: 'src/services/ChildService.ts',
        description: '子服务模块',
        access_modifier: 'public'
      });
     if (!childResult.success) {
       throw new Error(`创建子模块失败: ${childResult.error}`);
     }
     console.log('✓ 子模块创建成功');
 
     // 创建独立模块
     const standaloneResult = await manager.createModule({
        name: 'StandaloneService',
        type: 'class',
        parent_module: 'src.services',
        file_path: 'src/services/StandaloneService.ts',
        description: '独立服务模块',
        access_modifier: 'public'
      });
     if (!standaloneResult.success) {
       throw new Error(`创建独立模块失败: ${standaloneResult.error}`);
     }
     console.log('✓ 独立模块创建成功');
  
  console.log('测试模块创建成功');
  return manager;
}

/**
 * 测试删除模块功能
 */
async function testDeleteModule() {
  console.log('\n=== TESTMOD002-测试用例4: 删除模块功能测试 ===');
  
  try {
    let testCount = 0;
    let passCount = 0;
    
    // 测试1: 删除独立模块（正常情况）
    console.log('\n测试1: 删除独立模块');
    testCount++;
    const manager1 = await createTestModules();
    const deleteResult1 = await manager1.delete_module('src.services.StandaloneService');
    if (deleteResult1.success && deleteResult1.message?.includes('删除成功')) {
      console.log('✓ 删除独立模块成功');
      passCount++;
    } else {
      console.log('✗ 删除独立模块失败:', deleteResult1.error);
    }
    
    // 验证模块已被删除
    const verifyResult1 = await manager1.getModuleByName('src.services.StandaloneService');
    if (!verifyResult1) {
      console.log('✓ 验证模块已被删除');
    } else {
      console.log('✗ 模块仍然存在');
    }
    
    // 测试2: 删除有子模块的父模块（应该失败）
    console.log('\n测试2: 删除有子模块的父模块');
    testCount++;
    const manager2 = await createTestModules();
    const deleteResult2 = await manager2.delete_module('src.services.ParentService');
    if (!deleteResult2.success && deleteResult2.error?.includes('存在') && deleteResult2.error?.includes('子模块')) {
      console.log('✓ 正确拒绝删除有子模块的父模块');
      passCount++;
    } else {
      console.log('✗ 应该拒绝删除有子模块的父模块:', deleteResult2);
    }
    
    // 测试3: 先删除子模块，再删除父模块
    console.log('\n测试3: 先删除子模块，再删除父模块');
    testCount++;
    const manager3 = await createTestModules();
    
    // 删除子模块
    const deleteChildResult = await manager3.delete_module('src.services.ParentService.ChildService');
    if (deleteChildResult.success) {
      console.log('✓ 子模块删除成功');
      
      // 删除父模块
      const deleteParentResult = await manager3.delete_module('src.services.ParentService');
      if (deleteParentResult.success) {
        console.log('✓ 父模块删除成功');
        passCount++;
      } else {
        console.log('✗ 父模块删除失败:', deleteParentResult.error);
      }
    } else {
      console.log('✗ 子模块删除失败:', deleteChildResult.error);
    }
    
    // 测试4: 删除不存在的模块
    console.log('\n测试4: 删除不存在的模块');
    testCount++;
    const manager4 = await createTestModules();
    const deleteResult4 = await manager4.delete_module('src.services.NonExistentService');
    if (!deleteResult4.success && deleteResult4.error?.includes('不存在')) {
      console.log('✓ 正确处理删除不存在的模块');
      passCount++;
    } else {
      console.log('✗ 应该返回模块不存在错误:', deleteResult4);
    }
    
    // 测试5: 删除空的分层名称
    console.log('\n测试5: 删除空的分层名称');
    testCount++;
    const manager5 = await createTestModules();
    const deleteResult5 = await manager5.delete_module('');
    if (!deleteResult5.success) {
      console.log('✓ 正确处理空的分层名称');
      passCount++;
    } else {
      console.log('✗ 应该拒绝空的分层名称:', deleteResult5);
    }
    
    // 测试6: 删除无效的分层名称
    console.log('\n测试6: 删除无效的分层名称');
    testCount++;
    const manager6 = await createTestModules();
    const deleteResult6 = await manager6.delete_module('invalid..name');
    if (!deleteResult6.success) {
      console.log('✓ 正确处理无效的分层名称');
      passCount++;
    } else {
      console.log('✗ 应该拒绝无效的分层名称:', deleteResult6);
    }
    
    // 输出测试结果
    console.log(`\n=== 测试结果: ${passCount}/${testCount} 通过 ===`);
    
    if (passCount === testCount) {
      console.log('🎉 所有删除模块测试通过！');
    } else {
      console.log('❌ 部分测试失败');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

// 运行测试
testDeleteModule().catch(console.error);