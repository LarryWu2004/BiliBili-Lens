import { Module } from '@nestjs/common';
import { LocalDbModule } from '../local-db/local-db.module';
import { SyrdsModule } from '../syrds/syrds.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [LocalDbModule, SyrdsModule],
  controllers: [CollectionController],
  providers: [CollectionService],
})
export class CollectionModule {}
