/**
 * TESTMOD002-测试用例5: 获取模块类型功能测试
 * 测试ModuleManager的get_module_types方法
 */

import { ModuleManager } from '../api/modules/module-manager.js';
import { YamlStorage } from '../api/storage/yaml-storage.js';
import { ModuleType } from '../api/types/module.js';
import { StorageConfig } from '../api/types/config.js';

/**
 * 测试获取模块类型功能
 */
async function testGetModuleTypes(): Promise<void> {
  console.log('\n=== TESTMOD002-测试用例5: 获取模块类型功能测试 ===\n');
  
  const testConfig: StorageConfig = {
    root_path: './test-data',
    data_path: './test-data',
    backup_path: './test-backups',
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
  
  const storage = new YamlStorage(testConfig);
  const manager = new ModuleManager(storage);
  
  let passedTests = 0;
  const totalTests = 4;
  
  // 测试1: 基本功能测试 - 验证返回支持的模块类型列表
  console.log('测试1: 基本功能测试');
  try {
    const types = await manager.get_module_types();
    
    // 验证返回的是数组
    if (!Array.isArray(types)) {
      console.log('❌ 返回值不是数组');
    } else {
      // 验证包含所有预期的类型
      const expectedTypes: ModuleType[] = ['class', 'function', 'variable', 'file', 'functionGroup'];
      const hasAllTypes = expectedTypes.every(type => types.includes(type));
      const hasOnlyExpectedTypes = types.every(type => expectedTypes.includes(type));
      
      if (hasAllTypes && hasOnlyExpectedTypes && types.length === expectedTypes.length) {
        console.log('✓ 返回了正确的模块类型列表');
        console.log(`✓ 支持的类型: ${types.join(', ')}`);
        passedTests++;
      } else {
        console.log('❌ 返回的类型列表不正确');
        console.log(`期望: ${expectedTypes.join(', ')}`);
        console.log(`实际: ${types.join(', ')}`);
      }
    }
  } catch (error) {
    console.log('❌ 基本功能测试失败:', error);
  }
  
  // 测试2: 副本特性测试 - 验证返回的是副本而不是原数组的引用
  console.log('\n测试2: 副本特性测试');
  try {
    const types1 = await manager.get_module_types();
    const types2 = await manager.get_module_types();
    
    // 修改第一个返回的数组
    const originalLength = types1.length;
    types1.push('test' as ModuleType);
    
    // 验证第二个数组没有被影响
    if (types2.length === originalLength && !types2.includes('test' as ModuleType)) {
      console.log('✓ 返回的是副本，修改不影响其他调用');
      passedTests++;
    } else {
      console.log('❌ 返回的不是副本，存在引用问题');
    }
    
    // 验证两个数组不是同一个引用
    if (types1 !== types2) {
      console.log('✓ 每次调用返回不同的数组引用');
    } else {
      console.log('❌ 多次调用返回了相同的数组引用');
    }
  } catch (error) {
    console.log('❌ 副本特性测试失败:', error);
  }
  
  // 测试3: 一致性测试 - 验证多次调用结果的一致性
  console.log('\n测试3: 一致性测试');
  try {
    const results: ModuleType[][] = [];
    
    // 多次调用
    for (let i = 0; i < 5; i++) {
      const types = await manager.get_module_types();
      results.push(types);
    }
    
    // 验证所有结果都相同
    const firstResult = results[0];
    const allSame = results.every(result => 
      result.length === firstResult.length &&
      result.every((type, index) => type === firstResult[index])
    );
    
    if (allSame) {
      console.log('✓ 多次调用结果一致');
      passedTests++;
    } else {
      console.log('❌ 多次调用结果不一致');
    }
  } catch (error) {
    console.log('❌ 一致性测试失败:', error);
  }
  
  // 测试4: 性能测试 - 验证方法执行效率
  console.log('\n测试4: 性能测试');
  try {
    const startTime = Date.now();
    const iterations = 1000;
    
    // 执行多次调用
    for (let i = 0; i < iterations; i++) {
      await manager.get_module_types();
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`✓ 执行${iterations}次调用，总耗时: ${totalTime}ms`);
    console.log(`✓ 平均每次调用耗时: ${avgTime.toFixed(3)}ms`);
    
    if (avgTime < 1) { // 平均每次调用应该小于1ms
      console.log('✓ 性能测试通过');
      passedTests++;
    } else {
      console.log('❌ 性能测试失败，调用耗时过长');
    }
  } catch (error) {
    console.log('❌ 性能测试失败:', error);
  }
  
  // 输出测试结果
  console.log(`\n=== 测试结果: ${passedTests}/${totalTests} 通过 ===`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有获取模块类型测试通过！');
  } else {
    console.log('❌ 部分测试失败，请检查实现');
    process.exit(1);
  }
}

// 运行测试
testGetModuleTypes().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});