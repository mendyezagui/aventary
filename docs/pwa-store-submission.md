# Putting Tehillim in the App Store and on Google Play

The app is a PWA served from `tehillimcircle.com/tehillim`. Both stores are
reached with **PWABuilder** (pwabuilder.com), which wraps the live PWA — it does
not rebuild the app. Nothing here needs a code change to the reader; the pieces
the stores check for already ship in this repo:

- **Manifest** — `public/tehillim/manifest.webmanifest`: `name`, `short_name`,
  `description`, `id`/`start_url`/`scope` all `/`, `display: standalone`, a full
  icon set (incl. a 512 `maskable`), `categories`, and three phone
  `screenshots`. PWABuilder reads all of this.
- **Service worker** — `public/sw.js`, registered by `app/tehillim/PwaRegister.tsx`.
  Network-first with an offline fallback. This is what makes the PWA
  "installable", which is the gate PWABuilder checks first.
- **Digital Asset Links** — `app/api/assetlinks/route.ts`, served at
  `/.well-known/assetlinks.json` via a rewrite in `next.config.mjs`. Env-driven,
  so the Android signing fingerprint goes in Cloudflare, not in a commit.

The URL to hand PWABuilder is **`https://tehillimcircle.com/tehillim`**.

---

## Google Play (Android) — a TWA

PWABuilder wraps the PWA in a **Trusted Web Activity**: a full-screen Chrome with
no address bar, as long as Digital Asset Links verifies. Output is an Android App
Bundle (`.aab`) you upload to the Play Console.

### 1. Generate the package

