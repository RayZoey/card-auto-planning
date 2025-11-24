const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 从环境变量或文件读取数据库连接信息
function getDatabaseConfig() {
  // 尝试从.env文件读取
  const envFile = path.join(__dirname, '../.env');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const match = envContent.match(/DATABASE_URL="mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4]),
        user: match[1],
        password: match[2],
        database: match[5]
      };
    }
  }
  
  // 默认配置（从之前找到的信息）
  return {
    host: '47.109.133.72',
    port: 3306,
    user: 'root',
    password: 'zikanfs',
    database: 'auto_planning'
  };
}

async function executeSQL() {
  const config = getDatabaseConfig();
  console.log(`连接数据库: ${config.host}:${config.port}/${config.database}\n`);
  
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功\n');
    
    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../create_test_template.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 按分号分割SQL语句，但保留SET语句
    const statements = sql
      .split(/;(?![^']*'[^']*')/g) // 分割分号，但忽略字符串中的分号
      .map(s => s.trim())
      .filter(s => {
        // 过滤掉纯注释和空行
        const trimmed = s.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        return trimmed.length > 0;
      });
    
    console.log(`准备执行 ${statements.length} 条SQL语句...\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // 执行每条SQL语句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      
      // 跳过纯注释
      if (statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }
      
      try {
        // 执行SQL
        const [results] = await connection.execute(statement);
        
        // 如果是SELECT查询，显示结果
        if (statement.trim().toUpperCase().startsWith('SELECT')) {
          console.log(`\n📊 查询结果 ${i + 1}:`);
          if (Array.isArray(results) && results.length > 0) {
            console.table(results);
          } else {
            console.log('(无结果)');
          }
        } else {
          // INSERT/UPDATE等操作
          if (results.affectedRows !== undefined) {
            console.log(`✓ [${i + 1}/${statements.length}] 执行成功 (影响 ${results.affectedRows} 行)`);
          } else {
            console.log(`✓ [${i + 1}/${statements.length}] 执行成功`);
          }
          successCount++;
        }
      } catch (error) {
        // 如果是重复键错误，可以忽略
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('Duplicate entry')) {
          console.log(`⚠ [${i + 1}/${statements.length}] 跳过重复项: ${error.message.substring(0, 80)}`);
          skipCount++;
        } else if (error.code === 'ER_TABLE_EXISTS' || error.message.includes('already exists')) {
          console.log(`⚠ [${i + 1}/${statements.length}] 已存在: ${error.message.substring(0, 80)}`);
          skipCount++;
        } else {
          console.error(`✗ [${i + 1}/${statements.length}] 执行失败:`, error.message);
          console.error(`SQL片段: ${statement.substring(0, 150)}...`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n✅ SQL脚本执行完成！`);
    console.log(`   成功: ${successCount} 条`);
    console.log(`   跳过: ${skipCount} 条`);
    console.log(`   失败: ${errorCount} 条`);
    
  } catch (error) {
    console.error('❌ 执行出错:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

executeSQL();

