/**
 * 创建测试模块用于update_module测试
 */

import { ModuleManager } from './api/modules/module-manager.js';
import { YamlStorage } from './api/storage/yaml-storage.js';
import { StorageConfig } from './api/types/config.js';
import { ClassModule } from './api/types/module.js';

// 创建存储配置
const storageConfig: StorageConfig = {
    root_path: './test-data',
    data_path: './test-data/modules',
    backup_path: './test-data/backups',
    backup_enabled: true,
    backup_interval: 3600,
    max_backups: 10,
    auto_backup: true,
    compression: false,
    encryption: { enabled: false },
    validation: {
      enabled: true,
      schema_validation: true,
      data_integrity_check: true
    }
  };

// 创建存储实例和模块管理器
const storage = new YamlStorage(storageConfig);
const moduleManager = new ModuleManager(storage);

async function createTestModule() {
  console.log('初始化存储系统...');
  
  // 先初始化存储系统
  const initResult = await storage.initialize_storage();
  if (!initResult.success) {
    console.log(`✗ 存储系统初始化失败: ${initResult.error?.message}`);
    return;
  }
  console.log('✓ 存储系统初始化成功');
  
  console.log('创建测试模块...');
  
  // 创建一个测试服务模块
  const testModule: ClassModule = {
    hierarchical_name: 'services.TestService',
    name: 'TestService',
    type: 'class',
    description: '测试服务类',
    file_path: './src/services/TestService.ts',
    parent_module: 'services',
    access_modifier: 'public',
    inheritance: [],
    interfaces: [],
    methods: [],
    properties: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    const result = await moduleManager.add_module(testModule);
    if (result.success) {
      console.log('✓ 测试模块创建成功');
    } else {
      console.log(`✗ 测试模块创建失败: ${result.error}`);
    }
  } catch (error) {
    console.log(`✗ 创建测试模块时出错: ${error}`);
  }
}

// 运行创建测试模块
createTestModule().catch(console.error);