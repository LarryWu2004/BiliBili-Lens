import { BadGatewayException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  assertValidDateRange,
  assertValidPageNum,
  assertValidPageSize,
  assertValidUid,
} from './syrds.validation';
import {
  GetRepliesParams,
  NoticeLocation,
  SyrdsNoticeResponse,
  SyrdsRepliesResponse,
} from './syrds.types';

@Injectable()
export class SyrdsService {
  private readonly baseUrl = (process.env.SYRDS_BASE_URL ?? 'http://120.55.124.239').replace(/\/$/, '');

  async getReplies(params: GetRepliesParams): Promise<SyrdsRepliesResponse> {
    const pageNum = params.pageNum ?? 1;
    const pageSize = params.pageSize ?? 20;

    assertValidUid(params.uid);
    assertValidPageNum(pageNum);
    assertValidPageSize(pageSize);
    assertValidDateRange(params.start_dt, params.end_dt);

    const url = new URL(`${this.baseUrl}/get_replies`);
    url.searchParams.set('uid', params.uid);
    url.searchParams.set('pageNum', String(pageNum));
    url.searchParams.set('pageSize', String(pageSize));

    if (params.keyword?.trim()) {
      url.searchParams.set('keyword', params.keyword.trim());
    }
    if (params.start_dt) {
      url.searchParams.set('start_dt', params.start_dt);
    }
    if (params.end_dt) {
      url.searchParams.set('end_dt', params.end_dt);
    }

    const body = await this.fetchJson<SyrdsRepliesResponse>(url);
    this.assertBusinessSuccess(body);

    return {
      ...body,
      endpoint: '/get_replies',
      requestUrl: url.toString(),
    };
  }

  async getNotices(location: NoticeLocation = 'all'): Promise<SyrdsNoticeResponse> {
    const url = new URL(`${this.baseUrl}/get_notice`);
    if (location !== 'all') {
      url.searchParams.set('location', location);
    }

    const body = await this.fetchJson<SyrdsNoticeResponse>(url);
    this.assertBusinessSuccess(body);

    return body;
  }

  buildReviewsUrl(params: Omit<GetRepliesParams, 'pageSize'>): string {
    const pageNum = params.pageNum ?? 1;

    assertValidUid(params.uid);
    assertValidPageNum(pageNum);
    assertValidDateRange(params.start_dt, params.end_dt);

    const url = new URL(`${this.baseUrl}/reviews`);
    url.searchParams.set('uid', params.uid);
    url.searchParams.set('pageNum', String(pageNum));

    if (params.keyword?.trim()) {
      url.searchParams.set('keyword', params.keyword.trim());
    }
    if (params.start_dt) {
      url.searchParams.set('start_dt', params.start_dt);
    }
    if (params.end_dt) {
      url.searchParams.set('end_dt', params.end_dt);
    }

    return url.toString();
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const text = await response.text();
    if (!response.ok) {
      throw new BadGatewayException(`syrds returned HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadGatewayException('syrds returned a non-JSON response');
    }
  }

  private assertBusinessSuccess(body: { code?: number; msg?: string }): void {
    if (body.code === 0) {
      return;
    }

    if (body.code === 429 || body.code === 412) {
      throw new HttpException(
        body.msg || 'syrds rate limit or temporary block triggered',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new BadGatewayException(`syrds business error code=${body.code ?? 'unknown'} msg=${body.msg ?? ''}`);
  }
}
