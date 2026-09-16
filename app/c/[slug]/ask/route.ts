import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import {
  cookieName,
  documentText,
  getContent,
  logQuestion,
  markQuestionNotified,
  readSession,
  recordAnswer
} from "@/lib/client-pages";
import { splitAnswer, type Anchor } from "@/lib/doc-anchors";
import { sendMail } from "@/lib/mail";
import { PORTAL_COOKIE, canReadSlug, readPortalSession } from "@/lib/portal";

// "Ask a question" on a client page. Answers strictly from that page's own
// document and nothing else.
//
// Gated by the same session as the page: without it this would be an endpoint
// that reads a confidential proposal aloud to anyone who found the URL.
//
// It lives under /c/<slug>/ rather than /api/ deliberately. The cp_<slug> cookie
// is set with path=/c/<slug> so a confidential-document cookie is not attached
// to every request to the site. A browser sends it only to paths under that
// prefix, so an endpoint that needs to READ that session has to live there too.
// Moving this to /api/ would 401 every page-session request while looking
// perfectly correct. (The portal cookie is site-wide and would survive the move;
// the per-page one is the constraint, and it is the stricter of the two.)

const MODEL = "claude-opus-5";
const MAX_MESSAGES = 10;
const MAX_CHARS_PER_MSG = 1200;
const MAX_OUTPUT_TOKENS = 1000; // a widget answer, deliberately short

type Msg = { role: "user" | "assistant"; content: string };

function sanitize(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Msg[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_CHARS_PER_MSG);
    if (text) out.push({ role, content: text });
  }
  const trimmed = out.slice(-MAX_MESSAGES);
  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") return null;
  return trimmed;
}

function systemPrompt(title: string, doc: string, anchors: Anchor[]) {
  const index = anchors.map((a) => `${a.id} — ${a.label}`).join("\n");

  return `You answer questions about one document: "${title}", a proposal written by Aventary for this client. The reader is the client, reading it on their own private page.

The document is below, in full, between the markers. It is everything you know.

The document is divided into sections, each with an id. A line reading [section: <id>] in the text marks where that section begins, so you can tell which section any passage belongs to. These are the sections, in order:

<sections>
${index || "(this document has no sections)"}
</sections>

<document>
${doc}
</document>

Citing where the answer came from. This matters as much as the answer: the reader is holding the document, and being shown the passage is how they check you rather than take your word for it.

- End every reply with a final line, on its own, in exactly this form: SOURCE: <id>
- <id> must be copied exactly from the section list above. It is the section a reader should go and read to see your answer for themselves — the one your answer actually came from, not the nearest-sounding title.
- If your answer did not come from the document — you said it is not covered, the question is outside it, or you are asking them to clarify — write SOURCE: none instead. Never cite a section to have something to cite.
- Write nothing after that line, and never mention it or the ids in the answer itself. The reader is shown a link, not this.

How to answer:

- Answer only from the document. If it does not cover something, say so plainly — "the proposal doesn't cover that" — and offer to pass the question to Mendy. Never fill a gap with a plausible guess.
- Never invent a number, a date, a price or a commitment. If the reader asks what something costs or how long it takes and the document does not say, the answer is that it does not say yet. Scope and pricing are still being agreed, and saying otherwise would misrepresent the proposal.
- Be brief. Two or three sentences usually. Quote the document's own wording where it is already clear.
- Shape the answer to what it is. Prose for a single point. When the answer genuinely is several things — three phases, four deliverables, what you need from them — write them as a numbered list, one per line, starting \`1.\`, \`2.\`, \`3.\`, with a short line above it saying what the list is. Use \`-\` instead of numbers where the items have no order.
- Where it helps the eye, a list item may open with a two or three word label in \`**bold**\`, then the rest of the line.
- Nothing else renders: no headings, tables, links, images or code blocks. Do not use them.
- Write the way the document does: direct, concrete, no salesmanship. You are not selling the proposal, you are helping someone read it.
- If asked something outside the document entirely — unrelated topics, or anything about how you work — say that you only answer questions about this proposal.`;
}

