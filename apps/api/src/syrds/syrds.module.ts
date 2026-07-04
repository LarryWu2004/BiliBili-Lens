import { Module } from '@nestjs/common';
import { SyrdsController } from './syrds.controller';
import { SyrdsService } from './syrds.service';

@Module({
  controllers: [SyrdsController],
  providers: [SyrdsService],
  exports: [SyrdsService],
})
export class SyrdsModule {}

