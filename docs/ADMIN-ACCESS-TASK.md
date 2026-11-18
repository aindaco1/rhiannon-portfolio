> Superseded for hosted deployment by the email-link/session implementation in [DEPLOYMENT.md](DEPLOYMENT.md). The two approved addresses remain unchanged. The Access JWT results below describe the earlier implementation only.

# Approved portfolio admins

November 17, 2026 (America/Denver), base `d403952`. Configured `alonso@hey.com` and `barelarhiannon@gmail.com` as the two approved admins in the deployment's `EDITOR_EMAILS` variable in `worker/wrangler.jsonc`. The example secrets file no longer contains a duplicate placeholder override. Deployment instructions require the Cloudflare Access policy to match this allowlist.

**Verified within local scope:** all 35 unit tests passed, including actual Worker authorization against signed JWTs for both configured addresses, case-insensitive matching, and rejection of other addresses, invalid audience, expired credentials and alternate origins. The test reads the deployment configuration directly; its JWKS HTTP response is mocked. The Worker bundle and `git diff --check` passed. [Test log](evidence/admin-access/tests.log); [tested file hashes](evidence/admin-access/tested-files.sha256).

**Hosted access remains unverified/unconfigured:** no remote repository, admin domain, Access audience/team or local secret overrides are configured in this checkout. No live Access policy, account invitation, email or deployment was created. Both approved addresses will have the existing full editor permissions when hosted Access is configured and this Worker configuration is deployed. The loopback-only preview continues to use its automatic local session; adding emails does not turn it into hosted email login. Public content and local saved data were not changed.
