import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    let database = {
      ok: true,
      message: 'connected',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = {
        ok: false,
        message:
          'PostgreSQL is not reachable. Start the database service and run Prisma migrations before collecting comments.',
      };
    }

    return {
      ok: true,
      service: 'bilibili-lens-api',
      database,
      time: new Date().toISOString(),
    };
  }
}
