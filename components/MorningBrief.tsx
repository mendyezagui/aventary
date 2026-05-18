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

const API_URL = "/api/morning-brief";

const CAT_COLOR: Record<string, string> = {
  "AI Practitioners": "#00E5FF",
  "Salesforce / Agentforce": "#FF6B35",
  "Revenue Operations": "#A8FF3E",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

export default function MorningBrief() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "pending" }
    | { kind: "ok"; data: Brief }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

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
      } catch (err: any) {
        if (!cancelled) setState({ kind: "error", message: err?.message || "Unknown error" });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dateText =
    state.kind === "ok" ? formatDate(state.data.date) :
    state.kind === "loading" ? "Loading…" : todayFormatted();

  const statusText =
    state.kind === "ok" ? `${state.data.voices_scanned ?? 30} SCANNED` :
    state.kind === "pending" ? "PENDING" :
    state.kind === "error" ? "ERROR" : "LIVE";

  const generatedText =
    state.kind === "ok"
      ? `Generated ${new Date(state.data.generated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}`
      : "—";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div id="morning-brief">
        <div className="brief-header">
          <div>
            <div className="brief-eyebrow">Morning Intelligence Brief</div>
            <div className="brief-date">{dateText}</div>
            <div className="brief-meta">30 voices scanned · Top 5 surfaced · Updated 6 AM PST</div>
          </div>
          <div className="brief-tag">{statusText}</div>
        </div>

        <div>
          {state.kind === "loading" && <Skeletons />}
          {state.kind === "pending" && (
            <div className="brief-error">Brief not yet generated for today. Runs at 6 AM PST.</div>
          )}
          {state.kind === "error" && (
            <div className="brief-error">Failed to load brief: {state.message}</div>
          )}
          {state.kind === "ok" && (
            <div className="brief-grid">
              {(state.data.top5 || []).map((item) => (
                <Card key={item.rank} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="brief-footer">
          <span>{generatedText}</span>
          <span>aventary.com · AI Intelligence</span>
        </div>
      </div>
    </>
  );
}

function Card({ item }: { item: Item }) {
  const color = CAT_COLOR[item.category] || "#888";
  return (
    <div
      className="brief-card"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}30`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1A1A1A"; }}
    >
      <div className="brief-rank">#{item.rank}</div>
      <div className="brief-card-name">{item.name}</div>
      <div className="brief-card-meta">
        <span className="brief-card-date" style={{ color, opacity: 0.8 }}>{item.pub_date || ""}</span>
        {item.platform && <span className="brief-badge">{item.platform}</span>}
        <span className="brief-badge" style={{ color, background: `${color}12` }}>{item.category}</span>
      </div>
      {item.title && <div className="brief-card-title">{item.title}</div>}
      <ul className="brief-bullets">
        {(item.bullets || []).map((b, i) => (
          <li key={i}><span className="brief-bullet-mark" style={{ color }}>▸</span>{b}</li>
        ))}
      </ul>
      {item.why_top5 && <div className="brief-why">↑ {item.why_top5}</div>}
      {item.url && (
        <a className="brief-card-link" href={item.url} target="_blank" rel="noopener noreferrer">
          {item.url}
        </a>
      )}
    </div>
  );
}

function Skeletons() {
  return (
    <div className="brief-loading">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="brief-skeleton">
          <div className="brief-skel-line" style={{ height: 8, width: "45%" }} />
          <div className="brief-skel-line" style={{ height: 6, width: "25%", marginBottom: 12 }} />
          <div className="brief-skel-line" style={{ height: 7 }} />
          <div className="brief-skel-line" style={{ height: 7, width: "85%" }} />
          <div className="brief-skel-line" style={{ height: 7, width: "70%" }} />
        </div>
      ))}
    </div>
  );
}

const STYLES = `
  #morning-brief {
    font-family: Georgia, 'Times New Roman', serif;
    background: #080808;
    color: #D0D0C8;
    padding: 40px;
    max-width: 960px;
    margin: 0 auto;
  }
  #morning-brief .brief-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 1px solid #1C1C1C; padding-bottom: 20px; margin-bottom: 32px;
  }
  #morning-brief .brief-eyebrow {
    font-family: monospace; font-size: 9px; letter-spacing: 4px;
    text-transform: uppercase; color: #333; margin-bottom: 5px;
  }
  #morning-brief .brief-date { font-size: 22px; font-weight: 400; color: #F0EFE8; }
  #morning-brief .brief-meta {
    font-family: monospace; font-size: 9px; color: #282828; margin-top: 4px;
  }
  #morning-brief .brief-tag {
    font-family: monospace; font-size: 9px; letter-spacing: 1px;
    text-transform: uppercase; padding: 4px 8px; border: 1px solid #1E1E1E; color: #333;
  }
  #morning-brief .brief-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;
  }
  #morning-brief .brief-card {
    background: #0E0E0E; border: 1px solid #1A1A1A; padding: 22px;
    transition: border-color 0.15s; cursor: default; position: relative;
  }
  #morning-brief .brief-rank {
    position: absolute; top: 14px; right: 14px;
    font-family: monospace; font-size: 9px; color: #252525; letter-spacing: 1px;
  }
  #morning-brief .brief-card-name {
    font-family: monospace; font-size: 12px; font-weight: 700;
    color: #F0EFE8; margin-bottom: 3px;
  }
  #morning-brief .brief-card-meta {
    display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;
  }
  #morning-brief .brief-card-date { font-family: monospace; font-size: 9px; }
  #morning-brief .brief-badge {
    font-family: monospace; font-size: 8px; letter-spacing: 1px;
    text-transform: uppercase; padding: 2px 6px; background: #141414; color: #444;
  }
  #morning-brief .brief-card-title {
    font-size: 12px; font-style: italic; color: #888;
    margin-bottom: 12px; line-height: 1.45;
  }
  #morning-brief .brief-bullets { list-style: none; margin: 0; padding: 0; }
  #morning-brief .brief-bullets li {
    display: flex; gap: 8px; align-items: flex-start; margin-bottom: 5px;
    font-size: 12px; color: #606060; line-height: 1.65;
  }
  #morning-brief .brief-bullet-mark { font-size: 10px; margin-top: 3px; flex-shrink: 0; }
  #morning-brief .brief-why {
    margin-top: 12px; padding-top: 10px; border-top: 1px solid #141414;
    font-family: monospace; font-size: 9px; color: #2A2A2A; line-height: 1.5;
  }
  #morning-brief .brief-card-link {
    display: block; margin-top: 8px;
    font-family: monospace; font-size: 9px; color: #222; text-decoration: none;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  #morning-brief .brief-card-link:hover { color: #444; }
  #morning-brief .brief-footer {
    margin-top: 28px; padding-top: 16px; border-top: 1px solid #141414;
    font-family: monospace; font-size: 8px; color: #1E1E1E;
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 8px;
  }
  #morning-brief .brief-loading {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;
  }
  #morning-brief .brief-skeleton {
    background: #0C0C0C; border: 1px solid #141414; padding: 22px;
  }
  #morning-brief .brief-skel-line {
    background: #161616; border-radius: 2px; margin-bottom: 8px;
    animation: brief-blink 1.6s ease-in-out infinite;
  }
  @keyframes brief-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  #morning-brief .brief-error {
    background: #120000; border: 1px solid #3A0000; padding: 16px 20px;
    font-family: monospace; font-size: 11px; color: #FF5555;
  }
`;
