import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 24;
  
  console.log('=== 分析Day 8补全逻辑 ===\n');
  
  // 查看Day 7的任务（健身1H应该在Day 7）
  console.log('Day 7 任务:');
  const day7Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 7 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day7Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}`);
  }
  
  // 查看Day 8的任务
  console.log('\nDay 8 任务:');
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day8Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}`);
  }
  
  // 查看Day 9的任务
  console.log('\nDay 9 任务:');
  const day9Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 9 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day9Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}, task_id=${task.task_id}`);
  }
  
  // 模拟查找逻辑：从Day 9找priority最小的任务
  console.log('\n=== 模拟查找逻辑 ===');
  console.log('从Day 9找priority最小的任务（priority越小优先级越高）:');
  const sorted = day9Tasks
    .filter(t => t.task?.occupation_time > 0)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.task?.id || a.task_id) - (b.task?.id || b.task_id);
    });
  
  for (const task of sorted) {
    console.log(`  ${task.task?.name}: priority=${task.priority}, task_id=${task.task_id}`);
  }
  
  console.log(`\n应该选择: ${sorted[0]?.task?.name}`);
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

