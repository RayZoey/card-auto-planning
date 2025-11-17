import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 26;
  
  console.log('=== 调试Day 8补全问题 ===\n');
  
  // 查看Day 8的任务
  console.log('Day 8 当前任务:');
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  let day8Total = 0;
  for (const task of day8Tasks) {
    day8Total += task.task?.occupation_time || 0;
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}, group_sort=${task.group_sort}`);
  }
  console.log(`Day 8 总计: ${day8Total}分钟（限制210分钟）`);
  console.log(`Day 8 缺少: ${210 - day8Total}分钟\n`);
  
  // 查看Day 9的任务
  console.log('Day 9 当前任务:');
  const day9Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 9 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  let day9Total = 0;
  for (const task of day9Tasks) {
    day9Total += task.task?.occupation_time || 0;
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}, group_sort=${task.group_sort}, task_id=${task.task_id}`);
  }
  console.log(`Day 9 总计: ${day9Total}分钟（限制210分钟）\n`);
  
  // 模拟查找：从Day 9找priority最小的任务（60分钟）
  console.log('=== 模拟查找逻辑 ===');
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
  } else {
    console.log('\n没有找到合适的候选任务！');
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

