module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended'
  ],
  rules: {
    // 基础规则
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off',
    
    // 代码风格
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  },
  env: {
    node: true,
    es6: true,
    jest: true
  }
};