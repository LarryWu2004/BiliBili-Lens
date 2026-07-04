import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { collectPageSchema } from './collection.schemas';
import { CollectionService } from './collection.service';

@Controller()
export class CollectionController {
  constructor(@Inject(CollectionService) private readonly collectionService: CollectionService) {}

  @Post('collection-tasks')
  collectPage(@Body() body: unknown) {
    const result = collectPageSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }

    return this.collectionService.collectPage(result.data);
  }

  @Get('collection-tasks/:id')
  getTask(@Param('id') id: string) {
    return this.collectionService.getTask(id);
  }

  @Get('profiles/:uid')
  getProfile(@Param('uid') uid: string) {
    assertUid(uid);
    return this.collectionService.getProfile(uid);
  }

  @Get('comments')
  listComments(@Query('uid') uid?: string, @Query('take') take?: string) {
    if (!uid) {
      throw new BadRequestException('uid is required');
    }
    assertUid(uid);

    return this.collectionService.listComments(uid, take ? Number(take) : 50);
  }
}

function assertUid(uid: string): void {
  const schema = z.string().regex(/^[1-9]\d{0,19}$/);
  const result = schema.safeParse(uid);
  if (!result.success) {
    throw new BadRequestException('uid must be a positive integer string with 1-20 digits and no leading zero');
  }
}
