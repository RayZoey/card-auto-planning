import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 24;
  
  console.log('=== 分析期望结果 vs 实际结果 ===\n');
  
  console.log('期望的Day 8: 作文P1 → 单词30min → 做P9 → 作文P2');
  console.log('实际的Day 8: 作文P1 → 单词30min → 做P9\n');
  
  console.log('期望的Day 9: 跳舞1H → 单词30min → 做题P10 → 作文P3');
  console.log('实际的Day 9: 作文P2 → 跳舞1H → 单词30min → 做P10\n');
  
  // 查看Day 8和Day 9的任务详情
  console.log('=== Day 8 实际任务 ===');
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day8Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_id=${task.task_id}`);
  }
  
  console.log('\n=== Day 9 实际任务 ===');
  const day9Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 9 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day9Tasks) {
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_id=${task.task_id}`);
  }
  
  // 分析：如果Day 8需要补全60分钟，应该选择哪个任务？
  console.log('\n=== 分析：Day 8需要补全60分钟 ===');
  console.log('从Day 9及以后找priority最小的任务:');
  
  const allFutureTasks = await prisma.userTaskScheduler.findMany({
    where: { 
      plan_id: planId,
      date_no: { gt: 8 }
    },
    include: { task: true },
    orderBy: [
      { date_no: 'asc' },
      { priority: 'asc' },
      { task_id: 'asc' },
    ],
  });
  
  for (const task of allFutureTasks) {
    if (task.task?.occupation_time === 60) {
      console.log(`  Day ${task.date_no}: ${task.task?.name} - priority=${task.priority}, task_id=${task.task_id}`);
    }
  }
  
  console.log('\n根据当前逻辑，应该选择Day 9的"做P9"（priority=2, task_id最小）');
  console.log('但期望结果是"作文P2"（priority=3）被移到Day 8');
  console.log('\n可能的原因：');
  console.log('1. 期望结果可能有误？');
  console.log('2. 或者有额外的规则（比如任务集任务的优先级更高）？');
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

