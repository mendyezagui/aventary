"use client";

import { useEffect, useState } from "react";

type Item = {
  rank: number;
  name: string;
  category: string;
  platform?: string;
  title?: string;
  pub_date?: string;
  bullets?: string[];
  url?: string | null;
  why_top5?: string;
};

type Brief = {
  date: string;
  generated_at: string;
  voices_scanned?: number;
  rss_prefetched?: number;
  top5?: Item[];
  status?: "pending";
  message?: string;
};

type State =
  | { kind: "loading" }
  | { kind: "pending" }
  | { kind: "ok"; data: Brief }
  | { kind: "error"; message: string };

const API_URL = "/api/morning-brief";

function formatDate(iso: string) {
  try {
    // The Worker stores `date` as a bare YYYY-MM-DD string. `new Date(iso)`
    // would parse that as UTC midnight, which displays as the previous day
    // in PT. Append a midday time so the displayed day matches the brief's
    // intended day regardless of viewer timezone.
    const hasTime = /T\d/.test(iso);
    return new Date(hasTime ? iso : `${iso}T12:00:00`).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  } catch {
    return iso;
  }
}

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeFormatted(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MorningBrief() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok && res.status !== 202) throw new Error(`HTTP ${res.status}`);
        const data: Brief = await res.json();
        if (cancelled) return;
        if (data.status === "pending") setState({ kind: "pending" });
        else setState({ kind: "ok", data });
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setState({ kind: "error", message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const date =
    state.kind === "ok"
      ? formatDate(state.data.date)
      : state.kind === "loading"
      ? "Loading…"
      : todayFormatted();
  const voicesScanned = state.kind === "ok" ? state.data.voices_scanned ?? 30 : 30;
  const top5 = state.kind === "ok" ? state.data.top5 ?? [] : [];

  const statusKey: "live" | "pending" | "error" | "loading" =
    state.kind === "ok"
      ? "live"
      : state.kind === "pending"
      ? "pending"
      : state.kind === "error"
      ? "error"
      : "loading";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="mb-root">
        <header className="mb-header">
          <div className="mb-eyebrow">
            <span className={`mb-status mb-status-${statusKey}`}>{statusKey.toUpperCase()}</span>
            <span className="mb-eyebrow-text">
              {voicesScanned} voices scanned · Top 5 surfaced
            </span>
          </div>
          <h1 className="mb-title">Morning Intelligence Brief</h1>
          <p className="mb-subtitle">Updated 6 AM PST · {date}</p>
        </header>

        {state.kind === "loading" && <Skeletons />}
        {state.kind === "pending" && <PendingState />}
        {state.kind === "error" && (
          <div className="mb-error">Failed to load brief: {state.message}</div>
        )}

        {state.kind === "ok" && top5.length > 0 && (
          <>
            <div className="mb-grid">
              {top5[0] && <FeaturedCard item={top5[0]} />}
              {top5[1] && <MediumCard item={top5[1]} />}
              {top5.slice(2).map((item) => (
                <SmallCard key={item.rank} item={item} />
              ))}
            </div>
            <MetaTable brief={state.data} />
          </>
        )}

        <footer className="mb-footer">
          <span>aventary.com · AI Intelligence</span>
          {state.kind === "ok" && <span>Generated {timeFormatted(state.data.generated_at)}</span>}
        </footer>
      </div>
    </>
  );
}

