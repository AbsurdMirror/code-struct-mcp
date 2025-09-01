import {
  add_module,
  find_modules,
  update_module,
  delete_module,
  get_module_types,
  get_module_relationships,
  initialize_module_manager,
  clear_module_manager,
  Module,
  ClassModule,
  FunctionModule,
  VariableModule,
  SearchCriteria,
  ModuleRelationship
} from '../src/backend/module-manager';
import * as module_manager from '../src/backend/module-manager';
import { initialize_storage, save_modules, load_modules } from '../src/backend/storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 模块管理模块测试
 * 测试模块的创建、读取、更新和删除操作，以及模块关系管理功能
 */

describe('模块管理模块测试', () => {
  // 测试前清理和初始化
  beforeEach(() => {
    // 清理测试数据目录
    const testDataDir = path.join(process.cwd(), 'test_data');
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
    
    // 清理模块管理器状态
    clear_module_manager();
    
    // 初始化存储环境
    initialize_storage('test_data');
    
    // 彻底重置存储系统
    save_modules({ modules: {} });
  });
  
  // 测试后清理
  afterEach(() => {
    const testDataDir = path.join(process.cwd(), 'test_data');
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });
  
  /**
   * TESTCASE001. add_module函数测试
   */
  describe('TESTCASE001. add_module函数测试', () => {
    /**
     * TEST001.1 正常添加模块
     */
    test('TEST001.1 正常添加模块', () => {
      const module: Module = {
        name: 'TestClass',
        hierarchical_name: 'com.example.TestClass',
        type: 'class',
        description: '测试类模块'
      };
      
      const result = add_module(module);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('模块添加成功');
      
      // 验证模块是否被正确添加
      const found_modules = find_modules({ hierarchical_name: 'com.example.TestClass' });
      expect(found_modules).toHaveLength(1);
      expect(found_modules[0].name).toBe('TestClass');
    });
    
    /**
     * TEST001.2 重复添加模块失败
     */
    test('TEST001.2 重复添加模块失败', () => {
      const module: Module = {
        name: 'TestClass',
        hierarchical_name: 'com.example.TestClass',
        type: 'class',
        description: '测试类模块'
      };
      
      // 第一次添加
      const result1 = add_module(module);
      expect(result1.success).toBe(true);
      
      // 第二次添加相同模块
      const result2 = add_module(module);
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('模块已存在: com.example.TestClass');
    });
    
    /**
     * TEST001.3 循环引用检测
     */
    test('TEST001.3 循环引用检测', () => {
      // 添加父模块
      const parent_module: Module = {
        name: 'ParentClass',
        hierarchical_name: 'com.example.ParentClass',
        type: 'class',
        description: '父类模块'
      };
      add_module(parent_module);
      
      // 添加子模块
      const child_module: Module = {
        name: 'ChildClass',
        hierarchical_name: 'com.example.ChildClass',
        type: 'class',
        description: '子类模块',
        parent: 'com.example.ParentClass'
      };
      add_module(child_module);
      
      // 尝试让父模块引用子模块（形成循环）
      const circular_module: Module = {
        name: 'CircularClass',
        hierarchical_name: 'com.example.CircularClass',
        type: 'class',
        description: '循环引用模块',
        parent: 'com.example.ChildClass'
      };
      
      // 然后尝试让CircularClass的父模块指向ParentClass（这会形成循环）
      const result = add_module({
        ...parent_module,
        hierarchical_name: 'com.example.NewParent',
        parent: 'com.example.CircularClass'
      });
      
      // 测试自引用
      const self_ref_result = add_module({
        name: 'SelfRef',
        hierarchical_name: 'com.example.SelfRef',
        type: 'class',
        description: '自引用模块',
        parent: 'com.example.SelfRef'
      });
      
      expect(self_ref_result.success).toBe(false);
      expect(self_ref_result.message).toBe('模块不能引用自身作为父模块');
    });
    
    /**
     * TEST001.4 嵌套深度限制测试
     */
    test('TEST001.4 嵌套深度限制测试', () => {
      // 测试5层嵌套（应该成功）
      const valid_module: Module = {
        name: 'Level5',
        hierarchical_name: 'level1.level2.level3.level4.level5',
        type: 'class',
        description: '5层嵌套模块'
      };
      
      const result1 = add_module(valid_module);
      expect(result1.success).toBe(true);
      
      // 测试6层嵌套（应该失败）
      const invalid_module: Module = {
        name: 'Level6',
        hierarchical_name: 'level1.level2.level3.level4.level5.level6',
        type: 'class',
        description: '6层嵌套模块'
      };
      
      const result2 = add_module(invalid_module);
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('模块嵌套深度不能超过5层');
    });
    
    /**
     * TEST001.5 无效模块类型测试
     */
    test('TEST001.5 无效模块类型测试', () => {
      const invalid_module = {
        name: 'InvalidType',
        hierarchical_name: 'com.example.InvalidType',
        type: 'invalid_type' as any,
        description: '无效类型模块'
      };
      
      const result = add_module(invalid_module);
      expect(result.success).toBe(false);
      expect(result.message).toBe('不支持的模块类型: invalid_type');
    });
    
    /**
     * TEST001.6 无效名称格式测试
     */
    test('TEST001.6 无效名称格式测试', () => {
      // 测试以数字开头的名称
      const invalid_name_module: Module = {
        name: '123InvalidName',
        hierarchical_name: 'com.example.123InvalidName',
        type: 'class',
        description: '无效名称模块'
      };
      
      const result1 = add_module(invalid_name_module);
      expect(result1.success).toBe(false);
      expect(result1.message).toContain('模块名称格式无效');
      
      // 测试包含特殊字符的层次化名称
      const invalid_hierarchical_module: Module = {
        name: 'ValidName',
        hierarchical_name: 'com.example.invalid-name',
        type: 'class',
        description: '无效层次化名称模块'
      };
      
      const result2 = add_module(invalid_hierarchical_module);
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('层次化名称格式无效');
    });
  });
  
  /**
   * TESTCASE002. find_modules函数测试
   */
  describe('TESTCASE002. find_modules函数测试', () => {
    beforeEach(() => {
      // 添加测试数据
      const modules: Module[] = [
        {
          name: 'UserClass',
          hierarchical_name: 'com.example.UserClass',
          type: 'class',
          description: '用户管理类'
        },
        {
          name: 'getUserInfo',
          hierarchical_name: 'com.example.UserClass.getUserInfo',
          type: 'function',
          description: '获取用户信息的函数',
          parent: 'com.example.UserClass'
        },
        {
          name: 'userName',
          hierarchical_name: 'com.example.UserClass.userName',
          type: 'variable',
          description: '用户名变量',
          parent: 'com.example.UserClass'
        }
      ];
      
      modules.forEach(module => add_module(module));
    });
    
    /**
     * TEST002.1 按hierarchical_name精确查找
     */
    test('TEST002.1 按hierarchical_name精确查找', () => {
      const criteria: SearchCriteria = {
        hierarchical_name: 'com.example.UserClass'
      };
      
      const result = find_modules(criteria);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('UserClass');
      expect(result[0].hierarchical_name).toBe('com.example.UserClass');
    });
    
    /**
     * TEST002.2 按type类型查找
     */
    test('TEST002.2 按type类型查找', () => {
      const criteria: SearchCriteria = {
        type: 'function'
      };
      
      const result = find_modules(criteria);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('getUserInfo');
      expect(result[0].type).toBe('function');
    });
    
    /**
     * TEST002.3 按keyword关键字查找
     */
    test('TEST002.3 按keyword关键字查找', () => {
      const criteria: SearchCriteria = {
        keyword: '用户'
      };
      
      const result = find_modules(criteria);
      
      expect(result.length).toBeGreaterThanOrEqual(2);
      
      // 验证结果包含相关模块
      const names = result.map(m => m.name);
      expect(names).toContain('UserClass');
      expect(names).toContain('getUserInfo');
    });
    
    /**
     * TEST002.4 组合条件查找
     */
    test('TEST002.4 组合条件查找', () => {
      const criteria: SearchCriteria = {
        type: 'variable',
        keyword: '用户'
      };
      
      const result = find_modules(criteria);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('userName');
      expect(result[0].type).toBe('variable');
    });
    
    /**
     * TEST002.5 无匹配结果
     */
    test('TEST002.5 无匹配结果', () => {
      const criteria: SearchCriteria = {
        hierarchical_name: 'nonexistent.module'
      };
      
      const result = find_modules(criteria);
      
      expect(result).toHaveLength(0);
    });
  });
  
  /**
   * TESTCASE003. update_module函数测试
   */
  describe('TESTCASE003. update_module函数测试', () => {
    beforeEach(() => {
      // 添加测试模块
      const module: Module = {
        name: 'TestClass',
        hierarchical_name: 'com.example.TestClass',
        type: 'class',
        description: '原始描述'
      };
      add_module(module);
    });
    
    /**
     * TEST003.1 正常更新模块描述
     */
    test('TEST003.1 正常更新模块描述', () => {
      const updates = {
        description: '更新后的描述'
      };
      
      const result = update_module('com.example.TestClass', updates);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('模块更新成功');
      
      // 验证更新是否生效
      const found_modules = find_modules({ hierarchical_name: 'com.example.TestClass' });
      expect(found_modules[0].description).toBe('更新后的描述');
    });
    
    /**
     * TEST003.2 尝试更新不存在的模块
     */
    test('TEST003.2 尝试更新不存在的模块', () => {
      const updates = {
        description: '新描述'
      };
      
      const result = update_module('nonexistent.module', updates);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('模块不存在: nonexistent.module');
    });
    
    /**
     * TEST003.3 尝试更新受限字段
     */
    test('TEST003.3 尝试更新受限字段', () => {
      // 尝试更新hierarchical_name
      const result1 = update_module('com.example.TestClass', {
        hierarchical_name: 'new.name'
      });
      expect(result1.success).toBe(false);
      expect(result1.message).toBe('不允许修改模块的hierarchical_name');
      
      // 尝试更新name
      const result2 = update_module('com.example.TestClass', {
        name: 'NewName'
      });
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('不允许修改模块的name');
      
      // 尝试更新type
      const result3 = update_module('com.example.TestClass', {
        type: 'function'
      });
      expect(result3.success).toBe(false);
      expect(result3.message).toBe('不允许修改模块类型');
    });
  });
  
  /**
   * TESTCASE004. delete_module函数测试
   */
  describe('TESTCASE004. delete_module函数测试', () => {
    /**
     * TEST004.1 正常删除模块
     */
    test('TEST004.1 正常删除模块', () => {
      // 添加测试模块
      const module: Module = {
        name: 'TestClass',
        hierarchical_name: 'com.example.TestClass',
        type: 'class',
        description: '测试类'
      };
      add_module(module);
      
      // 删除模块
      const result = delete_module('com.example.TestClass');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('模块删除成功');
      
      // 验证模块已被删除
      const found_modules = find_modules({ hierarchical_name: 'com.example.TestClass' });
      expect(found_modules).toHaveLength(0);
    });
    
    /**
     * TEST004.2 尝试删除不存在的模块
     */
    test('TEST004.2 尝试删除不存在的模块', () => {
      const result = delete_module('nonexistent.module');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('模块不存在: nonexistent.module');
    });
    
    /**
     * TEST004.3 尝试删除有子模块的模块
     */
    test('TEST004.3 尝试删除有子模块的模块', () => {
      // 添加父模块
      const parent_module: Module = {
        name: 'ParentClass',
        hierarchical_name: 'com.example.ParentClass',
        type: 'class',
        description: '父类'
      };
      add_module(parent_module);
      
      // 添加子模块
      const child_module: Module = {
        name: 'ChildClass',
        hierarchical_name: 'com.example.ChildClass',
        type: 'class',
        description: '子类',
        parent: 'com.example.ParentClass'
      };
      add_module(child_module);
      
      // 尝试删除父模块
      const result = delete_module('com.example.ParentClass');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('模块包含子模块，无法删除: com.example.ParentClass');
    });
  });
  
  /**
   * TESTCASE005. get_module_types函数测试
   */
  describe('TESTCASE005. get_module_types函数测试', () => {
    /**
     * TEST005.1 获取支持的模块类型列表
     */
    test('TEST005.1 获取支持的模块类型列表', () => {
      const types = get_module_types();
      
      expect(types).toContain('class');
      expect(types).toContain('function');
      expect(types).toContain('variable');
      expect(types).toContain('file');
      expect(types).toContain('functionGroup');
      expect(types).toHaveLength(5);
    });
    
    /**
     * TEST005.2 返回值是副本而非引用
     */
    test('TEST005.2 返回值是副本而非引用', () => {
      const types1 = get_module_types();
      const types2 = get_module_types();
      
      // 修改其中一个数组
      types1.push('new_type' as any);
      
      // 验证另一个数组未受影响
      expect(types2).not.toContain('new_type');
      expect(types2).toHaveLength(5);
    });
  });
  
  /**
   * TESTCASE006. get_module_relationships函数测试
   */
  describe('TESTCASE006. get_module_relationships函数测试', () => {
    beforeEach(() => {
      // 添加测试数据
      const parent_module: Module = {
        name: 'ParentClass',
        hierarchical_name: 'com.example.ParentClass',
        type: 'class',
        description: '父类'
      };
      add_module(parent_module);
      
      const child_module: Module = {
        name: 'ChildClass',
        hierarchical_name: 'com.example.ChildClass',
        type: 'class',
        description: '子类',
        parent: 'com.example.ParentClass'
      };
      add_module(child_module);
    });
    
    /**
     * TEST006.1 获取存在模块的关系信息
     */
    test('TEST006.1 获取存在模块的关系信息', () => {
      const relationship = get_module_relationships('com.example.ParentClass');
      
      expect(relationship.hierarchical_name).toBe('com.example.ParentClass');
      expect(relationship.children).toContain('ChildClass');
      expect(relationship.references).toEqual([]);
    });
    
    /**
     * TEST006.2 获取不存在模块的关系信息
     */
    test('TEST006.2 获取不存在模块的关系信息', () => {
      const relationship = get_module_relationships('nonexistent.module');
      
      expect(relationship.hierarchical_name).toBe('nonexistent.module');
      expect(relationship.children).toEqual([]);
      expect(relationship.references).toEqual([]);
    });
  });
  
  /**
   * TESTCASE007. 综合功能测试
   */
  describe('TESTCASE007. 综合功能测试', () => {
    /**
     * TEST007.1 完整工作流程测试
     */
    test('TEST007.1 完整工作流程测试', () => {
      // 1. 添加类模块
      const class_module: ClassModule = {
        name: 'UserManager',
        hierarchical_name: 'com.example.UserManager',
        type: 'class',
        description: '用户管理类',
        functions: [],
        variables: [],
        classes: []
      };
      
      let result = add_module(class_module);
      expect(result.success).toBe(true);
      
      // 2. 添加函数模块
      const function_module: FunctionModule = {
        name: 'createUser',
        hierarchical_name: 'com.example.UserManager.createUser',
        type: 'function',
        description: '创建用户函数',
        parent: 'com.example.UserManager',
        parameters: [
          { name: 'username', type: 'string', description: '用户名' },
          { name: 'email', type: 'string', description: '邮箱' }
        ],
        returnType: 'User'
      };
      
      result = add_module(function_module);
      expect(result.success).toBe(true);
      
      // 3. 添加变量模块
      const variable_module: VariableModule = {
        name: 'userCount',
        hierarchical_name: 'com.example.UserManager.userCount',
        type: 'variable',
        description: '用户数量',
        parent: 'com.example.UserManager',
        dataType: 'number',
        initialValue: '0'
      };
      
      result = add_module(variable_module);
      expect(result.success).toBe(true);
      
      // 4. 查找所有模块
      const all_modules = find_modules({});
      expect(all_modules).toHaveLength(3);
      
      // 5. 查找特定类型模块
      const functions = find_modules({ type: 'function' });
      expect(functions).toHaveLength(1);
      expect(functions[0].name).toBe('createUser');
      
      // 6. 更新模块描述
      result = update_module('com.example.UserManager', {
        description: '更新后的用户管理类描述'
      });
      expect(result.success).toBe(true);
      
      // 7. 验证更新
      const updated_modules = find_modules({ hierarchical_name: 'com.example.UserManager' });
      expect(updated_modules[0].description).toBe('更新后的用户管理类描述');
      
      // 8. 获取模块关系
      const relationships = get_module_relationships('com.example.UserManager');
      expect(relationships.children).toContain('createUser');
      expect(relationships.children).toContain('userCount');
      
      // 9. 删除子模块
      result = delete_module('com.example.UserManager.createUser');
      expect(result.success).toBe(true);
      
      result = delete_module('com.example.UserManager.userCount');
      expect(result.success).toBe(true);
      
      // 10. 删除父模块
      result = delete_module('com.example.UserManager');
      expect(result.success).toBe(true);
      
      // 11. 验证所有模块已删除
      const remaining_modules = find_modules({});
      expect(remaining_modules).toHaveLength(0);
    });
    
    /**
     * TEST007.2 层次化命名系统测试
     */
    test('TEST007.2 层次化命名系统测试', () => {
      // 创建多层次模块结构
      const modules: Module[] = [
        {
          name: 'App',
          hierarchical_name: 'com.example.App',
          type: 'class',
          description: '应用主类'
        },
        {
          name: 'UserModule',
          hierarchical_name: 'com.example.App.UserModule',
          type: 'class',
          description: '用户模块',
          parent: 'com.example.App'
        },
        {
          name: 'UserService',
          hierarchical_name: 'com.example.App.UserModule.UserService',
          type: 'class',
          description: '用户服务',
          parent: 'com.example.App.UserModule'
        },
        {
          name: 'getUser',
          hierarchical_name: 'com.example.App.UserModule.getUser',
          type: 'function',
          description: '获取用户函数',
          parent: 'com.example.App.UserModule'
        },
        {
          name: 'userId',
          hierarchical_name: 'com.example.App.UserModule.userId',
          type: 'variable',
          description: '用户ID参数',
          parent: 'com.example.App.UserModule'
        }
      ];
      
      // 添加所有模块
      modules.forEach((module) => {
        const result = add_module(module);
        expect(result.success).toBe(true);
      });
      
      // 验证层次关系
      const app_relationships = get_module_relationships('com.example.App');
      expect(app_relationships.children).toContain('UserModule');
      
      const user_module_relationships = get_module_relationships('com.example.App.UserModule');
      expect(user_module_relationships.children).toContain('UserService');
      expect(user_module_relationships.children).toContain('getUser');
      expect(user_module_relationships.children).toContain('userId');
      
      const user_service_relationships = get_module_relationships('com.example.App.UserModule.UserService');
      expect(user_service_relationships.children).toEqual([]);
      
      const get_user_relationships = get_module_relationships('com.example.App.UserModule.getUser');
      expect(get_user_relationships.children).toEqual([]);
      
      // 验证搜索功能
      const all_functions = find_modules({ type: 'function' });
      expect(all_functions).toHaveLength(1);
      expect(all_functions[0].hierarchical_name).toBe('com.example.App.UserModule.getUser');
      
      const keyword_search = find_modules({ keyword: '用户' });
      expect(keyword_search.length).toBeGreaterThanOrEqual(3);
    });
  });
});