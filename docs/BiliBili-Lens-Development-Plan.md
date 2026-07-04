# BiliBili Lens 开发计划

> BiliBili Lens 是一个面向企业 KOL 合作审查与个人历史发言自查的 B站公开评论洞察与风险审查平台。系统基于 syrds 平台提供的公开评论查询能力，构建评论采集、风险规则扫描、证据链溯源、候选人对比和审查报告生成能力。

## 1. 项目定位

### 1.1 产品名称

**BiliBili Lens**

### 1.2 一句话定位

基于 B站公开评论数据，为企业 KOL 合作审查和个人历史发言自查提供评论采集、风险识别、证据链溯源和报告导出能力。

### 1.3 目标用户

- **企业用户**：品牌方、MCN、运营团队、商务团队。
- **个人用户**：求职、考公、自媒体商业化、签约前需要自查历史公开评论的用户。
- **运营用户**：活动报名筛查、社群准入筛查、合作候选人初筛人员。

### 1.4 核心价值

企业端：

- 降低 KOL 合作前的品牌安全风险。
- 快速发现公开评论中的攻击、低俗、隐私泄露、争议话题等风险。
- 提供可解释、可复核、可导出的证据链。
- 支持多个候选人横向比较。
- 建立标准化审查流程和审计留痕。

个人端：

- 快速定位历史公开评论中的潜在风险。
- 知道每条风险评论的命中原因。
- 通过原始链接自行复核和处理。
- 生成个人公开发言自查报告。

## 2. 重要约束与接口结论

### 2.1 syrds 接口使用范围

已验证可用接口：

```text
GET /get_replies
GET /reviews
GET /get_notice
```

不使用接口：

```text
GET /ai_summary
POST /feedback
```

原因：

- `/ai_summary` 当前不可稳定使用，项目设计中完全排除。
- `/feedback` 与 BiliBili Lens 核心业务无关。

### 2.2 syrds 基础地址

当前可用地址：

```text
http://120.55.124.239
```

未来可能迁移到：

```text
https://syrds.pro
```

实现要求：

- 后端必须允许通过环境变量覆盖 syrds base URL。
- 不要把 base URL 写死在业务代码中。

建议环境变量：

```env
SYRDS_BASE_URL=http://120.55.124.239
```

### 2.3 `/get_replies` 测试结论

请求示例：

```text
GET /get_replies?uid=123&pageSize=5&pageNum=1
```

返回字段：

```json
{
  "code": 0,
  "msg": "",
  "uid": "123",
  "current_name": "走失的脑叶",
  "all_names": "[\"莫眠俱乐部\",\"走失的脑叶\"]",
  "review_num": 13,
  "data": []
}
```

评论字段：

```text
bvid
video_owner_name
title
user_name
user_id
reply_type
content
pubdate
favorite
reply
dt
link
```

实现注意：

- HTTP 状态通常是 `200`，必须检查 JSON `code`。
- `pageSize` 最大值为 `100`。
- `pageNum` 从 `1` 开始。
- `keyword` 支持正则风格过滤。
- `start_dt` 和 `end_dt` 使用 `YYYYMMDD`。
- 日期过滤可用，但 `review_num` 不一定等于过滤后的结果总数。
- 本地系统必须基于入库数据自己统计筛选结果数量。

### 2.4 `/reviews` 测试结论

构造示例：

```text
GET /reviews?uid=123&pageNum=1&keyword=...&start_dt=20260501&end_dt=20260531
```

测试结论：

- 页面可访问，HTTP `200`。
- 返回 HTML。
- 页面内部固定使用 `pageSize=75`。

使用方式：

- 只作为外部复核页面或辅助分享链接。
- 不作为 BiliBili Lens 的核心数据源。
- BiliBili Lens 内部证据链以本地入库评论和原始 `link` 字段为准。

### 2.5 `/get_notice` 测试结论

可用 location：

```text
homepage
dump_replies
all
```

返回字段：

```text
title
content
```

可用于：

- 系统状态页。
- 数据免责声明。
- 显示 syrds 平台公告。