function FeaturedCard({ item }: { item: Item }) {
  return (
    <article className="mb-card mb-card-featured">
      <div className="mb-card-header">
        <div className="mb-avatar-row">
          <div className="mb-avatar" aria-hidden>
            {initials(item.name)}
          </div>
          <div>
            <h3 className="mb-card-name">{item.name}</h3>
            <p className="mb-card-role">{item.category}</p>
          </div>
        </div>
        <span className="mb-priority">Top Signal</span>
      </div>

      {item.title && (
        <div className="mb-ai-block">
          <p className="mb-ai-text">{item.title}</p>
        </div>
      )}

      {item.bullets && item.bullets.length > 0 && (
        <ul className="mb-bullets">
          {item.bullets.map((b, i) => (
            <li key={i}>
              <span className="mb-bullet-mark">▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {(item.why_top5 || item.url || item.pub_date) && (
        <div className="mb-featured-footer">
          {item.why_top5 && (
            <div className="mb-why-block">
              <span className="mb-impact-label">Why this matters</span>
              <p className="mb-impact-text">{item.why_top5}</p>
            </div>
          )}
          <div className="mb-featured-footer-meta">
            {item.pub_date && <span className="mb-label-tag">{item.pub_date}</span>}
            {item.url && (
              <a
                className="mb-source-link"
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View source ↗
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function MediumCard({ item }: { item: Item }) {
  return (
    <article className="mb-card mb-card-medium">
      <div className="mb-medium-head">
        <span className="mb-rank-icon">#{item.rank}</span>
        <h3 className="mb-card-name-md">{item.name}</h3>
      </div>
      <p className="mb-card-role-sm">{item.category}</p>
      {item.title && <p className="mb-card-body">{item.title}</p>}
      {item.bullets && item.bullets[0] && (
        <div className="mb-ai-marker">
          <span className="mb-ai-marker-text">{item.bullets[0]}</span>
        </div>
      )}
      <div className="mb-card-footer">
        {item.platform && <span className="mb-label-tag">{item.platform}</span>}
        {item.url && (
          <a
            className="mb-source-link"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View source ↗
          </a>
        )}
      </div>
    </article>
  );
}

function SmallCard({ item }: { item: Item }) {
  return (
    <article className="mb-card mb-card-small">
      <div className="mb-small-head">
        <span className="mb-rank-icon">#{item.rank}</span>
        <h4 className="mb-card-name-sm">{item.name}</h4>
      </div>
      <p className="mb-card-role-sm">{item.category}</p>
      {item.title && <p className="mb-card-body-sm">{item.title}</p>}
      {item.bullets && item.bullets[0] && (
        <div className="mb-ai-marker">
          <span className="mb-ai-marker-text">{item.bullets[0]}</span>
        </div>
      )}
      <div className="mb-card-footer">
        {item.platform && <span className="mb-label-tag">{item.platform}</span>}
        {item.url && (
          <a
            className="mb-source-link"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View source ↗
          </a>
        )}
      </div>
    </article>
  );
}

function MetaTable({ brief }: { brief: Brief }) {
  const rows: Array<[string, string]> = [
    ["Voices scanned", String(brief.voices_scanned ?? 30)],
    ["RSS prefetched", String(brief.rss_prefetched ?? 0)],
    ["Top items surfaced", String(brief.top5?.length ?? 0)],
    ["Generated", timeFormatted(brief.generated_at)],
  ];
  return (
    <div className="mb-meta-card">
      <div className="mb-meta-head">
        <span className="mb-meta-title">Brief metadata</span>
        <span className="mb-meta-subtitle">Last run</span>
      </div>
      <table className="mb-meta-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="mb-meta-key">{k}</td>
              <td className="mb-meta-val">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PendingState() {
  return (
    <div className="mb-pending">
      <div className="mb-pending-title">Brief not yet generated for today</div>
      <p className="mb-pending-text">Runs daily at 6 AM PST. Check back after that.</p>
    </div>
  );
}

function Skeletons() {
  const layouts = [
    { kind: "featured" as const },
    { kind: "medium" as const },
    { kind: "small" as const },
    { kind: "small" as const },
    { kind: "small" as const },
  ];
  return (
    <div className="mb-grid">
      {layouts.map((l, i) => (
        <div
          key={i}
          className={
            l.kind === "featured"
              ? "mb-card mb-card-featured mb-skel"
              : l.kind === "medium"
              ? "mb-card mb-card-medium mb-skel"
              : "mb-card mb-card-small mb-skel"
          }
        >
          <div className="mb-skel-line" style={{ width: "55%", height: 16 }} />
          <div className="mb-skel-line" style={{ width: "30%", height: 10 }} />
          <div className="mb-skel-line" style={{ height: 10, marginTop: 16 }} />
          <div className="mb-skel-line" style={{ height: 10, width: "85%" }} />
          <div className="mb-skel-line" style={{ height: 10, width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap");

.mb-root {
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  background: #f8f9ff;
  color: #0b1c30;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px 48px;
  min-height: calc(100vh - 5rem);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .mb-root { padding: 24px 16px 32px; }
}

.mb-header {
  padding-bottom: 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid #ccc3d7;
}

.mb-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.mb-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #ffffff;
  padding: 3px 8px;
  border-radius: 2px;
}

.mb-status-live { background: #ba1a1a; }
.mb-status-pending { background: #5c5f61; }
.mb-status-error { background: #ba1a1a; }
.mb-status-loading { background: #7b7486; }

.mb-eyebrow-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #4a4455;
  letter-spacing: 0.02em;
}

.mb-title {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: -0.02em;
  color: #0b1c30;
  margin: 0;
}

@media (max-width: 768px) {
  .mb-title { font-size: 28px; line-height: 36px; }
}

.mb-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #4a4455;
  margin: 6px 0 0;
  letter-spacing: 0.02em;
}

/* Bento grid */
.mb-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.mb-card-featured { grid-column: span 8 / span 8; }
.mb-card-medium { grid-column: span 4 / span 4; }
.mb-card-small { grid-column: span 4 / span 4; }

@media (max-width: 1024px) {
  .mb-card-featured { grid-column: span 12 / span 12; }
  .mb-card-medium { grid-column: span 6 / span 6; }
  .mb-card-small { grid-column: span 6 / span 6; }
}

@media (max-width: 640px) {
  .mb-card-featured, .mb-card-medium, .mb-card-small {
    grid-column: span 12 / span 12;
  }
}

.mb-card {
  background: #ffffff;
  border: 1px solid #ccc3d7;
  border-radius: 4px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.mb-card-featured { padding: 24px; }

/* Featured card header */
.mb-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.mb-avatar-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mb-avatar {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: #ebddff;
  color: #5300b7;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.mb-card-name {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #0b1c30;
  margin: 0;
}

.mb-card-role {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #5300b7;
  margin: 2px 0 0;
  letter-spacing: 0.02em;
}

.mb-priority {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: #e5eeff;
  color: #5300b7;
  padding: 4px 10px;
  border-radius: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* AI marker block (featured) */
.mb-ai-block {
  border-left: 2px solid #5300b7;
  padding-left: 16px;
  margin-bottom: 16px;
}

.mb-ai-text {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 16px;
  line-height: 24px;
  color: #0b1c30;
  margin: 0;
  font-weight: 500;
}

/* Bullets list */
.mb-bullets {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}

.mb-bullets li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 8px;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: #4a4455;
}

.mb-bullets li:last-child { margin-bottom: 0; }

.mb-bullet-mark {
  color: #5300b7;
  font-weight: 700;
  font-size: 12px;
  margin-top: 2px;
  flex-shrink: 0;
}

/* Featured card footer */
.mb-featured-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ccc3d7;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mb-impact-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4a4455;
}

.mb-impact-text {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 13px;
  line-height: 18px;
  color: #4a4455;
  margin: 6px 0 0;
}

.mb-featured-footer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

/* Medium card */
.mb-medium-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
}

.mb-card-name-md {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #0b1c30;
  margin: 0;
}

.mb-card-role-sm {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #5300b7;
  margin: 0 0 12px;
  letter-spacing: 0.02em;
}

.mb-card-body {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 14px;
  line-height: 20px;
  color: #4a4455;
  margin: 0 0 12px;
}

.mb-card-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #ccc3d7;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

/* Small card */
.mb-small-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.mb-rank-icon {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #7b7486;
  letter-spacing: 0.04em;
  font-weight: 600;
  flex-shrink: 0;
}

.mb-card-name-sm {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 22px;
  color: #0b1c30;
  margin: 0;
}

.mb-card-body-sm {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 13px;
  line-height: 18px;
  color: #4a4455;
  margin: 0 0 12px;
}

/* AI marker (smaller, for medium + small cards) */
.mb-ai-marker {
  border-left: 2px solid #5300b7;
  padding: 4px 0 4px 12px;
  margin-bottom: 16px;
}

.mb-ai-marker-text {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 13px;
  color: #0b1c30;
  line-height: 18px;
}

.mb-source-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5300b7;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.mb-source-link:hover { text-decoration: underline; }

/* Tag chips */
.mb-label-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: #f8f9ff;
  color: #4a4455;
  padding: 3px 8px;
  border: 1px solid #ccc3d7;
  border-radius: 2px;
  white-space: nowrap;
}

/* Meta table */
.mb-meta-card {
  background: #ffffff;
  border: 1px solid #ccc3d7;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 16px;
}

.mb-meta-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #eff4ff;
  border-bottom: 1px solid #ccc3d7;
}

.mb-meta-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #0b1c30;
}

.mb-meta-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #4a4455;
  letter-spacing: 0.04em;
}

.mb-meta-table {
  width: 100%;
  border-collapse: collapse;
}

.mb-meta-table tr { border-bottom: 1px solid #ccc3d7; }
.mb-meta-table tr:last-child { border-bottom: none; }

.mb-meta-key {
  padding: 10px 16px;
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 13px;
  color: #4a4455;
  width: 60%;
}

.mb-meta-val {
  padding: 10px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #0b1c30;
  text-align: right;
  letter-spacing: 0.02em;
}

/* Pending / Error states */
.mb-pending {
  background: #ffffff;
  border: 1px solid #ccc3d7;
  border-radius: 4px;
  padding: 40px 32px;
  text-align: center;
}

.mb-pending-title {
  font-family: 'Hanken Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #0b1c30;
  margin-bottom: 6px;
}

.mb-pending-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #4a4455;
  letter-spacing: 0.02em;
  margin: 0;
}

.mb-error {
  background: #ffdad6;
  border: 1px solid #93000a;
  border-radius: 4px;
  padding: 16px 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #93000a;
}

/* Skeletons */
.mb-skel { min-height: 180px; }

.mb-skel-line {
  background: #eff4ff;
  border-radius: 2px;
  margin-bottom: 10px;
  animation: mb-blink 1.4s ease-in-out infinite;
}

@keyframes mb-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Footer */
.mb-footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #ccc3d7;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #4a4455;
  letter-spacing: 0.02em;
}
`;
