import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 24;
  
  console.log('=== 追踪Day 8的补全过程 ===\n');
  
  // 查看Day 7的任务
  console.log('Day 7 任务（应该包含从Day 8移过来的任务）:');
  const day7Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 7 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  let day7Total = 0;
  for (const task of day7Tasks) {
    day7Total += task.task?.occupation_time || 0;
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}`);
  }
  console.log(`Day 7 总计: ${day7Total}分钟（限制390分钟）\n`);
  
  // 查看Day 8的任务
  console.log('Day 8 任务:');
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  let day8Total = 0;
  for (const task of day8Tasks) {
    day8Total += task.task?.occupation_time || 0;
    console.log(`  ${task.day_sort}. ${task.task?.name} (${task.task?.occupation_time}min) - priority=${task.priority}, task_group_id=${task.task?.task_group_id}`);
  }
  console.log(`Day 8 总计: ${day8Total}分钟（限制210分钟）`);
  console.log(`Day 8 缺少: ${210 - day8Total}分钟\n`);
  
  // 分析：Day 8应该有哪些任务
  console.log('=== 分析 ===');
  console.log('Day 8原本应该有：作文P1(60) + 健身1H(60) + 做P8(60) + 单词30min(30) = 210分钟');
  console.log('Day 8实际有：作文P1(60) + 单词30min(30) + 做P9(60) = 150分钟');
  console.log('被移走：健身1H(60) + 做P8(60) = 120分钟');
  console.log('只补全了：做P9(60) = 60分钟');
  console.log('还缺少：120 - 60 = 60分钟\n');
  
  console.log('问题：当"健身1H"被移走后，Day 8需要补全60分钟，补全了"做P9"');
  console.log('然后"做P8"又被移走，Day 8又需要补全60分钟，但这次没有补全！');
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

