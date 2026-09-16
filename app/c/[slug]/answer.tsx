import type { ReactNode } from "react";

// An answer's shape, rendered as elements rather than markup.
//
// Readers asked for lists to look like lists — "if there are three answers it
// should be 1, 2, 3" — so the model is now allowed to write one. What it is not
// given is an HTML path: this builds React nodes, so there is nothing to inject
// into. That matters more here than it looks. The answer is written by a model
// that has just read a client's document, and a document is content we do not
// fully control; a renderer that took HTML would be trusting the wrong thing.
//
// Deliberately small. Numbered lists, plain lists, paragraphs, and a bold label
// inside a line. No headings, tables, links, images or code — the prompt asks
// for none of them, and anything unrecognised falls through as ordinary text
// rather than as a stray asterisk.
//
// It also has to look right mid-stream, when the last line is half-written: a
// list that is two items long for a moment is fine, and an unclosed `**` is
// hidden rather than shown as punctuation.

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "ul"; items: string[] };

/** `1. ` or `1) `, the way the prompt asks for a numbered list. */
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
/** `-` and `•` only. `*` is left alone so it cannot eat a **bold** opening. */
const BULLETED = /^\s*[-•]\s+(.*)$/;

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const num = line.match(NUMBERED);
    const bul = num ? null : line.match(BULLETED);
    const last = blocks[blocks.length - 1];

    if (num) {
      if (last?.kind === "ol") last.items.push(num[1]);
      else blocks.push({ kind: "ol", items: [num[1]] });
      continue;
    }
    if (bul) {
      if (last?.kind === "ul") last.items.push(bul[1]);
      else blocks.push({ kind: "ul", items: [bul[1]] });
      continue;
    }
    if (!line.trim()) {
      // A blank line ends whatever was open; it never starts an empty block.
      if (last?.kind === "p") blocks.push({ kind: "p", lines: [] });
      continue;
    }
    if (last?.kind === "p") last.lines.push(line);
    else blocks.push({ kind: "p", lines: [line] });
  }
  return blocks.filter((b) => (b.kind === "p" ? b.lines.length : b.items.length));
}

/**
 * `**like this**` becomes bold. An odd number of markers means the closing one
 * has not arrived yet, so the dangling marker is removed and the words after it
 * are kept — drop the tail instead and a bold label blinks out of the answer
 * for as long as it takes to finish typing, which is worse than the asterisks
 * it was meant to hide.
 */
function inline(s: string, key: string): ReactNode[] {
  const marks = (s.match(/\*\*/g) ?? []).length;
  const at = s.lastIndexOf("**");
  const safe = marks % 2 ? s.slice(0, at) + s.slice(at + 2) : s;
  return safe
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) =>
      i % 2 ? <strong key={`${key}-${i}`}>{part}</strong> : <span key={`${key}-${i}`}>{part}</span>
    );
}

/** The answer, with its shape. */
export function AnswerText({ text }: { text: string }) {
  const blocks = parseAnswer(text);
  return (
    <div className="cp-ask-a">
      {blocks.map((b, i) => {
        if (b.kind === "p") {
          return <p key={i}>{b.lines.map((l, j) => inline(l, `${i}-${j}`))}</p>;
        }
        const List = b.kind === "ol" ? "ol" : "ul";
        return (
          <List key={i}>
            {b.items.map((item, j) => (
              <li key={j}>{inline(item, `${i}-${j}`)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