### 2.6 错误码与边界行为

缺少 UID：

```json
{
  "code": 2,
  "msg": "key 'uid' is required"
}
```

非法 UID：

```json
{
  "code": 4,
  "msg": "pageSize, pageNum, uid must be integers"
}
```

日期格式错误：

```json
{
  "code": 4,
  "msg": "日期格式: YYYYMMDD，例如: 20251001"
}
```

重要边界：

- `uid=0123` 会被 syrds 服务端当成 `123` 查询成功。
- BiliBili Lens 必须在本地禁止前导 0。

UID 校验规则：

```ts
/^[1-9]\d{0,19}$/
```

日期校验规则：

```ts
/^\d{8}$/
```

并额外校验日期是真实日期。

### 2.7 限流约束

syrds 查询接口限制：

```text
/get_replies 和 /ai_summary 共用限制
同一来源 60 秒最多 10 次
触发后返回 code=429
临时阻断返回 code=412
```

项目不使用 `/ai_summary`，但仍必须对 `/get_replies` 做限流。

实现要求：

- 全局请求速率不要超过 10 次 / 60 秒。
- 推荐保守策略：每 7 秒最多 1 次请求。
- 对 `code=429` 停止自动重试，任务进入 `rate_limited`。
- 对 `code=412` 暂停该任务至少 600 秒。
- 不允许无限重试。

### 2.8 数据完整性免责声明

syrds 公告明确说明：

- 数据来自公开接口抓取后的本地库。
- 评论可能不完整。
- 评论更新可能存在延迟。
- 不提供自动化全量评论导出接口。

BiliBili Lens 所有报告必须包含免责声明：

```text
本报告仅基于 syrds 当前可返回的公开评论数据生成，不代表目标 UID 的完整 B站评论历史。报告结论仅用于风险提示和人工复核参考，不构成最终事实判定。
```

## 3. 推荐技术栈

### 3.1 全栈技术方案

```text
Frontend:
Next.js
TypeScript
Tailwind CSS
TanStack Table
ECharts 或 Recharts
React Hook Form
Zod

Backend:
NestJS
TypeScript
Prisma

Database:
PostgreSQL

Cache / Queue:
Redis
BullMQ

Report:
HTML template
Playwright PDF

Deploy:
Docker Compose
Nginx
```

### 3.2 选择理由

- TypeScript 前后端统一，降低上下文切换成本。
- NestJS 适合组织企业级后端模块。
- Prisma 便于维护 schema 和迁移。
- Redis + BullMQ 适合处理 syrds 限流和采集任务。
- PostgreSQL 足够支撑结构化存储、统计、全文搜索和索引优化。
- Next.js 适合快速构建可演示的 Dashboard 产品。

## 4. 系统架构

### 4.1 核心数据流

```text
用户创建个人自查或企业审查项目
        ↓
输入 UID 或批量 UID
        ↓
创建 collection task
        ↓
BullMQ 按限流策略调度任务
        ↓
调用 syrds /get_replies
        ↓
清洗评论并写入 PostgreSQL
        ↓
执行风险规则扫描
        ↓
生成 risk hits 和 risk score
        ↓
展示 Dashboard、证据链、候选人对比
        ↓
导出 HTML / PDF 报告
```

### 4.2 后端模块划分

```text
SyrdsModule
CollectionModule
UserProfileModule
CommentModule
RiskRuleModule
RiskScanModule
RiskScoreModule
ProjectModule
CandidateModule
ReportModule
AuditLogModule
```

### 4.3 前端页面划分

```text
/                         工作台
/personal/new             创建个人自查
/projects                 企业审查项目列表
/projects/new             创建企业审查项目
/projects/:id             企业项目 Dashboard
/projects/:id/candidates  候选人列表与对比
/profiles/:uid            UID 用户画像
/profiles/:uid/comments   评论检索
/profiles/:uid/risks      风险证据链
/reports/:id              报告预览
/rules                    风险规则管理
/tasks/:id                采集任务进度
```

## 5. 产品功能设计

### 5.1 工作台

目标：

- 用户进入系统后直接开始使用，不做营销页。

