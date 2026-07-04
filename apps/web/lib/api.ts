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

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export async function collectPage(payload: {
  uid: string;
  pageNum: number;
  pageSize: number;
  keyword?: string;
  start_dt?: string;
  end_dt?: string;
}): Promise<CollectionResult> {
  const response = await fetch(`${apiBaseUrl}/api/collection-tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return response.json() as Promise<CollectionResult>;
}

export async function listComments(uid: string, take = 20): Promise<CommentRow[]> {
  const url = new URL(`${apiBaseUrl}/api/comments`);
  url.searchParams.set('uid', uid);
  url.searchParams.set('take', String(take));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await extractError(response));
  }

  return response.json() as Promise<CommentRow[]>;
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
