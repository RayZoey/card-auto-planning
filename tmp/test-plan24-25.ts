import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';

async function testPlan(planId: number) {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== Plan ${planId} 初始数据 ===`);
  console.log('='.repeat(60) + '\n');
  
  const plan = await prisma.userPlan.findUnique({
    where: { id: planId },
  });
  
  if (!plan) {
    console.log(`Plan ${planId} 不存在`);
    await prisma.$disconnect();
    return;
  }
  
  console.log(`计划名称: ${plan.name}`);
  console.log(`每日时间限制: ${JSON.stringify(plan.limit_hour)}\n`);
  
  const sched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  if (sched.length === 0) {
    console.log(`plan ${planId} 无任务数据`);
    await prisma.$disconnect();
    return;
  }
  
  const grouped = sched.reduce((acc, item) => {
    (acc[item.date_no] = acc[item.date_no] || []).push(item);
    return acc;
  }, {} as Record<number, typeof sched>);
  
  for (const day of Object.keys(grouped).sort((a,b)=>Number(a)-Number(b))) {
    console.log(`Day ${day}:`);
    let total = 0;
    const tasks = [];
    for (const item of grouped[Number(day)]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      tasks.push(`${item.task?.name}(${dur}min)`);
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - priority ${item.priority} task_id ${item.task?.id} group_sort ${item.group_sort} task_group_id ${item.task?.task_group_id}`);
    }
    console.log(`  总计: ${total}分钟`);
    console.log(`  顺序: ${tasks.join(' → ')}\n`);
  }
  
  // 查找day1的"看P1"任务
  const day1P1Task = sched.find(s => s.date_no === 1 && s.task?.name?.includes('看P1'));
  if (!day1P1Task) {
    console.log('\n未找到Day1的"看P1"任务');
    console.log('Day1的所有任务:');
    const day1Tasks = sched.filter(s => s.date_no === 1);
    day1Tasks.forEach(t => {
      console.log(`  - ${t.task?.name} (task_id: ${t.task_id})`);
    });
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`找到Day1的"看P1"任务:`);
  console.log(`  任务名称: ${day1P1Task.task?.name}`);
  console.log(`  任务ID: ${day1P1Task.task_id}`);
  console.log(`  占用时间: ${day1P1Task.task?.occupation_time}分钟`);
  console.log(`  day_sort: ${day1P1Task.day_sort}`);
  console.log(`  group_sort: ${day1P1Task.group_sort}`);
  console.log(`  priority: ${day1P1Task.priority}`);
  console.log(`  task_group_id: ${day1P1Task.task?.task_group_id}`);
  console.log('='.repeat(60));
  
  console.log(`\n执行删除操作 (needAutoPlan=true, needAutoFill=true)...\n`);
  
  const service = new UserTaskService(prisma, {} as any, {} as any);
  const userId = day1P1Task.task?.user_id || 1;
  await service.delete(userId, day1P1Task.task_id, true, true);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`=== Plan ${planId} 删除后数据 ===`);
  console.log('='.repeat(60) + '\n');
  
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
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) - priority ${item.priority} task_id ${item.task?.id} group_sort ${item.group_sort} global_sort ${item.global_sort}`);
    }
    console.log(`  总计: ${total}分钟`);
    console.log(`  顺序: ${tasks.join(' → ')}\n`);
  }
  
  await prisma.$disconnect();
}

async function main() {
  await testPlan(24);
  await testPlan(25);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

