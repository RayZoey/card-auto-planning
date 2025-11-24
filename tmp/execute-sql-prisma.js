const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function executeSQL() {
  try {
    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../create_test_template.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('开始执行SQL脚本...\n');
    
    // 移除验证查询部分（最后的部分）
    const validationStart = sql.indexOf('-- ============================================');
    const validationStart2 = sql.indexOf('-- 完成！查询验证数据');
    if (validationStart2 > 0) {
      sql = sql.substring(0, validationStart2);
    }
    
    // 将SQL按分号分割，但保留SET语句
    // 使用更智能的分割方式
    const statements = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      
      // 处理字符串
      if ((char === '"' || char === "'" || char === '`') && (i === 0 || sql[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        currentStatement += char;
        continue;
      }
      
      // 如果在字符串中，直接添加字符
      if (inString) {
        currentStatement += char;
        continue;
      }
      
      // 处理分号（语句结束）
      if (char === ';') {
        currentStatement += char;
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('--') && !trimmed.match(/^\/\*/)) {
          statements.push(trimmed);
        }
        currentStatement = '';
        continue;
      }
      
      currentStatement += char;
    }
    
    // 添加最后一个语句
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    console.log(`解析到 ${statements.length} 条SQL语句\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // 执行每条SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // 跳过纯注释
      if (statement.match(/^[\s]*--/) || statement.match(/^[\s]*\/\*/)) {
        continue;
      }
      
      try {
        // 使用Prisma执行
        const result = await prisma.$executeRawUnsafe(statement);
        
        if (typeof result === 'number') {
          console.log(`✓ [${i + 1}/${statements.length}] 执行成功 (影响 ${result} 行)`);
        } else {
          console.log(`✓ [${i + 1}/${statements.length}] 执行成功`);
        }
        successCount++;
      } catch (error) {
        // 如果是重复键错误，可以忽略
        if (error.message.includes('Duplicate entry') || 
            error.message.includes('ER_DUP_ENTRY') ||
            error.message.includes('already exists')) {
          console.log(`⚠ [${i + 1}/${statements.length}] 跳过重复项`);
          skipCount++;
        } else {
          console.error(`✗ [${i + 1}/${statements.length}] 执行失败:`, error.message.substring(0, 100));
          // 只显示SQL的前100个字符
          const sqlPreview = statement.replace(/\s+/g, ' ').substring(0, 100);
          console.error(`   SQL: ${sqlPreview}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n✅ SQL脚本执行完成！`);
    console.log(`   成功: ${successCount} 条`);
    console.log(`   跳过: ${skipCount} 条`);
    console.log(`   失败: ${errorCount} 条`);
    
    // 执行验证查询
    console.log('\n📊 执行验证查询...\n');
    const validationSQL = `
      SELECT 
        pt.id,
        pt.name,
        pt.total_days,
        pt.total_time,
        pt.is_enable
      FROM plan_template pt
      WHERE pt.name = '增加测试模版';
    `;
    
    try {
      const template = await prisma.$queryRawUnsafe(validationSQL);
      console.log('计划模板:');
      console.table(template);
      
      const detailCountSQL = `
        SELECT COUNT(*) as count FROM plan_template_detail WHERE plan_template_id = (SELECT id FROM plan_template WHERE name = '增加测试模版' LIMIT 1);
      `;
      const detailCount = await prisma.$queryRawUnsafe(detailCountSQL);
      console.log('\n模板详情数量:');
      console.table(detailCount);
    } catch (error) {
      console.log('验证查询执行失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 执行出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeSQL();

