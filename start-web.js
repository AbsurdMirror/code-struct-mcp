#!/usr/bin/env node
/**
 * 生产模式Web服务器启动脚本
 * 启动后端API服务器并提供静态文件服务
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
    staticDir: path.join(__dirname, 'src/frontend/dist'),
    dataPath: path.join(__dirname, 'data'),
    logFile: null,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--port':
        if (nextArg && !isNaN(parseInt(nextArg))) {
          config.port = parseInt(nextArg);
          i++;
        } else {
          console.error('错误: --port 参数需要一个有效的端口号');
          process.exit(1);
        }
        break;
      case '--static-dir':
        if (nextArg) {
          config.staticDir = path.resolve(nextArg);
          i++;
        } else {
          console.error('错误: --static-dir 参数需要一个目录路径');
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
生产模式Web服务器启动脚本使用说明:

参数:
  --port <端口号>        服务器端口 (默认: 3000)
  --static-dir <目录>    静态文件目录 (默认: src/frontend/dist)
  --data-path <目录>     数据存储目录 (默认: data)
  --log-file <文件>      日志文件路径 (可选)
  --verbose              显示详细日志
  --help                 显示此帮助信息

示例:
  node start-web.js
  node start-web.js --port 8080
  node start-web.js --port 8080 --static-dir ./dist
  node start-web.js --log-file ./logs/server.log
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
  console.log('验证配置...');
  
  // 检查端口范围
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`无效的端口号: ${config.port}`);
  }
  
  // 检查静态文件目录
  if (!fs.existsSync(config.staticDir)) {
    throw new Error(`静态文件目录不存在: ${config.staticDir}`);
  }
  
  const indexPath = path.join(config.staticDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`未找到入口文件: ${indexPath}`);
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
  
  console.log('配置验证通过');
}

// 启动服务器
function startServer(config) {
  return new Promise((resolve, reject) => {
    console.log('启动生产模式Web服务器...');
    console.log(`端口: ${config.port}`);
    console.log(`静态文件目录: ${config.staticDir}`);
    console.log(`数据目录: ${config.dataPath}`);
    if (config.logFile) {
      console.log(`日志文件: ${config.logFile}`);
    }
    
    const serverArgs = [
      path.join(__dirname, 'src/backend/app.ts'),
      '--mode', 'production',
      '--port', config.port.toString(),
      '--data-path', config.dataPath,
      '--static-dir', config.staticDir
    ];
    
    if (config.logFile) {
      serverArgs.push('--log-file', config.logFile);
    }
    
    const serverProcess = spawn('npx', ['tsx', ...serverArgs], {
      stdio: config.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let output = '';
    let errorOutput = '';

    if (!config.verbose) {
      serverProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        // 显示重要的启动信息
        if (text.includes('服务器启动') || text.includes('监听端口')) {
          process.stdout.write(text);
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        // 显示错误信息
        process.stderr.write(text);
      });
    }

    serverProcess.on('error', (error) => {
      console.error('服务器进程启动失败:', error.message);
      reject(error);
    });

    serverProcess.on('exit', (code, signal) => {
      if (code === 0) {
        console.log('服务器正常退出');
        resolve();
      } else if (signal) {
        console.log(`服务器被信号终止: ${signal}`);
        resolve();
      } else {
        console.error(`服务器异常退出，退出码: ${code}`);
        if (!config.verbose && errorOutput) {
          console.error('错误信息:');
          console.error(errorOutput);
        }
        reject(new Error(`服务器异常退出，退出码: ${code}`));
      }
    });

    // 处理进程信号
    process.on('SIGINT', () => {
      console.log('\n收到中断信号，正在关闭服务器...');
      serverProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      console.log('\n收到终止信号，正在关闭服务器...');
      serverProcess.kill('SIGTERM');
    });

    // 显示启动成功信息
    setTimeout(() => {
      console.log('\n🚀 生产模式Web服务器启动成功!');
      console.log(`\n访问地址: http://localhost:${config.port}`);
      console.log('\n按 Ctrl+C 停止服务器');
    }, 2000);
  });
}

// 主函数
async function main() {
  try {
    const config = parseArgs();
    
    console.log('启动生产模式Web服务器...');
    
    // 验证配置
    validateConfig(config);
    
    // 启动服务器
    await startServer(config);
    
  } catch (error) {
    console.error('启动失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { parseArgs, validateConfig, startServer };