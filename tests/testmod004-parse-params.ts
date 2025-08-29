/**
 * TESTMOD004-测试用例1: 解析工具参数功能测试
 * 测试目标: MOD004.FUNC001 parse_tool_parameters
 * 验证parse_tool_parameters函数能够正确解析和验证各种MCP工具参数
 */

import { ModuleManager } from '../api/modules/module-manager.js';
import { YamlStorage } from '../api/storage/yaml-storage.js';
import { StorageConfig } from '../api/types/config.js';
import { ModuleType, AccessModifier } from '../api/types/module.js';

// 解析工具参数的接口定义
interface ParsedParams {
  [key: string]: any;
}

interface ValidationRule {
  field: string;
  rule: 'required' | 'type' | 'length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// 参数验证规则表
const parameter_validation_rules: Record<string, ValidationRule[]> = {
  add_module: [
    { field: 'name', rule: 'required', message: '模块名称不能为空' },
    { field: 'name', rule: 'pattern', value: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '模块名称只能包含字母、数字、下划线，且不能以数字开头' },
    { field: 'type', rule: 'required', message: '模块类型不能为空' },
    { field: 'type', rule: 'custom', value: ['class', 'function', 'variable', 'file', 'functionGroup'], message: '无效的模块类型' },
    { field: 'file_path', rule: 'required', message: '文件路径不能为空' },
    { field: 'access_modifier', rule: 'required', message: '访问修饰符不能为空' }
  ],
  get_module_by_name: [
    { field: 'hierarchical_name', rule: 'required', message: '层次化名称不能为空' },
    { field: 'hierarchical_name', rule: 'pattern', value: /^[a-zA-Z_][a-zA-Z0-9_.]*$/, message: '层次化名称格式无效' }
  ],
  smart_search: [
    // smart_search的所有字段都是可选的
  ],
  get_type_structure: [
    { field: 'type_name', rule: 'required', message: '类型名称不能为空' },
    { field: 'type_name', rule: 'pattern', value: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '类型名称格式无效' }
  ]
};

/**
 * 生成层次化名称
 */
function generate_hierarchical_name(name: string, parent?: string): string {
  // 验证name格式
  const namePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  if (!namePattern.test(name)) {
    throw new Error('名称格式无效：只支持字母、数字、下划线，不能以数字开头');
  }
  
  if (!parent) {
    return name;
  }
  
  const hierarchicalName = `${parent}.${name}`;
  
  // 检查层次深度是否超过5层
  const depth = hierarchicalName.split('.').length;
  if (depth > 5) {
    throw new Error('层次深度不能超过5层');
  }
  
  return hierarchicalName;
}

/**
 * 解析工具参数函数
 * 根据工具名称和原始参数，返回标准化的参数对象
 */
function parse_tool_parameters(tool_name: string, raw_params: any): ParsedParams {
  const rules = parameter_validation_rules[tool_name] || [];
  const parsed_params: ParsedParams = { ...raw_params };
  
  // 执行参数验证
  for (const rule of rules) {
    const value = parsed_params[rule.field];
    
    switch (rule.rule) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          throw new Error(rule.message);
        }
        break;
        
      case 'type':
        if (value !== undefined && typeof value !== rule.value) {
          throw new Error(rule.message);
        }
        break;
        
      case 'length':
        if (value !== undefined && typeof value === 'string') {
          const { min, max } = rule.value;
          if ((min && value.length < min) || (max && value.length > max)) {
            throw new Error(rule.message);
          }
        }
        break;
        
      case 'pattern':
        if (value !== undefined && typeof value === 'string' && !rule.value.test(value)) {
          throw new Error(rule.message);
        }
        break;
        
      case 'custom':
        if (value !== undefined && Array.isArray(rule.value) && !rule.value.includes(value)) {
          throw new Error(rule.message);
        }
        break;
    }
  }
  
  // 根据工具类型执行特定处理
  switch (tool_name) {
    case 'add_module':
      // 生成层次化名称
      try {
        parsed_params.hierarchical_name = generate_hierarchical_name(
          parsed_params.name, 
          parsed_params.parent_module
        );
      } catch (error) {
        throw new Error(`生成层次化名称失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
      break;
      
    case 'get_module_by_name':
      // 验证层次化名称格式
      break;
      
    case 'smart_search':
      // 设置默认值
      parsed_params.limit = parsed_params.limit || 50;
      parsed_params.offset = parsed_params.offset || 0;
      break;
      
    case 'get_type_structure':
      // 验证类型名称
      break;
  }
  
  return parsed_params;
}

// 测试配置
const testConfig: StorageConfig = {
  root_path: './test_data',
  data_path: './test_data',
  backup_path: './test_data/backups',
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

let storage: YamlStorage;
let moduleManager: ModuleManager;

/**
 * 初始化测试环境
 */
async function initializeTest(): Promise<void> {
  console.log('初始化测试环境...');
  
  storage = new YamlStorage(testConfig);
  moduleManager = new ModuleManager(storage);
  
  // 初始化存储
  const initResult = await storage.initialize_storage();
  if (!initResult.success) {
    throw new Error(`存储初始化失败: ${initResult.error?.message}`);
  }
  
  console.log('✅ 测试环境初始化完成');
}

/**
 * 测试用例1: add_module工具参数解析
 */
async function testAddModuleParameterParsing(): Promise<boolean> {
  console.log('\n=== 测试用例1: add_module工具参数解析 ===');
  
  try {
    const raw_params = {
      name: 'testModule',
      type: 'class',
      description: '测试模块',
      parent_module: '',
      file_path: '/test/path.ts',
      access_modifier: 'public'
    };
    
    const parsed = parse_tool_parameters('add_module', raw_params);
    
    console.log('解析结果:', JSON.stringify(parsed, null, 2));
    
    // 验证结果
    if (parsed.hierarchical_name === 'testModule' && 
        parsed.name === 'testModule' &&
        parsed.type === 'class') {
      console.log('✅ add_module参数解析测试通过');
      return true;
    } else {
      console.log('❌ add_module参数解析测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ add_module参数解析测试失败:', error);
    return false;
  }
}

/**
 * 测试用例2: get_module_by_name工具参数解析
 */
async function testGetModuleByNameParameterParsing(): Promise<boolean> {
  console.log('\n=== 测试用例2: get_module_by_name工具参数解析 ===');
  
  try {
    const raw_params = {
      hierarchical_name: 'test.module'
    };
    
    const parsed = parse_tool_parameters('get_module_by_name', raw_params);
    
    console.log('解析结果:', JSON.stringify(parsed, null, 2));
    
    // 验证结果
    if (parsed.hierarchical_name === 'test.module') {
      console.log('✅ get_module_by_name参数解析测试通过');
      return true;
    } else {
      console.log('❌ get_module_by_name参数解析测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ get_module_by_name参数解析测试失败:', error);
    return false;
  }
}

/**
 * 测试用例3: smart_search工具参数解析
 */
async function testSmartSearchParameterParsing(): Promise<boolean> {
  console.log('\n=== 测试用例3: smart_search工具参数解析 ===');
  
  try {
    const raw_params = {
      name: 'test',
      type: 'class'
    };
    
    const parsed = parse_tool_parameters('smart_search', raw_params);
    
    console.log('解析结果:', JSON.stringify(parsed, null, 2));
    
    // 验证结果
    if (parsed.name === 'test' && 
        parsed.type === 'class' &&
        parsed.limit === 50 &&
        parsed.offset === 0) {
      console.log('✅ smart_search参数解析测试通过');
      return true;
    } else {
      console.log('❌ smart_search参数解析测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ smart_search参数解析测试失败:', error);
    return false;
  }
}

/**
 * 测试用例4: get_type_structure工具参数解析
 */
async function testGetTypeStructureParameterParsing(): Promise<boolean> {
  console.log('\n=== 测试用例4: get_type_structure工具参数解析 ===');
  
  try {
    const raw_params = {
      type_name: 'class'
    };
    
    const parsed = parse_tool_parameters('get_type_structure', raw_params);
    
    console.log('解析结果:', JSON.stringify(parsed, null, 2));
    
    // 验证结果
    if (parsed.type_name === 'class') {
      console.log('✅ get_type_structure参数解析测试通过');
      return true;
    } else {
      console.log('❌ get_type_structure参数解析测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ get_type_structure参数解析测试失败:', error);
    return false;
  }
}

/**
 * 测试用例5: 无效参数处理
 */
async function testInvalidParameterHandling(): Promise<boolean> {
  console.log('\n=== 测试用例5: 无效参数处理 ===');
  
  try {
    // 测试无效的模块名称
    const invalid_params = {
      name: '123invalid',  // 以数字开头
      type: 'invalid',     // 无效类型
      file_path: '/test/path.ts',
      access_modifier: 'public'
    };
    
    try {
      parse_tool_parameters('add_module', invalid_params);
      console.log('❌ 无效参数处理测试失败: 应该抛出错误但没有');
      return false;
    } catch (error) {
      console.log('捕获到预期错误:', error instanceof Error ? error.message : error);
      console.log('✅ 无效参数处理测试通过');
      return true;
    }
  } catch (error) {
    console.error('❌ 无效参数处理测试失败:', error);
    return false;
  }
}

/**
 * 测试用例6: 层次化名称生成测试
 */
async function testHierarchicalNameGeneration(): Promise<boolean> {
  console.log('\n=== 测试用例6: 层次化名称生成测试 ===');
  
  try {
    // 测试带父模块的情况
    const params_with_parent = {
      name: 'childModule',
      type: 'class',
      parent_module: 'parent.module',
      file_path: '/test/path.ts',
      access_modifier: 'public'
    };
    
    const parsed = parse_tool_parameters('add_module', params_with_parent);
    
    console.log('生成的层次化名称:', parsed.hierarchical_name);
    
    if (parsed.hierarchical_name === 'parent.module.childModule') {
      console.log('✅ 层次化名称生成测试通过');
      return true;
    } else {
      console.log('❌ 层次化名称生成测试失败: 结果不符合预期');
      return false;
    }
  } catch (error) {
    console.error('❌ 层次化名称生成测试失败:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 开始TESTMOD004-测试用例1: 解析工具参数功能测试');
  
  try {
    await initializeTest();
    
    const testResults = [
      await testAddModuleParameterParsing(),
      await testGetModuleByNameParameterParsing(),
      await testSmartSearchParameterParsing(),
      await testGetTypeStructureParameterParsing(),
      await testInvalidParameterHandling(),
      await testHierarchicalNameGeneration()
    ];
    
    const passedTests = testResults.filter(result => result).length;
    const totalTests = testResults.length;
    
    console.log(`\n📊 测试结果汇总:`);
    console.log(`✅ 通过: ${passedTests}/${totalTests}`);
    console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有测试用例通过！parse_tool_parameters功能正常工作。');
    } else {
      console.log('\n⚠️  部分测试用例失败，需要检查parse_tool_parameters实现。');
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  }
}

// 运行测试
if (process.argv[1] && process.argv[1].endsWith('testmod004-parse-params.ts')) {
  runAllTests().catch(console.error);
}

export {
  parse_tool_parameters,
  generate_hierarchical_name,
  parameter_validation_rules
};