"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getSettings } from "./store";
import { applyTheme } from "./theme";

export default function About() {
  useEffect(() => {
    applyTheme(getSettings().theme);
  }, []);

  return (
    <div className="wrap">
      <Link className="backlink" href="/modeh">
        <span aria-hidden>←</span> Morning
      </Link>

      <header className="head">
        <div className="head-l">
          <p className="greet">How this was built</p>
          <h1 className="brand">The text &amp; the questions</h1>
        </div>
      </header>

      <div className="prose">
        <h2>Where the Hebrew comes from</h2>
        <p>
          Nothing here is a paraphrase. Each nusach was transcribed from a
          printed siddur:
        </p>
        <ul>
          <li>
            <b>Ari (Chabad)</b> — <i>Siddur Torah Or</i>, the Alter Rebbe&rsquo;s
            siddur (Schulzinger Bros., 1940), via Hebrew Wikisource.
          </li>
          <li>
            <b>Ashkenaz</b> — the <i>Metsudah Siddur</i> (1981), via Sefaria.
          </li>
          <li>
            <b>Sefard</b> — the Nusach Sefard weekday shacharit on Hebrew
            Wikisource.
          </li>
        </ul>
        <p>
          The pointed Hebrew was typed by hand from those sources, so check it
          against your own siddur before you rely on it. For the Ari nusach the
          reference edition is the <i>Weiss Edition Siddur Tehillat Hashem</i>
          (Kehot / Tzivos Hashem) — see below.
        </p>

        <h2>What actually changes between them</h2>
        <p>
          More than wording — the <b>order</b> moves. In Nusach Ari the three
          blessings of identity come near the end, immediately before{" "}
          <bdi className="he" lang="he">הַמַּעֲבִיר שֵׁנָה</bdi>. In Ashkenaz and
          Sefard they come second, straight after the blessing on the rooster.
          Ari also opens that blessing in the present tense —{" "}
          <bdi className="he" lang="he">הַנּוֹתֵן לַשְּׂכְוִי</bdi> rather than{" "}
          <bdi className="he" lang="he">אֲשֶׁר נָתַן לַשֶּׂכְוִי</bdi>. It words{" "}
          <bdi className="he" lang="he">אֲשֶׁר יָצַר</bdi> differently, and seals{" "}
          <bdi className="he" lang="he">וִיהִי רָצוֹן</bdi> with{" "}
          <bdi className="he" lang="he">הַגּוֹמֵל</bdi> where Ashkenaz has{" "}
          <bdi className="he" lang="he">גּוֹמֵל</bdi>. Ashkenaz and Sefard share
          the order of the fifteen and part on smaller wordings.
        </p>
        <p>
          Choosing <i>feminine</i> swaps{" "}
          <bdi className="he" lang="he">מוֹדֶה</bdi> for{" "}
          <bdi className="he" lang="he">מוֹדָה</bdi> and the third blessing of
          identity for <bdi className="he" lang="he">שֶׁעָשַׂנִי כִּרְצוֹנוֹ</bdi>,
          the way the source siddurim print it. Some siddurim also print{" "}
          <bdi className="he" lang="he">גּוֹיָה</bdi> and{" "}
          <bdi className="he" lang="he">שִׁפְחָה</bdi> in the two before it; the
          sources used here do not, so this app leaves them as printed.
        </p>

        <h2>The English, and whose it is</h2>
        <p>
          Every English line here was written for this app. Set{" "}
          <i>Explain as you read</i> on and the explanation is woven into the
          sentence itself, in a lighter tone, so you understand what you are
          saying while you are saying it rather than after; set it to{" "}
          <i>Plain</i> and you get the translation alone. It is one text either
          way — the explanatory words are marked inside the line and simply
          dropped in plain mode, so the two readings can never drift apart.
        </p>
        <p>
          The idea of a translation with the explanation blended in, rather than
          footnoted underneath, is the Weiss Edition&rsquo;s, and it is a good
          one. The words are not. Nothing from that siddur, or any other
          published translation, is reproduced here.
        </p>

        <h2>Three levels, and none of them is a study level</h2>
        <p>
          Nobody is being taught here. The levels are how much room you are given
          to notice. <b>Quiet</b> is the words and one thing to do while you say
          them — nothing between you and the blessing. <b>Guided</b> adds what
          the blessing is actually looking at, and asks a written question on
          about a third of them. <b>Deep</b> takes a second pass at every
          blessing and asks you something on every one. The Hebrew is identical
          at all three; only the amount of room changes.
        </p>

        <h2>What the sit covers</h2>
        <p>
          The full morning runs Modeh Ani, the washing, Asher Yatzar and Elokai
          Neshamah; the fifteen blessings in the order of your nusach; then{" "}
          <bdi className="he" lang="he">וִיהִי רָצוֹן</bdi>, the{" "}
          <bdi className="he" lang="he">יְהִי רָצוֹן</bdi> that asks to be kept
          from a bad day, the three Torah blessings, and the two passages you
          learn straight after them — Birkat Kohanim and{" "}
          <bdi className="he" lang="he">אֵלּוּ דְבָרִים</bdi>. Twenty-four
          stations. Those last four used to be missing, which left the morning
          ending on a blessing over learning and then no learning.
        </p>
        <p>
          Birkat Kohanim is the whole passage, Bamidbar 6:22&ndash;27, in the
          nusachim that print it that way — the instruction to say it, the three
          verses, and the line that closes it:{" "}
          <bdi className="he" lang="he">
            וְשָׂמוּ אֶת שְׁמִי עַל בְּנֵי יִשְׂרָאֵל, וַאֲנִי אֲבָרֲכֵם
          </bdi>
          . Ashkenaz prints the three verses alone. No printed Nusach Sefard
          text of this passage could be found, so Sefard follows the Ari here
          and is flagged as the one open question on the proof sheet.
        </p>

        <h2>Why the question is different every morning</h2>
        <p>
          The liturgy repeats — that is the point of it. The written question
          does not. Research from Sonja Lyubomirsky&rsquo;s lab found that people
          who counted their blessings <i>once</i> a week ended up happier than
          people who did the identical exercise three times a week; the more
          frequent group showed no gain at all. The explanation is hedonic
          adaptation: a prompt you have answered forty times stops making you
          look. So each station holds a set of questions and rotates through
          them, and two stations never draw sibling questions on the same
          morning.
        </p>

        <h2>Why the last screen asks &ldquo;when&rdquo; before &ldquo;what&rdquo;</h2>
        <p>
          A resolution names what you want. An <i>if-then plan</i> names the
          moment that will trigger it — &ldquo;when the first person tests my
          patience, I will breathe once before answering.&rdquo; Gollwitzer and
          Sheeran&rsquo;s meta-analysis of 94 studies and over 8,000 participants
          put the effect of that small difference at around d&nbsp;=&nbsp;0.65 on
          goal attainment: naming the trigger roughly doubles follow-through
          compared with intention alone. That is the entire reason the closing
          screen has two fields instead of one.
        </p>

        <h2>Why each blessing is one screen, one thought, one thing to do</h2>
        <p>
          That shape is borrowed from the daily-devotional form that works —
          Mark Nepo&rsquo;s <i>The Book of Awakening</i> and Ryan Holiday&rsquo;s{" "}
          <i>The Daily Stoic</i> both run short text, then a reflection, then one
          concrete exercise. A blessing you can say in four seconds does not need
          a page of commentary; it needs one true sentence and something to do
          with your hands or your eyes while you say it.
        </p>
        <h2>The siddur to keep next to this</h2>
        <p>
          For the Ari nusach, the <i>Weiss Edition Siddur Tehillat Hashem</i> —
          Kehot with Tzivos Hashem, sponsored by Rabbi Moishe and Ruty Weiss,
          released 2017 with a compact edition in 2024. It runs the Chabad
          nusach with a synopsis before each tefillah, explanation blended into
          the translation rather than footnoted under it, and page
          cross-references to the Kehot Annotated Siddur. It is the edition to
          check this app&rsquo;s Hebrew against, and it is print only — its
          translation, synopses and insights are its own work and are not
          reproduced here. Everything you read on these screens is written for
          this app.
        </p>
        <p className="src">
          Also worth reading on the blessings themselves: <i>Ohr HaShachar:
          Torah, Kabbalah and Consciousness in the Daily Morning Blessings</i> by
          David Bar-Cohn (Urim), and Sivan Rahav-Meir&rsquo;s <i>Birkhot
          HaShachar: A Guide for the First Moments of the Day</i>. On the
          research: Emmons &amp; McCullough, &ldquo;Counting Blessings Versus
          Burdens&rdquo; (2003); Gollwitzer &amp; Sheeran (2006).
        </p>
        <p className="src">
          Those studies are about journaling and goal-setting in general, not
          about davening. They are here because they shaped how the app asks its
          questions — not as a claim about what a blessing is.
        </p>

        <h2>Where what you write goes</h2>
        <p>
          Nowhere. Every setting and every line you write is kept in this
          browser, on this device. There is no account and no server. Clearing
          site data, or moving to a new phone, clears the journal with it.
        </p>
      </div>

      <p className="foot">
        <Link className="card-link" href="/modeh">
          ← Back to the morning
        </Link>
      </p>
    </div>
  );
}
