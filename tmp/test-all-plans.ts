import { PrismaService } from '../src/common/prisma.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  
  // 查找所有可用的plan
  const plans = await prisma.userPlan.findMany({
    where: {
      id: { gte: 24, lte: 30 }
    },
    orderBy: { id: 'asc' },
  });
  
  console.log('可用的Plan IDs:');
  for (const plan of plans) {
    const taskCount = await prisma.userTaskScheduler.count({
      where: { plan_id: plan.id },
    });
    console.log(`  Plan ${plan.id}: ${taskCount} tasks`);
  }
  
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