功能：

- 创建个人自查。
- 创建企业审查项目。
- 查看最近任务。
- 查看最近报告。
- 查看 syrds 公告或接口状态。

### 5.2 个人自查模式

流程：

```text
输入 UID
选择日期范围，可选
开始采集
等待任务完成
查看画像和风险结果
生成个人自查报告
```

功能：

- 单 UID 查询。
- 评论采集和入库。
- 风险扫描。
- 风险评论列表。
- 原始链接跳转。
- HTML 报告。

### 5.3 企业审查模式

流程：

```text
创建审查项目
批量添加候选人 UID
系统排队采集
生成候选人风险分
横向比较候选人
人工标记审查结论
导出审查报告
```

功能：

- 项目管理。
- 候选人管理。
- 批量 UID 导入。
- 候选人风险排行。
- 候选人对比。
- 审查状态流转。
- 企业审查报告。

候选人状态：

```text
pending
reviewing
passed
needs_review
rejected
```

### 5.4 评论采集

功能：

- 单 UID 分页采集。
- 批量 UID 排队采集。
- 支持日期范围。
- 支持任务状态展示。
- 支持失败重试。
- 支持去重入库。
- 支持跳过已采集评论。

采集策略：

- 默认 `pageSize=100`。
- 从 `pageNum=1` 开始。
- 当返回 `data.length === 0` 时停止。
- 当已采集数量达到可估算上限时停止。
- 不完全依赖 `review_num` 判断完成。

任务状态：

```text
pending
running
rate_limited
blocked
completed
failed
cancelled
```

### 5.5 评论检索

基础检索条件：

- UID。
- 关键词。
- 日期范围。
- UP 主名称。
- 视频标题。
- 风险等级。
- 风险分类。
- 是否命中风险。

排序：

- 发布时间。
- 获赞数。
- 回复数。
- 风险分。

后续增强：

- PostgreSQL full text search。
- trigram 模糊搜索。
- 查询条件保存。
- 查询快照。

### 5.6 风险规则引擎

规则类型：

```text
keyword
regex
composite
whitelist
```

规则分类：

```text
abuse              攻击辱骂
vulgar             低俗表达
discrimination     歧视偏见
privacy            隐私泄露
extreme_emotion    极端情绪
controversy        争议话题
brand_safety       品牌安全
career_image       职业形象风险
```

规则字段：

```text
name
category
type
pattern
weight
level
reason
enabled
version
```

规则示例：

```json
{
  "name": "疑似手机号泄露",
  "category": "privacy",
  "type": "regex",
  "pattern": "1[3-9]\\\\d{9}",
  "weight": 60,
  "level": "high",
  "reason": "评论中疑似包含手机号，存在个人隐私泄露风险"
}
```

```json
{
  "name": "攻击性表达",
  "category": "abuse",
  "type": "keyword",
  "pattern": "垃圾|废物|滚|脑残",
  "weight": 35,
  "level": "medium",
  "reason": "评论中包含明显攻击性表达"
}
```

### 5.7 风险评分

单条评论风险分：

```text
comment_score = rule_score + impact_score
final_comment_score = comment_score * time_decay
```

规则基础分：

```text
low: 10
medium: 30
high: 60
```

传播影响分：

```text
favorite > 100: +15
favorite > 500: +25
reply > 20: +10
reply > 100: +20
```

时间权重：

```text
近 1 年: x1.0
1-3 年: x0.8
3-5 年: x0.6
5 年以上: x0.4
```

UID 总风险分：

```text
uid_score =
  high_risk_count_weight
  + medium_risk_count_weight
  + recent_risk_weight
  + impact_weight
```

最终等级：

```text
0-30: low
31-70: medium
71-100: high
```

展示文案要求：

- 使用“风险提示”“建议复核”“审查建议”。
- 不使用“最终判定”“违法”“违规”等绝对表述。
- 所有结论必须可以展开查看命中证据。

### 5.8 证据链

每条风险评论展示：

