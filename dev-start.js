#!/usr/bin/env node
/**
 * 开发模式启动脚本
 * 并发启动前端和后端开发服务器
 * 所有配置通过命令行参数传递，禁止使用环境变量
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    frontendPort: 5173,
    backendPort: 3000,
    dataPath: path.join(__dirname, 'data'),
    logFile: null,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--frontend-port':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.frontendPort = parseInt(nextArg);
          i++;
        } else {
          console.error('错误: --frontend-port 参数需要一个有效的端口号');
          process.exit(1);
        }
        break;
      case '--backend-port':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.backendPort = parseInt(nextArg);
          i++;
        } else {
          console.error('错误: --backend-port 参数需要一个有效的端口号');
          process.exit(1);
        }
        break;
      case '--data-path':
        if (nextArg) {
          config.dataPath = path.resolve(nextArg);
          i++;
        } else {
          console.error('错误: --data-path 参数需要一个目录路径');
          process.exit(1);
        }
        break;
      case '--log-file':
        if (nextArg) {
          config.logFile = path.resolve(nextArg);
          i++;
        } else {
          console.error('错误: --log-file 参数需要一个文件路径');
          process.exit(1);
        }
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        console.log(`
开发模式启动脚本使用说明:

参数:
  --frontend-port <端口号>  前端开发服务器端口 (默认: 5173)
  --backend-port <端口号>   后端API服务器端口 (默认: 3000)
  --data-path <目录>        数据存储目录 (默认: data)
  --log-file <文件>         日志文件路径 (可选)
  --verbose                 显示详细日志
  --help                    显示此帮助信息

示例:
  node dev-start.js
  node dev-start.js --frontend-port 3000 --backend-port 8080
  node dev-start.js --log-file ./logs/dev.log
`);
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`错误: 未知参数 ${arg}`);
          console.error('使用 --help 查看可用参数');
          process.exit(1);
        }
        break;
    }
  }

  return config;
}

// 验证配置
function validateConfig(config) {
  // 检查端口范围
  if (config.frontendPort < 1 || config.frontendPort > 65535) {
    throw new Error(`无效的前端端口号: ${config.frontendPort}`);
  }
  
  if (config.backendPort < 1 || config.backendPort > 65535) {
    throw new Error(`无效的后端端口号: ${config.backendPort}`);
  }
  
  // 检查端口冲突
  if (config.frontendPort === config.backendPort) {
    throw new Error('前端和后端端口不能相同');
  }
  
  // 检查数据目录
  if (!fs.existsSync(config.dataPath)) {
    console.log(`创建数据目录: ${config.dataPath}`);
    fs.mkdirSync(config.dataPath, { recursive: true });
  }
  
  // 检查日志文件目录
  if (config.logFile) {
    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      console.log(`创建日志目录: ${logDir}`);
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
}

// 启动后端服务器
function startBackend(config) {
  return new Promise((resolve, reject) => {
    console.log(`启动后端API服务器 (端口: ${config.backendPort})...`);
    
    const backendArgs = [
      path.join(__dirname, 'src/backend/app.ts'),
      '--mode', 'api',
      '--port', config.backendPort.toString(),
      '--data-path', config.dataPath
    ];
    
    if (config.logFile) {
      backendArgs.push('--log-file', config.logFile);
    }
    
    const backendProcess = spawn('npx', ['tsx', ...backendArgs], {
      stdio: config.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let output = '';
    let errorOutput = '';

    if (!config.verbose) {
      backendProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        // 显示重要的启动信息
        if (text.includes('API服务器启动成功') || text.includes('监听端口')) {
          console.log('[后端]', text.trim());
        }
      });

      backendProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error('[后端错误]', text.trim());
      });
    }

    backendProcess.on('error', (error) => {
      console.error('后端服务器启动失败:', error.message);
      reject(error);
    });

    backendProcess.on('exit', (code, signal) => {
      if (signal) {
        console.log(`后端服务器被信号终止: ${signal}`);
      } else {
        console.log(`后端服务器退出，退出码: ${code}`);
      }
    });

    // 等待后端启动
    setTimeout(() => {
      console.log('后端服务器启动完成');
      resolve(backendProcess);
    }, 2000);
  });
}

// 启动前端服务器
function startFrontend(config) {
  return new Promise((resolve, reject) => {
    console.log(`启动前端开发服务器 (端口: ${config.frontendPort})...`);
    
    const frontendArgs = ['run', 'dev', '--', '--port', config.frontendPort.toString(), '--host'];
    
    const frontendProcess = spawn('npm', frontendArgs, {
      cwd: path.join(__dirname, 'src/frontend'),
      stdio: config.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    if (!config.verbose) {
      frontendProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        // 显示重要的启动信息
        if (text.includes('Local:') || text.includes('ready in')) {
          console.log('[前端]', text.trim());
        }
      });

      frontendProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (!text.includes('ExperimentalWarning')) {
          console.error('[前端错误]', text.trim());
        }
      });
    }

    frontendProcess.on('error', (error) => {
      console.error('前端服务器启动失败:', error.message);
      reject(error);
    });

    frontendProcess.on('exit', (code, signal) => {
      if (signal) {
        console.log(`前端服务器被信号终止: ${signal}`);
      } else {
        console.log(`前端服务器退出，退出码: ${code}`);
      }
    });

    // 等待前端启动
    setTimeout(() => {
      console.log('前端服务器启动完成');
      resolve(frontendProcess);
    }, 3000);
  });
}

// 主函数
async function main() {
  try {
    const config = parseArgs();
    
    console.log('启动开发模式服务器...');
    console.log(`前端端口: ${config.frontendPort}`);
    console.log(`后端端口: ${config.backendPort}`);
    console.log(`数据目录: ${config.dataPath}`);
    if (config.logFile) {
      console.log(`日志文件: ${config.logFile}`);
    }
    
    // 验证配置
    validateConfig(config);
    
    // 启动后端服务器
    const backendProcess = await startBackend(config);
    
    // 启动前端服务器
    const frontendProcess = await startFrontend(config);
    
    console.log('\n🚀 开发服务器启动成功!');
    console.log(`\n前端访问地址: http://localhost:${config.frontendPort}`);
    console.log(`后端API地址: http://localhost:${config.backendPort}`);
    console.log('\n按 Ctrl+C 停止所有服务器');
    
    // 处理进程信号
    process.on('SIGINT', () => {
      console.log('\n收到中断信号，正在关闭所有服务器...');
      backendProcess.kill('SIGINT');
      frontendProcess.kill('SIGINT');
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

    process.on('SIGTERM', () => {
      console.log('\n收到终止信号，正在关闭所有服务器...');
      backendProcess.kill('SIGTERM');
      frontendProcess.kill('SIGTERM');
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
    
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { parseArgs, validateConfig, startBackend, startFrontend };