import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  CollectionTaskRow,
  CommentInsert,
  CommentRow,
  RiskHitInsert,
  RiskHitWithRelations,
  RiskRuleInsert,
  RiskRuleRow,
  TaskStatus,
  UserProfileRow,
} from './local-db.types';

@Injectable()
export class LocalDbService implements OnModuleDestroy {
  private readonly db: DatabaseSync;

  constructor() {
    const dbPath = process.env.SQLITE_DB_PATH ?? resolve(process.cwd(), 'data/bilibili-lens.db');
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.migrate();
  }

  onModuleDestroy() {
    this.db.close();
  }

  createCollectionTask(input: {
    uid: string;
    projectId?: string;
    status: TaskStatus;
    pageNum: number;
    pageSize: number;
    startedAt?: Date;
  }): CollectionTaskRow {
    const now = nowIso();
    const row: CollectionTaskRow = {
      id: randomUUID(),
      uid: input.uid,
      projectId: input.projectId ?? null,
      status: input.status,
      pageNum: input.pageNum,
      pageSize: input.pageSize,
      totalCount: null,
      fetchedCount: 0,
      errorCode: null,
      errorMessage: null,
      startedAt: input.startedAt ? input.startedAt.toISOString() : null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(`
      INSERT INTO collection_tasks (
        id, uid, project_id, status, page_num, page_size, total_count, fetched_count,
        error_code, error_message, started_at, finished_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.uid,
      row.projectId,
      row.status,
      row.pageNum,
      row.pageSize,
      row.totalCount,
      row.fetchedCount,
      row.errorCode,
      row.errorMessage,
      row.startedAt,
      row.finishedAt,
      row.createdAt,
      row.updatedAt,
    );

    return row;
  }

  updateCollectionTask(
    id: string,
    input: Partial<Pick<CollectionTaskRow, 'status' | 'totalCount' | 'fetchedCount' | 'errorCode' | 'errorMessage'>> & {
      finishedAt?: Date;
    },
  ): CollectionTaskRow {
    const current = this.getCollectionTask(id);
    const row: CollectionTaskRow = {
      ...current,
      ...input,
      finishedAt: input.finishedAt ? input.finishedAt.toISOString() : current.finishedAt,
      updatedAt: nowIso(),
    };

    this.db.prepare(`
      UPDATE collection_tasks
      SET status = ?, total_count = ?, fetched_count = ?, error_code = ?, error_message = ?,
          finished_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      row.status,
      row.totalCount,
      row.fetchedCount,
      row.errorCode,
      row.errorMessage,
      row.finishedAt,
      row.updatedAt,
      row.id,
    );

    return this.getCollectionTask(id);
  }

  getCollectionTask(id: string): CollectionTaskRow {
    const row = this.db.prepare('SELECT * FROM collection_tasks WHERE id = ?').get(id);
    if (!row) {
      throw new Error(`Collection task not found: ${id}`);
    }
    return mapTask(row as SqlRow);
  }

  upsertUserProfile(input: {
    uid: string;
    currentName: string | null;
    allNames: string | null;
    commentCount: number;
    firstCommentAt: Date | null;
    lastCommentAt: Date | null;
  }): UserProfileRow {
    const existing = this.findUserProfile(input.uid);
    const now = nowIso();

    if (!existing) {
      this.db.prepare(`
        INSERT INTO users (
          id, uid, current_name, all_names, comment_count, first_comment_at, last_comment_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        input.uid,
        input.currentName,
        input.allNames,
        input.commentCount,
        input.firstCommentAt?.toISOString() ?? null,
        input.lastCommentAt?.toISOString() ?? null,
        now,
        now,
      );
    } else {
      this.db.prepare(`
        UPDATE users
        SET current_name = ?, all_names = ?, comment_count = ?, first_comment_at = ?, last_comment_at = ?, updated_at = ?
        WHERE uid = ?
      `).run(
        input.currentName,
        input.allNames,
        input.commentCount,
        input.firstCommentAt?.toISOString() ?? existing.firstCommentAt,
        input.lastCommentAt?.toISOString() ?? existing.lastCommentAt,
        now,
        input.uid,
      );
    }

    return this.getUserProfile(input.uid);
  }

  updateUserCommentStats(uid: string, stats: { firstCommentAt: string | null; lastCommentAt: string | null }): void {
    this.db.prepare('UPDATE users SET first_comment_at = ?, last_comment_at = ?, updated_at = ? WHERE uid = ?').run(
      stats.firstCommentAt,
      stats.lastCommentAt,
      nowIso(),
      uid,
    );
  }

  getUserProfile(uid: string): UserProfileRow {
    const profile = this.findUserProfile(uid);
    if (!profile) {
      throw new Error(`User profile not found: ${uid}`);
    }
    return {
      ...profile,
      _count: {
        comments: this.countComments(uid),
      },
    };
  }

  insertComments(comments: CommentInsert[]): number {
    const statement = this.db.prepare(`
      INSERT OR IGNORE INTO comments (
        id, uid, bvid, video_title, video_owner_name, content, pubdate, dt,
        favorite_count, reply_count, reply_type, link, content_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    this.runInTransaction(() => {
      for (const comment of comments) {
        const now = nowIso();
        const result = statement.run(
          randomUUID(),
          comment.uid,
          comment.bvid,
          comment.videoTitle,
          comment.videoOwnerName,
          comment.content,
          comment.pubdate?.toISOString() ?? null,
          comment.dt?.toISOString() ?? null,
          comment.favoriteCount,
          comment.replyCount,
          comment.replyType,
          comment.link,
          comment.contentHash,
          now,
          now,
        );
        inserted += Number(result.changes ?? 0);
      }
    });
    return inserted;
  }

  getCommentStats(uid: string): { count: number; firstCommentAt: string | null; lastCommentAt: string | null } {
    const row = this.db
      .prepare('SELECT COUNT(*) as count, MIN(pubdate) as firstCommentAt, MAX(pubdate) as lastCommentAt FROM comments WHERE uid = ?')
      .get(uid) as SqlRow;
    return {
      count: Number(row.count ?? 0),
      firstCommentAt: stringOrNull(row.firstCommentAt),
      lastCommentAt: stringOrNull(row.lastCommentAt),
    };
  }

  listComments(uid: string, take: number): CommentRow[] {
    const rows = this.db
      .prepare('SELECT * FROM comments WHERE uid = ? ORDER BY pubdate DESC LIMIT ?')
      .all(uid, take) as SqlRow[];
    return rows.map(mapComment);
  }

  getComments(uid: string): CommentRow[] {
    const rows = this.db.prepare('SELECT * FROM comments WHERE uid = ? ORDER BY pubdate DESC').all(uid) as SqlRow[];
    return rows.map(mapComment);
  }

  countRiskRules(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM risk_rules').get() as SqlRow;
    return Number(row.count ?? 0);
  }

  createRiskRules(rules: RiskRuleInsert[]): number {
    const statement = this.db.prepare(`
      INSERT INTO risk_rules (id, name, category, type, pattern, weight, level, reason, enabled, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    this.runInTransaction(() => {
      for (const rule of rules) {
        const now = nowIso();
        const result = statement.run(
          randomUUID(),
          rule.name,
          rule.category,
          rule.type,
          rule.pattern,
          rule.weight,
          rule.level,
          rule.reason,
          1,
          1,
          now,
          now,
        );
        inserted += Number(result.changes ?? 0);
      }
    });
    return inserted;
  }

  listRiskRules(enabledOnly = false): RiskRuleRow[] {
    const sql = enabledOnly
      ? 'SELECT * FROM risk_rules WHERE enabled = 1 ORDER BY category ASC, created_at ASC'
      : 'SELECT * FROM risk_rules ORDER BY enabled DESC, category ASC, created_at ASC';
    return (this.db.prepare(sql).all() as SqlRow[]).map(mapRiskRule);
  }

  deleteRiskHits(uid: string): void {
    this.db.prepare('DELETE FROM risk_hits WHERE uid = ?').run(uid);
  }

  createRiskHits(hits: RiskHitInsert[]): number {
    const statement = this.db.prepare(`
      INSERT INTO risk_hits (
        id, uid, comment_id, rule_id, rule_version, category, level, score, matched_text, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let inserted = 0;
    this.runInTransaction(() => {
      for (const hit of hits) {
        const result = statement.run(
          randomUUID(),
          hit.uid,
          hit.commentId,
          hit.ruleId,
          hit.ruleVersion,
          hit.category,
          hit.level,
          hit.score,
          hit.matchedText,
          hit.reason,
          nowIso(),
        );
        inserted += Number(result.changes ?? 0);
      }
    });
    return inserted;
  }

  getRiskHitsWithRelations(uid: string, take = 50): RiskHitWithRelations[] {
    const rows = this.db
      .prepare(`
        SELECT
          rh.*,
          c.id as c_id, c.uid as c_uid, c.bvid as c_bvid, c.video_title as c_video_title,
          c.video_owner_name as c_video_owner_name, c.content as c_content, c.pubdate as c_pubdate,
          c.dt as c_dt, c.favorite_count as c_favorite_count, c.reply_count as c_reply_count,
          c.reply_type as c_reply_type, c.link as c_link, c.content_hash as c_content_hash,
          c.created_at as c_created_at, c.updated_at as c_updated_at,
          rr.id as r_id, rr.name as r_name, rr.category as r_category, rr.type as r_type,
          rr.pattern as r_pattern, rr.weight as r_weight, rr.level as r_level, rr.reason as r_reason,
          rr.enabled as r_enabled, rr.version as r_version, rr.created_at as r_created_at, rr.updated_at as r_updated_at
        FROM risk_hits rh
        JOIN comments c ON c.id = rh.comment_id
        JOIN risk_rules rr ON rr.id = rh.rule_id
        WHERE rh.uid = ?
        ORDER BY rh.score DESC, rh.created_at DESC
        LIMIT ?
      `)
      .all(uid, take) as SqlRow[];

    return rows.map(mapRiskHitWithRelations);
  }

  private findUserProfile(uid: string): UserProfileRow | null {
    const row = this.db.prepare('SELECT * FROM users WHERE uid = ?').get(uid) as SqlRow | undefined;
    return row ? mapUserProfile(row) : null;
  }

  private countComments(uid: string): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM comments WHERE uid = ?').get(uid) as SqlRow;
    return Number(row.count ?? 0);
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        current_name TEXT,
        all_names TEXT,
        comment_count INTEGER NOT NULL DEFAULT 0,
        first_comment_at TEXT,
        last_comment_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        bvid TEXT,
        video_title TEXT,
        video_owner_name TEXT,
        content TEXT NOT NULL,
        pubdate TEXT,
        dt TEXT,
        favorite_count INTEGER NOT NULL DEFAULT 0,
        reply_count INTEGER NOT NULL DEFAULT 0,
        reply_type INTEGER,
        link TEXT,
        content_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(uid, content_hash),
        FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_comments_uid_pubdate ON comments(uid, pubdate);

      CREATE TABLE IF NOT EXISTS collection_tasks (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        project_id TEXT,
        status TEXT NOT NULL,
        page_num INTEGER NOT NULL DEFAULT 1,
        page_size INTEGER NOT NULL DEFAULT 100,
        total_count INTEGER,
        fetched_count INTEGER NOT NULL DEFAULT 0,
        error_code INTEGER,
        error_message TEXT,
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS risk_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        pattern TEXT NOT NULL,
        weight INTEGER NOT NULL,
        level TEXT NOT NULL,
        reason TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS risk_hits (
        id TEXT PRIMARY KEY,
        uid TEXT NOT NULL,
        comment_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        rule_version INTEGER NOT NULL,
        category TEXT NOT NULL,
        level TEXT NOT NULL,
        score INTEGER NOT NULL,
        matched_text TEXT,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY(rule_id) REFERENCES risk_rules(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_risk_hits_uid_level ON risk_hits(uid, level);
    `);
  }

  private runInTransaction(callback: () => void): void {
    this.db.exec('BEGIN');
    try {
      callback();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}

type SqlValue = string | number | bigint | null | undefined;
type SqlRow = Record<string, SqlValue>;

function nowIso(): string {
  return new Date().toISOString();
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function boolFromSql(value: unknown): boolean {
  return value === 1 || value === true;
}

function mapTask(row: SqlRow): CollectionTaskRow {
  return {
    id: String(row.id),
    uid: String(row.uid),
    projectId: stringOrNull(row.project_id),
    status: String(row.status) as CollectionTaskRow['status'],
    pageNum: Number(row.page_num),
    pageSize: Number(row.page_size),
    totalCount: row.total_count === null ? null : Number(row.total_count),
    fetchedCount: Number(row.fetched_count),
    errorCode: row.error_code === null ? null : Number(row.error_code),
    errorMessage: stringOrNull(row.error_message),
    startedAt: stringOrNull(row.started_at),
    finishedAt: stringOrNull(row.finished_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapUserProfile(row: SqlRow): UserProfileRow {
  return {
    id: String(row.id),
    uid: String(row.uid),
    currentName: stringOrNull(row.current_name),
    allNames: stringOrNull(row.all_names),
    commentCount: Number(row.comment_count),
    firstCommentAt: stringOrNull(row.first_comment_at),
    lastCommentAt: stringOrNull(row.last_comment_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapComment(row: SqlRow): CommentRow {
  return {
    id: String(row.id),
    uid: String(row.uid),
    bvid: stringOrNull(row.bvid),
    videoTitle: stringOrNull(row.video_title),
    videoOwnerName: stringOrNull(row.video_owner_name),
    content: String(row.content),
    pubdate: stringOrNull(row.pubdate),
    dt: stringOrNull(row.dt),
    favoriteCount: Number(row.favorite_count),
    replyCount: Number(row.reply_count),
    replyType: row.reply_type === null ? null : Number(row.reply_type),
    link: stringOrNull(row.link),
    contentHash: String(row.content_hash),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRiskRule(row: SqlRow): RiskRuleRow {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    type: String(row.type) as RiskRuleRow['type'],
    pattern: String(row.pattern),
    weight: Number(row.weight),
    level: String(row.level) as RiskRuleRow['level'],
    reason: String(row.reason),
    enabled: boolFromSql(row.enabled),
    version: Number(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRiskHit(row: SqlRow): Omit<RiskHitWithRelations, 'comment' | 'rule'> {
  return {
    id: String(row.id),
    uid: String(row.uid),
    commentId: String(row.comment_id),
    ruleId: String(row.rule_id),
    ruleVersion: Number(row.rule_version),
    category: String(row.category),
    level: String(row.level) as RiskHitWithRelations['level'],
    score: Number(row.score),
    matchedText: stringOrNull(row.matched_text),
    reason: String(row.reason),
    createdAt: String(row.created_at),
  };
}

function mapRiskHitWithRelations(row: SqlRow): RiskHitWithRelations {
  return {
    ...mapRiskHit(row),
    comment: mapComment({
      id: row.c_id,
      uid: row.c_uid,
      bvid: row.c_bvid,
      video_title: row.c_video_title,
      video_owner_name: row.c_video_owner_name,
      content: row.c_content,
      pubdate: row.c_pubdate,
      dt: row.c_dt,
      favorite_count: row.c_favorite_count,
      reply_count: row.c_reply_count,
      reply_type: row.c_reply_type,
      link: row.c_link,
      content_hash: row.c_content_hash,
      created_at: row.c_created_at,
      updated_at: row.c_updated_at,
    }),
    rule: mapRiskRule({
      id: row.r_id,
      name: row.r_name,
      category: row.r_category,
      type: row.r_type,
      pattern: row.r_pattern,
      weight: row.r_weight,
      level: row.r_level,
      reason: row.r_reason,
      enabled: row.r_enabled,
      version: row.r_version,
      created_at: row.r_created_at,
      updated_at: row.r_updated_at,
    }),
  };
}
