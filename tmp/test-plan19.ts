import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 19;
  console.log('=== Plan 19 初始数据 ===');
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
    console.log(`\nDay ${day}:`);
    let total = 0;
    for (const item of grouped[day]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - priority ${item.priority} task_id ${item.task?.id}`);
    }
    console.log(`  总计: ${total}分钟`);
  }
  
  const day1Task = sched.find(s => s.date_no === 1 && s.day_sort === 2);
  if (!day1Task) {
    console.log('\n未找到Day1的第二个任务');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n删除Day1的第二个任务: ${day1Task.task?.name} (task_id: ${day1Task.task_id})`);
  const service = new UserTaskService(prisma, {} as any, {} as any);
  await service.delete(38, day1Task.task_id, true, true);
  
  console.log('\n=== Plan 19 删除后数据 ===');
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
    console.log(`\nDay ${day}:`);
    let total = 0;
    for (const item of grouped2[day]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - priority ${item.priority} task_id ${item.task?.id}`);
    }
    console.log(`  总计: ${total}分钟`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

