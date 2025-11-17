import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 29;
  
  // 查看Day 8和Day 9的任务
  console.log('=== Day 8 任务 ===');
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day8Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_id=${task.task_id}`);
  }
  
  console.log('\n=== Day 9 任务 ===');
  const day9Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 9 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day9Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_id=${task.task_id}, task_group_id=${task.task?.task_group_id}`);
  }
  
  // 模拟查找：从Day 9找priority最小的60分钟任务
  console.log('\n=== 模拟查找逻辑 ===');
  console.log('从Day 9找priority最小的60分钟任务:');
  const candidates = day9Tasks
    .filter(t => (t.task?.occupation_time || 0) === 60)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.task?.id || a.task_id) - (b.task?.id || b.task_id);
    });
  
  for (const task of candidates) {
    console.log(`  ${task.task?.name}: priority=${task.priority}, task_id=${task.task_id}`);
  }
  
  if (candidates.length > 0) {
    console.log(`\n应该选择: ${candidates[0].task?.name}`);
    console.log(`但期望选择: 作文P2`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

