# Billing, premium access, broadcasts, and ads

This guide describes the controls added to STEM Studio and the live-provider steps that remain outside the repository.

## Premium access rules

- The owner feature registry contains the modules and every DSA topic/category in `frontend/src/data/topicCatalog.json`. Newly added topic IDs and category keys are registered at backend startup without resetting existing owner choices.
- A free learner receives enabled features marked Free. A paid learner receives only the feature keys included in their current plan. An owner grant is stored as an owner-provided subscription with an expiry; it does not create a paid payment record.
- The API checks module and algorithm access on execution, quiz submission, and progress completion. The browser shows a lock for restricted topics and routes learners to `/plans?feature=...`.
- Unknown algorithm keys are rejected by the backend. A future DSA topic/category appears in the owner registry automatically when its stable key is added to the shared catalog. A new page/API still needs to use that stable feature key in its route and server-side entitlement guard before it has protected behavior.
- Retiring a paid plan hides it from new purchases. Existing subscriptions keep their purchased feature set through their period; plan price or feature changes with subscribers require a new plan version. The Free plan cannot be retired.
- Archiving a feature is a soft removal because existing progress and payment history must remain referentially valid.
- A feature can be disabled indefinitely, scheduled to resume on a selected date, or archived. A scheduled pause expires by timestamp in the authorization check, so a delayed maintenance worker cannot extend the lock.

The local visualizer code is delivered to a signed-in browser, so frontend locks are not secrecy controls. Protected backend operations also enforce entitlements; no web app can prevent a technically capable user from inspecting JavaScript already sent to their device.

## Owner-configured plans and discounts

In **Owner Control Center → Plans & billing → Plans & prices**, create separate monthly and yearly plan records. Choose an amount charged at every renewal, currency, included modules/topics, optional regular price and discount label, and whether the plan is listed or recommended. The regular price/label are advertised pricing only; the displayed recurring amount must be the amount configured on the corresponding Safepay recurring plan. Existing subscription prices and feature sets are protected; create a new plan code/version to change them. Learners can turn off future renewal while retaining the already-paid period.

This release does not create coupon-code redemption or payment-provider plans on the owner's behalf. `list_price_minor` and `discount_label` support a visible recurring-price offer, not a separate coupon that changes checkout totals.

## Safepay setup

Use Safepay Sandbox first, then repeat the setup with Live credentials. Create a recurring provider plan for every monthly/yearly plan that should use hosted card checkout. Safepay expects amounts in the lowest currency unit (paisas for PKR); STEM Studio stores and compares that same minor-unit amount. Copy each provider `plan_...` ID into the matching owner plan. The verified webhook also checks the provider plan ID, currency, amount, transaction status, and transaction ID before activating access.

Set these values in the backend host's secret environment configuration (Render → service → Environment):

```text
SAFEPAY_ENV=sandbox
SAFEPAY_SECRET_KEY=<sandbox server secret>
SAFEPAY_WEBHOOK_SECRET=<sandbox endpoint HMAC key>
```

For live service use `SAFEPAY_ENV=production` and the matching **Live** server and HMAC keys. Never mix Sandbox and Live credentials or paste them into chat/source control. The webhook endpoint is:

```text
https://stem-studio-backend.onrender.com/api/billing/webhooks/safepay
```

Register that HTTPS endpoint in the matching Safepay dashboard and subscribe to v2 events: `subscription.created`, `subscription.payment.succeeded`, `subscription.payment.failed`, and `subscription.cancelled`. The backend verifies `X-SFPY-SIGNATURE` over the raw request body, stores the deduplicated event, returns success, and applies the subscription change asynchronously. The redirect is only user feedback; it never activates access. A queued webhook that did not finish is retried by the maintenance command below.

