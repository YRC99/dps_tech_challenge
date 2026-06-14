# dps_tech_challenge

A small Express + TypeScript service that wraps the [iRail](https://docs.irail.be/)
API to look up upcoming train departures by (fuzzy-matched) station name.

## Endpoints

- `GET /` — health check, returns `Hello, World!`
- `GET /departures?q=<station name>` — fuzzy-matches `q` (min. 3 characters)
  against known station names and returns, for each matching station, the
  departures scheduled within the next 15 minutes (accounting for delay).
  Any other HTTP method on this path returns `405 Method Not Allowed`.
- `GET /docs` — Swagger UI with the OpenAPI spec for the endpoints above

## Setup

1. Use [this link](https://github.com/nvm-sh/nvm#installing-and-updating) to install `nvm`
2. Run `nvm install` and then `nvm use` to set the correct Node version (see `.nvmrc`)
3. Run `npm install` to install all dependencies
4. Copy `.env.example` to `.env` and adjust values if needed

## Configuration

Environment variables are loaded from `.env` (see `.env.example`):

| Variable | Default | Description                |
| -------- | ------- | -------------------------- |
| `PORT`   | `5000`  | Port the server listens on |

## Usage

- To start the dev server (auto-restarts on changes)

  ```bash
  npm run dev
  ```

- To build the project

  ```bash
  npm run build
  ```

- To build and start the project

  ```bash
  npm run start
  ```

Once running, visit `http://localhost:<PORT>/docs` for interactive API docs.

## Time:

- ~2h total of research (API, setup, ideas that got abandoned etc.)
- ~2.5h total of coding, manual testing
- ~1.5h total of other polishing of all kinds (refactoring, going over errors with AI help, working against own confusion etc)
- ~0.5h total for research and implementation of fuzzy search using Fuse.js
- ~1h total of research and integration of swagger-ui to serve docs (AI help)
- ~1h total of documenting setup, usage etc. (AI help)
