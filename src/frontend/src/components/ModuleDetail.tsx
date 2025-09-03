import React, { useState } from 'react';
import { Card, Descriptions, Tag, Space, Typography, Divider, Button, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  FolderOutlined,
  FileOutlined,
  FunctionOutlined,
  DatabaseOutlined,
  CodeOutlined,
  GroupOutlined,
  UserOutlined,
  KeyOutlined,
  TagOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { Module, ClassModule, FunctionModule, VariableModule, Parameter } from '../types';
import { deleteModule } from '../services/api';

const { Title, Text } = Typography;

interface ModuleDetailProps {
  module: Module | null;
  style?: React.CSSProperties;
  // 允许从外部传入类名，便于样式控制
  className?: string;
  // 删除成功后的回调函数
  onModuleDeleted?: () => void;
  // 当前页面路径，用于跳转时传递来源信息
  currentPath?: string;
}

const ModuleDetail: React.FC<ModuleDetailProps> = ({ module, style, className, onModuleDeleted, currentPath }) => {
  const navigate = useNavigate();
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 处理编辑按钮点击
  const handleEdit = () => {
    if (module) {
      const editUrl = `/edit-module/${encodeURIComponent(module.hierarchical_name)}`;
      if (currentPath) {
        navigate(`${editUrl}?from=${encodeURIComponent(currentPath)}`);
      } else {
        navigate(editUrl);
      }
    }
  };

  // 处理删除按钮点击
  const handleDelete = () => {
    if (!module) return;

    Modal.confirm({
      title: '确认删除模块',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您确定要删除模块 <strong>{module.name}</strong> 吗？</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            警告：此操作不可撤销，删除后模块数据将永久丢失。
          </p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setDeleteLoading(true);
        try {
          await deleteModule(module.hierarchical_name);
          message.success('模块删除成功');
          // 调用回调函数通知父组件
           if (onModuleDeleted) {
             onModuleDeleted();
           }
           // 根据当前页面路径决定跳转目标
           if (currentPath) {
             navigate(currentPath);
           } else {
             navigate('/search'); // 默认跳转到搜索页面
           }
        } catch (error) {
          console.error('删除模块失败:', error);
          message.error(error instanceof Error ? error.message : '删除模块失败');
        } finally {
          setDeleteLoading(false);
        }
      },
    });
  };

  if (!module) {
    return (
      <Card style={style} className={className ? `${className} module-detail-card` : 'module-detail-card'}>
        <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
          <CodeOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div>请选择一个模块查看详情</div>
        </div>
      </Card>
    );
  }

  // 获取模块类型图标
  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'class':
        return <FolderOutlined />;
      case 'function':
        return <FunctionOutlined />;
      case 'variable':
        return <DatabaseOutlined />;
      case 'file':
        return <FileOutlined />;
      case 'functionGroup':
        return <GroupOutlined />;
      default:
        return <CodeOutlined />;
    }
  };

  // 获取类型标签颜色
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      class: 'blue',
      function: 'green',
      variable: 'orange',
      file: 'purple',
      functionGroup: 'cyan'
    };
    return colors[type] || 'default';
  };

  // 获取类型中文名称
  const getTypeName = (type: string) => {
    const names: Record<string, string> = {
      class: '类',
      function: '函数',
      variable: '变量',
      file: '文件',
      functionGroup: '函数组'
    };
    return names[type] || type;
  };

  // 获取访问权限标签颜色
  const getAccessColor = (access?: string) => {
    switch (access) {
      case 'public':
        return 'green';
      case 'private':
        return 'red';
      case 'protected':
        return 'orange';
      default:
        return 'default';
    }
  };

  // 渲染参数列表
  const renderParameters = (parameters: Parameter[]) => {
    if (!parameters || parameters.length === 0) {
      return <Text type="secondary">无参数</Text>;
    }

    return (
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {parameters.map((param, index) => (
          <Card key={index} size="small" style={{ marginBottom: '8px' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <Tag color="blue">{param.name}</Tag>
                <Tag color="geekblue">{param.type}</Tag>
                {param.defaultValue && (
                  <Tag color="orange">默认: {param.defaultValue}</Tag>
                )}
              </Space>
              {param.description && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {param.description}
                </Text>
              )}
            </Space>
          </Card>
        ))}
      </Space>
    );
  };

  // 渲染字符串数组
  const renderStringArray = (items?: string[], emptyText = '无') => {
    if (!items || items.length === 0) {
      return <Text type="secondary">{emptyText}</Text>;
    }

    return (
      <Space wrap>
        {items.map((item, index) => (
          <Tag key={index} color="default">{item}</Tag>
        ))}
      </Space>
    );
  };

  // 渲染基础信息
  const renderBasicInfo = () => (
    <Descriptions column={1} bordered size="small">
      <Descriptions.Item label="模块名称">
        <Space>
          {getModuleIcon(module.type)}
          <Text strong>{module.name}</Text>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label="层次化名称">
        <Text code>{module.hierarchical_name}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="类型">
        <Tag color={getTypeColor(module.type)} icon={getModuleIcon(module.type)}>
          {getTypeName(module.type)}
        </Tag>
      </Descriptions.Item>
      {module.parent && (
        <Descriptions.Item label="父模块">
          <Tag color="default">{module.parent}</Tag>
        </Descriptions.Item>
      )}
      {module.file && (
        <Descriptions.Item label="所属文件">
          <Text code style={{ color: '#1890ff' }}>{module.file}</Text>
        </Descriptions.Item>
      )}
    </Descriptions>
  );

  // 渲染类模块特有字段
  const renderClassFields = (classModule: ClassModule) => (
    <>
      <Divider orientation="left">类特有属性</Divider>
      <Descriptions column={1} bordered size="small">
        {classModule.parentClass && (
          <Descriptions.Item label="父类">
            <Tag color="blue" icon={<UserOutlined />}>
              {classModule.parentClass}
            </Tag>
          </Descriptions.Item>
        )}
        {classModule.access && (
          <Descriptions.Item label="访问权限">
            <Tag color={getAccessColor(classModule.access)} icon={<KeyOutlined />}>
              {classModule.access}
            </Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="包含函数">
          {renderStringArray(classModule.functions, '无函数')}
        </Descriptions.Item>
        <Descriptions.Item label="包含变量">
          {renderStringArray(classModule.variables, '无变量')}
        </Descriptions.Item>
        <Descriptions.Item label="嵌套类">
          {renderStringArray(classModule.classes, '无嵌套类')}
        </Descriptions.Item>
      </Descriptions>
    </>
  );

  // 渲染函数模块特有字段
  const renderFunctionFields = (functionModule: FunctionModule) => (
    <>
      <Divider orientation="left">函数特有属性</Divider>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="返回类型">
          <Tag color="geekblue" icon={<TagOutlined />}>
            {functionModule.returnType}
          </Tag>
        </Descriptions.Item>
        {functionModule.access && (
          <Descriptions.Item label="访问权限">
            <Tag color={getAccessColor(functionModule.access)} icon={<KeyOutlined />}>
              {functionModule.access}
            </Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="参数列表">
          {renderParameters(functionModule.parameters)}
        </Descriptions.Item>
      </Descriptions>
    </>
  );

  // 渲染变量模块特有字段
  const renderVariableFields = (variableModule: VariableModule) => (
    <>
      <Divider orientation="left">变量特有属性</Divider>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="数据类型">
          <Tag color="geekblue" icon={<TagOutlined />}>
            {variableModule.dataType}
          </Tag>
        </Descriptions.Item>
        {variableModule.initialValue && (
          <Descriptions.Item label="初始值">
            <Text code>{variableModule.initialValue}</Text>
          </Descriptions.Item>
        )}
        {variableModule.access && (
          <Descriptions.Item label="访问权限">
            <Tag color={getAccessColor(variableModule.access)} icon={<KeyOutlined />}>
              {variableModule.access}
            </Tag>
          </Descriptions.Item>
        )}
      </Descriptions>
    </>
  );

  // 渲染描述信息（支持Markdown）
  const renderDescription = () => {
    if (!module.description) {
      return <Text type="secondary">暂无描述</Text>;
    }

    return (
      <div className="markdown-content module-description" style={{ 
        border: '1px solid #d9d9d9', 
        borderRadius: '6px', 
        padding: '12px',
        backgroundColor: '#fafafa',
        overflow: 'auto'
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // 自定义渲染组件
            h1: ({ children }) => <Title level={4}>{children}</Title>,
            h2: ({ children }) => <Title level={5}>{children}</Title>,
            h3: ({ children }) => <Text strong style={{ fontSize: '16px' }}>{children}</Text>,
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <Text code>{children}</Text>
              ) : (
                <pre style={{ 
                  backgroundColor: '#f6f8fa', 
                  padding: '12px', 
                  borderRadius: '4px',
                  overflow: 'auto'
                }}>
                  <code>{children}</code>
                </pre>
              );
            }
          }}
        >
          {module.description}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <Card 
      title={
        <Space>
          {getModuleIcon(module.type)}
          <span>模块详情</span>
        </Space>
      }
      extra={
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={handleEdit}
            size="small"
          >
            编辑
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />} 
            onClick={handleDelete}
            loading={deleteLoading}
            size="small"
          >
            删除
          </Button>
        </Space>
      }
      style={style}
      className={className ? `${className} module-detail-card` : 'module-detail-card'}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 基础信息 */}
        {renderBasicInfo()}
        
        {/* 描述信息 */}
        <div>
          <Divider orientation="left">描述信息</Divider>
          {renderDescription()}
        </div>
        
        {/* 类型特有字段 */}
        {module.type === 'class' && renderClassFields(module as ClassModule)}
        {module.type === 'function' && renderFunctionFields(module as FunctionModule)}
        {module.type === 'variable' && renderVariableFields(module as VariableModule)}
      </Space>
    </Card>
  );
};

export default ModuleDetail;