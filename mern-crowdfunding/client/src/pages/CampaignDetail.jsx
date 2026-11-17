import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { getSocket } from '../socket';
import { CATEGORIES, STATUS_LABELS, formatINR, categoryLabel } from '../data/config';
import FundingBar from '../components/FundingBar';
import CountdownRing from '../components/CountdownRing';
import PledgeSlider from '../components/PledgeSlider';
import CampaignArt from '../components/CampaignArt';
import Dialog from '../components/Dialog';

function useAnimatedNumber(value) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = Number(value) || 0;
    prev.current = to;
    if (from === to) {
      setDisplay(to);
      return undefined;
    }
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      setDisplay(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return display;
}

export default function CampaignDetail({ campaignId, hint, user, onGo, onRequireAuth, notify, pledgeTick }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feed, setFeed] = useState([]);
  const [flash, setFlash] = useState(false);
  const [pledgeOpen, setPledgeOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [rewardId, setRewardId] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [pledgeBusy, setPledgeBusy] = useState(false);
  const [pledgeError, setPledgeError] = useState('');
  const [pledgeDone, setPledgeDone] = useState(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateBody, setUpdateBody] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updateBusy, setUpdateBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', tagline: '', story: '', category: '' });
  const [editError, setEditError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .campaign(campaignId)
      .then((res) => {
        setData(res);
        setFeed(res.pledges || []);
        const c = res.campaign;
        setAmount(Math.max(Number(c.minimumPledge) || 1, 1));
      })
      .catch((e) => setError(e.message || 'Could not load this campaign.'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when App reports a live pledge for this campaign.
  useEffect(() => {
    if (pledgeTick > 0) load();
  }, [pledgeTick, load]);

  // Live pledge feed for this campaign.
  useEffect(() => {
    const socket = getSocket(campaignId);
    const onPledge = (payload) => {
      if (!payload || payload.campaignId !== campaignId) return;
      setFeed((f) => [
        { amount: payload.amount, backerName: payload.backerName || 'A backer', createdAt: new Date().toISOString() },
        ...f,
      ].slice(0, 20));
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          campaign: {
            ...d.campaign,
            pledgedTotal: payload.pledgedTotal ?? d.campaign.pledgedTotal,
            backerCount: payload.backerCount ?? d.campaign.backerCount,
            percentFunded:
              payload.pledgedTotal != null && d.campaign.goal
                ? Math.round((payload.pledgedTotal / d.campaign.goal) * 100)
                : d.campaign.percentFunded,
          },
        };
      });
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    };
    socket.on('pledge:new', onPledge);
    return () => {
      socket.off('pledge:new', onPledge);
    };
  }, [campaignId]);

  const campaign = data?.campaign;
  const animatedPledged = useAnimatedNumber(campaign?.pledgedTotal || 0);
  const animatedBackers = useAnimatedNumber(campaign?.backerCount || 0);

  if (loading) return <div className="page"><p className="empty-note">Loading campaign…</p></div>;
  if (error || !campaign) {
    return (
      <div className="page">
        <p className="form-error" role="alert">{error || 'Campaign not found.'}</p>
        <button type="button" className="btn btn-ghost" onClick={() => onGo({ name: 'browse' })}>Back to browse</button>
      </div>
    );
  }

  const isOwner =
    !!user && (user.role === 'admin' || (campaign.creator?.email && user.email === campaign.creator.email));
  const canPledge = campaign.status === 'live';
  const selectedReward = (campaign.rewards || []).find((r) => r._id === rewardId) || null;
  const remaining = (r) => (r.quantity == null ? 'Unlimited' : `${Math.max(0, r.quantity - (r.claimed || 0))} left`);
  const isSoldOut = (r) => r.quantity != null && (r.claimed || 0) >= r.quantity;

  function openPledge() {
    if (!user) {
      onRequireAuth();
      return;
    }
    setPledgeError('');
    setPledgeDone(null);
    setPledgeOpen(true);
  }

  function pickReward(r) {
    if (isSoldOut(r)) return;
    setRewardId(r._id);
    setAmount(Math.max(Number(r.amount), Number(campaign.minimumPledge) || 1));
  }

  async function confirmPledge() {
    setPledgeError('');
    setPledgeBusy(true);
    try {
      const res = await api.createPledge(campaignId, {
        amount,
        rewardId: rewardId || undefined,
        anonymous,
      });
      setPledgeDone(res);
      setData((d) => ({
        ...d,
        campaign: { ...d.campaign, ...res.campaign },
        pledges: [{ amount, backerName: anonymous ? 'Anonymous' : user.name, createdAt: new Date().toISOString() }, ...(d.pledges || [])],
      }));
      setFeed((f) => [{ amount, backerName: anonymous ? 'Anonymous' : user.name, createdAt: new Date().toISOString() }, ...f].slice(0, 20));
      notify(`Pledge of ${formatINR(amount)} recorded — thank you!`, 'success');
    } catch (e) {
      setPledgeError(e.message || 'Pledge failed. Try again.');
    } finally {
      setPledgeBusy(false);
    }
  }

  async function postComment(e) {
    e.preventDefault();
    setCommentError('');
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!commentBody.trim()) {
      setCommentError('Write a comment first.');
      return;
    }
    if (commentBody.length > 500) {
      setCommentError('Comments are limited to 500 characters.');
      return;
    }
    setCommentBusy(true);
    try {
      await api.createComment(campaignId, { body: commentBody.trim() });
      setCommentBody('');
      load();
    } catch (err) {
      setCommentError(err.message || 'Could not post the comment.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function postUpdate(e) {
    e.preventDefault();
    setUpdateError('');
    if (!updateTitle.trim() || !updateBody.trim()) {
      setUpdateError('Both a title and body are required for an update.');
      return;
    }
    setUpdateBusy(true);
    try {
      await api.createUpdate(campaignId, { title: updateTitle.trim(), body: updateBody.trim() });
      setUpdateTitle('');
      setUpdateBody('');
      notify('Update posted.', 'success');
      load();
    } catch (err) {
      setUpdateError(err.message || 'Could not post the update.');
    } finally {
      setUpdateBusy(false);
    }
  }

  async function doAction(fn, successMsg) {
    setActionError('');
    setActionBusy(true);
    try {
      await fn();
      notify(successMsg, 'success');
      load();
    } catch (e) {
      setActionError(e.message || 'That action failed.');
    } finally {
      setActionBusy(false);
    }
  }

  function openEdit() {
    setEditForm({
      title: campaign.title,
      tagline: campaign.tagline || '',
      story: campaign.story || '',
      category: campaign.category,
    });
    setEditError('');
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError('');
    if (!editForm.title.trim()) {
      setEditError('A title is required.');
      return;
    }
    try {
      await api.updateCampaign(campaignId, {
        title: editForm.title.trim(),
        tagline: editForm.tagline.trim(),
        story: editForm.story.trim(),
        category: editForm.category,
      });
      setEditOpen(false);
      notify('Campaign updated.', 'success');
      load();
    } catch (err) {
      setEditError(err.message || 'Could not save changes.');
    }
  }

  async function deleteCampaign() {
    setActionBusy(true);
    try {
      await api.deleteCampaign(campaignId);
      notify('Draft campaign deleted.', 'success');
      onGo({ name: 'dashboard' });
    } catch (e) {
      setActionError(e.message || 'Could not delete the campaign.');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="page campaign-detail">
      <button type="button" className="link-btn back-link" onClick={() => onGo({ name: 'browse' })}>
        ← All campaigns
      </button>
      {hint === 'publish' && campaign.status === 'draft' ? (
        <p className="hint-banner" role="status">
          Your draft is saved. Publish when ready — use “Publish campaign” in Creator actions below.
        </p>
      ) : null}
      <div className={`detail-head${flash ? ' is-flash' : ''}`}>
        <div className="detail-head-main">
          <p className="section-label">
            {categoryLabel(campaign.category)} · {STATUS_LABELS[campaign.status] || campaign.status}
            {campaign.isSample ? ' · Sample campaign' : ''}
          </p>
          <h1>{campaign.title}</h1>
          {campaign.tagline ? <p className="page-sub">{campaign.tagline}</p> : null}
          <p className="detail-creator">
            By {campaign.creator?.name || 'Unknown creator'}
            {campaign.creator?.email ? ` (${campaign.creator.email})` : ''}
          </p>
        </div>
        <CampaignArt title={campaign.title} category={campaign.category} size="large" />
      </div>

      <div className="detail-split">
        <div className="detail-main">
          <section aria-labelledby="funding-heading">
            <h2 id="funding-heading" className="sr-only">Funding progress</h2>
            <FundingBar pledged={campaign.pledgedTotal} goal={campaign.goal} stretchGoals={campaign.stretchGoals} />
            <div className="detail-stats" aria-live="polite">
              <div className="stat">
                <span className="stat-value">{formatINR(animatedPledged)}</span>
                <span className="stat-label">pledged of {formatINR(campaign.goal)}</span>
              </div>
              <div className="stat">
                <span className="stat-value">{animatedBackers}</span>
                <span className="stat-label">backers</span>
              </div>
              <div className="stat">
                <span className="stat-value">{campaign.percentFunded ?? 0}%</span>
                <span className="stat-label">funded</span>
              </div>
            </div>
            {(campaign.stretchGoals || []).length ? (
              <ul className="stretch-list">
                {campaign.stretchGoals.map((g, i) => (
                  <li key={g.title ? `${g.title}-${i}` : i} className={(campaign.pledgedTotal || 0) >= Number(g.amount) ? 'is-reached' : ''}>
                    <span aria-hidden="true">{(campaign.pledgedTotal || 0) >= Number(g.amount) ? '✓' : '○'}</span>
                    {' '}{g.title} — {formatINR(g.amount)}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="story-heading">
            <h2 id="story-heading">The story</h2>
            <p className="story-text">{campaign.story}</p>
          </section>

          <section aria-labelledby="updates-heading">
            <h2 id="updates-heading">Updates</h2>
            {(data.updates || []).length === 0 ? (
              <p className="empty-note">No updates yet.</p>
            ) : (
              <ol className="ruled-list">
                {data.updates.map((u, i) => (
                  <li key={u._id || i} className="ruled-row update-row">
                    <h3>{u.title}</h3>
                    <p>{u.body}</p>
                    <p className="hint-text">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : ''}</p>
                  </li>
                ))}
              </ol>
            )}
            {isOwner && (campaign.status === 'live' || campaign.status === 'funded' || campaign.status === 'fulfilled') ? (
              <form className="update-form" onSubmit={postUpdate}>
                <h3>Post an update</h3>
                <div className="field">
                  <label htmlFor="update-title">Update title</label>
                  <input id="update-title" type="text" value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="update-body">Update body</label>
                  <textarea id="update-body" rows={4} value={updateBody} onChange={(e) => setUpdateBody(e.target.value)} />
                </div>
                {updateError ? <p className="form-error" role="alert">{updateError}</p> : null}
                <button type="submit" className="btn btn-ghost btn-small" disabled={updateBusy}>
                  {updateBusy ? 'Posting…' : 'Post update'}
                </button>
              </form>
            ) : null}
          </section>

          <section aria-labelledby="comments-heading">
            <h2 id="comments-heading">Comments</h2>
            {user ? (
              <form onSubmit={postComment}>
                <div className="field">
                  <label htmlFor="comment-body">Leave a comment</label>
                  <textarea
                    id="comment-body"
                    rows={3}
                    maxLength={500}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Ask the creator a question…"
                  />
                  <p className="hint-text">{commentBody.length}/500 characters</p>
                </div>
                {commentError ? <p className="form-error" role="alert">{commentError}</p> : null}
                <button type="submit" className="btn btn-ghost btn-small" disabled={commentBusy}>
                  {commentBusy ? 'Posting…' : 'Post comment'}
                </button>
              </form>
            ) : (
              <p className="empty-note">
                <button type="button" className="link-btn" onClick={onRequireAuth}>Sign in</button> to leave a comment.
              </p>
            )}
            {(data.comments || []).length === 0 ? (
              <p className="empty-note">No comments yet.</p>
            ) : (
              <ol className="ruled-list comment-list">
                {data.comments.map((c, i) => (
                  <li key={c._id || i} className="ruled-row comment-row">
                    <p className="comment-author">{c.authorName || 'A backer'}</p>
                    <p>{c.body}</p>
                    <p className="hint-text">{c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : ''}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="detail-side" aria-label="Pledge">
          <CountdownRing endsAt={campaign.endsAt} />
          {/* No separate "days left" line: the ring already states the
              whole days remaining. A second line used the server's
              ceiling-based daysLeft and disagreed with the ring by one. */}

          <PledgeSlider
            amount={amount}
            onChange={(v) => {
              setAmount(v);
              const unlocked = [...(campaign.rewards || [])]
                .filter((r) => Number(v) >= Number(r.amount))
                .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
              setRewardId(unlocked ? unlocked._id : '');
            }}
            minimumPledge={campaign.minimumPledge || 1}
            goal={campaign.goal}
            rewards={campaign.rewards || []}
          />

          {(campaign.rewards || []).length ? (
            <div className="reward-list" role="group" aria-label="Reward tiers">
              {(campaign.rewards || []).map((r) => {
                const soldOut = isSoldOut(r);
                return (
                  <button
                    key={r._id}
                    type="button"
                    className={`reward-tier${rewardId === r._id ? ' is-selected' : ''}${soldOut ? ' is-sold-out' : ''}`}
                    disabled={soldOut || !canPledge}
                    onClick={() => pickReward(r)}
                    aria-pressed={rewardId === r._id}
                  >
                    <span className="reward-amount">{formatINR(r.amount)}</span>
                    <span className="reward-title">{r.title}</span>
                    {r.description ? <span className="reward-desc">{r.description}</span> : null}
                    <span className="reward-qty">{soldOut ? 'Sold out' : remaining(r)}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!canPledge}
            onClick={openPledge}
          >
            {campaign.status === 'live' ? `Back this campaign — ${formatINR(amount)}` : `Pledging closed (${STATUS_LABELS[campaign.status] || campaign.status})`}
          </button>
          <p className="hint-text">Mock payment only — no real money moves.</p>

          {isOwner ? (
            <div className="creator-actions">
              <h3>Creator actions</h3>
              {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
              {campaign.status === 'draft' ? (
                <button type="button" className="btn btn-accent btn-block" disabled={actionBusy} onClick={() => doAction(() => api.publishCampaign(campaignId), 'Campaign published — it is now live.')}>
                  Publish campaign
                </button>
              ) : null}
              {campaign.status === 'funded' ? (
                <button type="button" className="btn btn-accent btn-block" disabled={actionBusy} onClick={() => doAction(() => api.fulfillCampaign(campaignId), 'Campaign marked fulfilled.')}>
                  Mark as fulfilled
                </button>
              ) : null}
              {(campaign.status === 'draft' || campaign.status === 'live') ? (
                <button type="button" className="btn btn-ghost btn-block" onClick={openEdit}>
                  Edit campaign
                </button>
              ) : null}
              {campaign.status === 'draft' ? (
                confirmDelete ? (
                  <div className="delete-confirm">
                    <p>Delete this draft? This cannot be undone.</p>
                    <button type="button" className="btn btn-danger btn-small" disabled={actionBusy} onClick={deleteCampaign}>
                      Yes, delete it
                    </button>{' '}
                    <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirmDelete(false)}>
                      Keep it
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-danger-outline btn-block" onClick={() => setConfirmDelete(true)}>
                    Delete draft
                  </button>
                )
              ) : null}
            </div>
          ) : null}

          <div className="live-feed" aria-live="polite">
            <h3>Live pledges</h3>
            {feed.length === 0 ? (
              <p className="empty-note">No pledges yet — be the first.</p>
            ) : (
              <ol className="feed-list">
                {feed.slice(0, 10).map((p, i) => (
                  <li key={`${p.createdAt || ''}-${i}`} className="feed-item">
                    <span className="feed-name">{p.backerName || 'A backer'}</span>
                    <span className="feed-amount">{formatINR(p.amount)}</span>
                    {p.rewardTitle ? <span className="feed-reward">· {p.rewardTitle}</span> : null}
                    <span className="feed-time">{p.createdAt ? new Date(p.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {pledgeOpen ? (
        <Dialog title={pledgeDone ? 'Pledge recorded' : `Back “${campaign.title}”`} onClose={() => setPledgeOpen(false)}>
          {pledgeDone ? (
            <div>
              <p>
                Thank you! Your pledge of <strong>{formatINR(pledgeDone.pledge?.amount ?? amount)}</strong> was recorded.
              </p>
              <p>
                New totals: <strong>{formatINR(pledgeDone.campaign?.pledgedTotal ?? campaign.pledgedTotal)}</strong> from{' '}
                <strong>{pledgeDone.campaign?.backerCount ?? campaign.backerCount}</strong> backers
                {pledgeDone.campaign?.percentFunded != null ? ` (${pledgeDone.campaign.percentFunded}% funded)` : ''}.
              </p>
              <p className="hint-text">Mock payment only — no real money moved.</p>
              <button type="button" className="btn btn-primary" onClick={() => setPledgeOpen(false)}>
                Done
              </button>
            </div>
          ) : (
            <div>
              <dl className="pledge-summary">
                <div><dt>Amount</dt><dd>{formatINR(amount)}</dd></div>
                <div><dt>Reward</dt><dd>{selectedReward ? `${selectedReward.title} — ${formatINR(selectedReward.amount)}` : 'No reward — straight contribution'}</dd></div>
                <div><dt>Campaign</dt><dd>{campaign.title}</dd></div>
              </dl>
              <p className="mock-note" role="note">
                Mock payment only — no real money moves. This is a demo checkout; no card details are collected.
              </p>
              <div className="field checkbox-field">
                <input
                  id="pledge-anon"
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                <label htmlFor="pledge-anon">Pledge anonymously</label>
              </div>
              {pledgeError ? <p className="form-error" role="alert">{pledgeError}</p> : null}
              <div className="dialog-actions">
                <button type="button" className="btn btn-primary" disabled={pledgeBusy} onClick={confirmPledge}>
                  {pledgeBusy ? 'Processing…' : `Confirm pledge — ${formatINR(amount)}`}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPledgeOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Dialog>
      ) : null}

      {editOpen ? (
        <Dialog title="Edit campaign" onClose={() => setEditOpen(false)}>
          <form onSubmit={saveEdit}>
            <div className="field">
              <label htmlFor="edit-title">Title</label>
              <input id="edit-title" type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="edit-tagline">Tagline</label>
              <input id="edit-tagline" type="text" value={editForm.tagline} onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="edit-story">Story</label>
              <textarea id="edit-story" rows={5} value={editForm.story} onChange={(e) => setEditForm({ ...editForm, story: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="edit-category">Category</label>
              <select id="edit-category" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {editError ? <p className="form-error" role="alert">{editError}</p> : null}
            <div className="dialog-actions">
              <button type="submit" className="btn btn-primary">Save changes</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
