export interface SyrdsReply {
  bvid?: string;
  video_owner_name?: string;
  title?: string;
  user_name?: string;
  user_id?: number;
  reply_type?: number;
  content: string;
  pubdate?: string;
  favorite?: number;
  reply?: number;
  dt?: string;
  link?: string;
}

export interface SyrdsRepliesResponse {
  endpoint?: string;
  requestUrl?: string;
  httpStatus?: number;
  all_names: string;
  code: number;
  current_name: string;
  data: SyrdsReply[];
  msg: string;
  review_num: number;
  uid: string;
}

export interface SyrdsNotice {
  title: string;
  content: string;
}

export interface SyrdsNoticeResponse {
  code: number;
  msg: string;
  data: SyrdsNotice[];
}

export interface GetRepliesParams {
  uid: string;
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  start_dt?: string;
  end_dt?: string;
}

export type NoticeLocation = 'homepage' | 'dump_replies' | 'all';

