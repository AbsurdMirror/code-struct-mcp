import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Steps,
  Row,
  Col,
  Space,
  message,
  Spin,
  Alert
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { getModuleById, updateModule, getAllModules } from '../services/api';
import type { Module } from '../types';

const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

// 后端Parameter接口定义
interface Parameter {
  name: string;
  type: string;
  defaultValue?: string;
  description?: string;
}

interface EditFormData {
  name: string;
  type: string;
  description: string;
  file: string;
  parent?: string;
  // function类型特有字段
  parameters?: Parameter[];
  returnType?: string;
  access?: string;
  // variable类型特有字段
  dataType?: string;
  initialValue?: string;
  // class类型特有字段
  parentClass?: string;
  functions?: string[];
  variables?: string[];
  classes?: string[];
  // file类型特有字段
  fileExtension?: string;
  encoding?: string;
  // functionGroup类型特有字段
  groupType?: string;
  namespace?: string;
}

const EditModulePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [parentModules, setParentModules] = useState<Module[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 加载模块数据
  useEffect(() => {
    const loadModuleData = async () => {
      if (!id) {
        setError('缺少模块ID参数');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 并行加载模块数据和父模块列表
        const [module, allModules] = await Promise.all([
          getModuleById(id),
          getAllModules()
        ]);

        if (!module) {
          setError('模块不存在或已被删除');
          return;
        }

        setModuleData(module);
        setParentModules(allModules.filter(m => m.hierarchical_name !== id)); // 排除自己
        
        // 预填充表单数据
        const formData: EditFormData = {
          name: module.name,
          type: module.type,
          description: module.description || '',
          file: module.file || '',
          parent: module.parent || undefined,
        };

        // 根据模块类型添加特定字段
        if (module.type === 'function') {
          const funcModule = module as any;
          formData.parameters = funcModule.parameters || [];
          formData.returnType = funcModule.returnType || '';
          formData.access = funcModule.access || 'public';
        } else if (module.type === 'variable') {
          const varModule = module as any;
          formData.dataType = varModule.dataType || '';
          formData.initialValue = varModule.initialValue || '';
          formData.access = varModule.access || 'public';
        } else if (module.type === 'class') {
          const classModule = module as any;
          formData.parentClass = classModule.parentClass || '';
          formData.functions = classModule.functions || [];
          formData.variables = classModule.variables || [];
          formData.classes = classModule.classes || [];
          formData.access = classModule.access || 'public';
        } else if (module.type === 'file') {
          const fileModule = module as any;
          formData.fileExtension = fileModule.fileExtension || '';
          formData.encoding = fileModule.encoding || 'utf-8';
          formData.functions = fileModule.functions || [];
          formData.variables = fileModule.variables || [];
          formData.classes = fileModule.classes || [];
        } else if (module.type === 'functionGroup') {
          const groupModule = module as any;
          formData.groupType = groupModule.groupType || '';
          formData.namespace = groupModule.namespace || '';
          formData.functions = groupModule.functions || [];
        }

        form.setFieldsValue(formData);
      } catch (err) {
        console.error('加载模块数据失败:', err);
        setError(err instanceof Error ? err.message : '加载模块数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadModuleData();
  }, [id, form]);

  // 处理表单提交
  const handleSubmit = async () => {
    if (!id || !moduleData) {
      message.error('缺少必要的模块信息');
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);

      // 构建更新数据（排除name和type字段，这些不能修改）
      const updateData: any = {
        description: values.description,
        file: values.file,
        parent: values.parent || null,
      };

      // 根据模块类型添加特定字段
      if (moduleData.type === 'function') {
        updateData.parameters = values.parameters || [];
        updateData.returnType = values.returnType;
        updateData.access = values.access;
      } else if (moduleData.type === 'variable') {
        updateData.dataType = values.dataType;
        updateData.initialValue = values.initialValue;
        updateData.access = values.access;
      } else if (moduleData.type === 'class') {
        updateData.parentClass = values.parentClass;
        updateData.functions = values.functions || [];
        updateData.variables = values.variables || [];
        updateData.classes = values.classes || [];
        updateData.access = values.access;
      } else if (moduleData.type === 'file') {
        updateData.fileExtension = values.fileExtension;
        updateData.encoding = values.encoding;
        updateData.functions = values.functions || [];
        updateData.variables = values.variables || [];
        updateData.classes = values.classes || [];
      } else if (moduleData.type === 'functionGroup') {
        updateData.groupType = values.groupType;
        updateData.namespace = values.namespace;
        updateData.functions = values.functions || [];
      }

      await updateModule(id, updateData);
      message.success('模块更新成功！');
      
      // 根据来源页面参数决定跳转目标
      const from = searchParams.get('from');
      if (from) {
        navigate(from);
      } else {
        navigate(-1); // 默认返回上一页
      }
    } catch (error) {
      console.error('更新模块失败:', error);
      message.error(error instanceof Error ? error.message : '更新模块失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 处理取消操作
  const handleCancel = () => {
    navigate(-1); // 返回上一页
  };

  // 步骤配置
  const steps = [
    {
      title: '基本信息',
      description: '设置模块名称和类型'
    },
    {
      title: '详细信息',
      description: '保存模块详细信息'
    },
    {
      title: '特殊配置',
      description: '根据类型设置特殊配置'
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="加载模块数据中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/search')}>
              返回搜索
            </Button>
          }
        />
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="模块不存在"
          description="请检查模块ID是否正确"
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => navigate('/search')}>
              返回搜索
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '20px' }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
            type="text"
          >
            返回
          </Button>
          <h1 style={{ margin: 0 }}>编辑模块: {moduleData.name}</h1>
        </Space>
      </div>

      {/* 步骤指示器 */}
      <Card style={{ marginBottom: '20px' }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* 表单内容 */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        scrollToFirstError
      >
        {/* 第一步：基本信息 */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Card title="基本信息" style={{ marginBottom: '20px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="模块名称"
                  name="name"
                  rules={[
                    { required: true, message: '请输入模块名称' },
                    { max: 100, message: '模块名称不能超过100个字符' }
                  ]}
                >
                  <Input 
                    placeholder="请输入模块名称，如：UserService" 
                    disabled // 编辑时不允许修改名称
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="模块类型"
                  name="type"
                  rules={[{ required: true, message: '请选择模块类型' }]}
                >
                  <Select 
                    placeholder="请选择模块类型" 
                    disabled // 编辑时不允许修改类型
                  >
                    <Option value="class">类 (Class)</Option>
                    <Option value="function">函数 (Function)</Option>
                    <Option value="variable">变量 (Variable)</Option>
                    <Option value="file">文件 (File)</Option>
                    <Option value="functionGroup">函数组 (Function Group)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Alert
              message="类型说明"
              description="请根据您的代码结构选择合适的模块类型，编辑时不能修改模块名称和类型。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </Card>
        </div>

        {/* 第二步：详细信息 */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Card title="详细信息" style={{ marginBottom: '20px' }}>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="模块描述"
                  name="description"
                  rules={[
                    { required: true, message: '请输入模块描述' }
                  ]}
                >
                  <TextArea 
                    rows={4} 
                    placeholder="请详细描述该模块的功能和用途" 
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="所属文件"
                  name="file"
                  rules={[
                    { max: 200, message: '文件路径不能超过200个字符' }
                  ]}
                >
                  <Input placeholder="如：src/services/user.ts" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="父模块"
                  name="parent"
                >
                  <Select 
                    placeholder="选择父模块（可选）" 
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {parentModules.map(module => (
                      <Option key={module.hierarchical_name} value={module.hierarchical_name}>
                        {module.hierarchical_name} ({module.type})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>

        {/* 第三步：特殊配置 */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Card title="特殊配置" style={{ marginBottom: '20px' }}>
            {/* 根据模块类型显示不同的配置项 */}
            {moduleData.type === 'function' && (
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="返回类型"
                      name="returnType"
                    >
                      <Input placeholder="如：string, number, void" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="访问权限"
                      name="access"
                    >
                      <Select placeholder="选择访问权限">
                        <Option value="public">公开 (public)</Option>
                        <Option value="private">私有 (private)</Option>
                        <Option value="protected">保护 (protected)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                {/* 参数列表 */}
                <Form.List name="parameters">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>函数参数</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加参数
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <Card key={key} size="small" style={{ marginBottom: '8px' }}>
                          <Row gutter={8}>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                name={[name, 'name']}
                                label="参数名"
                                rules={[{ required: true, message: '请输入参数名' }]}
                              >
                                <Input placeholder="参数名" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                name={[name, 'type']}
                                label="参数类型"
                                rules={[{ required: true, message: '请输入参数类型' }]}
                              >
                                <Input placeholder="如：string" />
                              </Form.Item>
                            </Col>
                            <Col span={6}>
                              <Form.Item
                                {...restField}
                                name={[name, 'defaultValue']}
                                label="默认值"
                              >
                                <Input placeholder="默认值（可选）" />
                              </Form.Item>
                            </Col>
                            <Col span={5}>
                              <Form.Item
                                {...restField}
                                name={[name, 'description']}
                                label="描述"
                              >
                                <Input placeholder="参数描述" />
                              </Form.Item>
                            </Col>
                            <Col span={1}>
                              <Form.Item label=" ">
                                <Button type="text" danger onClick={() => remove(name)}>
                                  删除
                                </Button>
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>
            )}

            {moduleData.type === 'variable' && (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="数据类型"
                    name="dataType"
                  >
                    <Input placeholder="如：string, number, boolean" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="初始值"
                    name="initialValue"
                  >
                    <Input placeholder="变量的初始值" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="访问权限"
                    name="access"
                  >
                    <Select placeholder="选择访问权限">
                      <Option value="public">公开 (public)</Option>
                      <Option value="private">私有 (private)</Option>
                      <Option value="protected">保护 (protected)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}

            {moduleData.type === 'class' && (
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="父类"
                      name="parentClass"
                    >
                      <Input placeholder="继承的父类名称" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="访问权限"
                      name="access"
                    >
                      <Select placeholder="选择访问权限">
                        <Option value="public">公开 (public)</Option>
                        <Option value="private">私有 (private)</Option>
                        <Option value="protected">保护 (protected)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                {/* 类成员列表 */}
                <Form.List name="functions">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>类函数</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加函数
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="函数名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
                
                <Form.List name="variables">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>类变量</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加变量
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="变量名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
                
                <Form.List name="classes">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>嵌套类</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加嵌套类
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="嵌套类名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>
            )}

            {moduleData.type === 'file' && (
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="文件扩展名"
                      name="fileExtension"
                    >
                      <Input placeholder="如：.ts, .js, .py" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="编码格式"
                      name="encoding"
                    >
                      <Select placeholder="选择编码格式">
                        <Option value="utf-8">UTF-8</Option>
                        <Option value="gbk">GBK</Option>
                        <Option value="ascii">ASCII</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                
                {/* 文件内容列表 */}
                <Form.List name="classes">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>类列表</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加类
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="类名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
                
                <Form.List name="functions">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>函数列表</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加函数
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="函数名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
                
                <Form.List name="variables">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>变量列表</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加变量
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="变量名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>
            )}

            {moduleData.type === 'functionGroup' && (
              <div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="函数组类型"
                      name="groupType"
                    >
                      <Input placeholder="如：utils, helpers, validators" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="命名空间"
                      name="namespace"
                    >
                      <Input placeholder="函数组的命名空间" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.List name="functions">
                  {(fields, { add, remove }) => (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4>函数列表</h4>
                        <Button type="dashed" onClick={() => add()} block style={{ maxWidth: '200px' }}>
                          添加函数
                        </Button>
                      </div>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                          <Form.Item
                            {...restField}
                            name={name}
                            style={{ flex: 1, marginRight: '8px', marginBottom: 0 }}
                          >
                            <Input placeholder="函数名称" />
                          </Form.Item>
                          <Button type="text" danger onClick={() => remove(name)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>
            )}
          </Card>
        </div>

        {/* 操作按钮 */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              {currentStep > 0 && (
                <Button onClick={() => setCurrentStep(currentStep - 1)}>
                  上一步
                </Button>
              )}
            </div>
            <div>
              <Space>
                <Button onClick={handleCancel}>
                  取消
                </Button>
                {currentStep < steps.length - 1 ? (
                  <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                    下一步
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />}
                    loading={submitting}
                    onClick={handleSubmit}
                  >
                    保存修改
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </Card>
      </Form>
    </div>
  );
};

export default EditModulePage;