# Meeting light — physical device

A desk light driven by your Google Calendar. The Next.js app exposes
**`/api/status`**, which reads your calendar (via its secret iCal URL), works
out where you stand, and returns it as JSON. An ESP32 polls that endpoint over
WiFi every ~20 seconds and lights up. All the calendar logic lives on the
server, so the firmware stays tiny and you rarely reflash it.

```
Google Calendar  ──iCal──▶  /api/status (server)  ──WiFi/JSON──▶  ESP32  ──▶  light
```

There are two firmware builds — pick one:

| Build | Behaviour | Folder |
|-------|-----------|--------|
| **Single light + button** (recommended) | One LED. Turns **red 5 min before a meeting**; press the button to dismiss it; it re-arms for the next meeting (so back-to-back meetings still alert you). | `single-light/` |
| **Traffic light** | Three LEDs: 🟢 clear · 🟡 within 5 min · 🔴 in a meeting now. No button. | `meeting-light/` |

---

## Build A — single light + dismiss button (recommended)

One LED turns red 5 minutes before each meeting. Press the button to turn it off
when you head in; it automatically re-arms and lights up again 5 minutes before
the *next* meeting. Dismissals are tracked per-meeting (by calendar UID), so
silencing one meeting never silences the next.

### Parts (~$8)

| Part | Qty | Notes |
|------|-----|-------|
| ESP32 dev board | 1 | Any ESP32 with WiFi |
| 5mm LED (red) | 1 | |
| 220–330 Ω resistor | 1 | In series with the LED |
| Momentary push button | 1 | The dismiss button |
| Breadboard + jumper wires | 1 | |
| USB cable | 1 | Power + flashing |

### Wiring

| Part   | Connection |
|--------|------------|
| LED    | `GPIO 25 → resistor → LED(+)`, LED(−) → `GND` |
| Button | `GPIO 4 → button → GND` (uses the chip's internal pull-up) |

Change pins in `config.h` if needed. Set `BLINK_ALERT 0` for a steady (non-blinking) light.

### Flash it

1. Install the **Arduino IDE** and ESP32 board support (see "Flashing" below).
2. Open `device/single-light/single-light.ino`.
3. Copy `config.example.h` → `config.h`; fill in WiFi, `STATUS_URL`
   (add `?token=YOUR_TOKEN` if you set `MEETING_STATUS_TOKEN`), and pins.
4. Select your board + port, click **Upload**.

On boot the LED blinks twice (wiring self-test). Then: **dark** = nothing
imminent, **red/blinking** = a meeting starts within the warning window,
**press button** = dismiss until the next meeting.

---

## Build B — three-LED traffic light

- 🟢 **green** — you're clear, no meeting imminent
- 🟡 **yellow** — a meeting starts within 5 minutes (configurable)
- 🔴 **red** — a meeting is happening right now

## Parts (~$10)

| Part | Qty | Notes |
|------|-----|-------|
| ESP32 dev board (e.g. ESP32-WROOM DevKitC) | 1 | Any ESP32 with WiFi |
| 5mm LEDs — red, yellow, green | 1 each | Or one ready-made "traffic light" LED module (3 LEDs on a board) |
| 220–330 Ω resistors | 3 | One per LED (skip if your module has them built in) |
| Breadboard + jumper wires | 1 | |
| USB cable | 1 | Power + flashing |

> Want the photo's look (a real lamp)? Swap the LEDs for a **relay module**
> driving a 12 V / mains 3-colour traffic light. Wire each relay's control pin
> to `PIN_RED / PIN_YELLOW / PIN_GREEN`. **Mains voltage is dangerous — only do
> this if you know what you're doing.** The firmware is identical.

## Wiring (LED version)

Each LED: `GPIO pin → resistor → LED long leg (+)`, LED short leg (−) → `GND`.

| LED    | GPIO (default) |
|--------|----------------|
| Red    | 25 |
| Yellow | 26 |
| Green  | 27 |

Change the pins in `config.h` if your board breaks out different ones. If your
LEDs are common-anode (wired to 3.3 V instead of GND), set `ACTIVE_LOW 1`.

## Server setup (one time)

1. Deploy the app (it already builds for Cloudflare Pages — see the root README).
2. In Google Calendar → **Settings → [your calendar] → Integrate calendar →
   Secret address in iCal format**, copy the `.ics` URL.
3. Set these environment variables on the deployment:
   - `MEETING_ICAL_URL` — the secret iCal URL from step 2
   - `MEETING_WARN_MINUTES` — yellow lead time (default `5`)
   - `MEETING_STATUS_TOKEN` — any random string; this keeps your meeting titles
     private. The device sends it; the public internet can't read the endpoint
     without it.
4. Confirm it works: open `https://<your-site>/status` in a browser — that's the
   on-screen test view of the same data. (You don't need it once the light
   works, but it's handy for debugging.)

Leaving `MEETING_ICAL_URL` unset makes the endpoint serve **demo events** that
cycle green → yellow → red, so you can test the whole chain before wiring real
calendar data.

## Flashing the ESP32

1. Install the **Arduino IDE**.
2. Add ESP32 support: *File → Preferences → Additional Boards Manager URLs* →
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`, then
   *Tools → Board → Boards Manager* → install **esp32 by Espressif**.
3. Open `device/meeting-light/meeting-light.ino`.
4. Copy `config.example.h` to `config.h` and fill in your WiFi, the
   `STATUS_URL` (include `?token=YOUR_TOKEN` if you set `MEETING_STATUS_TOKEN`),
   and pins.
5. *Tools → Board* → select your ESP32 board; *Tools → Port* → select the port.
6. Click **Upload**.

On boot the LEDs flash red → yellow → green (a wiring self-test), then the green
LED blinks while connecting to WiFi. After that it shows your live status.

## Reading the light

| Pattern | Meaning |
|---------|---------|
| Solid green | Clear |
| Blinking yellow | Meeting within the warning window (set `BLINK_YELLOW 0` for solid) |
| Solid red | In a meeting now |
| All three blinking | Can't reach the server / no WiFi — status unknown |
| Slow green blink at startup | Connecting to WiFi |
