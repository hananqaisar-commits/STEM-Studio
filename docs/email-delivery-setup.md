# STEM Studio email delivery

## What the app sends

The backend has one branded sender configuration for account verification, verification retries, password resets, billing lifecycle notices, and optional owner announcement emails. Announcements still appear in the in-app notification center; the owner must choose **send email** to also email eligible learners. Product updates and promotions are limited to verified learners who opted into marketing email. Provider acceptance does not prove inbox delivery.

The API uses Resend's HTTPS email endpoint by default. Each queued email gets a stable provider idempotency key, which helps prevent a duplicate when an API response is lost and the app retries within the provider's idempotency retention period. This works with Render's Free web service, where outbound SMTP ports 25, 465, and 587 are blocked. SMTP remains available as an explicit option for a backend host that permits SMTP egress.

## You need a domain you control

The current site URL, `https://stem-studio-one.vercel.app`, is a Vercel deployment hostname. It does not give you DNS control over `vercel.app`, so it cannot be used as a sender domain such as `no-reply@stem-studio-one.vercel.app`. Vercel assigns `vercel.app` deployment URLs; a custom domain must be purchased or registered and then connected to the Vercel project.

1. Buy or use a domain you own, for example `your-domain.example` (replace this placeholder with your actual domain). You can register with Vercel or another domain registrar.
2. Connect the custom web domain to your Vercel project under **Project → Settings → Domains** and follow Vercel's DNS instructions. This is optional for email itself, but gives the public site a branded URL.
3. In Resend, open **Domains → Add Domain**. For account email, use a dedicated sending subdomain such as `account.your-domain.example`; you can use that verified subdomain for owner/product announcements too. Resend requires a domain you own and verifies it through DNS.
4. Copy the exact DNS records shown by Resend into the DNS manager for that domain. Add every record Resend asks for, including its DKIM and SPF records and any return-path/MX records it displays. Do not guess these values. Preserve existing website A/CNAME records and mail MX records.
5. If the domain already has an SPF TXT record, update that single SPF policy according to the DNS/email provider's instructions instead of creating a second SPF record at the same hostname. Keep the existing mail setup intact. Add DMARC only after reviewing the domain's current email sources; start with monitoring (`p=none`) and tighten later based on reports.
6. Return to Resend and wait until the sending domain is marked verified. Resend recommends a sending subdomain to isolate email reputation.
7. Create a restricted sending API key in Resend. Keep it private. Resend is the sending service; it does not automatically create an inbox. If users should be able to reply, create an inbox or forwarding address with an email/mailbox provider, then use it as the reply-to address.

## Configure the Render backend

These settings belong in the **backend Render Web Service**, not in Vercel's frontend environment and not in a shared environment group unless that group is intentionally attached to this service.

Open **Render Dashboard → My project → Production → STEM-Studio-backend → Environment → Add Environment Variable**. Add these one by one:

| Key | Value |
| --- | --- |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | The secret key created in Resend. Mark it secret if Render offers that option. |
| `EMAILS_FROM_EMAIL` | `no-reply@account.your-domain.example` using the domain you verified in Resend. |
| `EMAILS_FROM_NAME` | `STEM Studio` |
| `EMAILS_REPLY_TO` | Your real support inbox, such as `support@your-domain.example`. It may be blank if replies are not set up. |
| `FRONTEND_URL` | `https://stem-studio-one.vercel.app` until you connect a custom web domain. |

Save the environment changes and let Render redeploy the backend. Do not put `RESEND_API_KEY` in a `VITE_` variable, frontend source, Git, or chat. Checked-in `.env.example` files contain placeholders only.

### Optional SMTP fallback

If you later move the API to a host that permits SMTP, set `EMAIL_PROVIDER=smtp` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_TLS`, `SMTP_USE_SSL`, `SMTP_USER`, and `SMTP_PASSWORD` for that provider. Render Free cannot use SMTP ports 25, 465, or 587; keep `EMAIL_PROVIDER=resend` on that service or use a suitable paid setup.

## Confirm delivery

After redeploy:

1. In Resend, open **Emails** so you can inspect provider-side outcomes.
2. Create a test account using an inbox you control. Confirm the verification message arrives, and open the link.
3. Regular learner signup does not require verification by default. Test password reset and an owner announcement using an inbox you control. To test learner verification, set `EMAIL_VERIFICATION_REQUIRED=true` on the backend, redeploy, then sign up a fresh test account and use the verification link.
4. If available, create a billing notice or use an owner announcement with email enabled and a small eligible test audience. Promotions/product updates only go to people who opted in.
5. If the app reports an email failure, check Render logs for the safe delivery category, then check Resend's email log for the provider-side cause. Never paste API keys, verification links, password-reset links, authenticator setup keys, or private headers into support messages.

Email syntax checks cannot determine that an inbox exists. The verification link confirms that the user can access that inbox. A provider's accepted/queued status also does not guarantee delivery to the inbox; monitor bounces, complaints, and suppressions in the provider dashboard.

## Announcements and volume

The app creates in-app announcements and navbar unread counts independently of email. The owner may request email when publishing a broadcast. Marketing preference is checked for promotions and product updates; service messages use the verified active audience. Do not treat this owner tool as a full marketing campaign platform: large campaigns need provider-managed bounce/complaint webhooks, unsubscribe flows, suppression handling, rate/volume controls, and a provider plan with enough quota. The current app does not claim capacity for 45k or 200k recipients.

## Provider documentation

- [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email)
- [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction)
- [Render free-service limitations](https://render.com/docs/free)
- [Connect a custom domain to Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
