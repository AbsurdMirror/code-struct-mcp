import React, { useState } from 'react';
import {
  Card,
  Input,
  Button,
  Select,
  Row,
  Col,
  Layout,
  Tag,
  Typography,
  Empty,
  Space,
  Divider,
  Tree,
  message,
  Spin,
  Alert,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  FunctionOutlined,
  DatabaseOutlined,
  FolderOutlined,
  CodeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { Module } from '../types';
import ModuleDetail from '../components/ModuleDetail';
import type { DataNode } from 'antd/es/tree';
import { searchModules } from '../services/api';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;



const SearchPage: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number>(0);

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

  // 构建搜索结果的树形数据
  const buildSearchTreeData = (modules: Module[]): DataNode[] => {
    const moduleMap = new Map<string, Module>();
    const rootModules: Module[] = [];
    
    // 创建模块映射
    modules.forEach(module => {
      moduleMap.set(module.name, module);
    });
    
    // 分离根模块和子模块
    modules.forEach(module => {
      if (!module.parent || !moduleMap.has(module.parent)) {
        rootModules.push(module);
      }
    });
    
    // 递归构建树节点
    const buildTreeNode = (module: Module): DataNode => {
      const children = modules.filter(m => m.parent === module.name);
      
      return {
        key: module.name,
        title: (
          <Space>
            {getTypeIcon(module.type)}
            <span>{module.name}</span>
            <Tag color={getTypeColor(module.type)}>
              {getTypeName(module.type)}
            </Tag>
          </Space>
        ),
        children: children.length > 0 ? children.map(buildTreeNode) : undefined,
        isLeaf: children.length === 0
      };
    };
    
    return rootModules.map(buildTreeNode);
  };

  // 处理树节点选择
  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const selectedKey = selectedKeys[0] as string;
      const module = searchResults.find(m => m.name === selectedKey);
      setSelectedModule(module || null);
    } else {
      setSelectedModule(null);
    }
  };

  // 执行搜索
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const result = await searchModules({
        keyword: searchKeyword,
        type: searchType as 'class' | 'function' | 'variable' | 'file' | 'functionGroup' | 'all',
        offset: 0,
        limit: 100 // 获取更多结果用于展示
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setSearchResults(result.modules);
      setTreeData(buildSearchTreeData(result.modules));
      setSelectedModule(null);
      setSearchTime(duration);
      
      if (result.modules.length === 0) {
        message.info('未找到匹配的模块，请尝试其他关键词');
      } else {
        message.success(`找到 ${result.modules.length} 个匹配的模块 (${duration}ms)`);
      }
    } catch (error: any) {
      console.error('搜索失败:', error);
      const errorMessage = error?.response?.data?.error || error?.message || '搜索失败，请稍后重试';
      setError(errorMessage);
      message.error(errorMessage);
      setSearchResults([]);
      setTreeData([]);
      setSearchTime(0);
    } finally {
      setLoading(false);
    }
  };

  // 重置搜索
  const handleReset = () => {
    setSearchKeyword('');
    setSearchType('all');
    setSearchResults([]);
    setTreeData([]);
    setSelectedModule(null);
    setHasSearched(false);
    setError(null);
    setSearchTime(0);
  };

  // 重试搜索
  const handleRetry = () => {
    if (searchKeyword.trim()) {
      handleSearch();
    }
  };



  return (
    <div>
      {/* 搜索表单 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Search
              placeholder="输入搜索关键词（模块名称、描述等）"
              size="large"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={handleSearch}
              enterButton={
                <Button type="primary" icon={<SearchOutlined />}>
                  搜索
                </Button>
              }
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="选择模块类型"
              size="large"
              style={{ width: '100%' }}
              value={searchType}
              onChange={setSearchType}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">所有类型</Option>
              <Option value="class">类</Option>
              <Option value="function">函数</Option>
              <Option value="variable">变量</Option>
              <Option value="file">文件</Option>
              <Option value="functionGroup">函数组</Option>
            </Select>
          </Col>
          <Col xs={24} md={6}>
            <Button
              size="large"
              style={{ width: '100%' }}
              onClick={handleReset}
            >
              重置
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 搜索结果 */}
      {!hasSearched ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size="small">
                <span>请输入关键词开始搜索</span>
                <span style={{ color: '#999', fontSize: '12px' }}>支持模块名称、描述等关键词搜索</span>
              </Space>
            }
          />
        </Card>
      ) : error ? (
        <Card>
          <Alert
            message="搜索失败"
            description={error}
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            action={
              <Space>
                <Button size="small" onClick={handleRetry} icon={<ReloadOutlined />}>
                  重试
                </Button>
                <Button size="small" onClick={handleReset}>
                  重置
                </Button>
              </Space>
            }
          />
        </Card>
      ) : (
        <Layout style={{ background: '#fff', height: '70vh' }}>
          {/* 顶部工具栏 */}
          <Layout.Header style={{ background: '#fff', padding: '0 16px', borderBottom: '1px solid #f0f0f0', height: 'auto', lineHeight: 'normal' }}>
            <Row justify="space-between" align="middle" style={{ padding: '12px 0' }}>
              <Col>
                <Space>
                  <Button
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={() => setCollapsed(!collapsed)}
                  />
                  <Divider type="vertical" />
                  <span>搜索结果</span>
                  <Tag color="blue" icon={<CheckCircleOutlined />}>
                    {searchResults.length} 个结果
                  </Tag>
                  {searchTime > 0 && (
                    <Tag color="green">
                      {searchTime}ms
                    </Tag>
                  )}
                  <Tooltip title={`关键词: "${searchKeyword}" | 类型: ${searchType === 'all' ? '所有类型' : searchType}`}>
                    <Tag color="orange">
                      "{searchKeyword}"
                    </Tag>
                  </Tooltip>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button size="small" onClick={handleRetry} icon={<ReloadOutlined />} loading={loading}>
                    刷新
                  </Button>
                  <Button size="small" onClick={handleReset}>
                    重置
                  </Button>
                </Space>
              </Col>
            </Row>
          </Layout.Header>

          <Layout>
            {/* 左侧树形导航 */}
            <Layout.Sider
              width={350}
              collapsed={collapsed}
              collapsedWidth={0}
              className="module-tree-sider"
              style={{
                background: '#fff',
                borderRight: '1px solid #f0f0f0',
                height: '100%'
              }}
            >
              <div style={{ padding: '16px' }}>
                <Title level={5} style={{ marginBottom: 16 }}>模块树形结构</Title>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Spin size="large" tip="搜索中..." />
                  </div>
                ) : treeData.length > 0 ? (
                  <Tree
                    treeData={treeData}
                    onSelect={handleTreeSelect}
                    showIcon={false}
                    defaultExpandAll
                    style={{ fontSize: '14px' }}
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Space direction="vertical" size="small">
                        <span>未找到匹配的模块</span>
                        <span style={{ color: '#999', fontSize: '12px' }}>请尝试其他关键词或类型</span>
                      </Space>
                    }
                    style={{ margin: '20px 0' }}
                  />
                )}
              </div>
            </Layout.Sider>

            {/* 右侧详情面板 */}
            <Layout.Content style={{ padding: '16px', background: '#fff', height: '100%', overflow: 'auto' }}>
              {selectedModule ? (
                <ModuleDetail 
                  module={selectedModule} 
                  currentPath="/search"
                  onModuleDeleted={() => {
                    // 删除成功后重新搜索以刷新列表
                    if (searchKeyword) {
                      handleSearch();
                    }
                    setSelectedModule(null);
                  }}
                />
              ) : (
                <Card>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <Space direction="vertical" size="small">
                        <span>请从左侧树形导航中选择一个模块查看详情</span>
                        <span style={{ color: '#999', fontSize: '12px' }}>点击模块名称可查看详细信息、编辑或删除</span>
                      </Space>
                    }
                  />
                </Card>
              )}
            </Layout.Content>
          </Layout>
        </Layout>
      )}


    </div>
  );
};

export default SearchPage;
