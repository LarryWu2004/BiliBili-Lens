import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SyrdsModule } from '../syrds/syrds.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [PrismaModule, SyrdsModule],
  controllers: [CollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
