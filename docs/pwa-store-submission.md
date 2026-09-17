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

> **Already built once.** A signed `.aab` + `.apk` and the signing keystore were
> generated with Bubblewrap (the CLI PWABuilder wraps) and handed over in
> `tehillim-android-package.zip`. Its upload key is already baked into
> `assetlinks` (step 2). If you still have that zip you can skip step 1 and go to
> **step 3 (Upload)**; regenerate below only if you need a fresh build. Either
> tool produces an equivalent package.

### 1. Generate the package (only if you don't have the handed-over zip)

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
names the app's signing key. `app/api/assetlinks/route.ts` **already bakes in the
package id (`app.tehillimcircle.twa`) and the upload key's SHA-256** — public info,
so the signed test build verifies out of the box with nothing to configure.

The one thing left is Play's own key. Google **re-signs** your upload with its own
key (Play App Signing), so the store build is signed differently from the test
`.apk`. Once the listing exists, add Google's fingerprint via the **`aventary`**
Worker's env (Cloudflare dashboard → Workers & Pages → `aventary` → Settings →
Variables); the route **merges** it into the baked defaults, so you only add the
new one:

```
ANDROID_CERT_SHA256 = <SHA-256 from Play Console → Setup → App signing → App signing key certificate>
```

(`ANDROID_CERT_SHA256` is a comma-separated list if you ever need more than one.
`ANDROID_PACKAGE_NAME` can override the package id but normally isn't needed.)
Until Google's key is added, Play-installed users may see the address bar; the
sideloaded test `.apk` is unaffected.

Verify the file:

```
curl -s https://tehillimcircle.com/.well-known/assetlinks.json
```

It already returns a one-element array with the package id and the upload
fingerprint. After you add Google's key, that array lists both fingerprints.

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

## App Store (iOS) — a Capacitor app that ships the text

Apple has no TWA equivalent, and a WKWebView shell around the live URL is
precisely the shape Guideline 4.2 rejects. So iOS is **not** a wrapper: it is a
Capacitor app in `native/tehillim` whose `webDir` is the built assets, not a
server.

> **Superseded.** An earlier PWABuilder Xcode project was generated for bundle
> id `com.tehillimcircle.app` and handed over as `tehillim-ios-xcode.zip`. It is
> not on the build Mac and it is no longer the path — the section below replaces
> it. Both used the same bundle id, so nothing about the App Store Connect
> record changes.

### Why this way

The whole of Tehillim is in the bundle: all 150 chapters, the daily portion
computed on device from the Hebrew date, both Hebrew faces and the site's body
font. It opens with **no signal on a first launch** — on a plane, in shul —
which the service worker cannot do, because `sw.js` is network-first and has
nothing cached until the app has been online once. That difference is the
Guideline 4.2 argument, and it is worth more than a page of appeal text.

Nothing about the reader is reimplemented. `native/tehillim/src/App.tsx`
imports `HomeTehillim`, `TehillimReader` and `fonts` **directly from
`app/tehillim`**, so a fix to the website is a fix to the app at the next
build. Three shims cover the only Next-specific pieces:

| import | stands in as |
|---|---|
| `next/navigation` | a hash router — two screens, and it works from `file://` |
| `next/font/google` | the class names, with the woff2 files bundled |
| `@/lib/supabase/client` | a stub that throws |

### What v1 leaves out

**Sign-in and the Tehillim circle.** The build defines the two
`NEXT_PUBLIC_SUPABASE_*` vars empty, which is what `hasSupabase()` in
`app/tehillim/account.ts` already gates every network call on, so those
features hide themselves rather than half-work. Magic-link auth in a native app
needs deep-link handling that is not built yet. Reading, the daily portion,
saved Psalms and Tehillim for a name are all unaffected: none of them ever
touched the network.

### What v1 adds

A **daily reminder**, scheduled by iOS itself through
`@capacitor/local-notifications`. No server, no account, and nothing about who
reads what leaves the phone. The permission is asked for when someone turns it
on, never at launch — an app that asks at launch gets refused once and then has
no way back except the Settings app.

### Build and upload

```
cd native/tehillim
npm install
npx vite build          # the web bundle the app ships
npx cap sync ios        # copies it in, refreshes the pods
open ios/App/App.xcworkspace
```

CocoaPods needs a UTF-8 locale or `pod install` dies on an encoding error:
`LANG=en_US.UTF-8 npx cap sync ios`.

In Xcode: the **App** target → **Signing & Capabilities** → your Team, set the
version and build number, destination **Any iOS Device** → **Product → Archive**
→ **Distribute App → App Store Connect**.

### Still to do before it can ship

- App icon and splash are still Capacitor's defaults; the artwork is in
  `public/tehillim/`.
- A notification has not been seen to fire on a device.
- No App Store Connect record, no App Store screenshots, no privacy manifest.

### The Apple 4.2 risk — still read before submitting

Lower than a shell, not zero. In App Review notes, say what the app is (a
Tehillim/Psalms reader), and that **it works with no network at all** — invite
them to turn on airplane mode before opening it, because that is the whole
argument and it is trivially checkable. Mention auto-scroll, night mode and the
daily portion by the Hebrew date. There is no login to give them: v1 has none.


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