```text
评论内容
命中词高亮
风险等级
风险分类
命中规则
风险原因
视频标题
UP 主名称
发布时间
获赞数
回复数
原始链接
查询时间
规则版本
```

证据链要求：

- 能从风险结论跳到原始评论链接。
- 能看到具体命中规则和原因。
- 能看到扫描时使用的规则版本。
- 报告中应保留查询条件和生成时间。

### 5.9 Dashboard

个人 Dashboard：

```text
评论总数
已采集评论数
风险评论数
高风险评论数
风险等级
风险类型分布
评论时间趋势
风险评论时间趋势
高频风险词
建议复查列表
```

企业 Dashboard：

```text
项目候选人数
已完成审查人数
高风险候选人数
待复核人数
平均风险分
风险类型分布
候选人风险排行
最近审查任务
```

图表：

```text
折线图：评论数量时间趋势
柱状图：风险类型数量
环图：风险等级占比
热力图：评论活跃时段
表格：高风险评论明细
排行表：候选人风险排行
```

### 5.10 候选人对比

对比字段：

```text
UID
昵称
评论总数
已采集评论数
风险总分
风险等级
高风险评论数
中风险评论数
最近风险评论时间
主要风险类型
最高传播风险评论
审查建议
```

审查建议：

```text
建议通过
建议人工复核
不建议合作
```

建议必须可解释。例如：

```text
建议人工复核：近 12 个月内存在 3 条高风险攻击性评论，其中 1 条获赞超过 100。
```

### 5.11 报告导出

报告类型：

```text
个人公开发言自查报告
单个候选人审查报告
企业项目候选人对比报告
风险评论明细报告
```

报告内容：

```text
报告标题
生成时间
查询条件
数据来源说明
UID 基本信息
评论数据范围
风险总览
风险类型分布
高风险证据列表
人工复核建议
免责声明
```

实现策略：

- MVP 先做 HTML 报告。
- V1 再用 Playwright 将 HTML 渲染为 PDF。
- 报告生成后写入 `reports` 表。

## 6. 数据模型草案

### 6.1 users

```text
id
uid
current_name
all_names
comment_count
first_comment_at
last_comment_at
created_at
updated_at
```

### 6.2 comments

```text
id
uid
bvid
video_title
video_owner_name
content
pubdate
dt
favorite_count
reply_count
reply_type
link
content_hash
created_at
updated_at
```

唯一约束建议：

```text
uid + link
```

如果 link 缺失，则使用：

```text
uid + bvid + content_hash + pubdate
```

### 6.3 review_projects

```text
id
name
type              personal / enterprise
description
owner_name
created_at
updated_at
```

### 6.4 project_candidates

```text
id
project_id
uid
display_name
remark
review_status    pending / reviewing / passed / needs_review / rejected
risk_level
risk_score
created_at
updated_at
```

### 6.5 collection_tasks

```text
id
uid
project_id
status
page_num
page_size
total_count
fetched_count
error_code
error_message
started_at
finished_at
created_at
updated_at
```

### 6.6 risk_rules

```text
id
name
category
type
pattern
weight
level
reason
enabled
version
created_at
updated_at
```

### 6.7 risk_hits

```text
id
uid
comment_id
rule_id
rule_version
category
level
score
matched_text
reason
created_at
```

### 6.8 risk_scores

```text
id
uid
project_id
total_score
risk_level
high_count
medium_count
low_count
last_risk_at
created_at
updated_at
```

### 6.9 reports

```text
id
project_id
uid
type
title
html_path
pdf_path
created_at
```

### 6.10 audit_logs

```text
id
project_id
action
operator
target_uid
metadata
created_at
```

## 7. 后端 API 草案

### 7.1 系统状态

```text
GET /api/health
GET /api/syrds/notices
```

### 7.2 项目

