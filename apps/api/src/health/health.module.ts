import { Module } from '@nestjs/common';
import { LocalDbModule } from '../local-db/local-db.module';
import { HealthController } from './health.controller';

@Module({
  imports: [LocalDbModule],
  controllers: [HealthController],
})
export class HealthModule {}
