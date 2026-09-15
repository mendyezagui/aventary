import type { DocBlock as Block } from "@/lib/client-doc";

// One component, rendered.
//
// Every branch here is a server component and emits plain markup. The switch is
// exhaustive over DocBlock["kind"], so adding a component to the registry in
// lib/client-doc/parse.ts makes TypeScript point at this file until it has a
// rendering — which is the property that keeps the two halves of the registry
// from drifting apart.
//
// `avd-w-*` is the width class. It is the ONLY thing that decides how wide a
// block is; nothing below sets a max-width of its own. That is the rule that
// fixes the old template, where a headline stopped at 15 characters, a
// standfirst at 54, and the body ran the full column with no limit at all.

const html = (s: string) => ({ __html: s });

export function DocBlock({ block }: { block: Block }) {
  const cls = `avd-block avd-w-${block.width} avd-k-${block.kind}`;
  const heading = block.title ? <h3 className="avd-block-title">{block.title}</h3> : null;

  switch (block.kind) {
    case "prose":
      return (
        <div className={cls} id={block.id}>
          {heading}
          <div className="avd-body" dangerouslySetInnerHTML={html(block.html)} />
        </div>
      );

    case "callout":
      return (
        <aside className={`${cls} avd-tone-${block.tone}`} id={block.id}>
          {block.title ? <p className="avd-callout-title">{block.title}</p> : null}
          <div className="avd-body" dangerouslySetInnerHTML={html(block.html)} />
        </aside>
      );

    case "quote":
      return (
        <figure className={cls} id={block.id}>
          <blockquote className="avd-quote-text" dangerouslySetInnerHTML={html(block.html)} />
          {block.by ? <figcaption className="avd-quote-by">{block.by}</figcaption> : null}
        </figure>
      );

    case "metrics":
      return (
        <div className={cls} id={block.id}>
          {heading}
          <dl className="avd-metrics">
            {block.items.map((m, i) => (
              /* Label first in the DOM, value first on the screen (flex order).
                 A screen reader wants "median time to first response: 11 days";
                 an eye scanning the page wants the number. Both get their
                 order without duplicating anything. */
              <div key={i} className="avd-metric">
                <dt className="avd-metric-label" dangerouslySetInnerHTML={html(m.label)} />
                <dd className="avd-metric-value">{m.value}</dd>
                {m.note ? (
                  <dd className="avd-metric-note" dangerouslySetInnerHTML={html(m.note)} />
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      );

    case "cards":
      return (
        <div className={cls} id={block.id}>
          {heading}
          <div
            className="avd-cards"
            data-columns={block.columns ?? undefined}
            style={
              block.columns
                ? ({ "--card-columns": String(block.columns) } as React.CSSProperties)
                : undefined
            }
          >
            {block.items.map((c, i) => (
              <article key={i} className="avd-card">
                <h4>
                  <span dangerouslySetInnerHTML={html(c.title)} />
                  {c.badge ? (
                    <em className="avd-badge" dangerouslySetInnerHTML={html(c.badge)} />
                  ) : null}
                </h4>
                <div className="avd-body" dangerouslySetInnerHTML={html(c.html)} />
              </article>
            ))}
          </div>
        </div>
      );

    case "steps":
      return (
        <div className={cls} id={block.id}>
          {heading}
          <ol className="avd-steps">
            {block.items.map((s, i) => (
              <li key={i} className="avd-step">
                <div className="avd-step-rail">
                  <span className="avd-step-n">{String(i + 1).padStart(2, "0")}</span>
                  {s.when ? (
                    <span className="avd-step-when" dangerouslySetInnerHTML={html(s.when)} />
                  ) : null}
                </div>
                <div className="avd-step-main">
                  <h4 dangerouslySetInnerHTML={html(s.title)} />
                  <div className="avd-body" dangerouslySetInnerHTML={html(s.html)} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      );

    case "keyvalue":
      return (
        <div className={cls} id={block.id}>
          {heading}
          <dl className="avd-kv">
            {block.items.map((kv, i) => (
              <div key={i}>
                <dt dangerouslySetInnerHTML={html(kv.term)} />
                <dd dangerouslySetInnerHTML={html(kv.value)} />
              </div>
            ))}
          </dl>
        </div>
      );

    case "svg":
      return (
        <figure className={cls} id={block.id}>
          {heading}
          {/* The markup here was rebuilt from an allowlist by sanitizeSvg —
              it is never the block body as written. role and aria-label go on
              the wrapper so the diagram still says what it shows even when the
              source SVG carried no label of its own. */}
          <div
            className="avd-svg"
            role="img"
            aria-label={block.label}
            dangerouslySetInnerHTML={html(block.svg)}
          />
          {block.caption ? (
            <figcaption dangerouslySetInnerHTML={html(block.caption)} />
          ) : null}
        </figure>
      );

    case "figure":
      return (
        <figure className={cls} id={block.id}>
          {/* A plain img, not next/image: the source is an arbitrary client host
              from public_meta, and routing it through the optimiser would mean
              maintaining a remote-host allowlist for a decorative logo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src ?? ""} alt={block.alt} loading="lazy" />
          {block.caption ? (
            <figcaption dangerouslySetInnerHTML={html(block.caption)} />
          ) : null}
        </figure>
      );
  }

  // Adding a component to the registry in lib/client-doc/parse.ts without
  // rendering it here is a compile error, not a blank space on a client's page.
  // Without this the switch just falls out and the return type widens to
  // include undefined, which is how `svg` was added and typechecked clean.
  return exhaustive(block);
}

function exhaustive(block: never): never {
  throw new Error(`client document: no renderer for block ${JSON.stringify(block)}`);
}
