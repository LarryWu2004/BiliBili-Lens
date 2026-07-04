import { Module } from '@nestjs/common';
import { CollectionModule } from './collection/collection.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SyrdsModule } from './syrds/syrds.module';

@Module({
  imports: [HealthModule, PrismaModule, SyrdsModule, CollectionModule],
})
export class AppModule {}

