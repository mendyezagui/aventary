import { useEffect, useState } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";

/**
 * A daily nudge to say today's Tehillim, scheduled on the phone.
 *
 * This is the one piece of the app that has no counterpart on the website, and
 * it is deliberately local: the notification is scheduled by iOS itself, so it
 * arrives with no server, no account and no network. Nothing about who reads
 * what leaves the phone.
 *
 * The permission is only ever asked for when someone turns the reminder on. An
 * app that asks at launch, before it has shown why, gets refused once and then
 * has no way back except the Settings app.
 */

const PREF = "tehillim.reminder";
const ID = 1;

type Pref = { on: boolean; hour: number; minute: number };

function readPref(): Pref {
  try {
    const raw = localStorage.getItem(PREF);
    if (raw) return { hour: 8, minute: 0, on: false, ...JSON.parse(raw) };
  } catch {
    /* a blocked or cleared store just means the default */
  }
  return { on: false, hour: 8, minute: 0 };
}

function writePref(p: Pref) {
  try {
    localStorage.setItem(PREF, JSON.stringify(p));
  } catch {
    /* the schedule itself is what matters; the preference is a convenience */
  }
}

function label(hour: number, minute: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

export default function DailyReminder() {
  const [pref, setPref] = useState<Pref>(readPref);
  const [denied, setDenied] = useState(false);

  // Keep the scheduled notification in step with the preference, including
  // after an update that changed the wording.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: ID }] });
        if (!pref.on || cancelled) return;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: ID,
              title: "Tehillim",
              body: "Today's portion is ready.",
              schedule: { on: { hour: pref.hour, minute: pref.minute }, allowWhileIdle: true },
            },
          ],
        });
      } catch {
        /* Scheduling can fail if the permission was revoked in Settings; the
           switch below reflects the stored preference either way, and turning
           it off and on again re-asks. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pref]);

  async function toggle() {
    if (pref.on) {
      const next = { ...pref, on: false };
      setPref(next);
      writePref(next);
      return;
    }
    let granted = false;
    try {
      const current = await LocalNotifications.checkPermissions();
      const status =
        current.display === "granted"
          ? current
          : await LocalNotifications.requestPermissions();
      granted = status.display === "granted";
    } catch {
      granted = false;
    }
    if (!granted) {
      setDenied(true);
      return;
    }
    setDenied(false);
    const next = { ...pref, on: true };
    setPref(next);
    writePref(next);
  }

  function shiftTime(delta: number) {
    const total = (pref.hour * 60 + pref.minute + delta + 1440) % 1440;
    const next = { ...pref, hour: Math.floor(total / 60), minute: total % 60 };
    setPref(next);
    writePref(next);
  }

  return (
    <section className="card">
      <div className="card-main">
        <span className="card-kicker">ON THIS PHONE</span>
        <span className="card-title">Daily reminder</span>
        <span className="card-desc">
          {pref.on
            ? `Every day at ${label(pref.hour, pref.minute)}. Set on the phone itself — nothing is sent anywhere.`
            : "A quiet nudge each day when today's portion is ready. It is scheduled on the phone, so it works with no signal."}
        </span>
        {denied && (
          <span className="card-desc">
            Notifications are turned off for Tehillim. Settings › Notifications ›
            Tehillim to allow them.
          </span>
        )}
        <div className="sendrow">
          <button type="button" className="cta cta-quiet" onClick={() => void toggle()}>
            {pref.on ? "Turn off" : "Remind me daily"}
          </button>
          {pref.on && (
            <>
              <button type="button" className="move-btn" onClick={() => shiftTime(-30)}>
                −30m
              </button>
              <button type="button" className="move-btn" onClick={() => shiftTime(30)}>
                +30m
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
