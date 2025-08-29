/**
 * 存储系统相关的类型定义
 * 基于MOD002 数据存储模块的设计文档
 */

import { AnyModule } from './module.js';

// YAML文件结构接口
export interface YamlFileStructure {
  metadata: {
    version: string;
    created_at: string;
    updated_at: string;
    total_modules: number;
    file_hash?: string;
  };
  modules: AnyModule[] | { [key: string]: AnyModule }; // 支持数组和字典两种格式
}

// 存储操作结果接口
export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  operation: 'create' | 'read' | 'update' | 'delete' | 'backup' | 'restore';
  timestamp: string;
}

// 备份信息接口
export interface BackupInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  created_at: string;
  modules_count: number;
  checksum: string;
  description?: string;
}

// 存储统计信息接口
export interface StorageStats {
  total_files: number;
  total_modules: number;
  total_size: number;
  last_modified: string;
  backup_count: number;
  last_backup: string;
  file_distribution: {
    [file_path: string]: {
      modules_count: number;
      size: number;
      last_modified: string;
    };
  };
}

// 注意：StorageConfig 已在 config.ts 中定义，避免重复导出

// 文件操作接口
export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'move' | 'copy';
  source_path: string;
  target_path?: string;
  timestamp: string;
  user?: string;
  description?: string;
}

// 数据完整性检查结果接口
export interface IntegrityCheckResult {
  is_valid: boolean;
  errors: {
    file_path: string;
    error_type: 'missing_file' | 'corrupted_data' | 'schema_violation' | 'checksum_mismatch';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  warnings: {
    file_path: string;
    warning_type: 'deprecated_format' | 'performance_issue' | 'best_practice';
    message: string;
  }[];
  summary: {
    total_files: number;
    valid_files: number;
    corrupted_files: number;
    missing_files: number;
  };
  checked_at: string;
}

// 存储事件接口
export interface StorageEvent {
  id: string;
  type: 'file_created' | 'file_updated' | 'file_deleted' | 'backup_created' | 'backup_restored' | 'integrity_check';
  file_path?: string;
  module_id?: string;
  timestamp: string;
  details: {
    operation: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
  };
}

// 注意：CacheConfig 已在 config.ts 中定义，此处不重复定义

// 缓存项接口
export interface CacheItem<T = any> {
  key: string;
  value: T;
  created_at: string;
  accessed_at: string;
  expires_at: string;
  hit_count: number;
  size: number; // bytes
}

// 缓存统计接口
export interface CacheStats {
  total_items: number;
  total_size: number;
  hit_rate: number;
  miss_rate: number;
  eviction_count: number;
  oldest_item: string;
  newest_item: string;
  memory_usage: {
    used: number;
    available: number;
    percentage: number;
  };
}

// 数据迁移接口
export interface MigrationInfo {
  version: string;
  description: string;
  timestamp: string;
  changes: {
    type: 'schema_change' | 'data_transformation' | 'file_restructure';
    description: string;
    affected_files: string[];
  }[];
  rollback_available: boolean;
}

// 存储提供者接口
export interface StorageProvider {
  name: string;
  type: 'file_system' | 'database' | 'cloud' | 'memory';
  config: Record<string, any>;
  capabilities: {
    supports_transactions: boolean;
    supports_backup: boolean;
    supports_encryption: boolean;
    supports_compression: boolean;
    supports_indexing: boolean;
  };
}

// 查询选项接口
export interface QueryOptions {
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  }[];
  limit?: number;
  offset?: number;
  include_relationships?: boolean;
  include_metadata?: boolean;
}

// 批量操作接口
export interface BatchOperation {
  id: string;
  operations: {
    type: 'create' | 'update' | 'delete';
    target: string; // module hierarchical name or file path
    data?: any;
  }[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  started_at?: string;
  completed_at?: string;
  error?: string;
}

// 存储锁接口
export interface StorageLock {
  id: string;
  resource: string; // file path or module name
  type: 'read' | 'write' | 'exclusive';
  owner: string;
  acquired_at: string;
  expires_at: string;
  metadata?: Record<string, any>;
}

// 数据同步接口
export interface SyncInfo {
  last_sync: string;
  sync_status: 'up_to_date' | 'pending' | 'syncing' | 'conflict' | 'error';
  conflicts: {
    file_path: string;
    conflict_type: 'version_mismatch' | 'concurrent_modification' | 'schema_conflict';
    local_version: string;
    remote_version: string;
    resolution: 'manual' | 'auto_merge' | 'local_wins' | 'remote_wins';
  }[];
  pending_changes: {
    type: 'create' | 'update' | 'delete';
    file_path: string;
    timestamp: string;
  }[];
}

// 存储监控接口
export interface StorageMonitor {
  metrics: {
    read_operations: number;
    write_operations: number;
    delete_operations: number;
    average_response_time: number;
    error_rate: number;
    throughput: number; // operations per second
  };
  alerts: {
    type: 'high_error_rate' | 'slow_response' | 'storage_full' | 'backup_failed';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    resolved: boolean;
  }[];
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  last_check: string;
}