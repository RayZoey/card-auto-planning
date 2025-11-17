const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function runTest() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'mysql://root:zikanfs@47.109.133.72:3306/auto_planning?&connection_limit=40'
      }
    }
  });

  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    const planId = 19;
    console.log('\n=== Plan 19 初始数据 ===\n');
    
    const sched = await prisma.userTaskScheduler.findMany({
      where: { plan_id: planId },
      include: { task: true },
      orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
    });
    
    if (sched.length === 0) {
      console.log('plan 19 无任务数据');
      await prisma.$disconnect();
      return;
    }
    
    const grouped = sched.reduce((acc, item) => {
      (acc[item.date_no] = acc[item.date_no] || []).push(item);
      return acc;
    }, {});
    
    for (const day of Object.keys(grouped).sort((a,b)=>Number(a)-Number(b))) {
      console.log(`Day ${day}:`);
      let total = 0;
      const tasks = [];
      for (const item of grouped[day]) {
        const dur = item.task?.occupation_time || 0;
        total += dur;
        tasks.push(item.task?.name);
        console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min)`);
      }
      console.log(`  总计: ${total}分钟`);
      console.log(`  顺序: ${tasks.join(' → ')}\n`);
    }
    
    const day1Task = sched.find(s => s.date_no === 1 && s.day_sort === 2);
    if (!day1Task) {
      console.log('\n未找到Day1的第二个任务');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`\n准备删除Day1的第二个任务: ${day1Task.task?.name} (task_id: ${day1Task.task_id})\n`);
    
    await prisma.$disconnect();
    
    // 使用 TypeScript 脚本执行删除
    console.log('执行删除操作...\n');
    execSync(
      `DATABASE_URL="mysql://root:zikanfs@47.109.133.72:3306/auto_planning?&connection_limit=40" npx ts-node -T -r tsconfig-paths/register -e "import { PrismaService } from './src/common/prisma.service'; import { UserTaskService } from './src/plan/user/task/task.service'; (async () => { const prisma = new PrismaService(); await prisma.\$connect(); const service = new UserTaskService(prisma, {}, {}); await service.delete(38, ${day1Task.task_id}, true, true); await prisma.\$disconnect(); })();"`,
      { stdio: 'inherit', cwd: __dirname + '/..' }
    );
    
    // 重新连接查看结果
    await prisma.$connect();
    console.log('\n=== Plan 19 删除后数据 ===\n');
    
    const sched2 = await prisma.userTaskScheduler.findMany({
      where: { plan_id: planId },
      include: { task: true },
      orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
    });
    
    const grouped2 = sched2.reduce((acc, item) => {
      (acc[item.date_no] = acc[item.date_no] || []).push(item);
      return acc;
    }, {});
    
    for (const day of Object.keys(grouped2).sort((a,b)=>Number(a)-Number(b))) {
      console.log(`Day ${day}:`);
      let total = 0;
      const tasks = [];
      for (const item of grouped2[day]) {
        const dur = item.task?.occupation_time || 0;
        total += dur;
        tasks.push(item.task?.name);
        console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min)`);
      }
      console.log(`  总计: ${total}分钟`);
      console.log(`  顺序: ${tasks.join(' → ')}\n`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

runTest();

