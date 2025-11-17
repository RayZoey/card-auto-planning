import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 23;
  console.log('=== Plan 23 初始数据 ===\n');
  
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
    const tasks = [];
    for (const item of grouped[Number(day)]) {
      tasks.push(item.task?.name);
    }
    console.log(`  ${tasks.join(' → ')}\n`);
  }
  
  // 查找day1的"看P1"任务
  const day1P1Task = sched.find(s => s.date_no === 1 && s.task?.name?.includes('看P1'));
  if (!day1P1Task) {
    console.log('\n未找到Day1的"看P1"任务');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n删除Day1的"看P1"任务 (task_id: ${day1P1Task.task_id})...\n`);
  
  const service = new UserTaskService(prisma, {} as any, {} as any);
  const userId = day1P1Task.task?.user_id || 1;
  await service.delete(userId, day1P1Task.task_id, true, true);
  
  console.log('=== Plan 23 删除后数据 ===\n');
  const sched2 = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  const grouped2 = sched2.reduce((acc, item) => {
    (acc[item.date_no] = acc[item.date_no] || []).push(item);
    return acc;
  }, {} as Record<number, typeof sched2>);
  
  for (const day of Object.keys(grouped2).sort((a,b)=>Number(a)-Number(b))) {
    console.log(`Day ${day}:`);
    const tasks = [];
    for (const item of grouped2[Number(day)]) {
      tasks.push(item.task?.name);
    }
    console.log(`  ${tasks.join(' → ')}\n`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

