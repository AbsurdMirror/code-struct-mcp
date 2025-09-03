import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import type { MenuProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  DatabaseOutlined,
  EditOutlined
} from '@ant-design/icons';

import ModuleListPage from './pages/ModuleListPage';
import SearchPage from './pages/SearchPage';
import CreateModulePage from './pages/CreateModulePage';
import EditModulePage from './pages/EditModulePage';

const { Header, Sider, Content } = Layout;

// 菜单项配置
const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <DatabaseOutlined />,
    label: '模块列表'
  },
  {
    key: '/search',
    icon: <SearchOutlined />,
    label: '搜索模块'
  },
  {
    key: '/create',
    icon: <PlusOutlined />,
    label: '创建模块'
  }
];

// 主布局组件
const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return ['/'];
    if (path === '/search') return ['/search'];
    if (path === '/create') return ['/create'];
    if (path.startsWith('/edit-module/')) return []; // 编辑页面不高亮任何菜单
    return ['/'];
  };

  return (
    <Layout className="app-layout">
      {/* 顶部导航栏 */}
      <Header className="app-header">
        <div className="app-logo">
          代码结构管理系统
        </div>
        <div style={{ color: '#fff' }}>
          MCP项目 - 前端可视化控制台
        </div>
      </Header>
      
      <Layout>
        {/* 左侧菜单栏 */}
        <Sider
          className="app-sider"
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={250}
          theme="light"
        >
          <Menu
            mode="inline"
            selectedKeys={getSelectedKey()}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        
        {/* 右侧内容区 */}
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content
            className="app-content"
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: 280,
            }}
          >
            <Routes>
              <Route path="/" element={<ModuleListPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/create" element={<CreateModulePage />} />
              <Route path="/edit-module/:id" element={<EditModulePage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

// 主应用组件
const App: React.FC = () => {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
};

export default App;