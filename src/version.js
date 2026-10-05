// 版本单一来源是 package.json，构建时由 vite define 注入 __APP_VERSION__。
// node 直接运行（单元测试）时回退为 'dev'。
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
