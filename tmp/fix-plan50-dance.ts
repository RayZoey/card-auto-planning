import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  await prisma.$connect();
  
  const planId = 50;
  
  console.log('=== 修复 Plan 50 中"跳舞"任务的 can_divisible ===\n');
  
  // 查找"跳舞"任务
  const danceScheduler = await prisma.userTaskScheduler.findFirst({
    where: {
      plan_id: planId,
      task: {
        name: {
          contains: '跳舞'
        }
      }
    },
    include: {
      task: true
    }
  });
  
  if (!danceScheduler) {
    console.error('未找到"跳舞"任务');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`找到"跳舞"任务: ${danceScheduler.task?.name}`);
  console.log(`当前 can_divisible: ${danceScheduler.can_divisible}`);
  
  // 更新 can_divisible 为 true
  await prisma.userTaskScheduler.update({
    where: {
      task_id: danceScheduler.task_id
    },
    data: {
      can_divisible: true
    }
  });
  
  console.log('已将 can_divisible 更新为 true\n');
  
  await prisma.$disconnect();
  console.log('完成！');
}

main().catch(console.error);

