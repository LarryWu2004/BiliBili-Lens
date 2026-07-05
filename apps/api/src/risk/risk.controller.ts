import { BadRequestException, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(@Inject(RiskService) private readonly riskService: RiskService) {}

  @Post('rules/seed')
  seedDefaultRules() {
    return this.riskService.seedDefaultRules();
  }

  @Get('rules')
  listRules() {
    return this.riskService.listRules();
  }

  @Post('scan/:uid')
  scanUid(@Param('uid') uid: string) {
    assertUid(uid);
    return this.riskService.scanUid(uid);
  }

  @Get('summary/:uid')
  getSummary(@Param('uid') uid: string) {
    assertUid(uid);
    return this.riskService.getSummary(uid);
  }
}

function assertUid(uid: string): void {
  if (!/^[1-9]\d{0,19}$/.test(uid)) {
    throw new BadRequestException('uid must be a positive integer string with 1-20 digits and no leading zero');
  }
}

