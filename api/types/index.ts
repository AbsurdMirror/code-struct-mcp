/**
 * 类型定义统一导出文件
 * 提供所有类型定义的集中导出
 */

// 模块相关类型
export * from './module.js';

// 配置相关类型
export * from './config.js';

// MCP协议相关类型
export * from './mcp.js';

// API相关类型
export * from './api.js';

// 存储相关类型
export * from './storage.js';

/**
 * 访问上下文接口
 */
export interface AccessContext {
  userId: string;
  role: 'admin' | 'user' | 'guest';
  permissions?: string[];
  sessionId?: string;
  timestamp?: Date;
}

// 通用工具类型
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// 深度部分类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 深度只读类型
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 注意：NonNullable, Awaited, Parameters, ReturnType, ConstructorParameters, InstanceType 是 TypeScript 内置类型，无需重新定义

// 键值对类型
export type KeyValuePair<K extends string | number | symbol = string, V = any> = {
  key: K;
  value: V;
};

// 字符串字面量联合类型
export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

// 数组元素类型
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// 对象值类型
export type ValueOf<T> = T[keyof T];

// 条件类型
export type If<C extends boolean, T, F> = C extends true ? T : F;

// 联合类型转交叉类型
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// 注意：Exclude, Extract, Pick, Omit, Record 是 TypeScript 内置类型，无需重新定义