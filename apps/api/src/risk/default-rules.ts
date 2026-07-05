import { RiskLevel, RuleType } from '../local-db/local-db.types';

export interface DefaultRiskRule {
  name: string;
  category: string;
  type: RuleType;
  pattern: string;
  weight: number;
  level: RiskLevel;
  reason: string;
}

export const defaultRiskRules: DefaultRiskRule[] = [
  {
    name: '疑似手机号泄露',
    category: 'privacy',
    type: 'regex',
    pattern: '1[3-9]\\d{9}',
    weight: 60,
    level: 'high',
    reason: '评论中疑似包含手机号，存在个人隐私泄露风险。',
  },
  {
    name: '疑似邮箱泄露',
    category: 'privacy',
    type: 'regex',
    pattern: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    weight: 45,
    level: 'medium',
    reason: '评论中疑似包含邮箱地址，建议复核是否暴露个人联系方式。',
  },
  {
    name: '攻击性表达',
    category: 'abuse',
    type: 'keyword',
    pattern: '垃圾|废物|脑残|滚|傻逼|sb|弱智',
    weight: 35,
    level: 'medium',
    reason: '评论中包含明显攻击性表达，可能影响公开形象。',
  },
  {
    name: '低俗表达',
    category: 'vulgar',
    type: 'keyword',
    pattern: '恶心|下头|低俗|黄色|开黄腔',
    weight: 20,
    level: 'low',
    reason: '评论中包含低俗或负面表达，建议结合上下文复核。',
  },
  {
    name: '极端情绪表达',
    category: 'extreme_emotion',
    type: 'keyword',
    pattern: '气死|去死|毁灭|拉黑|封杀|举报死',
    weight: 30,
    level: 'medium',
    reason: '评论中包含强烈情绪化表达，建议人工确认语境。',
  },
  {
    name: '品牌安全关注',
    category: 'brand_safety',
    type: 'keyword',
    pattern: '抵制|避雷|诈骗|割韭菜|翻车|塌房',
    weight: 30,
    level: 'medium',
    reason: '评论中涉及品牌安全相关表达，适合合作前重点复核。',
  },
];
