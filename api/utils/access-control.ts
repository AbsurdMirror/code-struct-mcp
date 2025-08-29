/**
 * 访问控制管理器
 * 提供基于角色的访问控制(RBAC)和权限管理功能
 */

import { Logger } from './logger.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ErrorHandler, ErrorType } from './error-handler.js';

/**
 * 权限枚举
 */
export enum Permission {
  // 模块权限
  MODULE_READ = 'module:read',
  MODULE_CREATE = 'module:create',
  MODULE_UPDATE = 'module:update',
  MODULE_DELETE = 'module:delete',
  MODULE_SEARCH = 'module:search',
  
  // 文件权限
  FILE_READ = 'file:read',
  FILE_WRITE = 'file:write',
  FILE_DELETE = 'file:delete',
  
  // 系统权限
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_RESTORE = 'system:restore',
  SYSTEM_STATS = 'system:stats',
  
  // 管理权限
  ADMIN_USERS = 'admin:users',
  ADMIN_ROLES = 'admin:roles',
  ADMIN_PERMISSIONS = 'admin:permissions'
}

/**
 * 角色枚举
 */
export enum Role {
  GUEST = 'guest',
  USER = 'user',
  DEVELOPER = 'developer',
  ADMIN = 'admin',
  SYSTEM = 'system'
}

/**
 * 用户接口
 */
export interface User {
  id: string;
  name: string;
  roles: Role[];
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  lastAccessAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * 访问上下文接口
 */
export interface AccessContext {
  user?: User;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  requiredPermissions: Permission[];
  userPermissions: Permission[];
  missingPermissions: Permission[];
}

/**
 * 访问日志接口
 */
export interface AccessLog {
  id: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  permission: Permission;
  granted: boolean;
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * 访问控制管理器类
 */
export class AccessControlManager {
  private static instance: AccessControlManager;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private users: Map<string, User> = new Map();
  private sessions: Map<string, { userId: string; expiresAt: Date }> = new Map();
  private accessLogs: AccessLog[] = [];
  private rolePermissions: Map<Role, Permission[]> = new Map();
  private rateLimits: Map<string, { count: number; resetAt: Date }> = new Map();
  
  // 默认角色权限配置
  private readonly DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.GUEST]: [
      Permission.MODULE_READ,
      Permission.MODULE_SEARCH
    ],
    [Role.USER]: [
      Permission.MODULE_READ,
      Permission.MODULE_SEARCH,
      Permission.FILE_READ
    ],
    [Role.DEVELOPER]: [
      Permission.MODULE_READ,
      Permission.MODULE_CREATE,
      Permission.MODULE_UPDATE,
      Permission.MODULE_SEARCH,
      Permission.FILE_READ,
      Permission.FILE_WRITE,
      Permission.SYSTEM_STATS
    ],
    [Role.ADMIN]: [
      ...Object.values(Permission).filter(p => !p.startsWith('admin:')),
      Permission.ADMIN_USERS,
      Permission.ADMIN_ROLES
    ],
    [Role.SYSTEM]: Object.values(Permission)
  };
  
  // 速率限制配置
  private readonly RATE_LIMITS = {
    [Permission.MODULE_CREATE]: { maxRequests: 10, windowMs: 60000 }, // 10次/分钟
    [Permission.MODULE_UPDATE]: { maxRequests: 20, windowMs: 60000 }, // 20次/分钟
    [Permission.MODULE_DELETE]: { maxRequests: 5, windowMs: 60000 },  // 5次/分钟
    [Permission.FILE_WRITE]: { maxRequests: 50, windowMs: 60000 },    // 50次/分钟
    [Permission.FILE_DELETE]: { maxRequests: 10, windowMs: 60000 }    // 10次/分钟
  };