1. Go to pwabuilder.com, enter `https://tehillimcircle.com/tehillim`, **Start**.
2. On the report card, **Package for stores → Android → Google Play**.
3. Options that matter (leave the rest at PWABuilder's defaults):
   - **Package ID** — the Android application id, e.g. `app.tehillimcircle.twa`.
     This is permanent for the life of the listing; write it down.
   - **App name** — `Tehillim` (or `Tehillim — Psalms`).
   - **Signing key** — let PWABuilder **generate a new signing key**. Download the
     `.zip` it gives you and keep it somewhere safe (a password manager). It
     contains `signing.keystore` and a `signing-key-info.txt` with the passwords
     **and the SHA-256 fingerprint** — you need that fingerprint in step 2. If
     you lose this key you can never ship an update to the same listing.
4. Download the `.zip`. Inside: the `.aab` to upload, and the key material.

### 2. Wire up Digital Asset Links (the no-address-bar part)

The TWA only drops the browser chrome if `tehillimcircle.com/.well-known/assetlinks.json`
names the app. That file is generated from two Cloudflare env vars — set them on
the **`aventary`** Worker (Cloudflare dashboard → Workers & Pages → `aventary` →
Settings → Variables), then redeploy or let the next CI deploy pick them up:

```
ANDROID_PACKAGE_NAME = app.tehillimcircle.twa        # the Package ID from step 1
ANDROID_CERT_SHA256  = AB:CD:EF:...                    # SHA-256 from signing-key-info.txt
```

`ANDROID_CERT_SHA256` accepts a comma-separated list, which you will need later:
Play's **App Signing** re-signs your upload with Google's own key, so once the app
is live, add **Google's** signing-key SHA-256 (Play Console → Setup → App signing)
alongside the upload key's. Both fingerprints, comma-separated. Until you do,
users installed from Play may see the address bar.

Verify the file after setting the vars:

```
curl -s https://tehillimcircle.com/.well-known/assetlinks.json
```

Empty `[]` means the vars aren't set yet. A one-element array with your package
name means it's wired.

### 3. Upload to the Play Console

1. Play Console → **Create app** (or the existing app) → **Production** (or start
   with **Internal testing** to smoke-test on a real device first).
2. Upload the `.aab`.
3. Fill the store listing — see **Store listing copy** below. Screenshots: use
   the three PNGs in `public/tehillim/screenshots/` (phone, 824×1830).
4. Complete Play's **Data safety** form. This app collects an **email address**
   (magic-link sign-in) for **App functionality / Account management**; it is not
   shared with third parties and not used for ads or tracking. There is no other
   personal data.
5. Content rating questionnaire: it's a religious-text reader, no objectionable
   content — expect **Everyone**.
6. Submit for review.

---

## App Store (iOS) — an Xcode project

Apple has no TWA equivalent; PWABuilder emits an **Xcode project** (a WKWebView
shell around the PWA). You need a **Mac with Xcode** and the paid Apple Developer
account to build and upload it.

### 1. Generate the project

1. pwabuilder.com → same URL → **Package for stores → iOS**.
2. Set:
   - **Bundle ID** — e.g. `com.tehillimcircle.app` (must match an App ID you'll
     register in the Apple Developer portal).
   - **App name** — `Tehillim`.
   - **URL** — `https://tehillimcircle.com/tehillim` (already filled).
3. Download the `.zip` and unzip on the Mac.

### 2. Build and upload

1. Open the `.xcodeproj` in **Xcode**.
2. Signing & Capabilities → pick your **Team**; let Xcode manage signing. Confirm
   the **Bundle Identifier** matches the App ID.
3. Set a real **version** (1.0.0) and **build** number.
4. **Product → Archive**, then **Distribute App → App Store Connect → Upload**.
5. In **App Store Connect**, create the app record (same Bundle ID), attach the
   build, add the listing copy and screenshots, answer the **Privacy** questions
   (same as Play: email for sign-in, no tracking), and submit.

### 3. The Apple 4.2 risk — read before submitting

Apple rejects apps that are "just a website in a shell" under **Guideline 4.2
(Minimum Functionality)**. This is the most common reason a PWABuilder iOS app
bounces. It's beatable — lean on what the app genuinely does that a Safari tab
doesn't:

- **Works offline** — the service worker caches the reader; the daily portion and
  saved Psalms open with no signal. Demonstrate this in the review notes.
- **Native-feeling, single-purpose** — full-screen Hebrew reader, hands-free
  auto-scroll, read-aloud with the device voice, night mode, the daily portion by
  the Hebrew date. Not a repackaged marketing site.
- **Signed-in state** — saved Psalms and the "your circle" count persist to an
  account.

In **App Review notes**, spell out: what the app is (a Tehillim/Psalms reader),
that it works offline, how to reach the read-aloud and auto-scroll, and — if they
ask for a login — that sign-in is a **magic link sent to any email**, so give
them a review email address to use. If it's rejected anyway, reply in Resolution
Center pointing at the offline behavior and single-purpose design; a short back-
and-forth is normal and usually clears it.

---

## Store listing copy

Reusable for both stores. Trim to each store's limits.

**App name:** Tehillim — Psalms

**Short description / subtitle (≤80 chars):**
> Hebrew Tehillim: the daily portion, any Psalm, auto-scroll, read-aloud, night mode.

**Full description:**
> Tehillim is a clean, distraction-free Psalms reader in Hebrew.
>
> • **Today's portion** — the daily Tehillim by the Hebrew day of the month, with the Elul and Ten Days of Repentance additions.
> • **Any Psalm** — jump straight to any chapter, or read Psalm 119 stanzas for a person's name.
> • **Hands-free auto-scroll** — set the pace and read without touching the screen.
> • **Read-aloud** — hear the Tehillim in your device's voice, at a speed you choose.
> • **Saved Psalms** — keep the ones you say for a name, for kaddish, or for family.
> • **Night mode** — easy on the eyes for late or early davening.
> • **Works offline** — once opened, the reader and your saved Psalms are there with no signal.
>
> Sign in with just your email to save Psalms and see how many perakim the people you've shared the app with have said.

**Keywords (iOS, ≤100 chars, comma-separated):**
> tehillim,psalms,hebrew,jewish,prayer,siddur,daily psalms,torah,shabbat,read aloud

**Category:** Books (primary) / Lifestyle or Education (secondary).

**Screenshots:** `public/tehillim/screenshots/` — `2-reader.png`, `1-home.png`,
`3-reader-dark.png` (phone, 824×1830). Regenerate them by loading the pages at a
412×915 viewport (deviceScaleFactor 2) and capturing full-height.

**Privacy:** collects an email address for magic-link sign-in (account
functionality) only. No third-party sharing, no ads, no tracking. Point both
stores' privacy forms at the same one-line policy.

---

## After it's live

- **Updating the app** — the store binary is a thin shell over the live site, so
  most changes ship the moment they deploy to `tehillimcircle.com`; you only
  re-submit to the stores to change the icon, name, or native shell, or to bump
  the version Apple/Google show.
- **Keep the Android signing key.** Losing `signing.keystore` means you can never
  update that Play listing — you'd have to publish a new app with a new package
  id. It lives in the PWABuilder `.zip` from Android step 1.
- **Add Google's signing SHA-256** to `ANDROID_CERT_SHA256` once the Play listing
  exists (Android step 2), or Play-installed users keep the address bar.
