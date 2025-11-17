const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const planId = 19;
    console.log('=== Plan 19 初始数据 ===\n');
    
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
        tasks.push(`${item.task?.name} (${dur}min)`);
        console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - priority ${item.priority} task_id ${item.task?.id}`);
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

main();

