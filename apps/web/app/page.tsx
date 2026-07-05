'use client';

import { FormEvent, ReactNode, useState } from 'react';
import {
  Activity,
  Database,
  FileSearch,
  Gauge,
  LucideIcon,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react';
import {
  checkApiHealth,
  collectPage,
  CollectionResult,
  CommentRow,
  listComments,
  RiskHit,
  RiskSummary,
  scanRisk,
} from '../lib/api';

const uidPattern = /^[1-9]\d{0,19}$/;

type ActiveView = 'workspace' | 'collection' | 'risk' | 'assets';

const viewMeta: Record<ActiveView, { eyebrow: string; title: string; description: string }> = {
  workspace: {
    eyebrow: 'Public comment review',
    title: 'B站公开评论洞察与风险审查平台',
    description: '面向 KOL 合作审查与个人历史发言自查，先从可靠的数据采集闭环开始。',
  },
  collection: {
    eyebrow: 'Collection',
    title: '评论采集',
    description: '按 UID、页码、关键词和日期范围拉取公开评论，并写入本地 SQLite 数据库。',
  },
  risk: {
    eyebrow: 'Risk review',
    title: '风险审查',
    description: '基于本地评论库执行规则扫描，把命中内容、风险级别和证据链接集中呈现。',
  },
  assets: {
    eyebrow: 'Data assets',
    title: '数据资产',
    description: '查看当前 UID 的本地入库评论、平台来源链接和后续报告所需的证据材料。',
  },
};

const navItems: Array<{ id: ActiveView; label: string; icon: LucideIcon }> = [
  { id: 'workspace', label: '工作台', icon: Gauge },
  { id: 'collection', label: '评论采集', icon: FileSearch },
  { id: 'risk', label: '风险审查', icon: Activity },
  { id: 'assets', label: '数据资产', icon: Database },
];

export default function HomePage() {
  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [uid, setUid] = useState('123');
  const [pageSize, setPageSize] = useState(20);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [startDt, setStartDt] = useState('');
  const [endDt, setEndDt] = useState('');
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!uidPattern.test(uid)) {
      setError('UID 必须是 1-20 位正整数，且不能以 0 开头。');
      return;
    }

    setLoading(true);
    try {
      await checkApiHealth();
      const collection = await collectPage({
        uid,
        pageNum,
        pageSize,
        keyword: keyword || undefined,
        start_dt: startDt || undefined,
        end_dt: endDt || undefined,
      });
      const rows = await listComments(collection.uid, 20);
      setResult(collection);
      setComments(rows);
      setRiskSummary(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '采集失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleRiskScan() {
    const targetUid = result?.uid || uid;

    if (!uidPattern.test(targetUid)) {
      setError('请先输入有效 UID，或完成一次评论采集后再扫描风险。');
      return;
    }

    setError(null);
    setRiskLoading(true);
    try {
      await checkApiHealth();
      setRiskSummary(await scanRisk(targetUid));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '风险扫描失败');
    } finally {
      setRiskLoading(false);
    }
  }

  const meta = viewMeta[activeView];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <span>BiliBili Lens</span>
        </div>
        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <p className="sidebar-note">
          当前版本聚焦本地 MVP 闭环：UID 采集、评论入库、规则扫描和证据链展示。syrds /ai_summary
          暂不接入。
        </p>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <div className="eyebrow">{meta.eyebrow}</div>
            <h1>{meta.title}</h1>
            <p className="subtle">{meta.description}</p>
          </div>
          <span className={`status ${result ? '' : 'warn'}`}>{result ? '已采集' : '等待采集'}</span>
        </div>

        {error ? <div className="error global-error">{error}</div> : null}

        {activeView === 'workspace' ? (
          <WorkspaceView
            collectionForm={<CollectionForm />}
            collectionSummary={<CollectionSummary result={result} />}
            riskPanel={<RiskPanel riskSummary={riskSummary} onRiskScan={handleRiskScan} disabled={!result && !uid} loading={riskLoading} />}
            commentsTable={<CommentsTable comments={comments} requestUrl={result?.requestUrl} />}
          />
        ) : null}

        {activeView === 'collection' ? (
          <div className="view-stack">
            <div className="grid two">
              <CollectionForm />
              <CollectionSummary result={result} />
            </div>
            <CommentsTable comments={comments} requestUrl={result?.requestUrl} />
          </div>
        ) : null}

        {activeView === 'risk' ? (
          <div className="view-stack">
            <RiskPanel riskSummary={riskSummary} onRiskScan={handleRiskScan} disabled={!result && !uid} loading={riskLoading} />
            <RiskHitsTable hits={riskSummary?.topHits ?? []} />
          </div>
        ) : null}

        {activeView === 'assets' ? (
          <div className="view-stack">
            <DataAssetsSummary result={result} comments={comments} />
            <CommentsTable comments={comments} requestUrl={result?.requestUrl} />
          </div>
        ) : null}
      </section>
    </main>
  );

  function CollectionForm() {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">创建采集任务</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="uid">UID</label>
              <input id="uid" value={uid} onChange={(event) => setUid(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pageNum">页码</label>
              <input
                id="pageNum"
                type="number"
                min={1}
                value={pageNum}
                onChange={(event) => setPageNum(Number(event.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="pageSize">每页数量</label>
              <input
                id="pageSize"
                type="number"
                min={1}
                max={100}
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="keyword">关键词/正则</label>
              <input id="keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="startDt">开始日期</label>
              <input
                id="startDt"
                placeholder="YYYYMMDD"
                value={startDt}
                onChange={(event) => setStartDt(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="endDt">结束日期</label>
              <input
                id="endDt"
                placeholder="YYYYMMDD"
                value={endDt}
                onChange={(event) => setEndDt(event.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setKeyword('');
                setStartDt('');
                setEndDt('');
              }}
            >
              清空筛选
            </button>
            <button className="button" type="submit" disabled={loading}>
              <RefreshCw size={16} />
              {loading ? '采集中' : '开始采集'}
            </button>
          </div>
        </form>
      </section>
    );
  }
}

function WorkspaceView({
  collectionForm,
  collectionSummary,
  riskPanel,
  commentsTable,
}: {
  collectionForm: ReactNode;
  collectionSummary: ReactNode;
  riskPanel: ReactNode;
  commentsTable: ReactNode;
}) {
  return (
    <div className="view-stack">
      <div className="grid two">
        {collectionForm}
        {collectionSummary}
      </div>
      {riskPanel}
      {commentsTable}
    </div>
  );
}

function CollectionSummary({ result }: { result: CollectionResult | null }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">采集摘要</h2>
      </div>
      <div className="metric-row">
        <Metric label="平台评论数" value={result?.platformReviewNum ?? '-'} />
        <Metric label="本次拉取" value={result?.fetchedCount ?? '-'} />
        <Metric label="本地累计" value={result?.localCommentCount ?? '-'} />
        <Metric label="任务状态" value={result?.task.status ?? '-'} />
      </div>
      <p className="subtle panel-note">
        平台返回的评论总数仅作参考，筛选后的数量和报告统计以后端本地入库数据为准。
      </p>
    </section>
  );
}

function RiskPanel({
  riskSummary,
  onRiskScan,
  disabled,
  loading,
}: {
  riskSummary: RiskSummary | null;
  onRiskScan: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">风险扫描</h2>
        <button className="button secondary" type="button" onClick={onRiskScan} disabled={disabled || loading}>
          <ScanSearch size={16} />
          {loading ? '扫描中' : '扫描风险'}
        </button>
      </div>
      <div className="metric-row">
        <Metric label="风险分" value={riskSummary?.totalScore ?? '-'} />
        <Metric label="风险等级" value={riskSummary?.riskLevel ?? '-'} />
        <Metric label="高风险命中" value={riskSummary?.highCount ?? '-'} />
        <Metric label="总命中数" value={riskSummary?.hitCount ?? '-'} />
      </div>
      <p className="subtle panel-note">
        当前扫描基于可配置规则引擎，结论仅作为风险提示和人工复核入口。
      </p>
    </section>
  );
}

function DataAssetsSummary({ result, comments }: { result: CollectionResult | null; comments: CommentRow[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">本地数据资产</h2>
      </div>
      <div className="metric-row">
        <Metric label="当前 UID" value={result?.uid ?? '-'} />
        <Metric label="本地评论数" value={result?.localCommentCount ?? comments.length} />
        <Metric label="最近展示" value={comments.length} />
        <Metric label="证据链接" value={comments.filter((comment) => comment.link).length} />
      </div>
      <p className="subtle panel-note">
        这里展示的是已经进入本地数据库的数据，后续报告、规则复核和导出都应以本地数据为准。
      </p>
    </section>
  );
}

function CommentsTable({ comments, requestUrl }: { comments: CommentRow[]; requestUrl?: string }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">最近入库评论</h2>
        {requestUrl ? (
          <a className="link" href={requestUrl} target="_blank" rel="noreferrer">
            查看 syrds 请求
          </a>
        ) : null}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>发布时间</th>
              <th>评论内容</th>
              <th>视频</th>
              <th>UP 主</th>
              <th>互动</th>
              <th>证据</th>
            </tr>
          </thead>
          <tbody>
            {comments.length ? (
              comments.map((comment) => (
                <tr key={comment.id}>
                  <td>{comment.pubdate ? new Date(comment.pubdate).toLocaleString('zh-CN') : '-'}</td>
                  <td>
                    <div className="comment-text">{comment.content}</div>
                  </td>
                  <td>{comment.videoTitle ?? '-'}</td>
                  <td>{comment.videoOwnerName ?? '-'}</td>
                  <td>
                    赞 {comment.favoriteCount} / 回复 {comment.replyCount}
                  </td>
                  <td>
                    {comment.link ? (
                      <a className="link" href={comment.link} target="_blank" rel="noreferrer">
                        原链接
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>暂无评论数据。输入 UID 后开始采集。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RiskHitsTable({ hits }: { hits: RiskHit[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">风险命中证据</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>等级</th>
              <th>规则</th>
              <th>命中原因</th>
              <th>评论内容</th>
              <th>证据</th>
            </tr>
          </thead>
          <tbody>
            {hits.length ? (
              hits.map((hit) => (
                <tr key={hit.id}>
                  <td>{hit.level}</td>
                  <td>{hit.ruleName}</td>
                  <td>{hit.reason}</td>
                  <td>
                    <div className="comment-text">{hit.comment.content}</div>
                  </td>
                  <td>
                    {hit.comment.link ? (
                      <a className="link" href={hit.comment.link} target="_blank" rel="noreferrer">
                        原链接
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>暂无风险命中。完成采集后可执行风险扫描。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
