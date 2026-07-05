import { Module } from '@nestjs/common';
import { CollectionModule } from './collection/collection.module';
import { HealthModule } from './health/health.module';
import { LocalDbModule } from './local-db/local-db.module';
import { RiskModule } from './risk/risk.module';
import { SyrdsModule } from './syrds/syrds.module';

@Module({
  imports: [HealthModule, LocalDbModule, SyrdsModule, CollectionModule, RiskModule],
})
export class AppModule {}
