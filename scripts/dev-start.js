#!/usr/bin/env node

/**
 * 开发模式并发启动脚本
 * 同时启动前端和后端开发服务器
 * 支持通过命令行参数配置端口
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    frontendPort: 5173,  // 前端默认端口
    backendPort: 3000,   // 后端默认端口
    logFile: null        // 日志文件路径
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--port' && args[i + 1]) {
      // 统一端口，前端使用指定端口，后端使用指定端口+1
      const port = parseInt(args[i + 1]);
      config.frontendPort = port;
      config.backendPort = port + 1;
      i++;
    } else if (arg === '--frontend-port' && args[i + 1]) {
      config.frontendPort = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--backend-port' && args[i + 1]) {
      config.backendPort = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--log-file' && args[i + 1]) {
      config.logFile = args[i + 1];
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

// 启动进程
function startProcess(command, args, options, logger, name) {
  return new Promise((resolve, reject) => {
    logger.log(`启动${name}: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      ...options,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    // 处理标准输出
    child.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[${name}] ${message}`);
      }
    });

    // 处理错误输出
    child.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[${name}] ERROR: ${message}`);
      }
    });

    // 处理进程退出
    child.on('close', (code) => {
      if (code === 0) {
        logger.log(`${name}正常退出`);
        resolve(code);
      } else {
        logger.error(`${name}异常退出，退出码: ${code}`);
        reject(new Error(`${name}异常退出，退出码: ${code}`));
      }
    });

    // 处理进程错误
    child.on('error', (error) => {
      logger.error(`${name}启动失败: ${error.message}`);
      reject(error);
    });

    return child;
  });
}

// 主函数
async function main() {
  const config = parseArgs();
  const logger = createLogger(config.logFile);
  
  logger.log('=== 开发模式并发启动 ===');
  logger.log(`前端端口: ${config.frontendPort}`);
  logger.log(`后端端口: ${config.backendPort}`);
  
  const projectRoot = path.resolve(__dirname, '..');
  const frontendDir = path.join(projectRoot, 'src', 'frontend');
  const backendDir = path.join(projectRoot, 'src', 'backend');
  
  // 检查目录是否存在
  if (!fs.existsSync(frontendDir)) {
    logger.error(`前端目录不存在: ${frontendDir}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(backendDir)) {
    logger.error(`后端目录不存在: ${backendDir}`);
    process.exit(1);
  }

  const processes = [];
  
  try {
    // 启动后端服务器
    logger.log('启动后端服务器...');
    const backendProcess = spawn('npm', ['run', 'dev', '--', '--port', config.backendPort.toString()], {
      cwd: backendDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    processes.push(backendProcess);
    
    // 处理后端输出
    backendProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[后端] ${message}`);
      }
    });
    
    backendProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[后端] ERROR: ${message}`);
      }
    });
    
    // 等待后端启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 启动前端服务器
    logger.log('启动前端服务器...');
    const frontendProcess = spawn('npm', ['run', 'dev', '--', '--port', config.frontendPort.toString()], {
      cwd: frontendDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    processes.push(frontendProcess);
    
    // 处理前端输出
    frontendProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[前端] ${message}`);
      }
    });
    
    frontendProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        logger.log(`[前端] ERROR: ${message}`);
      }
    });
    
    logger.log('=== 服务启动完成 ===');
    logger.log(`前端访问地址: http://localhost:${config.frontendPort}`);
    logger.log(`后端API地址: http://localhost:${config.backendPort}`);
    
    // 处理进程退出信号
    process.on('SIGINT', () => {
      logger.log('收到退出信号，正在关闭服务...');
      processes.forEach(proc => {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      });
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.log('收到终止信号，正在关闭服务...');
      processes.forEach(proc => {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      });
      process.exit(0);
    });
    
    // 等待进程结束
    await Promise.all([
      new Promise(resolve => backendProcess.on('close', resolve)),
      new Promise(resolve => frontendProcess.on('close', resolve))
    ]);
    
  } catch (error) {
    logger.error(`启动失败: ${error.message}`);
    
    // 清理进程
    processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    });
    
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