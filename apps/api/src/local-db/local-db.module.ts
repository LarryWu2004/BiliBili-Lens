import { Global, Module } from '@nestjs/common';
import { LocalDbService } from './local-db.service';

@Global()
@Module({
  providers: [LocalDbService],
  exports: [LocalDbService],
})
export class LocalDbModule {}

