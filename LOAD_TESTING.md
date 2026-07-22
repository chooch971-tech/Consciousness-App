# Presence launch load testing

Run this against a production-sized staging service and staging MongoDB—not the public service first. The default `launch` scenario reproduces the signed-in launch path: cloud pull followed by concurrent Lodge feed, conversations, notifications, and heartbeat requests. The `network` scenario concurrently opens the Friends list, profile summary, followers, and following views; it is designed to expose social-graph query amplification.

Prepare a JSON file containing staging JWTs as strings or `{ "token": "..." }` objects. More distinct accounts produce a more realistic database test; a single token can be repeated for a quick infrastructure check.

```sh
PRESENCE_LOAD_BASE_URL=https://presence-staging.example.com \
PRESENCE_LOAD_CONFIRM=presence-staging.example.com \
PRESENCE_LOAD_TOKENS_FILE=/secure/path/staging-tokens.json \
PRESENCE_LOAD_USERS=100 \
PRESENCE_LOAD_RAMP_SEC=10 \
npm run test:load
```

Repeat at 100, 250, 500, and 1,000 users, first with `PRESENCE_LOAD_SCENARIO=launch` and then with `PRESENCE_LOAD_SCENARIO=network`. The command fails unless total errors stay at or below 1% and overall p95 latency stays at or below 2 seconds. For launch approval, also confirm in the Render and MongoDB dashboards:

- no service restart or out-of-memory event;
- CPU below 70% sustained and memory below 75%;
- MongoDB connections below 70% of the plan limit;
- database p95 operations below 500 ms;
- no endpoint exceeds 1% 5xx responses.

Use `PRESENCE_LOAD_MAX_ERROR_RATE`, `PRESENCE_LOAD_MAX_P95_MS`, and `PRESENCE_LOAD_TIMEOUT_MS` to tighten thresholds. Non-local targets require `PRESENCE_LOAD_CONFIRM` to exactly match the hostname, preventing an accidental production test.
