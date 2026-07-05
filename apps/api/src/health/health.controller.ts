import { Controller, Get, Inject } from '@nestjs/common';
import { LocalDbService } from '../local-db/local-db.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(LocalDbService) private readonly localDb: LocalDbService) {}

  @Get()
  async getHealth() {
    let database = {
      ok: true,
      message: 'connected',
    };

    try {
      this.localDb.countRiskRules();
    } catch {
      database = {
        ok: false,
        message: 'Local SQLite database is not reachable.',
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
