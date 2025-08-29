/**
 * RESTful API相关的类型定义
 * 基于MOD005 人类交互接口的设计文档
 */

import { AnyModule, SearchCriteria, ModuleRelationship } from './module.js';

// HTTP状态码枚举
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500
}

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  request_id?: string;
}

// 分页参数接口
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// 排序参数接口
export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// 搜索参数接口
export interface SearchParams extends PaginationParams, SortParams {
  q?: string; // 通用搜索关键词
  name?: string;
  type?: string;
  file_path?: string;
  parent_module?: string;
  access_modifier?: string;
  description?: string;
}

// 模块创建请求接口
export interface CreateModuleRequest {
  name: string;
  type: 'class' | 'function' | 'variable' | 'file' | 'functionGroup';
  parent_module?: string;
  file_path: string;
  access_modifier: 'public' | 'private' | 'protected';
  description?: string;
  // 类型特定字段
  inheritance?: string[];
  interfaces?: string[];
  parameters?: {
    name: string;
    data_type: string;
    default_value?: string | null;
    is_required: boolean;
    description?: string;
  }[];
  return_type?: string;
  is_async?: boolean;
  data_type?: string;
  initial_value?: string;
  is_constant?: boolean;
  functions?: string[];
}

// 模块更新请求接口
export interface UpdateModuleRequest {
  name?: string;
  description?: string;
  access_modifier?: 'public' | 'private' | 'protected';
  parent_module?: string;
  // 类型特定字段
  inheritance?: string[];
  interfaces?: string[];
  parameters?: {
    name: string;
    data_type: string;
    default_value?: string | null;
    is_required: boolean;
    description?: string;
  }[];
  return_type?: string;
  is_async?: boolean;
  data_type?: string;
  initial_value?: string;
  is_constant?: boolean;
  functions?: string[];
}

// 模块响应接口
export interface ModuleResponse {
  module: AnyModule;
  relationships?: ModuleRelationship[];
  children?: AnyModule[];
}

// 模块列表响应接口
export interface ModuleListResponse extends PaginatedResponse<AnyModule> {
  filters?: SearchParams;
}

// 搜索结果响应接口
export interface SearchResponse {
  results: AnyModule[];
  total: number;
  query: SearchCriteria;
  suggestions?: string[];
  facets?: {
    types: { [key: string]: number };
    files: { [key: string]: number };
    access_modifiers: { [key: string]: number };
  };
}

// 类型结构响应接口
export interface TypeStructureResponse {
  type_name: string;
  hierarchy: string[];
  related_modules: AnyModule[];
  relationships: ModuleRelationship[];
  inheritance_tree?: {
    parents: string[];
    children: string[];
    siblings: string[];
  };
}

// 统计信息响应接口
export interface StatsResponse {
  total_modules: number;
  modules_by_type: { [key: string]: number };
  modules_by_file: { [key: string]: number };
  modules_by_access: { [key: string]: number };
  recent_activity: {
    created: number;
    updated: number;
    deleted: number;
  };
  storage_info: {
    total_files: number;
    total_size: number;
    last_backup: string;
  };
}

// 健康检查响应接口
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  services: {
    storage: 'up' | 'down';
    mcp_server: 'up' | 'down';
    validation: 'up' | 'down';
  };
  last_check: string;
}

// 配置响应接口
export interface ConfigResponse {
  storage: {
    data_path: string;
    backup_enabled: boolean;
    backup_interval: number;
  };
  validation: {
    strict_mode: boolean;
    auto_fix: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  server: {
    port: number;
    cors_enabled: boolean;
    rate_limit: {
      enabled: boolean;
      max_requests: number;
      window_ms: number;
    };
  };
}

// 错误代码枚举
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  MODULE_ALREADY_EXISTS = 'MODULE_ALREADY_EXISTS',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// 错误消息映射
export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.VALIDATION_ERROR]: '请求参数验证失败',
  [ApiErrorCode.MODULE_NOT_FOUND]: '模块未找到',
  [ApiErrorCode.MODULE_ALREADY_EXISTS]: '模块已存在',
  [ApiErrorCode.CIRCULAR_REFERENCE]: '检测到循环引用',
  [ApiErrorCode.STORAGE_ERROR]: '存储操作失败',
  [ApiErrorCode.PERMISSION_DENIED]: '权限不足',
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超限',
  [ApiErrorCode.INTERNAL_ERROR]: '服务器内部错误'
};

// 注意：ValidationRule 已在 mcp.ts 中定义，此处不重复定义

// API路由定义
export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  parameters?: {
    path?: { [key: string]: string };
    query?: { [key: string]: string };
    body?: { [key: string]: any };
  };
  responses: {
    [statusCode: number]: {
      description: string;
      schema?: any;
    };
  };
  auth_required?: boolean;
  rate_limit?: {
    max_requests: number;
    window_ms: number;
  };
}

// 中间件配置接口
export interface MiddlewareConfig {
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
  rate_limit: {
    enabled: boolean;
    max_requests: number;
    window_ms: number;
    skip_successful_requests?: boolean;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'combined' | 'common';
  };
  validation: {
    enabled: boolean;
    strict_mode: boolean;
    auto_sanitize: boolean;
  };
}