Safepay describes the first successful recurring-payment event as the activation signal, recommends Sandbox end-to-end testing before go-live, and requires a distinct HMAC key for Sandbox and Live. See the [Safepay subscription guide](https://safepay-docs.netlify.app/build-your-integration/subscriptions/) and [webhook requirements](https://safepay-docs.netlify.app/developers/webhooks/overview/).

## Bank transfer, Easypaisa, and JazzCash

In **Owner Control Center → Plans & billing → Bank & wallets**, add the account holder, public account identifier, currency, instructions, and method. This only publishes transfer instructions. A learner submits a transaction reference; it does not grant access. In **Transfer reviews**, compare the reference and exact snapshotted amount with the real bank or wallet statement, then approve or reject. Approval creates the payment record and dated subscription in one backend operation. Removing a method hides it from new claims while preserving existing records.

Card details and card security codes are never collected or stored by this application. Safepay receives hosted card checkout. Money is settled to the merchant account configured with Safepay; manual wallet/bank money goes directly to the account number you publish.

## Verification and broadcast email

Configure the shared sender as backend service environment variables in Render (not in Vercel). The recommended Render Free setup is Resend over HTTPS: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAILS_FROM_EMAIL`, `EMAILS_FROM_NAME`, optional `EMAILS_REPLY_TO`, and the public HTTPS `FRONTEND_URL`. Follow [the email delivery setup guide](email-delivery-setup.md) to verify a domain and add the variables. Render Free blocks outbound SMTP ports 25, 465, and 587, so Gmail SMTP will not work from that service. Regular learner signup does not require email delivery by default; email remains needed for password resets and optional broadcast emails. If inbox verification is deliberately re-enabled with `EMAIL_VERIFICATION_REQUIRED=true`, test signup verification and resend delivery after redeploy. Also test password reset and a small owner email broadcast using an inbox you control. The backend logs safe provider failure categories without logging addresses, links, message content, or credentials. Provider acceptance does not guarantee inbox delivery; production campaigns need provider quota, bounce/complaint processing, suppression management, and opt-out handling.

## Renewal notices and scheduled maintenance

The lifecycle sends one in-app and email-provider reminder each of the first five overdue days, suspends premium on the fifth day for a one-day hold, then expires the subscription and leaves the account/progress on the free plan. This workflow must run on a schedule; create Render Cron Jobs using the same repository branch, backend environment variables, and `backend/requirements.txt` as the web service:

| Schedule | Command | Purpose |
| --- | --- | --- |
| Every 2 minutes | `python -m backend.app.cli process-billing-webhooks` | Retry signed events stored before a worker interruption |
| Every 5 minutes | `python -m backend.app.cli process-broadcast-email-queue` | Recover queued/stale owner announcement email delivery rows |
| Daily, e.g. 00:10 UTC | `python -m backend.app.cli run-billing-lifecycle` | Send renewal notices and apply overdue grace/expiry transitions |

Configure each Cron Job with the same `DATABASE_URL`, stable authentication/owner secrets, `FRONTEND_URL`, CORS configuration, and email-provider values as the web service. Keep the maintenance commands single-instance; concurrent billing lifecycle workers are not intended. Provider acceptance is recorded, but inbox delivery is controlled by the recipient mail provider. A stale email attempt can be retried after 30 minutes; a rare crash after provider acceptance but before the DB update can result in a duplicate email.

## Broadcast and audit housekeeping

Owner announcements appear in the in-app notification center, whose unread counter includes announcement and subscription reminders. Optional email is sent asynchronously in durable batches of 100 with per-recipient delivery state. Promotions/product updates are sent only to active learners who opted into marketing email; non-promotional service notices can use all active accounts. Failed rows can be retried. Selected or all announcement records can be removed from broadcast history; audit events also support selected, age-based, or full cleanup. Each cleanup action writes a fresh audit record, so “delete all” leaves its own record. Provider acceptance is not inbox delivery; a very large 200,000-recipient campaign needs a contracted bulk email provider with sufficient quotas, bounce processing, and suppression management. The current app does not claim that capacity.

## Google AdSense

Ads are disabled unless the owner saves a publisher ID and both placement IDs in **Plans & billing → Ads** and enables placements. The app renders one placement on the marketing landing page and one on the learner dashboard. The backend omits placements for provisioned owners and accounts with an active paid period; anonymous visitors and free accounts may receive ads. Browser blockers and AdSense inventory/approval can still prevent an ad from appearing.

Before enabling ads, create and submit the site for AdSense review, add AdSense's required site verification/ads.txt setup as instructed by Google, and configure the account's privacy/consent requirements for the regions you serve. Then add the actual publisher ID and approved slot IDs. Approval, ad fill, and earnings cannot be created from application code. See [AdSense site approval](https://support.google.com/adsense/answer/7584263?hl=en) and [ad setup](https://support.google.com/adsense/answer/7037624?hl=en).

## Database changes

Backend startup first creates missing tables, then applies additive Alembic migrations, then registers the feature catalog. Do not run destructive schema resets against the live database. The current billing migration adds subscription/payment/notice/ad tables and snapshots a manual claim's amount/currency so a price edit cannot change what a learner is claiming to have paid.

## What must be completed before live charging

1. Deploy this branch to the backend and confirm migration `20261021_02` has applied successfully.
2. Create matching Sandbox recurring plans, configure Sandbox keys/webhook, add test plan IDs in owner controls, and complete end-to-end monthly and yearly test subscriptions.
3. Verify each webhook is accepted and a duplicate event does not create duplicate payment/access.
4. Configure the maintenance Cron Jobs above and confirm they can reach the same database.
5. Only after the Sandbox flow succeeds, enter Live Safepay keys and plan IDs, register the Live webhook, and make the plan public.
6. Configure real Easypaisa/JazzCash/bank details only if you want manual payments; perform owner statement reconciliation for every claim.
7. Obtain AdSense approval and consent configuration before enabling ads.
