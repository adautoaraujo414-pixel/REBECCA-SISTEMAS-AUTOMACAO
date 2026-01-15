// ========================================
// REBECA - CONFIGURAÇÃO DO ESLINT
// ========================================

module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Erros
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'no-undef': 'error',
    
    // Estilo
    'indent': ['warn', 2],
    'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'only-multiline'],
    
    // Boas práticas
    'eqeqeq': ['warn', 'always'],
    'no-var': 'warn',
    'prefer-const': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 2 }],
    
    // Async/Await
    'no-async-promise-executor': 'error',
    'require-await': 'warn',
    
    // Desabilitar regras muito restritivas
    'no-prototype-builtins': 'off'
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'backups/',
    'logs/',
    'admin/dist/',
    '*.min.js'
  ]
};