  private constructor() {
    this.logger = new Logger();
    this.errorHandler = ErrorHandler.getInstance();
    this.initializeDefaultRoles();
    this.createDefaultUsers();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AccessControlManager {
    if (!AccessControlManager.instance) {
      AccessControlManager.instance = new AccessControlManager();
    }
    return AccessControlManager.instance;
  }

  /**
   * 检查权限
   */
  checkPermission(
    context: AccessContext,
    requiredPermissions: Permission | Permission[]
  ): PermissionCheckResult {
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    // 如果没有用户信息，使用访客权限
    const user = context.user || this.createGuestUser();
    
    // 获取用户所有权限
    const userPermissions = this.getUserPermissions(user);
    
    // 检查缺失的权限
    const missingPermissions = permissions.filter(
      permission => !userPermissions.includes(permission)
    );
    
    const granted = missingPermissions.length === 0;
    
    // 记录访问日志
    this.logAccess({
      userId: user.id,
      sessionId: context.sessionId || 'unknown',
      action: context.action || 'unknown',
      resource: context.resource || 'unknown',
      permission: permissions[0], // 记录第一个权限
      granted,
      reason: granted ? '' : `缺少权限: ${missingPermissions.join(', ')}`,
      timestamp: context.timestamp,
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent || 'unknown',
      metadata: context.metadata || {}
    })
    
    const result: PermissionCheckResult = {
      granted,
      requiredPermissions: permissions,
      userPermissions,
      missingPermissions
    };
    
    if (!granted) {
      result.reason = `缺少权限: ${missingPermissions.join(', ')}`;
    }
    
    return result;
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(userId: string, permission: Permission): boolean {
    const limit = this.RATE_LIMITS[permission as keyof typeof this.RATE_LIMITS];
    if (!limit) {
      return true; // 没有限制
    }
    
    const key = `${userId}:${permission}`;
    const now = new Date();
    const rateLimitInfo = this.rateLimits.get(key);
    
    if (!rateLimitInfo || now > rateLimitInfo.resetAt) {
      // 重置计数器
      this.rateLimits.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + limit.windowMs)
      });
      return true;
    }
    
    if (rateLimitInfo.count >= limit.maxRequests) {
      return false; // 超过限制
    }
    
