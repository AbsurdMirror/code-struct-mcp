import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  Alert,
  Steps,
  message,
  Tooltip,
  Tag,
} from 'antd';
import { createModule, getAllModules } from '../services/api';
import type { Module } from '../types';
import {
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  FunctionOutlined,
  DatabaseOutlined,
  FolderOutlined,
  CodeOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';


const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;


// 后端Parameter接口定义
interface Parameter {
  name: string;
  type: string;
  defaultValue?: string;
  description?: string;
}

interface CreateFormData {
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

const CreatePage: React.FC = () => {
  const [form] = Form.useForm<CreateFormData>();
  const [currentStep, setCurrentStep] = useState(0);
  const [moduleType, setModuleType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [parentModules, setParentModules] = useState<Module[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // 加载父模块列表
  useEffect(() => {
    const loadParentModules = async () => {
      setLoadingParents(true);
      try {
        const modules = await getAllModules();
        setParentModules(modules);
      } catch (error) {
        console.error('加载父模块列表失败:', error);
        message.error('加载父模块列表失败');
      } finally {
        setLoadingParents(false);
      }
    };

    loadParentModules();
  }, []);

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      class: <FileTextOutlined style={{ color: '#1890ff' }} />,
      function: <FunctionOutlined style={{ color: '#52c41a' }} />,
      variable: <DatabaseOutlined style={{ color: '#fa8c16' }} />,
      file: <FolderOutlined style={{ color: '#722ed1' }} />,
      functionGroup: <CodeOutlined style={{ color: '#13c2c2' }} />
    };
    return icons[type] || <FileTextOutlined />;
  };

  // 获取类型描述
  const getTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      class: '面向对象的类定义，包含属性和方法',
      function: '独立的函数或类方法，执行特定的业务逻辑',
      variable: '变量或常量定义，存储数据值',
      file: '文件级别的模块，通常包含多个相关功能',
      functionGroup: '函数组，将相关函数组织在一起'
    };
    return descriptions[type] || '';
  };

  // 处理类型选择
  const handleTypeChange = (type: string) => {
    setModuleType(type);
    form.setFieldsValue({ type });
    
    // 清除之前类型的特定字段
    const fieldsToReset = ['parameters', 'returnType', 'access', 'dataType', 'initialValue', 'parentClass', 'functions', 'variables', 'classes', 'fileExtension', 'encoding', 'groupType', 'namespace'];
    const resetValues: any = {};
    fieldsToReset.forEach(field => {
      resetValues[field] = undefined;
    });
    
    // 根据类型设置默认值
    if (type === 'variable') {
      resetValues.initialValue = '';
      resetValues.dataType = '';
    } else if (type === 'function') {
      resetValues.parameters = [];
    } else if (type === 'class') {
      resetValues.functions = [];
      resetValues.variables = [];
      resetValues.classes = [];
    } else if (type === 'file') {
      resetValues.fileExtension = '';
      resetValues.encoding = 'utf-8';
    } else if (type === 'functionGroup') {
      resetValues.groupType = '';
      resetValues.namespace = '';
    }
    
    form.setFieldsValue(resetValues);
  };

  // 处理表单提交
  const handleSubmit = async (values: CreateFormData) => {
    setLoading(true);
    
    try {
      // 获取表单所有字段的值，而不是只使用当前步骤的values
      const allValues = form.getFieldsValue();
      
      // 调试：打印提交的数据
      console.log('提交的表单数据:', allValues);
      console.log('当前步骤values:', values);
      
      // 调用创建模块API
      await createModule(allValues);
      
      message.success('模块创建成功！');
      
      // 重置表单
      form.resetFields();
      setCurrentStep(0);
      setModuleType('');
      
      // 重新加载父模块列表
      const modules = await getAllModules();
      setParentModules(modules);
    } catch (error) {
      console.error('创建模块失败:', error);
      message.error('创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理下一步
  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['name', 'type']);
      } else if (currentStep === 1) {
        await form.validateFields(['description', 'file']);
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      // 验证失败，不进行下一步
    }
  };

  // 处理上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setCurrentStep(0);
    setModuleType('');
  };

  // 步骤配置
  const steps = [
    {
      title: '基本信息',
      description: '设置模块名称和类型'
    },
    {
      title: '详细信息',
      description: '填写描述和文件路径'
    },
    {
      title: '特定配置',
      description: '根据类型设置特定属性'
    }
  ];

  return (
    <div style={{ height: '100vh', padding: '24px', overflow: 'auto', boxSizing: 'border-box' }}>
      {/* 创建步骤 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* 创建表单 */}
      <Card>
        <div>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              access: 'public'
            }}
          >
          {/* 第一步：基本信息 */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <div>
              <Title level={4}>基本信息</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label="模块名称"
                    rules={[
                      { required: true, message: '请输入模块名称' },
                      { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '名称只能包含字母、数字和下划线，且不能以数字开头' }
                    ]}
                  >
                    <Input
                      placeholder="输入模块名称，如：UserService"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="type"
                    label="模块类型"
                    rules={[{ required: true, message: '请选择模块类型' }]}
                  >
                    <Select
                      placeholder="选择模块类型"
                      size="large"
                      onChange={handleTypeChange}
                    >
                      <Option value="class">
                        <Space>
                          {getTypeIcon('class')}
                          <span>类 (Class)</span>
                        </Space>
                      </Option>
                      <Option value="function">
                        <Space>
                          {getTypeIcon('function')}
                          <span>函数 (Function)</span>
                        </Space>
                      </Option>
                      <Option value="variable">
                        <Space>
                          {getTypeIcon('variable')}
                          <span>变量 (Variable)</span>
                        </Space>
                      </Option>
                      <Option value="file">
                        <Space>
                          {getTypeIcon('file')}
                          <span>文件 (File)</span>
                        </Space>
                      </Option>
                      <Option value="functionGroup">
                        <Space>
                          {getTypeIcon('functionGroup')}
                          <span>函数组 (Function Group)</span>
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              {moduleType && (
                <Alert
                  message={`${moduleType === 'class' ? '类' : moduleType === 'function' ? '函数' : moduleType === 'variable' ? '变量' : moduleType === 'file' ? '文件' : '函数组'} 类型说明`}
                  description={getTypeDescription(moduleType)}
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </div>
          </div>

          {/* 第二步：详细信息 */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <div>
              <Title level={4}>详细信息</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Form.Item
                    name="description"
                    label="模块描述"
                    rules={[{ required: true, message: '请输入模块描述' }]}
                  >
                    <TextArea
                      placeholder="详细描述模块的功能和用途"
                      rows={4}
                      showCount
                      maxLength={500}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="file"
                    label="文件路径"
                    rules={[{ required: true, message: '请输入文件路径' }]}
                  >
                    <Input
                      placeholder="如：src/services/UserService.ts"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="parent"
                    label={
                      <Space>
                        <span>父模块</span>
                        <Tooltip title="可选，如果该模块属于某个父模块">
                          <InfoCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <Select
                      placeholder="选择父模块（可选）"
                      size="large"
                      allowClear
                      loading={loadingParents}
                    >
                      {parentModules.map((parent: Module) => (
                        <Option key={parent.hierarchical_name} value={parent.hierarchical_name}>
                          <Space>
                            {getTypeIcon(parent.type)}
                            <span>{parent.name}</span>
                            <Tag>{parent.type}</Tag>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </div>

          {/* 第三步：特定配置 */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            <div>
              <Title level={4}>特定配置</Title>
              
              {/* 函数特定字段 */}
              {moduleType === 'function' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24}>
                    <Form.Item label="函数参数列表">
                      <Form.List name="parameters">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: 16, padding: 12, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                                <Row gutter={[8, 8]}>
                                  <Col xs={24} sm={12}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'name']}
                                      label="参数名称"
                                      rules={[{ required: true, message: '请输入参数名称' }]}
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input placeholder="如：userId" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'type']}
                                      label="参数类型"
                                      rules={[{ required: true, message: '请输入参数类型' }]}
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input placeholder="如：string" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'defaultValue']}
                                      label="默认值"
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input placeholder="可选，如：null" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12}>
                                    <Form.Item
                                      {...restField}
                                      name={[name, 'description']}
                                      label="参数描述"
                                      style={{ marginBottom: 8 }}
                                    >
                                      <Input placeholder="可选，参数说明" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24}>
                                    <Button 
                                      type="link" 
                                      danger 
                                      icon={<MinusCircleOutlined />} 
                                      onClick={() => remove(name)}
                                      style={{ padding: 0 }}
                                    >
                                      删除此参数
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加参数
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="returnType"
                      label="返回类型"
                      rules={[{ required: true, message: '请输入返回类型' }]}
                    >
                      <Input
                        placeholder="如：Promise<User>"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="access"
                      label="访问权限"
                    >
                      <Select size="large" defaultValue="public">
                        <Option value="public">Public</Option>
                        <Option value="private">Private</Option>
                        <Option value="protected">Protected</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {/* 变量特定字段 */}
              {moduleType === 'variable' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="dataType"
                      label="数据类型"
                      rules={[{ required: true, message: '请输入变量数据类型' }]}
                    >
                      <Input
                        placeholder="如：string, number, boolean, User[]"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="initialValue"
                      label="初始值"
                    >
                      <TextArea
                        placeholder="变量的初始值或常量值"
                        rows={3}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="access"
                      label="访问权限"
                    >
                      <Select size="large" defaultValue="public">
                        <Option value="public">Public</Option>
                        <Option value="private">Private</Option>
                        <Option value="protected">Protected</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {/* 类特定字段 */}
              {moduleType === 'class' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="parentClass"
                      label="父类名称"
                    >
                      <Input
                        placeholder="如：BaseService"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="access"
                      label="访问权限"
                    >
                      <Select size="large" defaultValue="public">
                        <Option value="public">Public</Option>
                        <Option value="private">Private</Option>
                        <Option value="protected">Protected</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item label="类中的函数列表">
                      <Form.List name="functions">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                <Form.Item
                                  {...restField}
                                  name={name}
                                  rules={[{ required: true, message: '请输入函数名称' }]}
                                  style={{ marginBottom: 0, flex: 1 }}
                                >
                                  <Input placeholder="函数名称，如：getUserById" />
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => remove(name)} />
                              </Space>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加函数
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="类中的变量列表">
                      <Form.List name="variables">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                <Form.Item
                                  {...restField}
                                  name={name}
                                  rules={[{ required: true, message: '请输入变量名称' }]}
                                  style={{ marginBottom: 0, flex: 1 }}
                                >
                                  <Input placeholder="变量名称，如：userId" />
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => remove(name)} />
                              </Space>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加变量
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="嵌套类列表">
                      <Form.List name="classes">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                <Form.Item
                                  {...restField}
                                  name={name}
                                  rules={[{ required: true, message: '请输入类名称' }]}
                                  style={{ marginBottom: 0, flex: 1 }}
                                >
                                  <Input placeholder="类名称，如：UserConfig" />
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => remove(name)} />
                              </Space>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加嵌套类
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {/* 文件特定字段 */}
              {moduleType === 'file' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="encoding"
                      label="文件编码"
                    >
                      <Select size="large" placeholder="选择文件编码" defaultValue="utf-8">
                        <Option value="utf-8">UTF-8</Option>
                        <Option value="gbk">GBK</Option>
                        <Option value="ascii">ASCII</Option>
                        <Option value="iso-8859-1">ISO-8859-1</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      label="类列表"
                      style={{ marginBottom: 16 }}
                    >
                      <Form.List name="classes">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: 8, padding: 12, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                                <Row gutter={[8, 8]} align="middle">
                                  <Col xs={20}>
                                    <Form.Item
                                      {...restField}
                                      name={name}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="类名称，如：UserService" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={4}>
                                    <Button 
                                      type="link" 
                                      danger 
                                      icon={<MinusCircleOutlined />} 
                                      onClick={() => remove(name)}
                                      style={{ padding: 0 }}
                                    >
                                      删除
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加类
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      label="函数列表"
                      style={{ marginBottom: 16 }}
                    >
                      <Form.List name="functions">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: 8, padding: 12, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                                <Row gutter={[8, 8]} align="middle">
                                  <Col xs={20}>
                                    <Form.Item
                                      {...restField}
                                      name={name}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="函数名称，如：getUserById" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={4}>
                                    <Button 
                                      type="link" 
                                      danger 
                                      icon={<MinusCircleOutlined />} 
                                      onClick={() => remove(name)}
                                      style={{ padding: 0 }}
                                    >
                                      删除
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加函数
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item
                      label="变量列表"
                      style={{ marginBottom: 16 }}
                    >
                      <Form.List name="variables">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: 8, padding: 12, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                                <Row gutter={[8, 8]} align="middle">
                                  <Col xs={20}>
                                    <Form.Item
                                      {...restField}
                                      name={name}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="变量名称，如：API_BASE_URL" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={4}>
                                    <Button 
                                      type="link" 
                                      danger 
                                      icon={<MinusCircleOutlined />} 
                                      onClick={() => remove(name)}
                                      style={{ padding: 0 }}
                                    >
                                      删除
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加变量
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Alert
                      message="文件模块说明"
                      description="文件模块用于表示整个文件级别的代码组织单元，包含该文件中的类、函数和变量。"
                      type="info"
                      showIcon
                    />
                  </Col>
                </Row>
              )}

              {/* 函数组特定字段 */}
              {moduleType === 'functionGroup' && (
                <Row gutter={[16, 16]}>
                  <Col xs={24}>
                    <Form.Item
                      label="函数列表"
                      style={{ marginBottom: 16 }}
                    >
                      <Form.List name="functions">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: 8, padding: 12, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                                <Row gutter={[8, 8]} align="middle">
                                  <Col xs={20}>
                                    <Form.Item
                                      {...restField}
                                      name={name}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Input placeholder="函数名称，如：formatDate" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={4}>
                                    <Button 
                                      type="link" 
                                      danger 
                                      icon={<MinusCircleOutlined />} 
                                      onClick={() => remove(name)}
                                      style={{ padding: 0 }}
                                    >
                                      删除
                                    </Button>
                                  </Col>
                                </Row>
                              </div>
                            ))}
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                添加函数
                              </Button>
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Alert
                      message="函数组模块说明"
                      description="函数组用于将相关的函数组织在一起，便于管理和调用。可以按功能、用途或业务领域进行分组。注意：file字段和description字段使用通用字段。"
                      type="info"
                      showIcon
                    />
                  </Col>
                </Row>
              )}
            </div>
          </div>
          </Form>
        </div>
        
        {/* 操作按钮 - 固定在底部 */}
        <Divider style={{ margin: '16px 0' }} />
        <Row justify="space-between">
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              重置
            </Button>
          </Col>
          <Col>
            <Space>
              {currentStep > 0 && (
                <Button onClick={handlePrev}>
                  上一步
                </Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={handleNext}>
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={() => handleSubmit(form.getFieldsValue())}
                  loading={loading}
                  icon={<SaveOutlined />}
                >
                  创建模块
                </Button>
              )}
            </Space>
            </Col>
          </Row>
      </Card>
    </div>
  );
};

export default CreatePage;