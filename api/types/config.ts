/**
 * 配置相关的类型定义
 * 基于MOD001数据存储模块的设计文档
 */

// 存储配置接口
export interface StorageConfig {
  root_path: string;              // 存储根路径
  data_path: string;              // 数据存储路径
  backup_path: string;            // 备份存储路径
  backup_enabled: boolean;        // 是否启用备份
  backup_interval: number;        // 备份间隔 (秒)
  max_backups: number;           // 最大备份数量
  auto_backup: boolean;          // 是否自动备份
  compression: boolean;          // 是否启用压缩
  encryption: {
    enabled: boolean;
    algorithm?: string;
    key_path?: string;
  };
  validation: {
    enabled: boolean;
    schema_validation: boolean;
    data_integrity_check: boolean;
  };
}

// 验证配置接口
export interface ValidationConfig {
  max_nesting_level: number;      // 最大嵌套层级
  max_name_length: number;        // 最大名称长度
  allowed_types: string[];        // 允许的模块类型
  strict_mode: boolean;           // 严格模式
  auto_fix: boolean;              // 自动修复
}

// 缓存配置接口
export interface CacheConfig {
  enabled: boolean;               // 是否启用缓存
  ttl: number;                   // 缓存生存时间 (秒)
  max_size: number;              // 最大缓存条目数
}

// MCP服务器配置接口
export interface McpServerConfig {
  name: string;                   // 服务器名称
  version: string;                // 服务器版本
  description: string;            // 服务器描述
  tools: string[];               // 支持的工具列表
}

// HTTP服务器配置接口
export interface HttpServerConfig {
  port: number;                   // 服务端口
  host: string;                   // 服务主机
  cors: {
    enabled: boolean;             // 是否启用CORS
    origins: string[];            // CORS允许的源
    methods: string[];            // 允许的HTTP方法
    headers: string[];            // 允许的请求头
  };
  rate_limit: {
    enabled: boolean;             // 是否启用限流
    window_ms: number;            // 限流时间窗口 (毫秒)
    max_requests: number;         // 最大请求数
  };
}

// 日志配置接口
export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file_path?: string;            // 日志文件路径
  max_file_size: string;         // 最大文件大小
  max_files: number;             // 最大文件数量
}

// 应用程序配置接口
export interface AppConfig {
  storage: StorageConfig;
  validation: ValidationConfig;
  cache: CacheConfig;
  mcp_server: McpServerConfig;
  http_server: HttpServerConfig;
  logging: LogConfig;
  environment: 'development' | 'production' | 'test';
}

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  storage: {
    root_path: './data',
    data_path: './data',
    backup_path: './data/backups',
    backup_enabled: true,
    backup_interval: 3600,
    max_backups: 10,
    auto_backup: true,
    compression: false,
    encryption: {
      enabled: false
    },
    validation: {
      enabled: true,
      schema_validation: true,
      data_integrity_check: true
    }
  },
  validation: {
    max_nesting_level: 5,
    max_name_length: 100,
    allowed_types: ['class', 'function', 'variable', 'file', 'functionGroup'],
    strict_mode: false,
    auto_fix: true
  },
  cache: {
    enabled: true,
    ttl: 300,
    max_size: 1000
  },
  mcp_server: {
    name: 'code-struct-mcp',
    version: '1.0.0',
    description: '代码文档管理工具MCP服务器',
    tools: ['add_module', 'get_module_by_name', 'smart_search', 'get_type_structure']
  },
  http_server: {
    port: 3001,
    host: '0.0.0.0',
    cors: {
      enabled: true,
      origins: ['http://localhost:5173', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization']
    },
    rate_limit: {
      enabled: true,
      window_ms: 60000,
      max_requests: 100
    }
  },
  logging: {
    level: 'info',
    file_path: './logs/app.log',
    max_file_size: '10MB',
    max_files: 5
  },
  environment: 'development'
};