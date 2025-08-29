#!/usr/bin/env npx tsx
/**
 * 自动化测试脚本
 * 批量执行所有测试用例并生成测试报告
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// 测试结果接口
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  output?: string;
}

// 测试报告接口
interface TestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  results: TestResult[];
  timestamp: string;
}

/**
 * 执行单个测试文件
 */
async function runSingleTest(testFile: string): Promise<TestResult> {
  const startTime = Date.now();
  const testName = path.basename(testFile, '.ts');
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', testFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const output = stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '');
      
      if (code === 0) {
        resolve({
          name: testName,
          status: 'passed',
          duration,
          output
        });
      } else {
        resolve({
          name: testName,
          status: 'failed',
          duration,
          error: `Exit code: ${code}`,
          output
        });
      }
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        name: testName,
        status: 'failed',
        duration,
        error: error.message,
        output: stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '')
      });
    });
  });
}

/**
 * 获取所有测试文件
 */
async function getTestFiles(): Promise<string[]> {
  const testsDir = path.join(process.cwd(), 'tests');
  
  try {
    const files = await fs.readdir(testsDir);
    return files
      .filter(file => file.endsWith('.ts') && file.startsWith('testmod'))
      .map(file => path.join(testsDir, file))
      .sort();
  } catch (error) {
    console.error('❌ 无法读取测试目录:', error);
    return [];
  }
}

/**
 * 生成测试报告
 */
function generateReport(results: TestResult[]): TestReport {
  const passedTests = results.filter(r => r.status === 'passed').length;
  const failedTests = results.filter(r => r.status === 'failed').length;
  const skippedTests = results.filter(r => r.status === 'skipped').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    skippedTests,
    duration: totalDuration,
    results,
    timestamp: new Date().toISOString()
  };
}

/**
 * 打印测试报告
 */
function printReport(report: TestReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 自动化测试报告');
  console.log('='.repeat(80));
  console.log(`📅 执行时间: ${report.timestamp}`);
  console.log(`⏱️  总耗时: ${(report.duration / 1000).toFixed(2)}秒`);
  console.log(`📊 测试统计:`);
  console.log(`   总计: ${report.totalTests}`);
  console.log(`   ✅ 通过: ${report.passedTests}`);
  console.log(`   ❌ 失败: ${report.failedTests}`);
  console.log(`   ⏭️  跳过: ${report.skippedTests}`);
  console.log(`   📈 成功率: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);
  
  console.log('\n📋 详细结果:');
  console.log('-'.repeat(80));
  
  report.results.forEach((result, index) => {
    const statusIcon = result.status === 'passed' ? '✅' : 
                      result.status === 'failed' ? '❌' : '⏭️';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`${index + 1}. ${statusIcon} ${result.name} (${duration}s)`);
    
    if (result.status === 'failed' && result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });
  
  if (report.failedTests > 0) {
    console.log('\n❌ 失败的测试详情:');
    console.log('-'.repeat(80));
    
    report.results
      .filter(r => r.status === 'failed')
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}:`);
        if (result.error) {
          console.log(`   错误: ${result.error}`);
        }
        if (result.output) {
          console.log(`   输出:`);
          console.log(result.output.split('\n').map(line => `   ${line}`).join('\n'));
        }
      });
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * 保存测试报告到文件
 */
async function saveReport(report: TestReport): Promise<void> {
  const reportDir = path.join(process.cwd(), 'test-reports');
  
  try {
    await fs.mkdir(reportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `test-report-${timestamp}.json`);
    
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 测试报告已保存到: ${reportFile}`);
  } catch (error) {
    console.error('❌ 保存测试报告失败:', error);
  }
}

/**
 * 自动修复常见问题
 */
async function autoFixIssues(results: TestResult[]): Promise<void> {
  const failedTests = results.filter(r => r.status === 'failed');
  
  if (failedTests.length === 0) {
    return;
  }
  
  console.log('\n🔧 尝试自动修复发现的问题...');
  
  for (const test of failedTests) {
    if (test.output?.includes('ERR_MODULE_NOT_FOUND')) {
      console.log(`🔍 检测到模块未找到错误: ${test.name}`);
      // 这里可以添加自动修复逻辑
    }
    
    if (test.output?.includes('模块已存在')) {
      console.log(`🔍 检测到模块已存在错误: ${test.name}`);
      // 这里可以添加清理数据的逻辑
    }
    
    if (test.output?.includes('Cannot read properties of undefined')) {
      console.log(`🔍 检测到未定义属性错误: ${test.name}`);
      // 这里可以添加属性检查的逻辑
    }
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🚀 开始执行自动化测试...');
  
  const testFiles = await getTestFiles();
  
  if (testFiles.length === 0) {
    console.log('❌ 未找到任何测试文件');
    process.exit(1);
  }
  
  console.log(`📁 发现 ${testFiles.length} 个测试文件:`);
  testFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. ${path.basename(file)}`);
  });
  
  console.log('\n⏳ 开始执行测试...');
  
  const results: TestResult[] = [];
  
  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    const testName = path.basename(testFile, '.ts');
    
    console.log(`\n[${i + 1}/${testFiles.length}] 🧪 执行测试: ${testName}`);
    
    const result = await runSingleTest(testFile);
    results.push(result);
    
    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${statusIcon} ${testName} (${duration}s)`);
    
    if (result.status === 'failed') {
      console.log(`   错误: ${result.error}`);
    }
  }
  
  // 生成并显示报告
  const report = generateReport(results);
  printReport(report);
  
  // 保存报告
  await saveReport(report);
  
  // 尝试自动修复问题
  await autoFixIssues(results);
  
  // 根据测试结果设置退出码
  if (report.failedTests > 0) {
    console.log('\n❌ 存在失败的测试用例');
    process.exit(1);
  } else {
    console.log('\n🎉 所有测试用例均通过！');
    process.exit(0);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

// 执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

export { main, runSingleTest, getTestFiles, generateReport };