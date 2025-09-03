#!/usr/bin/env node

/**
 * 生产模式启动脚本
 * 启动Express服务器，同时提供API服务和静态文件服务
 * 支持通过命令行参数配置端口
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: 3000,          // 服务端口
    logFile: null,       // 日志文件路径
    staticDir: null      // 静态文件目录
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--port' && args[i + 1]) {
      config.port = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--log-file' && args[i + 1]) {
      config.logFile = args[i + 1];
      i++;
    } else if (arg === '--static-dir' && args[i + 1]) {
      config.staticDir = args[i + 1];
      i++;
    }
  }

  return config;
}

// 创建日志写入器
function createLogger(logFile) {
  if (!logFile) {
    return {
      log: () => {}, // 禁用标准输出
      error: (msg) => console.error(msg)
    };
  }

  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  return {
    log: (msg) => {
      const timestamp = new Date().toISOString();
      logStream.write(`[${timestamp}] ${msg}\n`);
    },
    error: (msg) => {
      const timestamp = new Date().toISOString();
      logStream.write(`[${timestamp}] ERROR: ${msg}\n`);
      console.error(msg);
    }
  };
}

// 主函数
async function main() {
  const config = parseArgs();
  const logger = createLogger(config.logFile);
  
  logger.log('=== 生产模式启动 ===');
  logger.log(`服务端口: ${config.port}`);
  
  const projectRoot = path.resolve(__dirname, '..');
  const backendDir = path.join(projectRoot, 'src', 'backend');
  
  // 设置静态文件目录
  if (!config.staticDir) {
    config.staticDir = path.join(projectRoot, 'src', 'frontend', 'dist');
  }
  
  logger.log(`静态文件目录: ${config.staticDir}`);
  
  // 检查目录是否存在
  if (!fs.existsSync(backendDir)) {
    logger.error(`后端目录不存在: ${backendDir}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(config.staticDir)) {
    logger.error(`静态文件目录不存在: ${config.staticDir}`);
    logger.error('请先运行构建命令: npm run build');
    process.exit(1);
  }

  try {
    // 启动生产服务器
    logger.log('启动生产服务器...');
    
    const args = [
      'run', 'start',
      '--',
      '--port', config.port.toString(),
      '--static-dir', config.staticDir
    ];
    
    if (config.logFile) {
      args.push('--log-file', config.logFile);
    }
    
    const serverProcess = spawn('npm', args, {
      cwd: backendDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // 处理服务器输出
    serverProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[服务器] ${message}`);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[服务器] ERROR: ${message}`);
      }
    });
    
    logger.log('=== 服务启动完成 ===');
    logger.log(`访问地址: http://localhost:${config.port}`);
    logger.log(`API地址: http://localhost:${config.port}/api`);
    
    // 处理进程退出信号
    process.on('SIGINT', () => {
      logger.log('收到退出信号，正在关闭服务...');
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
      }
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.log('收到终止信号，正在关闭服务...');
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGTERM');
      }
      process.exit(0);
    });
    
    // 等待进程结束
    await new Promise(resolve => {
      serverProcess.on('close', (code) => {
        if (code === 0) {
          logger.log('服务器正常退出');
        } else {
          logger.error(`服务器异常退出，退出码: ${code}`);
        }
        resolve(code);
      });
    });
    
  } catch (error) {
    logger.error(`启动失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('启动失败:', error.message);
    process.exit(1);
  });
}

module.exports = { main, parseArgs };