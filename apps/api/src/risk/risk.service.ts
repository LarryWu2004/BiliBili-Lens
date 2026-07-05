import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LocalDbService } from '../local-db/local-db.service';
import { RiskLevel, RiskRuleRow } from '../local-db/local-db.types';
import { defaultRiskRules } from './default-rules';

@Injectable()
export class RiskService {
  constructor(@Inject(LocalDbService) private readonly localDb: LocalDbService) {}

  seedDefaultRules() {
    const existingCount = this.localDb.countRiskRules();
    if (existingCount > 0) {
      return {
        created: 0,
        skipped: existingCount,
      };
    }

    const created = this.localDb.createRiskRules(defaultRiskRules);

    return {
      created,
      skipped: 0,
    };
  }

  listRules() {
    return this.localDb.listRiskRules();
  }

  scanUid(uid: string) {
    assertUid(uid);
    this.ensureRulesExist();

    const rules = this.localDb.listRiskRules(true);
    const comments = this.localDb.getComments(uid);

    this.localDb.deleteRiskHits(uid);

    const hits = [];
    for (const comment of comments) {
      for (const rule of rules) {
        const matchedText = matchRule(rule, comment.content);
        if (!matchedText) {
          continue;
        }

        hits.push({
          uid,
          commentId: comment.id,
          ruleId: rule.id,
          ruleVersion: rule.version,
          category: rule.category,
          level: rule.level,
          score: calculateCommentRuleScore(rule.level, rule.weight, comment.favoriteCount, comment.replyCount),
          matchedText,
          reason: rule.reason,
        });
      }
    }

    if (hits.length) {
      this.localDb.createRiskHits(hits);
    }

    const summary = summarizeHits(hits);

    return {
      uid,
      scannedComments: comments.length,
      hitCount: hits.length,
      ...summary,
    };
  }

  getSummary(uid: string) {
    assertUid(uid);

    const hits = this.localDb.getRiskHitsWithRelations(uid, 50);

    const summary = summarizeHits(hits);

    return {
      uid,
      hitCount: hits.length,
      ...summary,
      topHits: hits.map((hit) => ({
        id: hit.id,
        category: hit.category,
        level: hit.level,
        score: hit.score,
        matchedText: hit.matchedText,
        reason: hit.reason,
        ruleName: hit.rule.name,
        comment: {
          id: hit.comment.id,
          content: hit.comment.content,
          pubdate: hit.comment.pubdate,
          videoTitle: hit.comment.videoTitle,
          videoOwnerName: hit.comment.videoOwnerName,
          favoriteCount: hit.comment.favoriteCount,
          replyCount: hit.comment.replyCount,
          link: hit.comment.link,
        },
      })),
    };
  }

  private ensureRulesExist(): void {
    const count = this.localDb.countRiskRules();
    if (count === 0) {
      this.seedDefaultRules();
    }
  }
}

function matchRule(rule: RiskRuleRow, content: string): string | null {
  const flags = 'iu';
  const expression =
    rule.type === 'keyword'
      ? new RegExp(rule.pattern, flags)
      : rule.type === 'regex'
        ? new RegExp(rule.pattern, flags)
        : null;

  if (!expression) {
    return null;
  }

  const match = content.match(expression);
  return match?.[0] ?? null;
}

function calculateCommentRuleScore(
  level: RiskLevel,
  weight: number,
  favoriteCount: number,
  replyCount: number,
): number {
  const levelBase = level === 'high' ? 60 : level === 'medium' ? 30 : 10;
  const impactScore =
    (favoriteCount > 500 ? 25 : favoriteCount > 100 ? 15 : 0) +
    (replyCount > 100 ? 20 : replyCount > 20 ? 10 : 0);

  return Math.min(100, Math.max(levelBase, weight) + impactScore);
}

function summarizeHits(hits: Array<{ level: RiskLevel; category: string; score: number }>) {
  const highCount = hits.filter((hit) => hit.level === 'high').length;
  const mediumCount = hits.filter((hit) => hit.level === 'medium').length;
  const lowCount = hits.filter((hit) => hit.level === 'low').length;
  const categoryCounts = hits.reduce<Record<string, number>>((acc, hit) => {
    acc[hit.category] = (acc[hit.category] ?? 0) + 1;
    return acc;
  }, {});

  const totalScore = Math.min(
    100,
    highCount * 20 + mediumCount * 8 + lowCount * 3 + Math.ceil(hits.reduce((sum, hit) => sum + hit.score, 0) / 20),
  );

  return {
    totalScore,
    riskLevel: totalScore >= 71 ? 'high' : totalScore >= 31 ? 'medium' : 'low',
    highCount,
    mediumCount,
    lowCount,
    categoryCounts,
  };
}

function assertUid(uid: string): void {
  if (!/^[1-9]\d{0,19}$/.test(uid)) {
    throw new BadRequestException('uid must be a positive integer string with 1-20 digits and no leading zero');
  }
}
