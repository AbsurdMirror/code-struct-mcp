import type { Module } from '../types';

// API基础URL
const API_BASE_URL = '/api';

// API响应接口
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    offset: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 搜索查询参数
interface SearchQuery {
  keyword: string;
  type?: 'class' | 'function' | 'variable' | 'file' | 'functionGroup' | 'all';
  offset?: number;
  limit?: number;
}

// 搜索结果接口
interface SearchResult {
  modules: Module[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取根模块列表
 */
export async function getRootModules(): Promise<Module[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules`);
    const result: ApiResponse<Module[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取根模块列表失败');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('获取根模块列表失败:', error);
    throw error;
  }
}

/**
 * 搜索模块
 */
export async function searchModules(query: SearchQuery): Promise<SearchResult> {
  try {
    const params = new URLSearchParams();
    params.append('keyword', query.keyword);
    
    if (query.type && query.type !== 'all') {
      params.append('type', query.type);
    }
    
    if (query.offset !== undefined) {
      params.append('offset', query.offset.toString());
    }
    
    if (query.limit !== undefined) {
      params.append('limit', query.limit.toString());
    }
    
    const response = await fetch(`${API_BASE_URL}/modules/search?${params.toString()}`);
    const result: ApiResponse<Module[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '搜索模块失败');
    }
    
    return {
      modules: result.data || [],
      pagination: result.pagination || {
        offset: 0,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  } catch (error) {
    console.error('搜索模块失败:', error);
    throw error;
  }
}

/**
 * 根据层次名称获取模块详情
 */
export async function getModuleByName(hierarchicalName: string): Promise<Module | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules/get?name=${encodeURIComponent(hierarchicalName)}`);
    const result: ApiResponse<Module> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取模块详情失败');
    }
    
    return result.data || null;
  } catch (error) {
    console.error('获取模块详情失败:', error);
    throw error;
  }
}

/**
 * 获取模块的子模块列表
 */
export async function getModuleChildren(moduleId: string): Promise<Module[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules/${encodeURIComponent(moduleId)}/children`);
    const result: ApiResponse<Module[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '获取子模块列表失败');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('获取子模块列表失败:', error);
    throw error;
  }
}

/**
 * 创建新模块
 */
export async function createModule(moduleData: any): Promise<Module> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(moduleData),
    });
    
    const result: ApiResponse<Module> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '创建模块失败');
    }
    
    return result.data;
  } catch (error) {
    console.error('创建模块失败:', error);
    throw error;
  }
}

/**
 * 根据ID获取模块详情（RESTful风格）
 */
export async function getModuleById(moduleId: string): Promise<Module | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules/${encodeURIComponent(moduleId)}`);
    const result: ApiResponse<Module> = await response.json();
    
    if (!result.success) {
      if (response.status === 404) {
        return null; // 模块不存在
      }
      throw new Error(result.message || '获取模块详情失败');
    }
    
    return result.data || null;
  } catch (error) {
    console.error('获取模块详情失败:', error);
    throw error;
  }
}

/**
 * 更新模块信息（RESTful风格）
 */
export async function updateModule(moduleId: string, updateData: any): Promise<Module> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules/${encodeURIComponent(moduleId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const result: ApiResponse<Module> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '更新模块失败');
    }
    
    return result.data;
  } catch (error) {
    console.error('更新模块失败:', error);
    throw error;
  }
}

/**
 * 删除模块（RESTful风格）
 */
export async function deleteModule(moduleId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/modules/${encodeURIComponent(moduleId)}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse<void> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '删除模块失败');
    }
  } catch (error) {
    console.error('删除模块失败:', error);
    throw error;
  }
}

/**
 * 获取所有模块列表（用于父模块选择）
 */
export async function getAllModules(): Promise<Module[]> {
  try {
    // 使用根模块API获取所有模块
    const modules = await getRootModules();
    return modules;
  } catch (error) {
    console.error('获取所有模块失败:', error);
    throw error;
  }
}