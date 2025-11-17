import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 28;
  console.log('=== Plan 28 删除day1的看P1任务测试 ===\n');
  
  const sched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  // 查找day1的"看P1"任务
  const day1P1Task = sched.find(s => s.date_no === 1 && s.task?.name?.includes('看P1'));
  if (!day1P1Task) {
    console.log('Day1的"看P1"任务不存在或已被删除');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`找到Day1的"看P1"任务: task_id=${day1P1Task.task_id}\n`);
  console.log('执行删除操作 (needAutoPlan=true, needAutoFill=true)...\n');
  
  const service = new UserTaskService(prisma, {} as any, {} as any);
  const userId = day1P1Task.task?.user_id || 1;
  await service.delete(userId, day1P1Task.task_id, true, true);
  
  console.log('=== Plan 28 删除后结果 ===\n');
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
    let total = 0;
    const tasks = [];
    for (const item of grouped2[Number(day)]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      tasks.push(item.task?.name);
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min)`);
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

