import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // 配置代理，将API请求转发到后端服务器
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // 后端服务器地址
        changeOrigin: true,              // 改变请求头中的origin字段
        secure: false,                   // 如果是https接口，需要配置这个参数
        // rewrite: (path) => path.replace(/^\/api/, '') // 如果后端不需要/api前缀，可以重写路径
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

// 支持通过命令行参数动态配置代理目标
// 使用方式: npm run dev -- --backend-port 8080
if (process.env.npm_config_backend_port) {
  const backendPort = process.env.npm_config_backend_port;
  console.log(`配置后端代理端口: ${backendPort}`);
}