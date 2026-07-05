export type TaskStatus = 'pending' | 'running' | 'rate_limited' | 'blocked' | 'completed' | 'failed' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RuleType = 'keyword' | 'regex' | 'composite' | 'whitelist';

export interface CollectionTaskRow {
  id: string;
  uid: string;
  projectId: string | null;
  status: TaskStatus;
  pageNum: number;
  pageSize: number;
  totalCount: number | null;
  fetchedCount: number;
  errorCode: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileRow {
  id: string;
  uid: string;
  currentName: string | null;
  allNames: string | null;
  commentCount: number;
  firstCommentAt: string | null;
  lastCommentAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
  };
}

export interface CommentInsert {
  uid: string;
  bvid: string | null;
  videoTitle: string | null;
  videoOwnerName: string | null;
  content: string;
  pubdate: Date | null;
  dt: Date | null;
  favoriteCount: number;
  replyCount: number;
  replyType: number | null;
  link: string | null;
  contentHash: string;
}

export interface CommentRow extends Omit<CommentInsert, 'pubdate' | 'dt'> {
  id: string;
  pubdate: string | null;
  dt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RiskRuleInsert {
  name: string;
  category: string;
  type: RuleType;
  pattern: string;
  weight: number;
  level: RiskLevel;
  reason: string;
}

export interface RiskRuleRow extends RiskRuleInsert {
  id: string;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RiskHitInsert {
  uid: string;
  commentId: string;
  ruleId: string;
  ruleVersion: number;
  category: string;
  level: RiskLevel;
  score: number;
  matchedText: string | null;
  reason: string;
}

export interface RiskHitRow extends RiskHitInsert {
  id: string;
  createdAt: string;
}

export interface RiskHitWithRelations extends RiskHitRow {
  comment: CommentRow;
  rule: RiskRuleRow;
}

