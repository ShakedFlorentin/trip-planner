# Email for open sign-up: Resend + Supabase Auth (2026-11-16)

Why: Supabase's built-in mail only reaches the team's own addresses and is capped at a few mails an hour. Open sign-up
(confirm email, reset password) needs a real sender. Do this BEFORE switching `features.open_signup` on.
The invite flow (`sign-up` function) sends no mail and is not affected.

## 1. A sending domain (required)
Resend's free tier (3,000 mails/month, 100/day) delivers only to your own Resend-account address until a DOMAIN you
own is verified. So you need a domain (any registrar). Use a subdomain, e.g. `mail.<yourdomain>`, so it stays apart
from your normal mail.

## 2. Resend
1. resend.com, sign up, Domains, Add Domain, enter `mail.<yourdomain>`, region closest to your users (EU if unsure).
2. Resend shows DNS records. Add them at your DNS host exactly as shown (names/values differ per account):
   - SPF: a TXT record on `send.mail.<yourdomain>` (value starts `v=spf1 include:amazonses.com ...`) and an MX record
     on `send.mail.<yourdomain>` (priority 10, feedback-smtp...amazonses.com).
   - DKIM: a TXT record `resend._domainkey.mail.<yourdomain>` (long `p=...` value).
   - DMARC (recommended): TXT `_dmarc.mail.<yourdomain>` = `v=DMARC1; p=none; rua=mailto:<your address>`.
3. Click Verify in Resend; wait until status is "Verified" (minutes to a few hours).
4. API Keys, Create API Key, "Sending access", limited to that domain. Copy it (shown once). Never put it in the repo or the app.
5. Turn OFF open and click tracking for the domain in Resend (Domain settings) so no tracking pixel or rewritten links
   touch the confirm/reset links (rewritten links can also break them).

## 3. Supabase Auth: Custom SMTP
Dashboard, project `wbofjfwbdewgnwjmcpnv`, Authentication, Emails (SMTP Settings), enable Custom SMTP:
- Sender email: `no-reply@mail.<yourdomain>`; Sender name: `Toogo`
- Host: `smtp.resend.com`; Port: `465` (SSL) (587 also works); Username: `resend`; Password: the API key from step 2.4
Save. Then "Send test"/trigger a password reset to your own address and check it arrives and is not in spam.

## 4. URL configuration
Authentication, URL Configuration:
- Site URL: `https://shakedflorentin.github.io/trip-planner/`
- Redirect URLs (add all):
  - `https://shakedflorentin.github.io/trip-planner/`
  - `https://shakedflorentin.github.io/trip-planner/?reset=1`   (password reset; the app reads `?reset=1`)
  - `https://shakedflorentin.github.io/trip-planner/**`         (covers the confirm landing and any query/hash the client adds; if you prefer exact entries, add the exact confirm-landing URL the frontend uses)
  - `toogo://auth-callback`                                      (iOS app deep link, added by the frontend agent)
  - `http://localhost:5173/**` only if you test locally, remove afterwards.
A redirect not on this list is silently replaced by the Site URL, so the iOS link and `?reset=1` must be listed.

## 5. Email templates
Authentication, Emails, Templates. For each, paste the HTML file as the message body and set the subject:
| Template | File | Subject |
|---|---|---|
| Confirm signup | `supabase/email-templates/confirm-signup.html` | `אישור מייל ל-Toogo / Confirm your Toogo email` |
| Reset password | `supabase/email-templates/reset-password.html` | `איפוס סיסמה ל-Toogo / Reset your Toogo password` |
| Change email address | `supabase/email-templates/change-email.html` | `אישור שינוי מייל / Confirm your new email` |
Uses `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`. Leave "Magic link" and "Invite user" as they are (unused).
Auth Providers, Email: "Confirm email" ON; minimum password length 8 (the app and `sign-up` require 8); leave "Secure email change" ON.
Note: the confirm link goes to the `emailRedirectTo` the client passes (must be in the list in step 4).

## 6. Rate limits (Authentication, Rate Limits)
Suggested starting values (tune after launch):
- Emails sent per hour: 30 (with custom SMTP this is yours to set; Resend free allows 100/day, so 30/h cannot burn the day by itself in one hour but can in four. Lower to 15 if you see bot noise.)
- Sign-ups and sign-ins per 5 min per IP: 10
- Token verifications per 5 min per IP: 30
- Token refreshes: leave default
- Sign-in / OTP: leave default
- Auth, Providers, Email: "Email OTP expiration" 3600 s (default) is fine.
The 100/day Resend cap is the real ceiling: when it is hit, new people get no confirm mail. Upgrade Resend (about $20/month) if sign-ups pass ~80/day.

## 7. CAPTCHA (recommended, not enabled): Cloudflare Turnstile (free)
Why: with sign-up open, scripts can create thousands of unconfirmed accounts and spend your mail quota. Rate limits per IP only slow that.
Steps:
1. Cloudflare dashboard, Turnstile, Add widget, hostname `shakedflorentin.github.io`, mode Managed. Copy Site key and Secret key.
2. Supabase, Authentication, Attack Protection, enable CAPTCHA, provider Turnstile, paste the Secret key.
3. Client change (frontend agent): add the Turnstile widget (`@marsidev/react-turnstile` or the script tag from challenges.cloudflare.com) on the sign-up and forgot-password forms, and pass the token:
   `supabase.auth.signUp({ email, password, options: { captchaToken, emailRedirectTo, data: { name } } })`
   `supabase.auth.resetPasswordForEmail(email, { redirectTo, captchaToken })`
   (also `signInWithPassword({ ..., options: { captchaToken } })`: once CAPTCHA is on Supabase requires a token on sign-in too, so every email-auth form needs the widget, or sign-in breaks.)
4. The Turnstile site key is public (fine in the client). Add the hostname for the Capacitor app origin (`capacitor://localhost`) if the iOS app runs the form: Turnstile in a WKWebView on a non-listed origin can fail, test on a device before enabling. The `sign-up` invite function does not use Supabase's captcha check (admin API), so invites are unaffected.
5. Do not enable it before the client ships the widget: all email sign-ins would fail.

## 8. Order of switching on
1. Steps 1-6 done, test mails received (reset to your own address, sign-up with a second address of yours via a build that has open sign-up).
2. Run `supabase/sql/2026-11-16-open-signup.sql` (flag stays off).
3. Optionally run `supabase/sql/tests/2026-11-16-open-signup-test.sql` on a branch/rehearsal DB, never live.
4. Frontend with the open sign-up form is published.
5. Switch on: `update public.app_settings set value = value || '{"open_signup": true}' where key = 'features';`
Switch off: `update public.app_settings set value = value || '{"open_signup": false}' where key = 'features';`
Real trip `a779ec4d-...`: nothing here touches trips, members or bookings. Consider doing this after the trip (Dec 2026) per the owner's no-risky-deploy rule.