    // 增加计数
    rateLimitInfo.count++;
    return true;
  }

  /**
   * 创建用户
   */
  createUser(userData: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      id: this.generateUserId(),
      createdAt: new Date(),
      ...userData
    };
    
    this.users.set(user.id, user);
    this.logger.info(`用户已创建: ${user.name} (${user.id})`);
    
    return user;
  }

  /**
   * 获取用户
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  /**
   * 更新用户
   */
  updateUser(userId: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(userId);
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, ...updates };
    this.users.set(userId, updatedUser);
    
    this.logger.info(`用户已更新: ${user.name} (${userId})`);
    return updatedUser;
  }

  /**
   * 删除用户
   */
  deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }
    
    this.users.delete(userId);
    this.logger.info(`用户已删除: ${user.name} (${userId})`);
    return true;
  }

  /**
   * 创建会话
   */
  createSession(userId: string, expirationMs: number = 24 * 60 * 60 * 1000): string {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + expirationMs);
    
    this.sessions.set(sessionId, { userId, expiresAt });
    
    // 更新用户最后访问时间
    const user = this.users.get(userId);
    if (user) {
      user.lastAccessAt = new Date();
    }
    
    this.logger.info(`会话已创建: ${sessionId} for user ${userId}`);
    return sessionId;
  }

  /**
   * 验证会话
   */
  validateSession(sessionId: string): User | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      this.logger.info(`会话已过期: ${sessionId}`);
      return undefined;
    }
    
    const user = this.users.get(session.userId);
    if (!user || !user.isActive) {
      return undefined;
    }
    
    // 更新最后访问时间
    user.lastAccessAt = new Date();
    
    return user;
  }

  /**
   * 销毁会话
   */
  destroySession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      this.logger.info(`会话已销毁: ${sessionId}`);
    }
    return deleted;
  }

  /**
   * 获取用户权限
   */
  getUserPermissions(user: User): Permission[] {
    const permissions = new Set<Permission>();
    
    // 添加角色权限
    user.roles.forEach(role => {
      const rolePermissions = this.rolePermissions.get(role) || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    });
    
    // 添加用户特定权限
    user.permissions.forEach(permission => permissions.add(permission));
    
    return Array.from(permissions);
  }

  /**
   * 添加角色权限
   */
  addRolePermission(role: Role, permission: Permission): void {
    const permissions = this.rolePermissions.get(role) || [];
    if (!permissions.includes(permission)) {
      permissions.push(permission);
      this.rolePermissions.set(role, permissions);
      this.logger.info(`权限已添加到角色: ${permission} -> ${role}`);
    }
  }

  /**
   * 移除角色权限
   */
  removeRolePermission(role: Role, permission: Permission): void {
    const permissions = this.rolePermissions.get(role) || [];
    const index = permissions.indexOf(permission);
    if (index > -1) {
      permissions.splice(index, 1);
      this.rolePermissions.set(role, permissions);
      this.logger.info(`权限已从角色移除: ${permission} <- ${role}`);
    }
  }

  /**
   * 获取访问日志
   */
  getAccessLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    granted?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AccessLog[] {
    let logs = this.accessLogs;
    
    if (filters) {
      logs = logs.filter(log => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.resource && log.resource !== filters.resource) return false;
        if (filters.granted !== undefined && log.granted !== filters.granted) return false;
        if (filters.startDate && log.timestamp < filters.startDate) return false;
        if (filters.endDate && log.timestamp > filters.endDate) return false;
        return true;
      });
    }
    
    // 按时间倒序排列
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.info(`已清理 ${cleanedCount} 个过期会话`);
    }
    
    return cleanedCount;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    totalAccessLogs: number;
    recentFailedAccess: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return {
      totalUsers: this.users.size,
      activeUsers: Array.from(this.users.values()).filter(u => u.isActive).length,
      totalSessions: this.sessions.size,
      totalAccessLogs: this.accessLogs.length,
      recentFailedAccess: this.accessLogs.filter(
        log => !log.granted && log.timestamp > oneHourAgo
      ).length
    };
  }

  /**
   * 初始化默认角色
   */
  private initializeDefaultRoles(): void {
    for (const [role, permissions] of Object.entries(this.DEFAULT_ROLE_PERMISSIONS)) {
      this.rolePermissions.set(role as Role, permissions);
    }
  }

  /**
   * 创建默认用户
   */
  private createDefaultUsers(): void {
    // 在MCP模式下，临时禁用控制台输出
    const originalConsole = process.env.MCP_MODE === 'true';
    
    // 创建系统用户
    this.createUser({
      name: 'System',
      roles: [Role.SYSTEM],
      permissions: [],
      isActive: true
    });
    
    // 创建默认管理员用户
    this.createUser({
      name: 'Admin',
      roles: [Role.ADMIN],
      permissions: [],
      isActive: true
    });
    
    // 创建访客用户
    this.createUser({
      name: 'Guest',
      roles: [Role.GUEST],
      permissions: [],
      isActive: true
    });
  }

  /**
   * 创建访客用户
   */
  private createGuestUser(): User {
    return {
      id: 'guest',
      name: 'Guest',
      roles: [Role.GUEST],
      permissions: [],
      isActive: true,
      createdAt: new Date()
    };
  }

  /**
   * 记录访问日志
   */
  private logAccess(logData: Omit<AccessLog, 'id'>): void {
    const log: AccessLog = {
      id: this.generateLogId(),
      ...logData
    };
    
    this.accessLogs.push(log);
    
    // 限制日志数量，保留最近的10000条
    if (this.accessLogs.length > 10000) {
      this.accessLogs = this.accessLogs.slice(-10000);
    }
    
    // 记录到系统日志
    if (log.granted) {
      this.logger.debug(`访问授权: ${log.userId} -> ${log.action} on ${log.resource}`);
    } else {
      this.logger.warn(`访问拒绝: ${log.userId} -> ${log.action} on ${log.resource} (${log.reason})`);
    }
  }

  /**
   * 生成用户ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 权限检查装饰器
 */
export function RequirePermission(permission: Permission | Permission[]) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const accessControl = AccessControlManager.getInstance();
      
      // 从参数中提取访问上下文（假设第一个参数包含上下文信息）
      const context: AccessContext = {
        timestamp: new Date(),
        action: propertyName,
        resource: target.constructor.name,
        ...(args[0]?.context || {})
      };
      
      const result = accessControl.checkPermission(context, permission);
      if (!result.granted) {
        throw new Error(`访问被拒绝: ${result.reason}`);
      }
      
      return await method.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * 速率限制装饰器
 */
export function RateLimit(permission: Permission) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const accessControl = AccessControlManager.getInstance();
      
      // 从参数中提取用户ID
      const userId = args[0]?.context?.user?.id || 'anonymous';
      
      if (!accessControl.checkRateLimit(userId, permission)) {
        throw new Error('请求频率过高，请稍后再试');
      }
      
      return await method.apply(this, args);
    };
    
    return descriptor;
  };
}

// 导出单例实例
export const accessControl = AccessControlManager.getInstance();