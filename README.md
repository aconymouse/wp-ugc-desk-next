# wp-ugc-desk-next

[Bahasa Indonesia](README.id.md)

A Next.js front end for [WP UGC Desk](https://github.com/aconymouse/wp-ugc-desk): reader accounts, a writing editor, and web push.

Readers sign in with Google or an email code, fill in a writer profile, and write right on the site. When they send it, the piece is turned into Gutenberg blocks and goes into WordPress for editors to review. They can follow the status and any revision notes from their account page.

It runs every day on [Owrite](https://www.owrite.id), an Indonesian news site, so the interface text is in Indonesian.

## Try it

- [owrite.id/kirim-tulisan](https://www.owrite.id/kirim-tulisan/): sign in and play with the editor. Nothing reaches the newsroom until you hit Kirim (send).
- [owrite.id/notifikasi](https://www.owrite.id/notifikasi/): turn on notifications and pick categories.

## What's in it

- Sign in with Google or a 6-digit email code. Codes last 10 minutes. 15 wrong codes in an hour locks that email for an hour and warns the owner. Cloudflare Turnstile keeps bots out.
- Accounts that already exist in WordPress are matched by email. Admins, editors, and authors keep their role.
- A writer profile (photo, name, title, bio, social links) that becomes the byline. The send button stays off until it's complete.
- A Tiptap editor with headings, quotes, lists, images, and YouTube, X, Instagram, TikTok, Threads embeds. Drafts save to the browser as you type and to the server every few seconds, so a dropped connection loses nothing.
- A "Tulisanmu" (your writing) page with drafts, pieces under review, revision requests with notes, and published work.
- A report form on every article.
- Web push with no third-party service. A service worker, VAPID keys, and `web-push`.

## Requirements

- Node.js 20.9+
- MySQL or MariaDB
- WordPress with [WP UGC Desk](https://github.com/aconymouse/wp-ugc-desk) and PublishPress Authors active
- Optional: a Google OAuth client, a [Brevo](https://www.brevo.com) account for email, Cloudflare Turnstile

## Running it

1. Install and set up the [WP UGC Desk](https://github.com/aconymouse/wp-ugc-desk#install) plugin first.
2. Create the database and import the tables:

   ```
   mysql -u root -p -e "CREATE DATABASE ugc_desk"
   mysql -u root -p ugc_desk < db/schema.sql
   ```

3. Copy `.env.example` to `.env.local` and fill it in. At minimum:
   - `WORDPRESS_API_URL`, for example `https://cms.example.com/wp-json`
   - `WORDPRESS_AUTH_USER` and `WORDPRESS_AUTH_PASS`, an admin Application Password
   - `UGC_DESK_SECRET`, exactly the same as the key in the plugin
   - `AKUN_DATABASE_URL`
   - `BETTER_AUTH_SECRET`, from `openssl rand -hex 32`
4. `npm install`, then `npm run dev`.
5. Open `http://localhost:3000/kirim-tulisan`.

To make poking around easier:

- Without `BREVO_API_KEY`, emails are printed in the terminal, sign-in codes included.
- Without Turnstile keys, the check is skipped outside production.
- `AKUN_WP_OFF=1` lets you click through the account and editor pages with no WordPress at all.

## Web push

1. Generate keys once: `npx web-push generate-vapid-keys`. Keep them, because replacing them drops every existing subscription.
2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT_EMAIL`, then `NEXT_PUBLIC_PUSH=1`.
3. In WordPress, tick "Kirim notifikasi ke pembaca" on the post you want to send.

On iPhone and iPad, notifications only work after the site is added to the Home Screen. That's Apple's rule, not a bug.

## Environment

| Variable | What it's for |
| --- | --- |
| `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL` | Site name and address, used in text, emails, and metadata |
| `NEXT_PUBLIC_CMS_URL` | Public WordPress address, for links and images |
| `NEXT_PUBLIC_AKUN`, `NEXT_PUBLIC_PUSH` | Feature switches, `1` to turn on |
| `NEXT_PUBLIC_AKUN_EMAIL` | `0` for Google sign-in only |
| `WORDPRESS_API_URL` | WordPress REST address |
| `WORDPRESS_API_URL_BUILD` | Optional REST address for build time, when the normal one is on a private network |
| `WORDPRESS_AUTH_USER`, `WORDPRESS_AUTH_PASS` | Admin Application Password |
| `UGC_DESK_SECRET` | Key shared with the plugin |
| `AKUN_DATABASE_URL` | MySQL or MariaDB connection |
| `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` | Better Auth address and secret |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `BREVO_API_KEY`, `BREVO_PENGIRIM` | Email sending and the sender address |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | Cloudflare Turnstile |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT_EMAIL` | Web push |

## Not using Next.js?

That's fine. The plugin works with any stack. Treat this repo as a reference, and see the [API docs](https://github.com/aconymouse/wp-ugc-desk/blob/main/docs/api.md) for every request and webhook.

## Layout

```
app/akun/            account, settings, editor pages
app/api/akun/        profile, avatar, images, drafts, send, reports, webhook
app/api/push/        subscribe, category picks, key rotation, send
components/akun/     sign-in dialog, account button, profile form
components/naskah/   editor and writing list
components/push/     notification settings
lib/akun/            auth, database, email, rate limits, WordPress client
lib/naskah/          Gutenberg conversion, local drafts
lib/push/            subscriptions and delivery
db/schema.sql        all tables
```

## Credit

Made by Hafidz Nc ([Aconymous](https://aconymous.com), [GitHub](https://github.com/aconymouse), [LinkedIn](https://www.linkedin.com/in/tjuanmudaco/)) for Owrite.

MIT licensed.
