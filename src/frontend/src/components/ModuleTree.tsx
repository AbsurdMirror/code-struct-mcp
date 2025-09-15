import React, { useState, useMemo } from 'react';
import { Tree, Tag, Space } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  FunctionOutlined,
  DatabaseOutlined,
  CodeOutlined,
  GroupOutlined
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { Module } from '../types';

interface ModuleTreeProps {
  modules: Module[];
  onSelect?: (selectedKeys: React.Key[], info: any) => void;
  selectedKeys?: React.Key[];
  expandedKeys?: React.Key[];
  onExpand?: (expandedKeys: React.Key[], info: any) => void;
}

interface TreeNodeData extends DataNode {
  module: Module;
  isLeaf?: boolean;
}

const ModuleTree: React.FC<ModuleTreeProps> = ({
  modules,
  onSelect,
  selectedKeys = [],
  expandedKeys,
  onExpand
}) => {
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<React.Key[]>([]);
  
  // 使用内部状态或外部传入的expandedKeys
  const currentExpandedKeys = expandedKeys !== undefined ? expandedKeys : internalExpandedKeys;
  
  // 获取模块类型图标
  const getModuleIcon = (module: Module, expanded?: boolean) => {
    switch (module.type) {
      case 'class':
        return expanded ? <FolderOpenOutlined /> : <FolderOutlined />;
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

  // 构建树形数据结构
  const treeData = useMemo(() => {
    // 创建模块映射
    const moduleMap = new Map<string, Module>();
    modules.forEach(module => {
      moduleMap.set(module.hierarchical_name, module);
    });

    // 构建树形结构
    const rootNodes: TreeNodeData[] = [];
    const processedNodes = new Set<string>();

    // 递归构建子节点（仅用于已加载的子模块）
    const buildChildren = (parentModule: Module): TreeNodeData[] => {
      const children: TreeNodeData[] = [];
      
      // 查找所有以当前模块为父模块的子模块（仅在modules数组中已存在的）
      modules.forEach(module => {
        if (module.parent === parentModule.hierarchical_name && !processedNodes.has(module.hierarchical_name)) {
          processedNodes.add(module.hierarchical_name);
          
          const childNode: TreeNodeData = {
            key: module.hierarchical_name,
            title: (
              <Space size="small">
                <span>{module.name}</span>
                <Tag color={getTypeColor(module.type)}>
                  {getTypeName(module.type)}
                </Tag>
              </Space>
            ),
            icon: getModuleIcon(module, currentExpandedKeys.includes(module.hierarchical_name)),
            module: module,
            isLeaf: !module.hasChildren,
            children: module.hasChildren ? buildChildren(module) : undefined
          };
          
          children.push(childNode);
        }
      });
      
      return children;
    };

    // 找到所有根模块（没有父模块的模块）
    modules.forEach(module => {
      if (!module.parent && !processedNodes.has(module.hierarchical_name)) {
        processedNodes.add(module.hierarchical_name);
        
        const rootNode: TreeNodeData = {
          key: module.hierarchical_name,
          title: (
            <Space size="small">
              <span style={{ fontWeight: 'bold' }}>{module.name}</span>
              <Tag color={getTypeColor(module.type)}>
                {getTypeName(module.type)}
              </Tag>
            </Space>
          ),
          icon: getModuleIcon(module, currentExpandedKeys.includes(module.hierarchical_name)),
          module: module,
          isLeaf: !module.hasChildren,
          children: module.hasChildren ? buildChildren(module) : undefined
        };
        
        rootNodes.push(rootNode);
      }
    });

    return rootNodes;
  }, [modules, currentExpandedKeys]);

  // 处理展开/收起
  const handleExpand = (expandedKeys: React.Key[], info: any) => {
    if (onExpand) {
      onExpand(expandedKeys, info);
    } else {
      setInternalExpandedKeys(expandedKeys);
    }
  };

  // 处理选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (onSelect) {
      onSelect(selectedKeys, info);
    }
  };

  return (
    <Tree
      showIcon
      treeData={treeData}
      selectedKeys={selectedKeys}
      expandedKeys={currentExpandedKeys}
      onExpand={handleExpand}
      onSelect={handleSelect}
      style={{
        background: 'transparent',
        fontSize: '14px'
      }}
    />
  );
};

export default ModuleTree;