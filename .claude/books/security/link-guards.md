---
title: Link guards and the DNS check
chapter: defences
explains:
  - isPrivateHost
  - redirectAllowed
  - imageHostAllowed
  - publicHttpsAllowed
  - dnsAllowed
  - followRedirects
  - fetchLimited
  - readCapped
  - isConsentHost
  - isGoogleHost
---
Goal: the server (edge function, service role nearby) must never be talked into fetching something internal (SSRF), and must not download huge files. File: `supabase/functions/_shared/guard.ts`.

**Host checks (no network)**
- `isPrivateHost(hostname)`: refuses localhost, `.local/.internal/.lan/.home.arpa/.corp`, names with no dot, IPv6 loopback/unique-local/link-local, IPv4-mapped IPv6, and every IPv4 range that is private, loopback, link-local (metadata 169.254), shared, reserved or multicast. IPv4 in hex, octal or one big number is refused.
- `redirectAllowed(url)`: where a pasted link may point: https, no credentials, port 443 only, TikTok, Instagram, `maps.app.goo.gl`, Google consent pages and Google Maps paths only.
- `imageHostAllowed(url)`: post pictures only from the Instagram/Facebook/TikTok CDNs.
- `publicHttpsAllowed(url)`: any public https page or file (card photos, a place's website) with a public name, not an IP literal.

**Network checks**
- `dnsAllowed(host, resolve)`: resolves A and AAAA and refuses if any answer is blocked (`addressBlocked`); a failed lookup refuses the fetch. This closes "public name that points to a private address".
- `followRedirects(fetch, url, allowed, init)`: manual redirects, at most `MAX_HOPS` (5); every hop is checked by the host rule and by DNS before it is fetched.
- `fetchLimited` and `readCapped`: read at most `MAX_HTML` (2 MB) or `MAX_IMAGE` (6 MB) and only expected content types (jpeg, png, webp for images).

**Rules**
- Never call `fetch` on a user-supplied or model-supplied URL directly; go through these. Commit 4a26113 added the DNS check with 45 tests.
- A URL a member typed that is later opened by users must be https/http only (`place_library_safe_links` and the candidates trigger clean links on write after the poisoning fix; read-only until applied). QA: "Navigate" opened a pasted TikTok link (client).
- `safeUrl` accepts `https://` with no host (QA low).
- Add a test for each new allowed host.
Related: injection-defences, backend book (functions-cards).
