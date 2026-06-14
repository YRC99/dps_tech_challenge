# AI Usage Log

## 2026-06-14 — Code review (Claude Code / Sonnet 4.6)

**Prompt:** "Go over the code and point out major problems."

**What was done:** Read through every file in `src/` (server bootstrap, routers,
models, middleware), checked `package.json`/`tsconfig.json`/`tslint.json`, ran
`tsc --noEmit`, started the dev server with `tsx` and exercised the routes with
`curl`, and reproduced a suspected crash bug with a minimal standalone Express
repro. No code was changed — findings only.

### Critical

1. **An iRail API failure crashes the entire server.**
   `src/routers/departures.ts` makes parallel `axios.get(...)` calls inside
   `Promise.all` with no `try/catch` or `.catch()`. Express 4 does not await
   async route handlers, so if any of those requests rejects (network error,
   non-2xx from iRail, timeout, malformed station id, etc.), it becomes an
   _unhandled promise rejection_. On Node ≥15 (default `--unhandled-rejections`
   behavior) this **terminates the whole process**, taking down every route,
   not just `/departures`. Reproduced with a minimal Express app: a rejected
   promise inside an async handler crashes the server and all subsequent
   requests fail to connect.
   - Fix direction: wrap the `Promise.all` (or each axios call) in try/catch,
     return a 502/504 to the client, and add a global Express error-handling
     middleware as a backstop.

2. **The root route `/` is hijacked and returns a misleading 405.**
   In `src/routers/departures.ts`, `router.all("/", ...)` is intended to reject
   non-GET methods on `/departures`, but the router is mounted at the app root
   (`app.use(departures(stationData))`), so `"/"` here means the literal root
   path `/`, not `/departures`. Because this router is registered _before_
   `src/routers/index.ts`, **every request to `/` (any method) is intercepted**
   and returns:
   `HTTP 405 {"error":"Method GET not allowed on /departures."}`
   The intended "Hello, World!" handler in `index.ts` is now unreachable.
   Verified live with `curl http://localhost:5000/`.
   - Fix direction: change `router.all("/", ...)` to `router.all("/departures", ...)`
     (or use `.get(...)` plus a method-specific guard) so it doesn't shadow the
     app root.

### High

3. **Unbounded fan-out of outbound requests per `/departures` call.**
   Every station whose name matches the (≥3 char) query string triggers its
   own `axios.get` to iRail's liveboard endpoint, all fired concurrently via
   `Promise.all`, with no cap on candidate count and no concurrency limit. A
   broad query (e.g. "station") can match dozens of stations, fan out dozens
   of simultaneous outbound requests, and (per issue #1) any single failure
   among them crashes the server.

4. **Server fails silently if the startup station-data fetch fails.**
   In `src/server.ts`, the entire bootstrap (middleware setup, route
   registration, `app.listen`) is inside the `try` block alongside the initial
   `axios.get("https://api.irail.be/stations?format=json")`. If that request
   fails, the `catch` only logs the error — the process exits with code 0,
   nothing listens on the port, and there's no retry or non-zero exit code for
   process managers/Docker healthchecks to detect.

### Medium

5. **Incorrect TypeScript types for upstream API responses.**
   - `StationResponse.station` is typed as `[{ ... }]` (a 1-element tuple),
     but the real iRail response is an array of N stations
     (`src/models/responses/StationResponse.ts`).
   - `LiveboardResponse.departures.departure` is typed as `[Departure]`
     (also a 1-element tuple) but can legitimately be empty or have many
     entries (`src/models/responses/LiveboardResponse.ts`).
     These don't break `.map`/`.filter` at runtime, but they misrepresent the
     data shape and defeat `noUncheckedIndexedAccess` guarantees. Should be
     `Station[]` / `Departure[]`.

6. **Dependency/tooling mismatches and dead config.**
   - `express: ^4.22.2` paired with `@types/express: ^5.0.6` — a major-version
     mismatch between runtime and type definitions (Express 5 changed
     request/response typings and removed APIs).
   - `body-parser` is declared as a dependency but never imported anywhere
     (express's built-in `express.json()` is used instead).
   - `tslint.json` exists but `tslint` is deprecated/unmaintained, and there's
     no `lint` script in `package.json`.
   - `@openapitools/openapi-generator-cli` is a devDependency with no
     generated client or usage found in `src/`.

### Low / cleanup

7. **Dead code:** `DepartureEntry` interface in
   `src/models/responses/LiveboardResponse.ts` is empty and unused.
8. **Unused env var:** `HOST_URL` in `.env` / `.env.example` is never read by
   the application.
9. **Stale build output:** `dist/` contains `app.js`/`app.d.ts` from a
   `src/app.ts` that no longer exists (current entry point is `server.ts`).
   `dist/` is gitignored so this doesn't affect the repo, but it's a confusing
   local leftover from a previous structure — safe to delete and regenerate
   with `npm run build`.
10. **No tests:** `package.json`'s `test` script is still the default
    `"Error: no test specified"` placeholder.

No fixes were applied in this pass — this is a review/findings summary only.

Fixed:
1. 
2. ✅
3. 
4. ✅
5. ✅
6. ✅
7. ✅
8. ✅
9. ✅
10. 

Further usage of ChatGPT mostly to interpret the documentation of the API of irail.be and minor setup questions for typescript (has been a while since the last project, also for experiments like trying to convert the json schemas of the API to OpenAPI aand then use the generators, was discarded)

otherwise for commit message