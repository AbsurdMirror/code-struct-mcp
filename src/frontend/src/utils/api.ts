/**
 * API服务类
 * 提供前端与后端API的通信接口
 */

import type { Module, APIResponse, SearchQuery } from '../types';

/**
 * API配置接口
 */
interface ApiConfig {
  baseUrl: string;  // API基础URL
  timeout: number;  // 请求超时时间（毫秒）
}

/**
 * 默认API配置
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: '/api',  // 开发模式下通过Vite代理转发
  timeout: 10000    // 10秒超时
};

/**
 * API服务类
 * 封装所有与后端API的通信逻辑
 */
export class ApiService {
  private config: ApiConfig;

  /**
   * 构造函数
   * @param config API配置，可选，使用默认配置
   */
  constructor(config?: Partial<ApiConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 通用HTTP请求方法
   * @param endpoint API端点
   * @param options 请求选项
   * @returns Promise<APIResponse<T>>
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // 设置默认请求头
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 检查HTTP状态码
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }

      // 解析JSON响应
      const data = await response.json();
      return data as APIResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 处理不同类型的错误
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时');
        }
        throw error;
      }
      throw new Error('未知错误');
    }
  }

  /**
   * GET请求方法
   * @param endpoint API端点
   * @param params 查询参数
   * @returns Promise<APIResponse<T>>
   */
  private async get<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<APIResponse<T>> {
    let url = endpoint;
    
    // 添加查询参数
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST请求方法
   * @param endpoint API端点
   * @param data 请求体数据
   * @returns Promise<APIResponse<T>>
   */
  private async post<T = any>(
    endpoint: string,
    data?: any
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT请求方法
   * @param endpoint API端点
   * @param data 请求体数据
   * @returns Promise<APIResponse<T>>
   */
  private async put<T = any>(
    endpoint: string,
    data?: any
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE请求方法
   * @param endpoint API端点
   * @returns Promise<APIResponse<T>>
   */
  private async delete<T = any>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ==================== 模块相关API ====================

  /**
   * 获取根模块列表
   * @returns Promise<APIResponse<Module[]>>
   */
  async getRootModules(): Promise<APIResponse<Module[]>> {
    return this.get<Module[]>('/modules');
  }

  /**
   * 根据层次名称获取模块详情
   * @param hierarchicalName 模块的层次化名称
   * @returns Promise<APIResponse<Module>>
   */
  async getModuleByHierarchicalName(hierarchicalName: string): Promise<APIResponse<Module>> {
    // URL编码层次名称，处理特殊字符
    const encodedName = encodeURIComponent(hierarchicalName);
    return this.get<Module>('/modules/get', { name: hierarchicalName });
  }

  /**
   * 搜索模块
   * @param query 搜索查询条件
   * @returns Promise<APIResponse<Module[]>>
   */
  async searchModules(query: SearchQuery): Promise<APIResponse<Module[]>> {
    return this.get<Module[]>('/modules/search', query);
  }

  /**
   * 获取所有模块列表
   * @returns Promise<APIResponse<Module[]>>
   */
  async getAllModules(): Promise<APIResponse<Module[]>> {
    return this.get<Module[]>('/modules');
  }

  /**
   * 获取指定模块的子模块列表
   * @param hierarchicalName 父模块的层次化名称
   * @returns Promise<APIResponse<Module[]>>
   */
  async getModuleChildren(hierarchicalName: string): Promise<APIResponse<Module[]>> {
    // URL编码层次名称，处理特殊字符
    const encodedName = encodeURIComponent(hierarchicalName);
    return this.get<Module[]>(`/modules/${encodedName}/children`);
  }

  /**
   * 添加新模块
   * @param moduleData 模块数据
   * @returns Promise<APIResponse<Module>>
   */
  async addModule(moduleData: any): Promise<APIResponse<Module>> {
    return this.post<Module>('/modules', moduleData);
  }

  /**
   * 更新模块
   * @param hierarchicalName 模块的层次化名称
   * @param moduleData 更新的模块数据
   * @returns Promise<APIResponse<Module>>
   */
  async updateModule(hierarchicalName: string, moduleData: any): Promise<APIResponse<Module>> {
    return this.put<Module>(`/modules/update?name=${encodeURIComponent(hierarchicalName)}`, moduleData);
  }

  /**
   * 删除模块
   * @param hierarchicalName 模块的层次化名称
   * @returns Promise<APIResponse<void>>
   */
  async deleteModule(hierarchicalName: string): Promise<APIResponse<void>> {
    return this.delete<void>(`/modules/delete?name=${encodeURIComponent(hierarchicalName)}`);
  }
}

/**
 * 默认API服务实例
 * 可以直接导入使用
 */
export const apiService = new ApiService();

/**
 * 导出默认实例
 */
export default apiService;
