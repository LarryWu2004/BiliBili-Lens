import { Controller, Get, Inject, Query } from '@nestjs/common';
import { NoticeLocation } from './syrds.types';
import { SyrdsService } from './syrds.service';

@Controller('syrds')
export class SyrdsController {
  constructor(@Inject(SyrdsService) private readonly syrdsService: SyrdsService) {}

  @Get('notices')
  getNotices(@Query('location') location?: NoticeLocation) {
    return this.syrdsService.getNotices(location ?? 'all');
  }

  @Get('reviews-url')
  getReviewsUrl(
    @Query('uid') uid: string,
    @Query('pageNum') pageNum?: string,
    @Query('keyword') keyword?: string,
    @Query('start_dt') startDt?: string,
    @Query('end_dt') endDt?: string,
  ) {
    return {
      url: this.syrdsService.buildReviewsUrl({
        uid,
        pageNum: pageNum ? Number(pageNum) : undefined,
        keyword,
        start_dt: startDt,
        end_dt: endDt,
      }),
      note: 'The syrds /reviews page uses pageSize=75 internally.',
    };
  }
}
