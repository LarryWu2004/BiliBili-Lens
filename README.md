# BiliBili Lens

BiliBili Lens 是一个面向企业 KOL 合作审查与个人历史发言自查的 B站公开评论洞察与风险审查平台。

项目基于 syrds 平台提供的公开评论查询能力，计划实现评论采集、风险规则扫描、证据链溯源、候选人对比和审查报告生成。

## 当前状态

当前仓库处于 MVP 骨架开发阶段，已完成：

- syrds 可用接口验证。
- 项目定位和功能范围梳理。
- MVP、V1、V2 开发阶段划分。
- 数据模型、API 草案、风险规则和评分模型设计。
- monorepo 开发骨架。
- NestJS API 基础服务。
- Prisma 数据模型。
- syrds `/get_replies` 客户端封装和参数校验。
- 单页评论采集入库接口。
- Next.js 工作台页面。

完整开发计划见：

[docs/BiliBili-Lens-Development-Plan.md](docs/BiliBili-Lens-Development-Plan.md)

本地开发说明见：

[docs/Development.md](docs/Development.md)

## 关键约束

- 不使用 syrds `/ai_summary` 接口。
- 核心数据来源为 syrds `/get_replies`。
- 所有接口调用必须检查业务 `code`，不能只看 HTTP 状态。
- UID 必须本地严格校验，禁止前导 0。
- 报告结论仅作为风险提示和人工复核参考。

## 快速开始

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd run prisma:generate
npm.cmd run dev
```

数据库和 Redis 本地服务配置见 [docs/Development.md](docs/Development.md)。
