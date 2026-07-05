export interface CollectionResult {
  uid: string;
  currentName: string;
  allNames: string;
  platformReviewNum: number;
  fetchedCount: number;
  insertedCount: number;
  localCommentCount: number;
  requestUrl: string;
  task: {
    id: string;
    status: string;
    pageNum: number;
    pageSize: number;
    totalCount: number | null;
    fetchedCount: number;
  };
}

export interface CommentRow {
  id: string;
  uid: string;
  videoTitle: string | null;
  videoOwnerName: string | null;
  content: string;
  pubdate: string | null;
  favoriteCount: number;
  replyCount: number;
  link: string | null;
}

export interface RiskSummary {
  uid: string;
  hitCount: number;
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categoryCounts: Record<string, number>;
  topHits?: RiskHit[];
}

export interface RiskHit {
  id: string;
  category: string;
  level: 'low' | 'medium' | 'high';
  score: number;
  matchedText: string | null;
  reason: string;
  ruleName: string;
  comment: {
    id: string;
    content: string;
    pubdate: string | null;
    videoTitle: string | null;
    videoOwnerName: string | null;
    favoriteCount: number;
    replyCount: number;
    link: string | null;
  };
}

interface HealthResponse {
  ok: boolean;
  database?: {
    ok: boolean;
    message: string;
  };
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function checkApiHealth(): Promise<void> {
  const health = (await requestJson(`${apiBaseUrl}/api/health`)) as HealthResponse;
  if (!health.ok) {
    throw new Error('BiliBili Lens API 当前不可用。');
  }
  if (health.database && !health.database.ok) {
    throw new Error('本地 SQLite 数据库未连接，请确认后端服务已正常启动。');
  }
}

export async function collectPage(payload: {
  uid: string;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  start_dt?: string;
  end_dt?: string;
}): Promise<CollectionResult> {
  return requestJson(`${apiBaseUrl}/api/collection-tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }) as Promise<CollectionResult>;
}

export async function listComments(uid: string, take = 20): Promise<CommentRow[]> {
  const url = new URL(`${apiBaseUrl}/api/comments`);
  url.searchParams.set('uid', uid);
  url.searchParams.set('take', String(take));

  return requestJson(url) as Promise<CommentRow[]>;
}

export async function scanRisk(uid: string): Promise<RiskSummary> {
  return requestJson(`${apiBaseUrl}/api/risk/scan/${uid}`, {
    method: 'POST',
  }) as Promise<RiskSummary>;
}

export async function getRiskSummary(uid: string): Promise<RiskSummary> {
  return requestJson(`${apiBaseUrl}/api/risk/summary/${uid}`) as Promise<RiskSummary>;
}

async function requestJson(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new Error(
      `无法连接到 BiliBili Lens API。请确认后端服务已启动，并且 NEXT_PUBLIC_API_BASE_URL 指向可访问地址。当前地址：${apiBaseUrl}`,
    );
  }

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return response.json();
}

async function extractError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: unknown; error?: unknown };
    if (typeof json.message === 'string') {
      return json.message;
    }
    if (json.message) {
      return JSON.stringify(json.message);
    }
    if (typeof json.error === 'string') {
      return json.error;
    }
  } catch {
    return text || response.statusText;
  }

  return response.statusText;
}
