#!/usr/bin/env node
/**
 * 构建脚本
 * 构建前端应用，为生产部署做准备
 * 所有配置通过命令行参数传递，禁止使用环境变量
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    outputDir: 'src/frontend/dist',
    clean: true,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--output-dir':
        if (nextArg) {
          config.outputDir = nextArg;
          i++;
        }
        break;
      case '--no-clean':
        config.clean = false;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--help':
        console.log(`
构建脚本使用说明:

参数:
  --output-dir <目录>    构建输出目录 (默认: src/frontend/dist)
  --no-clean            不清理输出目录
  --verbose             显示详细构建信息
  --help                显示此帮助信息

示例:
  node build.js
  node build.js --output-dir ./dist
  node build.js --verbose --no-clean
`);
        process.exit(0);
        break;
    }
  }

  return config;
}

// 清理输出目录
function cleanOutputDir(outputDir) {
  if (fs.existsSync(outputDir)) {
    console.log(`清理输出目录: ${outputDir}`);
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

// 构建前端应用
function buildFrontend(config) {
  return new Promise((resolve, reject) => {
    console.log('开始构建前端应用...');
    
    const buildArgs = ['run', 'build'];
    
    // 设置输出目录
    if (config.outputDir !== 'src/frontend/dist') {
      buildArgs.push('--', '--outDir', config.outputDir);
    }
    
    const buildProcess = spawn('npm', buildArgs, {
      cwd: path.join(__dirname, 'src/frontend'),
      stdio: config.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    if (!config.verbose) {
      buildProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      buildProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
    }

    buildProcess.on('error', (error) => {
      console.error('构建进程启动失败:', error.message);
      reject(error);
    });

    buildProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('前端应用构建成功!');
        console.log(`构建输出目录: ${path.resolve(config.outputDir)}`);
        resolve();
      } else {
        console.error(`前端应用构建失败，退出码: ${code}`);
        if (!config.verbose && errorOutput) {
          console.error('错误信息:');
          console.error(errorOutput);
        }
        reject(new Error(`构建失败，退出码: ${code}`));
      }
    });
  });
}

// 验证构建结果
function validateBuild(outputDir) {
  console.log('验证构建结果...');
  
  const indexPath = path.join(outputDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`构建验证失败: 未找到 ${indexPath}`);
  }
  
  const assetsDir = path.join(outputDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.warn(`警告: 未找到资源目录 ${assetsDir}`);
  }
  
  console.log('构建结果验证通过');
}

// 显示构建统计信息
function showBuildStats(outputDir) {
  console.log('\n构建统计信息:');
  
  try {
    const stats = fs.statSync(outputDir);
    console.log(`输出目录: ${path.resolve(outputDir)}`);
    console.log(`创建时间: ${stats.birthtime.toLocaleString()}`);
    
    // 统计文件数量和大小
    let fileCount = 0;
    let totalSize = 0;
    
    function walkDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else {
          fileCount++;
          totalSize += stat.size;
        }
      }
    }
    
    walkDir(outputDir);
    
    console.log(`文件数量: ${fileCount}`);
    console.log(`总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.warn('无法获取构建统计信息:', error.message);
  }
}

// 主函数
async function main() {
  try {
    const config = parseArgs();
    
    console.log('开始构建应用...');
    console.log(`输出目录: ${config.outputDir}`);
    
    // 清理输出目录
    if (config.clean) {
      cleanOutputDir(config.outputDir);
    }
    
    // 构建前端应用
    await buildFrontend(config);
    
    // 验证构建结果
    validateBuild(config.outputDir);
    
    // 显示构建统计信息
    showBuildStats(config.outputDir);
    
    console.log('\n构建完成! 🎉');
    console.log(`\n使用以下命令启动生产服务器:`);
    console.log(`  npm run start:web`);
    console.log(`  npm run start:web -- --port 8080`);
    
  } catch (error) {
    console.error('构建失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { parseArgs, buildFrontend, validateBuild };