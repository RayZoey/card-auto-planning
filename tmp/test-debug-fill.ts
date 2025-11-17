import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 26;
  
  // 先重置plan 26的数据，重新测试
  console.log('测试Plan 26删除day1的看P1任务...\n');
  
  const sched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  // 查找day1的"看P1"任务
  const day1P1Task = sched.find(s => s.date_no === 1 && s.task?.name?.includes('看P1'));
  if (!day1P1Task) {
    console.log('Day1的"看P1"任务已被删除，无法测试');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`找到Day1的"看P1"任务: task_id=${day1P1Task.task_id}\n`);
  
  const service = new UserTaskService(prisma, {} as any, {} as any);
  const userId = day1P1Task.task?.user_id || 1;
  
  // 执行删除
  await service.delete(userId, day1P1Task.task_id, true, true);
  
  // 检查Day 8的结果
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  const day8Total = day8Tasks.reduce((sum, item) => sum + (item.task?.occupation_time || 0), 0);
  
  console.log(`Day 8 结果:`);
  for (const task of day8Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min)`);
  }
  console.log(`Day 8 总计: ${day8Total}分钟（限制210分钟）`);
  console.log(`Day 8 缺少: ${210 - day8Total}分钟\n`);
  
  if (day8Total < 210) {
    console.log('问题：Day 8缺少任务，递归补全可能没有正确执行！');
  } else {
    console.log('Day 8已正确补全！');
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

