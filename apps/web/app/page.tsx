'use client';

import { FormEvent, useState } from 'react';
import { Activity, Database, FileSearch, Gauge, RefreshCw, ShieldCheck } from 'lucide-react';
import { checkApiHealth, collectPage, CollectionResult, CommentRow, listComments } from '../lib/api';

const uidPattern = /^[1-9]\d{0,19}$/;

export default function HomePage() {
  const [uid, setUid] = useState('123');
  const [pageSize, setPageSize] = useState(20);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [startDt, setStartDt] = useState('');
  const [endDt, setEndDt] = useState('');
  const [result, setResult] = useState<CollectionResult | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '采集失败');
    } finally {
      setLoading(false);
    }
  }

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
          <div className="nav-item active">
            <Gauge size={18} />
            工作台
          </div>
          <div className="nav-item">
            <FileSearch size={18} />
            评论采集
          </div>
          <div className="nav-item">
            <Activity size={18} />
            风险审查
          </div>
          <div className="nav-item">
            <Database size={18} />
            数据资产
          </div>
        </nav>
        <p className="sidebar-note">
          当前版本聚焦 MVP 闭环：UID 采集、评论入库、基础证据链展示。风险规则扫描将在下一阶段接入。
        </p>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <div className="eyebrow">Public comment review</div>
            <h1>B站公开评论洞察与风险审查平台</h1>
            <p className="subtle">面向 KOL 合作审查与个人历史发言自查，先从可靠的数据采集闭环开始。</p>
          </div>
          <span className={`status ${result ? '' : 'warn'}`}>{result ? '已采集' : '等待采集'}</span>
        </div>

        <div className="grid two">
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
                <button className="button secondary" type="button" onClick={() => setKeyword('')}>
                  清空筛选
                </button>
                <button className="button" type="submit" disabled={loading}>
                  <RefreshCw size={16} />
                  {loading ? '采集中' : '开始采集'}
                </button>
              </div>

              {error ? <div className="error">{error}</div> : null}
            </form>
          </section>

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
            <p className="subtle" style={{ marginTop: 14 }}>
              平台返回的评论总数仅作参考，筛选后的数量和报告统计以后端本地入库数据为准。
            </p>
          </section>
        </div>

        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header">
            <h2 className="panel-title">最近入库评论</h2>
            {result?.requestUrl ? (
              <a className="link" href={result.requestUrl} target="_blank" rel="noreferrer">
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
      </section>
    </main>
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
