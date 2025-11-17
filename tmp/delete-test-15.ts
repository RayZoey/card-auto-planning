import { PrismaService } from '../src/common/prisma.service';
import { UserTaskService } from '../src/plan/user/task/task.service';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const service = new UserTaskService(prisma, {} as any, {} as any);
  await service.delete(38, 441, true, true);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
