import { Module } from '@nestjs/common';
import { LocalDbModule } from '../local-db/local-db.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [LocalDbModule],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
