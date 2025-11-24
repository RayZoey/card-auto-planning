const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function executeSQL() {
  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../create_test_template.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 移除注释和空行，分割成独立的SQL语句
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))
      .filter(s => !s.match(/^[\s\n]*$/));
    
    console.log(`准备执行 ${statements.length} 条SQL语句...\n`);
    
    // 执行每条SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // 跳过SET语句（Prisma不支持）
      if (statement.startsWith('SET @')) {
        console.log(`跳过变量设置: ${statement.substring(0, 50)}...`);
        continue;
      }
      
      // 跳过SELECT查询（验证查询）
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log(`\n执行验证查询 ${i + 1}:`);
        try {
          const result = await prisma.$queryRawUnsafe(statement);
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.log(`查询执行失败: ${error.message}`);
        }
        continue;
      }
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✓ 执行成功 ${i + 1}/${statements.length}`);
      } catch (error) {
        // 如果是重复键错误，可以忽略
        if (error.message.includes('Duplicate entry') || error.message.includes('already exists')) {
          console.log(`⚠ 跳过重复项 ${i + 1}/${statements.length}: ${error.message.substring(0, 100)}`);
        } else {
          console.error(`✗ 执行失败 ${i + 1}/${statements.length}:`, error.message);
          console.error(`SQL: ${statement.substring(0, 200)}...`);
        }
      }
    }
    
    console.log('\n✅ SQL脚本执行完成！');
    
  } catch (error) {
    console.error('❌ 执行出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeSQL();

