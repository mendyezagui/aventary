import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import { pingCopy, sendPush, vapidFromEnv, type PushSubscriptionRecord } from "@/lib/carpool/push";

// Records a carpool ping and pushes it to the parents it concerns.
//
// The insert runs as the signed-in user so RLS decides whether they are really
// in this group. Only the fan-out needs the service role, because a parent may
// not read anyone else's push subscriptions.

const Schema = z.object({
  group_id: z.string().uuid(),
  stop_id: z.string().uuid().nullable().optional(),
  run_id: z.string().uuid().nullable().optional(),
  kind: z.enum([
    "heads_up",
    "one_minute",
    "arrived",
    "waiting",
    "skipped",
    "running_late",
    "message"
  ]),
  message: z.string().max(400).optional(),
  eta_seconds: z.number().int().min(0).max(86_400).nullable().optional()
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const input = parsed.data;

  const sb = await createSupabaseServer();
  const {
    data: { user }
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const { data: me } = await sb
    .from("carpool_members")
    .select("id, display_name, group_id")
    .eq("group_id", input.group_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "not in this carpool" }, { status: 403 });

  const { data: ping, error } = await sb
    .from("carpool_pings")
    .insert({
      group_id: input.group_id,
      stop_id: input.stop_id ?? null,
      run_id: input.run_id ?? null,
      from_member: me.id,
      kind: input.kind,
      message: input.message ?? null,
      eta_seconds: input.eta_seconds ?? null
    })
    .select()
    .single();

  if (error) {
    // 23505 = the once-per-stop-per-run guard. Not a failure: the family has
    // already been told, and telling them twice is the actual bug.
    if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const delivered = await fanOut({
    groupId: input.group_id,
    stopId: input.stop_id ?? null,
    fromMemberId: me.id,
    fromName: me.display_name,
    kind: input.kind,
    message: input.message,
    etaSeconds: input.eta_seconds ?? null
  });

  return NextResponse.json({ ok: true, ping, delivered });
}

/** Push the ping to the right phones. Never throws — the row is already saved. */
async function fanOut(args: {
  groupId: string;
  stopId: string | null;
  fromMemberId: string;
  fromName: string;
  kind: string;
  message?: string;
  etaSeconds: number | null;
}): Promise<number> {
  if (!vapidFromEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return 0;

  try {
    const admin = createSupabaseAdmin();

    // Who should hear about this?
    let userIds: string[] = [];
    let stopLabel: string | undefined;

    if (args.stopId) {
      const { data: stop } = await admin
        .from("carpool_stops")
        .select("label, member_id")
        .eq("id", args.stopId)
        .maybeSingle();
      stopLabel = stop?.label ?? undefined;
      if (stop?.member_id) {
        const { data: owner } = await admin
          .from("carpool_members")
          .select("user_id")
          .eq("id", stop.member_id)
          .maybeSingle();
        if (owner?.user_id) userIds = [owner.user_id];
      }
    } else {
      const { data: everyone } = await admin
        .from("carpool_members")
        .select("user_id, id")
        .eq("group_id", args.groupId);
      userIds = (everyone ?? [])
        .filter((m) => m.id !== args.fromMemberId)
        .map((m) => m.user_id as string);
    }

    if (userIds.length === 0) return 0;

    const { data: subs } = await admin
      .from("carpool_push_subs")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (!subs || subs.length === 0) return 0;

    const payload = pingCopy(args.kind, args.fromName, {
      stopLabel,
      message: args.message,
      etaSeconds: args.etaSeconds
    });
    payload.url = "/carpool";
    payload.tag = `${args.kind}-${args.stopId ?? args.groupId}`;

    const results = await Promise.all(
      subs.map(async (sub) => {
        const record: PushSubscriptionRecord = {
          endpoint: sub.endpoint as string,
          p256dh: sub.p256dh as string,
          auth: sub.auth as string
        };
        const result = await sendPush(record, payload);
        if (result.gone) {
          await admin.from("carpool_push_subs").delete().eq("id", sub.id);
        } else if (result.ok) {
          await admin
            .from("carpool_push_subs")
            .update({ last_ok_at: new Date().toISOString() })
            .eq("id", sub.id);
        } else {
          await admin
            .from("carpool_push_subs")
            .update({ failed_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
        return result.ok;
      })
    );
    return results.filter(Boolean).length;
  } catch (e) {
    console.error("carpool push fan-out failed", e);
    return 0;
  }
}
