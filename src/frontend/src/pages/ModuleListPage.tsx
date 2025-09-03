import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  message,
  Row,
  Col,
  Layout,
  Input,
  Select
} from 'antd';
import {
  ReloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';
import type { Module } from '../types';
import ModuleTree from '../components/ModuleTree';
import ModuleDetail from '../components/ModuleDetail';
import { apiService } from '../utils/api';

const { Sider, Content } = Layout;

// 删除 props，模块列表默认展示全部模块
const ModuleListPage: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [allModules, setAllModules] = useState<Module[]>([]); // 存储所有已加载的模块
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());

  // 处理树形导航选择
  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const moduleHierarchicalName = selectedKeys[0] as string;
      const module = allModules.find(m => m.hierarchical_name === moduleHierarchicalName);
      setSelectedModule(module || null);
    } else {
      setSelectedModule(null);
    }
  };

  // 处理树节点展开
  const handleTreeExpand = async (expandedKeys: React.Key[], info: any) => {
    setExpandedKeys(expandedKeys);
    
    // 如果是展开操作且节点还没有加载子模块
    if (info.expanded && info.node) {
      const nodeKey = info.node.key as string;
      const module = allModules.find(m => m.hierarchical_name === nodeKey);
      
      if (module && !loadingChildren.has(nodeKey)) {
        // 检查是否已经有子模块数据
        const hasChildrenInState = allModules.some(m => m.parent === module.hierarchical_name);
        
        if (!hasChildrenInState) {
          await loadModuleChildren(module.hierarchical_name);
        }
      }
    }
  };

  // 加载指定模块的子模块
  const loadModuleChildren = async (hierarchicalName: string) => {
    try {
      setLoadingChildren(prev => new Set(prev).add(hierarchicalName));
      
      const response = await apiService.getModuleChildren(hierarchicalName);
      
      if (response.success && response.data) {
        // 将新加载的子模块添加到allModules中
        setAllModules(prev => {
          const existingNames = new Set(prev.map(m => m.hierarchical_name));
          const newModules = response.data!.filter(m => !existingNames.has(m.hierarchical_name));
          return [...prev, ...newModules];
        });
      } else {
        console.warn(`加载子模块失败: ${response.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error(`加载子模块失败: ${errorMessage}`, err);
      message.error(`加载子模块失败: ${errorMessage}`);
    } finally {
      setLoadingChildren(prev => {
        const newSet = new Set(prev);
        newSet.delete(hierarchicalName);
        return newSet;
      });
    }
  };

  // 加载模块数据
  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getRootModules();
      
      if (response.success && response.data) {
        setModules(response.data);
        setAllModules(response.data); // 同时更新allModules
      } else {
        throw new Error(response.message || '获取模块列表失败');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      message.error(`加载模块失败: ${errorMessage}`);
      console.error('加载模块失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    loadModules();
  }, []);

  // 处理刷新
  const handleRefresh = () => {
    loadModules();
  };

  // 默认展示所有模块
  const filteredModules = modules;

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <Card style={{ marginBottom: '16px' }}>
        <Row justify="end" gutter={12}>
          <Col>
            <Button
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '展开导航' : '折叠导航'}
            </Button>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <Layout style={{ flex: '1 1 0', minHeight: 0, backgroundColor: '#fff' }}>
        {/* 左侧树形导航 */}
        <Sider
          width={350}
          collapsible
          collapsed={collapsed}
          trigger={null}
          className="module-tree-sider"
          style={{
            backgroundColor: '#fff',
            borderRight: '1px solid #f0f0f0'
          }}
        >
          <div style={{ padding: '16px 8px', height: '100%', overflow: 'auto' }}>
            <ModuleTree
              modules={allModules}
              onSelect={handleTreeSelect}
              onExpand={handleTreeExpand}
              expandedKeys={expandedKeys}
              loadingChildren={loadingChildren}
            />
          </div>
        </Sider>

        {/* 右侧详情面板 */}
        <Content style={{ padding: '16px', overflow: 'hidden' }}>
          <ModuleDetail
            module={selectedModule}
            style={{ height: '100%' }}
            currentPath="/"
            onModuleDeleted={() => {
              // 删除成功后重新加载模块列表
              loadModules();
              setSelectedModule(null);
            }}
          />
        </Content>
      </Layout>
    </div>
  );
};

export default ModuleListPage;