---
slug: whack-a-mole-building-production-ai
title: "My AI Is Driving Me Crazy — And That's Exactly the Job"
excerpt: "Building production AI feels like whack-a-mole. Here's the scaffolding I use to stay sane — context, memories, an expert panel, and evals — and the wins that scaffolding shipped this week."
cover_url: ""
published_at: null
status: draft
---

## I'm losing my mind, and it's going great

Some weeks building AI feels like whack-a-mole. You fix one thing, two more pop up. You tighten a prompt, and a behavior you fixed three sessions ago quietly comes back. You ship a guardrail, and the model finds a new, creative way to be wrong.

Let me be honest about something the demos never tell you: most of the time, the AI has no clue what's going on.

My favorite tell is when the model takes the *instructions* and reads them back to the user as if they were part of the conversation. A customer says something, and the AI responds, "I'm going to go now and retrieve data through my API integration." It narrates its own plumbing. The prompt leaks into the prompt. It's the AI equivalent of an actor reading the stage directions out loud.

It's maddening. It's also the job. The difference between a science project and a system that runs a business is everything you build *around* the model so that when it drifts, you catch it before your customer does.

## The scaffolding that keeps me sane

I don't fight the chaos with vibes. I fight it with structure. Before anything ships, I've already built the apparatus to pre-evaluate success and catch regressions:

- **Tests up front.** I write the test cases *before* I trust the output, so I can pre-evaluate success instead of discovering failures in production.
- **Context as a knowledge base.** Context files inform how the AI is created and maintained — development protocols, release protocols, and the actual context of the business it's serving. The model doesn't get to improvise the company's reality.
- **Memories and rules.** When a change is significant enough to matter, I record the fix. Post-mortems become memory. The system stops re-learning the same lesson.
- **A panel of experts.** I bring in different perspectives to weigh in — including the AI's own. AI is a challenge with its own point of view, and I record that too, because sometimes the model's objection is right.
- **Evals at the end.** I check all the work after the fact. Not a spot check — a real audit of what actually happened versus what was supposed to happen.

That last one is the unlock. Evals turn "I think it's working" into "here's the win rate."

## What the scaffolding shipped this week

Here's the part I genuinely didn't expect to get done. The same discipline that keeps me from losing my mind is also a flywheel — and this week it produced real things:

**Reams and reams of test cases.** Through evals, I audited *thousands* of RingCentral calls — tagging topics and grading outcomes — to compare humans dispatching calls against the machine. Not a vibe. A measured win rate.

**Slack wired into Salesforce, talking in real time.** I set it up to send partial messages and then update them in place, so we shaved four to five seconds off the gap between when a call comes in and when the dispatcher actually sees what they need. In dispatching, four seconds is a long time.

**Cost cut by more than half.** For one client, I brought token usage down by over 50%. Same outcomes, half the spend.

**Coaching and guidance, baked in.** We can now surface points of guidance and coaching directly in the workflow — and feed real calls back into the system to iterate and make enhancements to the core tool.

## The numbers I'm still earning

I'll tell you what I *don't* know yet, because the eval discipline cuts both ways — it keeps me honest about what I can actually claim.

I think the close rate is moving. I'm not ready to say I moved it myself, or by how much. We'll see at the end of the week. Tomorrow I'm going to check something specific: whether the dispatchers are spending *less* time on the calls I forward — because if they're actually using the information I'm dropping into the Slack channel, the handle time should drop. If it does, that's a huge difference, and I'll have the data to prove it instead of the feeling that it's true.

That's the whole game. Build the scaffolding. Let the model be a challenge. Catch the drift with evals. And measure the wins instead of assuming them.

It's whack-a-mole. But every week the moles get slower, and the mallet gets a feedback loop.
