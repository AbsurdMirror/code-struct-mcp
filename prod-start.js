#!/usr/bin/env node
/**
 * 生产模式启动脚本
 * 启动构建后的应用，提供API服务和静态文件服务
 * 所有配置通过命令行参数传递，禁止使用环境变量
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    port: 3000,
    logFile: null,
    staticDir: path.join(__dirname, 'src/frontend/dist')
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--port':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.port = parseInt(nextArg);
          i++;
        }
        break;
      case '--log-file':
        if (nextArg) {
          config.logFile = nextArg;
          i++;
        }
        break;
      case '--static-dir':
        if (nextArg) {
          config.staticDir = path.resolve(nextArg);
          i++;
        }
        break;
      case '--help':
        console.log(`
生产模式启动脚本使用说明:

参数:
  --port <端口号>        服务器端口 (默认: 3000)
  --log-file <文件路径>  日志文件路径 (可选)
  --static-dir <目录>    静态文件目录 (默认: src/frontend/dist)
  --help                显示此帮助信息

示例:
  node prod-start.js --port 8080
  node prod-start.js --port 3000 --log-file ./logs/server.log
  node prod-start.js --port 80 --static-dir ./build
`);
        process.exit(0);
        break;
    }
  }

  return config;
}

// 启动生产服务器
function startProductionServer(config) {
  console.log('启动生产模式服务器...');
  console.log(`配置: 端口=${config.port}, 静态目录=${config.staticDir}`);
  
  // 检查静态文件目录是否存在
  if (!fs.existsSync(config.staticDir)) {
    console.error(`错误: 静态文件目录不存在: ${config.staticDir}`);
    console.error('请先运行构建命令: npm run build');
    process.exit(1);
  }

  // 构建启动参数
  const startArgs = [
    path.join(__dirname, 'src/backend/app.ts'),
    '--mode', 'production',
    '--port', config.port.toString(),
    '--static-dir', config.staticDir
  ];

  if (config.logFile) {
    startArgs.push('--log-file', config.logFile);
  }

  // 使用ts-node启动后端服务器
  const serverProcess = spawn('npx', ['ts-node', ...startArgs], {
    stdio: config.logFile ? ['ignore', 'ignore', 'ignore'] : 'inherit',
    cwd: __dirname
  });

  // 如果指定了日志文件，将输出重定向到文件
  if (config.logFile) {
    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logStream = fs.createWriteStream(config.logFile, { flags: 'a' });
    serverProcess.stdout?.pipe(logStream);
    serverProcess.stderr?.pipe(logStream);
    
    console.log(`服务器日志输出到: ${config.logFile}`);
  }

  serverProcess.on('error', (error) => {
    console.error('启动服务器失败:', error.message);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`服务器进程退出，退出码: ${code}`);
      process.exit(code || 1);
    }
  });

  // 处理进程信号
  process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    serverProcess.kill('SIGTERM');
  });

  console.log(`生产服务器启动成功!`);
  console.log(`访问地址: http://localhost:${config.port}`);
  console.log(`API地址: http://localhost:${config.port}/api`);
  console.log('按 Ctrl+C 停止服务器');
}

// 主函数
function main() {
  try {
    const config = parseArgs();
    startProductionServer(config);
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { parseArgs, startProductionServer };