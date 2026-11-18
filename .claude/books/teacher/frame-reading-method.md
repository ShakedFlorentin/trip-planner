---
title: Frame-reading method
chapter: method
---
Learned 16 Nov 2026: a Sonnet agent could not read raw browser screenshots (base64), `TextDetector` is absent and videos are `blob:` URLs. So no frame was read in the first teacher run. Do not claim "watched" without a working route.

## Route 1: look directly
Use `mcp__Claude_Browser__computer` with `screenshot` or `zoom` on the playing video. If it returns an image you can see, step the video (set `currentTime` with the javascript tool) at several timestamps and read on-screen text, code, UI and diagrams.

## Route 2: OCR
1. Read the direct `.mp4` URL from the page (`<video>` `src` if not `blob:`, or `video_url` / `video_versions` in the page JSON).
2. Download with `curl` into a new empty folder under the session scratchpad (the owner's yes for downloads, see signed-in rules). No cookies.
3. `/opt/homebrew/bin/ffmpeg -i reel.mp4 -vf fps=1 f%03d.png`
4. `/opt/homebrew/bin/tesseract f001.png - -l eng` (add `heb` if installed), or open the PNG with Read to look at it.
5. Delete the folder. Run Python with `-I` if you script it.

## Never
Disk-wide searches for tools; running anything from the download.

## Record
Per reel: "watched (frames)" or "caption only". Burned-in captions read at 1 s steps are fine; voice-only value is "voice only, not read".

## Budget
Captions first, frames only for the reels judged relevant, up to 5 per account on a tight budget, stop cleanly at an account boundary.

Related: [reel-learning-loop](reel-learning-loop.md).