```text
POST   /api/projects
GET    /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### 7.3 候选人

```text
POST  /api/projects/:id/candidates
GET   /api/projects/:id/candidates
PATCH /api/candidates/:id/status
GET   /api/candidates/:uid/profile
```

### 7.4 采集任务

```text
POST /api/collection-tasks
GET  /api/collection-tasks/:id
POST /api/collection-tasks/:id/retry
POST /api/collection-tasks/:id/cancel
```

### 7.5 评论

```text
GET /api/comments
GET /api/comments/:id
GET /api/comments/search
```

### 7.6 风险

```text
POST /api/risk/scan/:uid
GET  /api/risk/summary/:uid
GET  /api/risk/hits
GET  /api/risk/rules
POST /api/risk/rules
PATCH /api/risk/rules/:id
DELETE /api/risk/rules/:id
```

### 7.7 报告

```text
POST /api/reports
GET  /api/reports/:id
GET  /api/reports/:id/export/pdf
```

## 8. 开发阶段

### Phase 1：项目骨架

目标：

- 跑通前端、后端、数据库、Redis 和 Docker。

任务：

- 初始化 Next.js 前端。
- 初始化 NestJS 后端。
- 配置 PostgreSQL。
- 配置 Prisma。
- 配置 Redis。
- 配置 Docker Compose。
- 建立基础布局。
- 建立 API 健康检查。

验收：

```text
前端可访问
后端 API 可访问
数据库迁移成功
Redis 连接成功
Docker Compose 可一键启动
```

### Phase 2：syrds 评论采集

目标：

- 输入 UID 后能拉取评论并入库。

任务：

- 封装 `SyrdsClient`。
- 实现 `/get_replies` 调用。
- 处理业务 `code`。
- 实现 UID、日期、分页参数校验。
- 实现分页采集。
- 实现评论去重。
- 写入 `users` 和 `comments`。
- 创建 `collection_tasks`。
- 页面展示任务状态。

验收：

```text
输入 UID 后能采集评论
评论能入库
任务状态能更新
接口错误能显示
重复采集不会重复入库
非法 UID 会在本地被拒绝
```

### Phase 3：风险规则引擎

目标：

- 能扫描评论并生成风险命中。

任务：

- 建立 `risk_rules` 表。
- 初始化内置规则。
- 实现关键词匹配。
- 实现正则匹配。
- 实现 `risk_hits` 生成。
- 实现风险分计算。
- 实现风险等级计算。
- 建立规则管理页面。

验收：

```text
评论能被规则命中
命中结果包含规则、原因、等级、命中文本
UID 能生成总风险分
规则可以启用和禁用
```

### Phase 4：Dashboard 与评论检索

目标：

- 产品可用、可演示。

任务：

- 用户画像页。
- 评论趋势图。
- 风险类型分布图。
- 风险评论列表。
- 评论搜索。
- 日期筛选。
- 风险等级筛选。
- 命中高亮。

验收：

```text
能查看 UID 总览
能搜索评论
能筛选风险评论
图表数据正确
点击评论能跳转原始链接
```

### Phase 5：企业审查项目

目标：

- 支持企业多 UID 审查。

任务：

- 创建 `review_projects`。
- 批量添加候选人。
- 候选人状态管理。
- 批量采集任务。
- 候选人风险排行。
- 候选人对比表。

验收：

```text
能创建企业审查项目
能批量添加 UID
能批量分析
能对比候选人风险
能标记审查状态
```

### Phase 6：证据链与报告导出

目标：

- 形成完整业务闭环。

任务：

- 证据链详情页。
- 查询条件快照。
- 规则版本记录。
- HTML 报告模板。
- 个人报告。
- 候选人报告。
- 企业对比报告。
- PDF 导出。

验收：

```text
每条风险都有可解释证据
报告能生成
报告包含查询条件、规则版本和原始链接
PDF 能正常导出
报告包含数据完整性免责声明
```

### Phase 7：工程化优化

目标：

- 提高项目稳定性、可维护性和简历含金量。

任务：

- Redis 缓存。
- BullMQ 限流队列。
- 失败重试策略。
- API 参数校验。
- 日志记录。
- 审计日志。
- 单元测试。
- E2E 测试。
- Docker 部署文档。
- OpenAPI 文档。

验收：

```text
接口限流稳定
任务失败可重试
关键模块有测试
项目可 Docker 一键启动
README 完整
```

## 9. MVP 范围

第一版只做：

```text
1. 单 UID 评论采集
2. 评论入库
3. 风险规则扫描
4. 风险评论列表
5. 用户风险 Dashboard
6. 原始链接证据链
7. HTML 报告
```

暂时不做：

```text
批量 UID
PDF 导出
语义搜索
权限系统
复杂企业流程
多租户
AI 摘要
```

MVP 验收标准：

```text
输入一个 UID 后，系统能采集评论、扫描风险、展示风险证据，并生成一份 HTML 自查报告。
```

## 10. V1 完整版范围

在 MVP 上增加：

```text
1. 企业项目
2. 批量候选人
3. BullMQ 队列
4. Redis 限流
5. 候选人对比
6. 规则管理
7. PDF 报告
8. 审计日志
```

## 11. V2 增强版范围

后续增强：

```text
1. PostgreSQL 全文搜索
2. Meilisearch 搜索
3. 风险规则测试沙盒
4. 报告模板自定义
5. 用户登录
6. 组织空间
7. 审核流转
8. 评论兴趣画像
9. 活跃时间热力图
10. 规则命中统计分析
```

## 12. 关键工程注意事项

### 12.1 不要依赖 AI 摘要

项目不接入 `/ai_summary`，也不把 AI 摘要作为任何核心功能前置条件。

### 12.2 必须检查业务 code

syrds 查询接口即使业务失败也可能返回 HTTP `200`。

正确处理：

```text
先看 HTTP 状态
再解析 JSON
最后检查 code
```

### 12.3 本地校验必须严格

UID：

```ts
/^[1-9]\d{0,19}$/
```

pageSize：

```text
1 <= pageSize <= 100
```

pageNum：

```text
pageNum >= 1
```

日期：

```text
YYYYMMDD
必须是真实日期
start_dt <= end_dt
```

### 12.4 不要完全相信 review_num

`review_num` 可作为参考，不可作为强一致总数。

本地系统应该：

- 基于实际入库评论数统计已采集数量。
- 基于本地查询条件统计筛选结果数量。
- 在 UI 上区分“平台返回评论数”和“本地已采集评论数”。

### 12.5 证据链必须可复核

每个风险结论必须能追踪到：

- 原始评论。
- 原始链接。
- 命中规则。
- 规则版本。
- 查询时间。
- 扫描时间。

### 12.6 风险结论必须谨慎表达

推荐文案：

- 风险提示。
- 建议复核。
- 可能存在。
- 命中规则。
- 审查建议。

避免文案：

- 违规。
- 违法。
- 实锤。
- 确认有问题。
- 最终判定。

## 13. README 中应展示的项目亮点

可写入简历的技术点：

```text
- 基于 syrds 公开评论接口构建 B站 UID 评论采集与结构化存储流程。
- 使用 Redis + BullMQ 适配第三方接口 10 次 / 60 秒限流约束。
- 设计可配置风险规则引擎，支持关键词、正则、权重、风险分类和规则启停。
- 构建风险评分模型，结合规则命中、互动传播和时间衰减生成风险等级。
- 实现证据链审查页面，保留原始评论链接、命中规则、查询条件和规则版本。
- 使用 PostgreSQL 存储评论、规则、任务和报告数据，支持评论检索与统计分析。
- 基于 Next.js + ECharts 构建企业级审查 Dashboard 和候选人对比视图。
- 支持个人历史发言自查和企业 KOL 合作前审查两类业务场景。
```

## 14. 推荐开发顺序

严格按下面顺序推进：

```text
1. 项目骨架
2. 数据库 schema
3. syrds client
4. 单 UID 评论采集
5. 评论入库和去重
6. 风险规则扫描
7. 风险结果页面
8. Dashboard
9. HTML 报告
10. 企业项目和批量候选人
11. BullMQ 限流队列
12. PDF 报告
13. 工程化测试和部署
```

不要从复杂 UI 或企业流程开始。先打通：

```text
UID -> 评论 -> 入库 -> 风险命中 -> 证据链 -> 报告
```

这是 BiliBili Lens 的最小闭环。