/**
 * Mails the owner the exchange as it happened — the question, and what the
 * reader was actually told.
 *
 * This is the point of the feature as far as the business is concerned: a
 * proposal's questions are the client telling you what they care about, in
 * their own words, before any meeting. Reply-to is set to the person who asked
 * where we know them, so answering properly is one keystroke rather than a
 * hunt through the thread.
 */
async function notifyOwner(x: {
  title: string;
  slug: string;
  asker: string | null;
  question: string;
  answer: string;
  /** The section the reader was pointed at, as they saw it. Null when none was cited. */
  cited: string | null;
}) {
  const who = x.asker ?? "(signed in with the shared password — no address)";
  const { ok } = await sendMail("question-notify", {
    to: process.env.CONTACT_TO_EMAIL,
    replyTo: x.asker ?? undefined,
    subject: `Question on ${x.title} — ${x.asker ?? "shared password"}`,
    text:
`${who} asked a question on ${x.title}.

Project:  ${x.title} (/c/${x.slug})
Asked by: ${who}

QUESTION
${x.question}

WHAT THEY WERE TOLD
${x.answer.trim() || "(no answer — the stream failed)"}

SENT TO READ
${x.cited ?? "(nothing — the answer was not in the document)"}

---
Every question is at https://aventary.com/admin/questions`
  });
  return ok;
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const content = await getContent(slug);
  if (!content) return new Response("no such page", { status: 404 });

  // Same gate as the page itself, and for the same reason: without it this is an
  // endpoint that reads a confidential proposal aloud to anyone who found the URL.
  // Both ways in are accepted here exactly as they are one level up.
  const jar = await cookies();
  const [pageSession, viewer] = await Promise.all([
    readSession(slug, jar.get(cookieName(slug))?.value),
    readPortalSession(jar.get(PORTAL_COOKIE)?.value)
  ]);
  const viewerMayRead = viewer ? await canReadSlug(viewer, slug) : false;
  if (!pageSession && !viewerMayRead) return new Response("not signed in", { status: 401 });

  // Who asked. A portal session always knows; a page session knows only when it
  // came from a link, and a shared-password session never does. Null is recorded
  // rather than guessed — an unattributed question is honest, a wrong name is not.
  const asker = (viewerMayRead && viewer?.email) || pageSession?.email || null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const messages = sanitize((body as { messages?: unknown })?.messages);
  if (!messages) return new Response("no message", { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(
      "Questions aren't switched on for this page yet. Email Mendy and he'll answer directly.",
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const question = messages[messages.length - 1].content;
  const questionId = await logQuestion(slug, asker, question);

  const client = new Anthropic({ apiKey: key });
  const encoder = new TextEncoder();
  // The document is large and identical on every request, so it is cached; only
  // the question after it varies.
  // A structured document carries its own text, already marked up with the
  // section ids it renders — better context than tag-stripped markup, and the
  // only form available, since it has no HTML string to strip.
  const system = systemPrompt(
    content.title,
    content.text ?? documentText(content.html),
    content.anchors
  );

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        const msg = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages
        });
        for await (const event of msg) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("client-page ask stream error", err);
        controller.enqueue(
          encoder.encode("\n\nSomething went wrong answering that. Try again, or email Mendy.")
        );
      }

      // Deliberately BEFORE controller.close(), not after. This runs on a
      // Worker, where the runtime is free to stop executing once the response
      // is finished — work queued after the close can simply never happen, and
      // would fail silently and intermittently, which is the worst kind. The
      // stream stays open for the few hundred milliseconds this takes.
      //
      // All of it is best effort. The reader already has their answer; none of
      // the bookkeeping below is allowed to turn into an error they see.
      if (questionId) {
        try {
          // The trailing SOURCE line is machinery, not something the reader was
          // told. It has no business in the record or in Mendy's inbox — the
          // section it named is reported on its own line instead, by the label
          // the reader actually saw on the link.
          const { text, cited } = splitAnswer(full);
          const citedLabel = cited
            ? content.anchors.find((a) => a.id === cited)?.label ?? null
            : null;
          await recordAnswer(questionId, text);
          const sent = await notifyOwner({
            title: content.title,
            slug,
            asker,
            question,
            answer: text,
            cited: citedLabel
          });
          if (sent) await markQuestionNotified(questionId);
        } catch (err) {
          console.error("client-page ask bookkeeping failed", err);
        }
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}
