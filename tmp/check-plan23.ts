import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 23;
  console.log('=== Plan 23 初始数据 ===\n');
  
  const plan = await prisma.userPlan.findUnique({
    where: { id: planId },
  });
  
  if (!plan) {
    console.log('Plan 23 不存在');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`计划名称: ${plan.name}`);
  console.log(`每日时间限制: ${JSON.stringify(plan.limit_hour)}\n`);
  
  const sched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  if (sched.length === 0) {
    console.log('plan 23 无任务数据');
    await prisma.$disconnect();
    return;
  }
  
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
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - priority ${item.priority} task_id ${item.task?.id} group_sort ${item.group_sort} task_group_id ${item.task?.task_group_id}`);
    }
    console.log(`  总计: ${total}分钟`);
    console.log(`  顺序: ${tasks.join(' → ')}\n`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

