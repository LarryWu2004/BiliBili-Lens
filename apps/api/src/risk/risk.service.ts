import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RiskLevel, RiskRule, RuleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { defaultRiskRules } from './default-rules';

@Injectable()
export class RiskService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async seedDefaultRules() {
    const existingCount = await this.prisma.riskRule.count();
    if (existingCount > 0) {
      return {
        created: 0,
        skipped: existingCount,
      };
    }

    const result = await this.prisma.riskRule.createMany({
      data: defaultRiskRules,
    });

    return {
      created: result.count,
      skipped: 0,
    };
  }

  listRules() {
    return this.prisma.riskRule.findMany({
      orderBy: [{ enabled: 'desc' }, { category: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async scanUid(uid: string) {
    assertUid(uid);
    await this.ensureRulesExist();

    const [rules, comments] = await Promise.all([
      this.prisma.riskRule.findMany({ where: { enabled: true } }),
      this.prisma.comment.findMany({
        where: { uid },
        orderBy: { pubdate: 'desc' },
      }),
    ]);

    await this.prisma.riskHit.deleteMany({ where: { uid } });

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
      await this.prisma.riskHit.createMany({ data: hits });
    }

    const summary = summarizeHits(hits);

    return {
      uid,
      scannedComments: comments.length,
      hitCount: hits.length,
      ...summary,
    };
  }

  async getSummary(uid: string) {
    assertUid(uid);

    const hits = await this.prisma.riskHit.findMany({
      where: { uid },
      include: {
        comment: true,
        rule: true,
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

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

  private async ensureRulesExist(): Promise<void> {
    const count = await this.prisma.riskRule.count();
    if (count === 0) {
      await this.seedDefaultRules();
    }
  }
}

function matchRule(rule: RiskRule, content: string): string | null {
  const flags = 'iu';
  const expression =
    rule.type === RuleType.keyword
      ? new RegExp(rule.pattern, flags)
      : rule.type === RuleType.regex
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
  const levelBase = level === RiskLevel.high ? 60 : level === RiskLevel.medium ? 30 : 10;
  const impactScore =
    (favoriteCount > 500 ? 25 : favoriteCount > 100 ? 15 : 0) +
    (replyCount > 100 ? 20 : replyCount > 20 ? 10 : 0);

  return Math.min(100, Math.max(levelBase, weight) + impactScore);
}

function summarizeHits(hits: Array<{ level: RiskLevel; category: string; score: number }>) {
  const highCount = hits.filter((hit) => hit.level === RiskLevel.high).length;
  const mediumCount = hits.filter((hit) => hit.level === RiskLevel.medium).length;
  const lowCount = hits.filter((hit) => hit.level === RiskLevel.low).length;
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
    riskLevel: totalScore >= 71 ? RiskLevel.high : totalScore >= 31 ? RiskLevel.medium : RiskLevel.low,
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

