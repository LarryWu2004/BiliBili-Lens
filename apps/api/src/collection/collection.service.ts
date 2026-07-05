import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { LocalDbService } from '../local-db/local-db.service';
import { SyrdsService } from '../syrds/syrds.service';
import { CollectPageInput } from './collection.schemas';

@Injectable()
export class CollectionService {
  constructor(
    @Inject(LocalDbService) private readonly localDb: LocalDbService,
    @Inject(SyrdsService) private readonly syrdsService: SyrdsService,
  ) {}

  async collectPage(input: CollectPageInput) {
    if (input.start_dt && input.end_dt && input.start_dt > input.end_dt) {
      throw new BadRequestException('start_dt must be earlier than or equal to end_dt');
    }

    const task = this.localDb.createCollectionTask({
      uid: input.uid,
      projectId: input.projectId,
      status: 'running',
      pageNum: input.pageNum,
      pageSize: input.pageSize,
      startedAt: new Date(),
    });

    try {
      const response = await this.syrdsService.getReplies({
        uid: input.uid,
        pageNum: input.pageNum,
        pageSize: input.pageSize,
        keyword: input.keyword,
        start_dt: input.start_dt,
        end_dt: input.end_dt,
      });

      const comments = response.data.map((reply) => ({
        uid: response.uid,
        bvid: reply.bvid ?? null,
        videoTitle: reply.title ?? null,
        videoOwnerName: reply.video_owner_name ?? null,
        content: reply.content,
        pubdate: parseDate(reply.pubdate),
        dt: parseDate(reply.dt),
        favoriteCount: reply.favorite ?? 0,
        replyCount: reply.reply ?? 0,
        replyType: reply.reply_type ?? null,
        link: reply.link ?? null,
        contentHash: hashComment(response.uid, reply.content, reply.pubdate, reply.bvid),
      }));

      this.localDb.upsertUserProfile({
        uid: response.uid,
        currentName: response.current_name || null,
        allNames: response.all_names || null,
        commentCount: response.review_num ?? 0,
        firstCommentAt: minDate(comments.map((comment) => comment.pubdate)),
        lastCommentAt: maxDate(comments.map((comment) => comment.pubdate)),
      });

      const insertedCount = comments.length ? this.localDb.insertComments(comments) : 0;

      const localStats = this.localDb.getCommentStats(response.uid);

      this.localDb.updateUserCommentStats(response.uid, {
        firstCommentAt: localStats.firstCommentAt,
        lastCommentAt: localStats.lastCommentAt,
      });

      const completedTask = this.localDb.updateCollectionTask(task.id, {
        status: 'completed',
        totalCount: response.review_num,
        fetchedCount: response.data.length,
        finishedAt: new Date(),
      });

      return {
        task: completedTask,
        uid: response.uid,
        currentName: response.current_name,
        allNames: response.all_names,
        platformReviewNum: response.review_num,
        fetchedCount: response.data.length,
        insertedCount,
        localCommentCount: localStats.count,
        requestUrl: response.requestUrl,
      };
    } catch (error) {
      this.localDb.updateCollectionTask(task.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown collection error',
        finishedAt: new Date(),
      });

      throw error;
    }
  }

  getTask(id: string) {
    return this.localDb.getCollectionTask(id);
  }

  getProfile(uid: string) {
    return this.localDb.getUserProfile(uid);
  }

  listComments(uid: string, take = 50) {
    return this.localDb.listComments(uid, Math.min(Math.max(take, 1), 100));
  }
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hashComment(uid: string, content: string, pubdate?: string, bvid?: string): string {
  return createHash('sha256')
    .update([uid, bvid ?? '', pubdate ?? '', content].join('|'))
    .digest('hex');
}

function minDate(values: Array<Date | null>): Date | null {
  const timestamps = values.filter((value): value is Date => value !== null).map((value) => value.getTime());
  return timestamps.length ? new Date(Math.min(...timestamps)) : null;
}

function maxDate(values: Array<Date | null>): Date | null {
  const timestamps = values.filter((value): value is Date => value !== null).map((value) => value.getTime());
  return timestamps.length ? new Date(Math.max(...timestamps)) : null;
}
