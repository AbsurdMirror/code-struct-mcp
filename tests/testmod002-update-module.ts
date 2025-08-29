/**
 * TESTMOD002 - 测试用例3: update_module函数测试
 * 测试模块管理模块的update_module功能
 */

import { ModuleManager } from '../api/modules/module-manager.ts';
import { YamlStorage } from '../api/storage/yaml-storage.ts';
import { StorageConfig } from '../api/types/config.ts';

// 创建存储配置
const storageConfig: StorageConfig = {
  root_path: './test-data',
  data_path: './test-data/modules',
  backup_path: './test-data/backups',
  backup_enabled: true,
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

// 创建存储实例和模块管理器
const storage = new YamlStorage(storageConfig);
const moduleManager = new ModuleManager(storage);

async function runUpdateModuleTests() {
  console.log('\n=== TESTMOD002-测试用例3: update_module函数测试 ===\n');
  
  // 初始化存储系统
  await storage.initialize_storage();
  
  // 清理可能存在的测试数据
  try {
    await moduleManager.delete_module('services.TestService');
  } catch (error) {
    // 忽略删除错误，可能模块不存在
  }
  
  // 创建测试模块
  console.log('初始化测试数据...');
  const addResult = await moduleManager.add_module({
    hierarchical_name: 'services.TestService',
    name: 'TestService',
    type: 'class',
    description: '测试服务类',
    access_modifier: 'public',
    file_path: 'src/services/TestService.ts',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  if (!addResult.success) {
    console.log('❌ 测试数据初始化失败:', addResult.error);
    return;
  }
  console.log('✓ 测试数据初始化成功');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // 测试用例1: 正常更新模块描述
  totalTests++;
  console.log('测试用例1: 正常更新模块描述');
  try {
    const result = await moduleManager.update_module('services.TestService', {
      description: '更新后的测试服务描述'
    });
    
    if (result.success) {
      // 验证更新是否成功
      const updatedModule = await moduleManager.getModuleByName('services.TestService');
      if (updatedModule && updatedModule.description === '更新后的测试服务描述') {
        console.log('✓ 测试通过: 模块描述更新成功');
        passedTests++;
      } else {
        console.log('✗ 测试失败: 模块描述未正确更新');
      }
    } else {
      console.log(`✗ 测试失败: ${result.error}`);
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 测试用例2: 更新父模块
  totalTests++;
  console.log('\n测试用例2: 更新父模块');
  try {
    const result = await moduleManager.update_module('services.TestService', {
      parent_module: 'core.services'
    });
    
    if (result.success) {
      // 验证更新是否成功
      const updatedModule = await moduleManager.getModuleByName('services.TestService');
      if (updatedModule && updatedModule.parent_module === 'core.services') {
        console.log('✓ 测试通过: 父模块更新成功');
        passedTests++;
      } else {
        console.log('✗ 测试失败: 父模块未正确更新');
        console.log(`期望: core.services, 实际: ${updatedModule?.parent_module}`);
      }
    } else {
      console.log(`✗ 测试失败: ${result.error}`);
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 测试用例3: 尝试更新不存在的模块
  totalTests++;
  console.log('\n测试用例3: 尝试更新不存在的模块');
  try {
    const result = await moduleManager.update_module('nonexistent.Module', {
      description: '新描述'
    });
    
    if (!result.success && result.error === '模块不存在') {
      console.log('✓ 测试通过: 正确处理不存在的模块');
      passedTests++;
    } else {
      console.log('✗ 测试失败: 未正确处理不存在的模块');
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 测试用例4: 尝试更新hierarchical_name (应该失败)
  totalTests++;
  console.log('\n测试用例4: 尝试更新hierarchical_name (应该失败)');
  try {
    const result = await moduleManager.update_module('services.TestService', {
      hierarchical_name: 'new.name'
    });
    
    if (!result.success && result.error === '不允许修改模块的hierarchical_name') {
      console.log('✓ 测试通过: 正确拒绝修改hierarchical_name');
      passedTests++;
    } else {
      console.log('✗ 测试失败: 未正确拒绝修改hierarchical_name');
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 测试用例5: 尝试更新name (应该失败)
  totalTests++;
  console.log('\n测试用例5: 尝试更新name (应该失败)');
  try {
    const result = await moduleManager.update_module('services.TestService', {
      name: 'NewName'
    });
    
    if (!result.success && result.error === '不允许修改模块的name') {
      console.log('✓ 测试通过: 正确拒绝修改name');
      passedTests++;
    } else {
      console.log('✗ 测试失败: 未正确拒绝修改name');
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 测试用例6: 尝试更新type (应该失败)
  totalTests++;
  console.log('\n测试用例6: 尝试更新type (应该失败)');
  try {
    const result = await moduleManager.update_module('services.TestService', {
      type: 'function'
    });
    
    if (!result.success && result.error === '不允许修改模块类型') {
      console.log('✓ 测试通过: 正确拒绝修改type');
      passedTests++;
    } else {
      console.log('✗ 测试失败: 未正确拒绝修改type');
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 测试用例7: 多字段同时更新
  totalTests++;
  console.log('\n测试用例7: 多字段同时更新');
  try {
    const result = await moduleManager.update_module('services.TestService', {
      description: '多字段更新测试',
      access_modifier: 'protected'
    });
    
    if (result.success) {
      // 验证更新是否成功
      const updatedModule = await moduleManager.getModuleByName('services.TestService');
      if (updatedModule && 
          updatedModule.description === '多字段更新测试' && 
          updatedModule.access_modifier === 'protected') {
        console.log('✓ 测试通过: 多字段更新成功');
        passedTests++;
      } else {
        console.log('✗ 测试失败: 多字段更新未完全成功');
      }
    } else {
      console.log(`✗ 测试失败: ${result.error}`);
    }
  } catch (error) {
    console.log(`✗ 测试失败: ${error}`);
  }
  
  // 输出测试结果
  console.log(`\n=== 测试结果 ===`);
  console.log(`通过: ${passedTests}/${totalTests}`);
  console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有update_module测试用例通过!');
  } else {
    console.log(`\n❌ ${totalTests - passedTests} 个测试用例失败`);
  }
}

// 运行测试
runUpdateModuleTests().catch(console.error);