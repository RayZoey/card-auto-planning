import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 24;
  
  // 查看Day 8和Day 9的任务详情
  console.log('=== Day 8 任务详情 ===');
  const day8Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 8 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day8Tasks) {
    console.log(`${task.task?.name}: priority=${task.priority}, task_group_id=${task.task?.task_group_id}, group_sort=${task.group_sort}`);
  }
  
  console.log('\n=== Day 9 任务详情 ===');
  const day9Tasks = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId, date_no: 9 },
    include: { task: true },
    orderBy: { day_sort: 'asc' },
  });
  
  for (const task of day9Tasks) {
    console.log(`${task.task?.name}: priority=${task.priority}, task_group_id=${task.task?.task_group_id}, group_sort=${task.group_sort}`);
  }
  
  // 查看"健身1H"的详细信息
  console.log('\n=== 健身1H 任务详情 ===');
  const fitnessTask = await prisma.userTaskScheduler.findFirst({
    where: { 
      plan_id: planId,
      task: { name: '健身1H' }
    },
    include: { task: true },
  });
  
  if (fitnessTask) {
    console.log(`当前在Day ${fitnessTask.date_no}`);
    console.log(`priority=${fitnessTask.priority}, task_group_id=${fitnessTask.task?.task_group_id}, group_sort=${fitnessTask.group_sort}`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

