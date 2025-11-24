import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';
import { BaseService } from '../src/base/base.service';
import { QueryConditionParser } from '../src/common/query-condition-parser';
import { ConfigService } from '@nestjs/config';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  const planId = 51;
  
  console.log('=== Plan 51 插入零散任务测试 ===\n');
  
  // 查看插入前的状态
  console.log('=== 插入前的状态 ===\n');
  const beforeSched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  const beforeGrouped = beforeSched.reduce((acc, item) => {
    (acc[item.date_no] = acc[item.date_no] || []).push(item);
    return acc;
  }, {} as Record<number, typeof beforeSched>);
  
  for (const day of Object.keys(beforeGrouped).sort((a,b)=>Number(a)-Number(b))) {
    console.log(`Day ${day}:`);
    let total = 0;
    const tasks = [];
    for (const item of beforeGrouped[Number(day)]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      tasks.push(item.task?.name);
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) [priority=${item.priority}]`);
    }
    console.log(`  总计: ${total}分钟`);
    console.log(`  顺序: ${tasks.join(' → ')}\n`);
  }
  
  // 获取计划信息
  const plan = await prisma.userPlan.findUnique({
    where: { id: planId },
  });
  
  if (!plan) {
    console.error('计划不存在');
    await prisma.$disconnect();
    return;
  }
  
  const userId = plan.user_id;
  console.log(`计划用户ID: ${userId}`);
  console.log(`计划总天数: ${plan.total_days}`);
  console.log(`计划时间限制: ${JSON.stringify(plan.limit_hour)}\n`);
  
  // 准备插入数据（使用用户提供的参数）
  const createDto = {
    name: "零散任务",
    plan_id: planId,
    background: "#DAA520",
    remark: "备注",
    timing_type: "POMODORO" as const,
    occupation_time: 60,
    need_auto_plan: true,
    need_auto_fill: true,
    UserTaskScheduler: {
      priority: 9999,
      global_sort: 2,
      day_sort: 2,
      can_divisible: true,
      date_no: 1
    },
    can_divisible: true,
    status: "WAITING" as const,
  };
  
  console.log('=== 执行插入操作 ===\n');
  console.log('插入参数:', JSON.stringify(createDto, null, 2));
  console.log('\n');
  
  // 创建服务实例
  const configService = new ConfigService();
  const baseService = new BaseService(prisma, configService);
  const queryConditionParser = new QueryConditionParser();
  const service = new UserTaskService(prisma, baseService, queryConditionParser);
  
  // 执行插入
  try {
    await service.create(userId, createDto as any, true, true);
    console.log('插入成功！\n');
  } catch (error) {
    console.error('插入失败:', error);
    await prisma.$disconnect();
    return;
  }
  
  // 查看插入后的状态
  console.log('=== 插入后的状态 ===\n');
  const afterSched = await prisma.userTaskScheduler.findMany({
    where: { plan_id: planId },
    include: { task: true },
    orderBy: [{ date_no: 'asc' }, { day_sort: 'asc' }],
  });
  
  const afterGrouped = afterSched.reduce((acc, item) => {
    (acc[item.date_no] = acc[item.date_no] || []).push(item);
    return acc;
  }, {} as Record<number, typeof afterSched>);
  
  for (const day of Object.keys(afterGrouped).sort((a,b)=>Number(a)-Number(b))) {
    console.log(`Day ${day}:`);
    let total = 0;
    const tasks = [];
    for (const item of afterGrouped[Number(day)]) {
      const dur = item.task?.occupation_time || 0;
      total += dur;
      tasks.push(item.task?.name);
      console.log(`  ${item.day_sort}. ${item.task?.name} (${dur}min) [priority=${item.priority}, task_id=${item.task_id}]`);
    }
    console.log(`  总计: ${total}分钟`);
    console.log(`  顺序: ${tasks.join(' → ')}\n`);
  }
  
  // 验证期望结果
  console.log('=== 验证期望结果 ===\n');
  console.log('期望结果:');
  console.log('day1: 听课1、新增零散任务（30/60）、看直播1、看书1、做题1');
  console.log('day2: 新增零散任务（30/60）【新增的任务拆开的】、听课2、看直播2、看书2、做题2');
  console.log('day3: 单词30min【原来day1的单词30min】、听课3、看直播3、看书3、做题3');
  console.log('day4: 单词30min【原来day2的单词30min】、听课4、看直播4、看书4、做题4');
  console.log('day9: 单词、单词、作文2、看直播9、做题9、跳舞（30/60）');
  console.log('day10: 跳舞（30/60）、单词30、作文3、看直播10、玩耍、做题10、单词30min\n');
  
  console.log('实际结果:');
  for (const day of Object.keys(afterGrouped).sort((a,b)=>Number(a)-Number(b))) {
    const tasks = afterGrouped[Number(day)].map(item => item.task?.name).join('、');
    console.log(`day${day}: ${tasks}`);
  }
  
  // 检查关键点
  console.log('\n=== 关键验证点 ===\n');
  
  // 1. 检查day1是否有"零散任务(30/60)"
  const day1ZeroTask = afterGrouped[1]?.find(item => 
    item.task?.name?.includes('零散任务') && 
    item.task?.name?.includes('30/60') &&
    !item.task?.name?.includes('【拆分】')
  );
  if (day1ZeroTask) {
    console.log('✓ Day1有零散任务(30/60):', day1ZeroTask.task?.name);
  } else {
    console.log('✗ Day1没有找到零散任务(30/60)');
  }
  
  // 2. 检查day2是否有"零散任务【拆分】(30/60)"
  const day2ZeroTask = afterGrouped[2]?.find(item => 
    item.task?.name?.includes('零散任务') && 
    item.task?.name?.includes('【拆分】')
  );
  if (day2ZeroTask) {
    console.log('✓ Day2有零散任务【拆分】(30/60):', day2ZeroTask.task?.name);
    console.log('  day_sort:', day2ZeroTask.day_sort, '(应该是1，即第一个位置)');
  } else {
    console.log('✗ Day2没有找到零散任务【拆分】(30/60)');
  }
  
  // 3. 检查day3是否有"单词30min"
  const day3WordTask = afterGrouped[3]?.find(item => 
    item.task?.name?.includes('单词') && 
    item.task?.occupation_time === 30
  );
  if (day3WordTask) {
    console.log('✓ Day3有单词30min:', day3WordTask.task?.name);
    console.log('  day_sort:', day3WordTask.day_sort, '(应该是1，即第一个位置)');
  } else {
    console.log('✗ Day3没有找到单词30min');
  }
  
  // 4. 检查day4是否有"单词30min"
  const day4WordTask = afterGrouped[4]?.find(item => 
    item.task?.name?.includes('单词') && 
    item.task?.occupation_time === 30
  );
  if (day4WordTask) {
    console.log('✓ Day4有单词30min:', day4WordTask.task?.name);
    console.log('  day_sort:', day4WordTask.day_sort, '(应该是1，即第一个位置)');
  } else {
    console.log('✗ Day4没有找到单词30min');
  }
  
  // 5. 检查day9-10是否符合期望
  console.log('\n=== Day9-10 验证 ===\n');
  
  // Day9期望: 单词、单词、作文2、看直播9、做题9、跳舞（30/60）
  const day9Tasks = afterGrouped[9]?.map(item => item.task?.name).join('、') || '';
  console.log('Day9实际:', day9Tasks);
  console.log('Day9期望: 单词、单词、作文2、看直播9、做题9、跳舞（30/60）');
  
  // Day10期望: 跳舞（30/60）、单词30、作文3、看直播10、玩耍、做题10、单词30min
  const day10Tasks = afterGrouped[10]?.map(item => item.task?.name).join('、') || '';
  console.log('Day10实际:', day10Tasks);
  console.log('Day10期望: 跳舞（30/60）、单词30、作文3、看直播10、玩耍、做题10、单词30min');
  
  // 检查day9是否有"跳舞（30/60）"（应该被拆分，一部分留在day9）
  const day9DanceTask = afterGrouped[9]?.find(item => 
    item.task?.name?.includes('跳舞') && 
    item.task?.name?.includes('30/60') &&
    !item.task?.name?.includes('【拆分】')
  );
  if (day9DanceTask) {
    console.log('✓ Day9有跳舞（30/60）任务（拆分后的一部分）');
  } else {
    console.log('✗ Day9没有找到跳舞（30/60）任务');
  }
  
  // 检查day10是否有"跳舞【拆分】(30/60)"（应该被拆分，一部分移到day10）
  const day10DanceSplit = afterGrouped[10]?.find(item => 
    item.task?.name?.includes('跳舞') && 
    item.task?.name?.includes('【拆分】')
  );
  if (day10DanceSplit) {
    console.log('✓ Day10有跳舞【拆分】(30/60)任务（拆分后移到day10的部分）');
  } else {
    console.log('✗ Day10没有找到跳舞【拆分】(30/60)任务');
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

