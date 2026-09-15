import { brandStyle, type ClientDocument } from "@/lib/client-doc";
import { DocBlock } from "./DocBlock";
import { DocControls } from "./DocControls";

// A whole client document.
//
// This replaces a function that returned a 4KB HTML string rendered inside an
// auto-sized iframe. The iframe went for one reason: it could not contain
// anything interactive. It was sized to the full document height with
// scrolling="no", so a collapsing section had no way to tell the frame it had
// changed height, and nothing could ever be sticky — there was even a comment
// in the old stylesheet explaining that the top bar had to sit still.
//
// Authored pages in content/clients keep their iframe. Those are hand-written
// standalone HTML documents with their own <style>, and sandboxing them is the
// whole reason that path exists. This one is ours, styled by one stylesheet
// scoped under .avdoc, so there is nothing to isolate it from.

export function ClientDoc({ doc, slug }: { doc: ClientDocument; slug?: string }) {
  const { brand, layout } = doc;
  const items = doc.sections.map((s) => ({ id: s.id, index: s.index, title: s.title }));

  return (
    <article
      className={`avdoc avd-density-${layout.density}`}
      // The slug this document belongs to, so a document appearing under the
      // wrong URL is visible in the DOM rather than silent. There is no frame
      // check to do here, unlike DocFrame: nothing is loaded asynchronously
      // that could hold a previous document. The key on this element is what
      // stops one being reused across two clients' pages.
      data-slug={slug}
      style={brandStyle(brand) as React.CSSProperties}
    >
      {/* Masthead. The lockup is fixed: Aventary at the left, the client at the
          right, the relationship between them stated once. Every document says
          who made it and who it is for in the same place. */}
      <header className="avd-masthead">
        <div className="avd-shell avd-masthead-in">
          <span className="avd-mark">
            <span aria-hidden="true">בע&quot;ה</span> <b>AVENTARY</b>
          </span>
          <span className="avd-masthead-meta">Confidential · {doc.date}</span>
        </div>
      </header>

      <div className="avd-hero">
        <div className="avd-shell">
          <div className="avd-hero-top">
            <div>
              {doc.eyebrow ? <p className="avd-eyebrow">{doc.eyebrow}</p> : null}
              <h1 className="avd-title">{doc.title}</h1>
              {doc.blurb ? <p className="avd-lede">{doc.blurb}</p> : null}
            </div>
            <ClientLockup brand={brand} />
          </div>

          {(doc.preparedFor || doc.preparedBy) && (
            <dl className="avd-hero-meta">
              {doc.preparedFor && (
                <div>
                  <dt>Prepared for</dt>
                  <dd>{doc.preparedFor}</dd>
                </div>
              )}
              {doc.preparedBy && (
                <div>
                  <dt>Prepared by</dt>
                  <dd>{doc.preparedBy}</dd>
                </div>
              )}
              <div>
                <dt>Date</dt>
                <dd>{doc.date}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <div className={`avd-shell avd-main${layout.nav ? " avd-has-rail" : ""}`}>
        {layout.nav ? <DocControls sections={items} numbered={layout.numbered} /> : null}

        <div className="avd-flow">
          {doc.sections.map((s) => (
            /* Native <details>. Collapsing works with no JavaScript at all, is
               keyboard-operable and screen-reader-announced for free, and
               prints expanded. DocControls only adds scroll-spy and the bulk
               open/close on top of it. */
            <details key={s.id} id={s.id} className="avd-section" open={!s.startsCollapsed}>
              <summary className="avd-section-head">
                {layout.numbered ? (
                  <span className="avd-section-n">{String(s.index).padStart(2, "0")}</span>
                ) : null}
                {/* h2 inside summary: the section heading is a real heading at a
                    real size. In the old template this was a 10.5px mono label
                    while the blocks under it were 25px, which inverted the
                    outline and is why the structure could not be read. */}
                <h2 className="avd-section-title">{s.title}</h2>
                <span className="avd-section-rule" aria-hidden="true" />
                <span className="avd-section-chev" aria-hidden="true" />
              </summary>
              <div className="avd-section-body">
                {s.blocks.map((b) => (
                  <DocBlock key={b.id} block={b} />
                ))}
              </div>
            </details>
          ))}

          <div className="avd-signoff">
            <div>
              <b>{doc.preparedBy || "Aventary"}</b>
              Salesforce Advisory · AI Implementation
              <br />
              aventary.com
            </div>
            <div className="avd-signoff-r">
              {doc.date}
              <br />
              {doc.preparedFor ? `Prepared for ${doc.preparedFor}` : "Confidential"}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * The client's identity in the hero.
 *
 * A logo when there is one, a monogram in the client's accent when there is
 * not. Never nothing: an empty slot where an identity belongs reads as a page
 * that failed to load, and most clients will never send a logo file.
 */
function ClientLockup({ brand }: { brand: ClientDocument["brand"] }) {
  if (brand.logo) {
    return (
      <div className="avd-lockup">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt={brand.name} className="avd-logo" />
      </div>
    );
  }
  return (
    <div className="avd-lockup">
      <span className="avd-monogram" aria-hidden="true">
        {brand.mark}
      </span>
      <span className="avd-sr">{brand.name}</span>
    </div>
  );
}
