/**
 * TESTMOD001 - 测试用例4: validate_data函数测试
 * 测试数据验证功能，包括各种有效和无效数据场景
 */

import { YamlStorage } from '../api/storage/yaml-storage.js';
import { StorageConfig } from '../api/types/config.js';

// 测试配置
const TEST_CONFIG: StorageConfig = {
  root_path: './test_data_validate',
  data_path: './test_data_validate',
  backup_path: './test_data_validate/backups',
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
 * 测试用例1: 非字典类型数据返回验证失败
 */
function testValidateDataNonDictionary() {
  console.log('\n=== 测试用例1: 非字典类型数据返回验证失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 测试字符串类型
  const stringResult = storage.validate_data('invalid string data' as any);
  if (!stringResult.is_valid && stringResult.errors.some(err => err.includes('数据必须是字典类型'))) {
    console.log('✓ 字符串类型数据验证失败，错误信息正确');
  } else {
    console.log('✗ 字符串类型数据验证结果不正确');
  }
  
  // 测试数组类型
  const arrayResult = storage.validate_data(['invalid', 'array', 'data'] as any);
  if (!arrayResult.is_valid && arrayResult.errors.some(err => err.includes('数据必须是字典类型'))) {
    console.log('✓ 数组类型数据验证失败，错误信息正确');
  } else {
    console.log('✗ 数组类型数据验证结果不正确');
  }
  
  // 测试null类型
  const nullResult = storage.validate_data(null as any);
  if (!nullResult.is_valid && nullResult.errors.some(err => err.includes('数据必须是字典类型'))) {
    console.log('✓ null类型数据验证失败，错误信息正确');
  } else {
    console.log('✗ null类型数据验证结果不正确');
  }
}

/**
 * 测试用例2: 缺少modules字段返回验证失败
 */
function testValidateDataMissingModules() {
  console.log('\n=== 测试用例2: 缺少modules字段返回验证失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 测试空字典
  const emptyResult = storage.validate_data({});
  if (!emptyResult.is_valid && emptyResult.errors.some(err => err.includes('缺少必需的modules字段'))) {
    console.log('✓ 空字典验证失败，错误信息正确');
  } else {
    console.log('✗ 空字典验证结果不正确');
  }
  
  // 测试包含其他字段但缺少modules的字典
  const otherFieldsResult = storage.validate_data({
    metadata: { version: '1.0' },
    config: { setting: 'value' }
  });
  if (!otherFieldsResult.is_valid && otherFieldsResult.errors.some(err => err.includes('缺少必需的modules字段'))) {
    console.log('✓ 缺少modules字段的字典验证失败，错误信息正确');
  } else {
    console.log('✗ 缺少modules字段的字典验证结果不正确');
  }
}

/**
 * 测试用例3: modules非字典类型返回验证失败
 */
function testValidateDataModulesNonDictionary() {
  console.log('\n=== 测试用例3: modules非字典类型返回验证失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  // 测试modules为字符串
  const stringModulesResult = storage.validate_data({
    modules: 'invalid string modules'
  });
  if (!stringModulesResult.is_valid && stringModulesResult.errors.some(err => err.includes('modules必须是字典类型'))) {
    console.log('✓ modules为字符串时验证失败，错误信息正确');
  } else {
    console.log('✗ modules为字符串时验证结果不正确');
  }
  
  // 测试modules为数组
  const arrayModulesResult = storage.validate_data({
    modules: ['module1', 'module2']
  });
  if (!arrayModulesResult.is_valid && arrayModulesResult.errors.some(err => err.includes('modules必须是字典类型'))) {
    console.log('✓ modules为数组时验证失败，错误信息正确');
  } else {
    console.log('✗ modules为数组时验证结果不正确');
  }
}

/**
 * 测试用例4: 模块缺少name字段返回验证失败
 */
function testValidateDataModuleMissingName() {
  console.log('\n=== 测试用例4: 模块缺少name字段返回验证失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  const result = storage.validate_data({
    modules: {
      'module1': {
        id: 'mod_001',
        // 缺少name字段
        type: 'class',
        file_path: '/test/path/TestClass.ts',
        description: '测试类模块'
      }
    }
  });
  
  if (!result.is_valid && result.errors.some(err => err.includes('name'))) {
    console.log('✓ 模块缺少name字段时验证失败，错误信息正确');
  } else {
    console.log('✗ 模块缺少name字段时验证结果不正确');
    console.log('错误信息:', result.errors);
  }
}

/**
 * 测试用例5: 模块缺少type字段返回验证失败
 */
function testValidateDataModuleMissingType() {
  console.log('\n=== 测试用例5: 模块缺少type字段返回验证失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  const result = storage.validate_data({
    modules: {
      'module1': {
        id: 'mod_001',
        name: 'TestClass',
        // 缺少type字段
        file_path: '/test/path/TestClass.ts',
        description: '测试类模块'
      }
    }
  });
  
  if (!result.is_valid && result.errors.some(err => err.includes('type'))) {
    console.log('✓ 模块缺少type字段时验证失败，错误信息正确');
  } else {
    console.log('✗ 模块缺少type字段时验证结果不正确');
    console.log('错误信息:', result.errors);
  }
}

/**
 * 测试用例6: 模块type值无效返回验证失败
 */
function testValidateDataModuleInvalidType() {
  console.log('\n=== 测试用例6: 模块type值无效返回验证失败 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  const result = storage.validate_data({
    modules: {
      'module1': {
        id: 'mod_001',
        name: 'TestClass',
        type: 'invalid_type', // 无效的type值
        file_path: '/test/path/TestClass.ts',
        description: '测试类模块'
      }
    }
  });
  
  if (!result.is_valid && result.errors.some(err => err.includes('type') || err.includes('无效'))) {
    console.log('✓ 模块type值无效时验证失败，错误信息正确');
  } else {
    console.log('✗ 模块type值无效时验证结果不正确');
    console.log('错误信息:', result.errors);
  }
}

/**
 * 测试用例7: 有效数据返回验证成功
 */
function testValidateDataValidData() {
  console.log('\n=== 测试用例7: 有效数据返回验证成功 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  const validData = {
    modules: {
      'module1': {
        id: 'mod_001',
        name: 'TestClass',
        type: 'class',
        file_path: '/test/path/TestClass.ts',
        description: '测试类模块',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      'module2': {
        id: 'mod_002',
        name: 'testFunction',
        type: 'function',
        file_path: '/test/path/testFunction.ts',
        description: '测试函数模块',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      'module3': {
        id: 'mod_003',
        name: 'ITestInterface',
        type: 'interface',
        file_path: '/test/path/ITestInterface.ts',
        description: '测试接口模块',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }
    }
  };
  
  const result = storage.validate_data(validData);
  
  if (result.is_valid && result.errors.length === 0) {
    console.log('✓ 有效数据验证成功，无错误信息');
  } else {
    console.log('✗ 有效数据验证失败');
    console.log('错误信息:', result.errors);
  }
}

/**
 * 测试用例8: 测试多个错误同时存在的情况
 */
function testValidateDataMultipleErrors() {
  console.log('\n=== 测试用例8: 测试多个错误同时存在的情况 ===');
  
  const storage = new YamlStorage(TEST_CONFIG);
  
  const invalidData = {
    modules: {
      'module1': {
        id: 'mod_001',
        // 缺少name字段
        // 缺少type字段
        file_path: '/test/path/TestClass.ts'
      },
      'module2': {
        id: 'mod_002',
        name: 'testFunction',
        type: 'invalid_type', // 无效type
        file_path: '/test/path/testFunction.ts'
      }
    }
  };
  
  const result = storage.validate_data(invalidData);
  
  if (!result.is_valid && result.errors.length > 1) {
    console.log('✓ 多个错误同时检测成功，错误数量:', result.errors.length);
    console.log('错误信息:', result.errors);
  } else {
    console.log('✗ 多个错误检测失败');
    console.log('错误信息:', result.errors);
  }
}

/**
 * 主测试函数
 */
function runTests() {
  console.log('开始执行 TESTMOD001 - validate_data函数测试');
  
  try {
    // 执行所有测试用例
    testValidateDataNonDictionary();
    testValidateDataMissingModules();
    testValidateDataModulesNonDictionary();
    testValidateDataModuleMissingName();
    testValidateDataModuleMissingType();
    testValidateDataModuleInvalidType();
    testValidateDataValidData();
    testValidateDataMultipleErrors();
    
    console.log('\n=== 所有测试完成 ===');
    
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行测试
runTests();