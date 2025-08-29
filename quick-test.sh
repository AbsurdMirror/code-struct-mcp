#!/bin/bash

# 快速测试脚本 - 批量执行所有测试用例
# 使用方法: chmod +x quick-test.sh && ./quick-test.sh

echo "🚀 开始快速测试所有模块..."
echo "======================================"

# 测试计数器
total_tests=0
passed_tests=0
failed_tests=0

# 测试文件列表
test_files=(
    "tests/testmod001-comprehensive.ts"
    "tests/testmod001-data-storage-init.ts"
    "tests/testmod001-load-modules.ts"
    "tests/testmod001-save-modules.ts"
    "tests/testmod001-validate-data.ts"
    "tests/testmod002-add-module.ts"
    "tests/testmod002-delete-module.ts"
    "tests/testmod002-find-modules.ts"
    "tests/testmod002-get-types.ts"
    "tests/testmod002-update-module.ts"
    "tests/testmod004-call-tool.ts"
    "tests/testmod004-list-tools.ts"
    "tests/testmod004-parse-params.ts"
    "tests/testmod005-human-interface.ts"
)

# 执行每个测试文件
for test_file in "${test_files[@]}"; do
    if [ -f "$test_file" ]; then
        echo -n "🧪 测试 $(basename "$test_file" .ts)... "
        
        # 执行测试并捕获输出
        if npx tsx "$test_file" > /dev/null 2>&1; then
            echo "✅ 通过"
            ((passed_tests++))
        else
            echo "❌ 失败"
            ((failed_tests++))
        fi
        
        ((total_tests++))
    else
        echo "⚠️  文件不存在: $test_file"
    fi
done

echo "======================================"
echo "📊 测试结果汇总:"
echo "   总计: $total_tests"
echo "   ✅ 通过: $passed_tests"
echo "   ❌ 失败: $failed_tests"
echo "   📈 成功率: $(( passed_tests * 100 / total_tests ))%"

if [ $failed_tests -eq 0 ]; then
    echo "🎉 所有测试均通过！"
    exit 0
else
    echo "❌ 存在失败的测试用例"
    exit 1
fi