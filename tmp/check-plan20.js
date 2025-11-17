const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://root:zikanfs@47.109.133.72:3306/auto_planning?&connection_limit=40'
    }
  }
});

async function main() {
  try {
    await prisma.$connect();
    console.log('Connected to database\n');
    
    const planId = 20;
    console.log('=== Plan 20 初始数据 ===\n');
    
    const sched = await prisma.userTaskScheduler.findMany({
      where: { plan_id: planId },
      include: { task: true },
      orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
    });
    
    if (sched.length === 0) {
      console.log('plan 20 无任务数据');
      await prisma.$disconnect();
      return;
    }
    
    const grouped = sched.reduce((acc, item) => {
      (acc[item.date_no] = acc[item.date_no] || []).push(item);
      return acc;
    }, {});
    
    for (const day of Object.keys(grouped).sort((a,b)=>Number(a)-Number(b))) {
      console.log(`Day ${day}:`);
      const tasks = [];
      for (const item of grouped[day]) {
        tasks.push(`${item.task?.name} (${item.task?.occupation_time}min)`);
      }
      console.log(`  ${tasks.join(' → ')}\n`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

main();

