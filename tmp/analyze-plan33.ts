import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 33;
  
  console.log('=== Plan 33 当前数据（按day_sort排序）===\n');
  
  const sched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  const grouped = sched.reduce((acc, item) => {
    (acc[item.date_no] = acc[item.date_no] || []).push(item);
    return acc;
  }, {} as Record<number, typeof sched>);
  
  for (const day of Object.keys(grouped).sort((a,b)=>Number(a)-Number(b))) {
    console.log(`Day ${day}:`);
    let total = 0;
    const tasks = [];
    for (const item of grouped[Number(day)]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      tasks.push(item.task?.name);
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - global_sort=${item.global_sort}, group_sort=${item.group_sort}`);
    }
    console.log(`  总计: ${total}分钟`);
    console.log(`  顺序: ${tasks.join(' → ')}\n`);
  }
  
  // 特别检查Day 3
  console.log('\n=== Day 3 详细分析 ===');
  const day3Tasks = grouped[3] || [];
  console.log('Day 3任务列表:');
  for (const task of day3Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - global_sort=${task.global_sort}, group_sort=${task.group_sort}, task_id=${task.task_id}`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

