# Play phone screenshots (1080x1920)

Google Play only accepts phone screenshots with an aspect ratio between 16:9
and 9:16. The three PNGs in `public/tehillim/screenshots/` are 824x1830, a
ratio of 0.45 — narrower than 9:16, so Play refuses them. They are not a
mistake: the PWA manifest lists them by name *and by size* for the install
prompt, so they must stay exactly as they are.

These five are the Play set: 1080x1920, dead on 9:16. Captured from the signed
TWA running on an Android 15 emulator, so they are the real app rather than a
browser at a phone width, and cropped from 1080x2400 with a small top offset to
drop the status bar.

Order as listed; the first is what shows in search results.
