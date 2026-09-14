# Self-service trial rollout

VENDR's self-service trial is isolated from existing stores. Existing rows receive
`account_type = 'legacy'` and are never assigned an expiry date. Only stores
created through the verified `/trial/request` → `/trial/verify` flow receive
`account_type = 'trial'`.

## Routes

- `/trial`: public trial landing page and registration
- `/trial-admin`: authenticated platform administration for trial review and conversion
- `/login` behavior is unchanged; the existing application root still opens normal login

## Render environment variables

Required before enabling registration:

| Variable | Purpose |
| --- | --- |
| `TRIAL_SIGNUP_ENABLED` | Set to `true` only after all variables below are configured |
| `TURNSTILE_SITE_KEY` | Public Cloudflare Turnstile site key returned by `/trial/config` |
| `TURNSTILE_SECRET_KEY` | Server-side Turnstile validation secret |
| `RESEND_API_KEY` | Sends verification messages |
| `VENDR_EMAIL_FROM` | Verified Resend sender, e.g. `VENDR <trials@example.com>` |
| `VENDR_PUBLIC_URL` | Production frontend origin, without a trailing slash |
| `VENDR_PLATFORM_ADMIN_STORE_IDS` | Comma-separated existing store IDs allowed to open `/trial-admin` |

Optional:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `TRIAL_LENGTH_DAYS` | `14` | Trial write-access duration |
| `TRIAL_RETENTION_DAYS` | `30` | Recorded retention target after expiry |
| `TRIAL_RATE_LIMIT_SECRET` | JWT secret | Key used to hash signup IP addresses |

The existing `JWT_SECRET_KEY` and `JWT_ACCESS_TOKEN_MINUTES` configuration is reused.

## Safe rollout order

1. Deploy the backend and allow startup to add the nullable/additive trial columns.
2. Keep `TRIAL_SIGNUP_ENABLED=false`.
3. Configure Turnstile for the production VENDR hostname.
4. Verify the Resend sender and configure the email variables.
5. Add the administering legacy store number to `VENDR_PLATFORM_ADMIN_STORE_IDS`.
6. Deploy the frontend and verify normal login for an existing store.
7. Open `/trial` and verify the landing page.
8. Set `TRIAL_SIGNUP_ENABLED=true`.
9. Create one test trial with a real email, follow the verification link, and perform one sale.
10. Open `/trial-admin` while signed in to the allowlisted store and convert the test trial.
11. Sign back into the converted test store and confirm normal write access.

## Expiration behavior

Trial expiry does not delete data. Expired trial users may sign in and read their
store history, but authenticated mutation requests return HTTP 403 with
`code=trial_expired_read_only`. Legacy stores and paid stores bypass this guard.

Converting a trial changes its store to `paid`. The middleware rechecks the
database only when an expired trial token attempts a write, so conversion restores
access immediately without adding queries to normal legacy-store operations.

## Abuse controls

- No store is created until its email link is verified.
- Verification links expire after 30 minutes and are stored as hashes.
- Cloudflare Turnstile is validated by the backend.
- Requests are limited per hashed IP and per email.
- Passwords are hashed before pending registration data is stored.
- Registration remains feature-gated for emergency shutdown.

## Current scope

This rollout intentionally does not collect card details or bill users
automatically. Conversion is a deliberate admin action after the customer agrees
to become paid. Automated billing can be added later without changing the legacy
store classification.
