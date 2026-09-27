# Hosting Trama publicly (account-less)

Trama runs in two modes that share the same engine, UI and SQLite project format:

| | Local-first (`npm run serve`) | Hosted (`npm run serve:hosted`) |
|---|---|---|
| Entry | `server.mjs` | `server-hosted.mjs` |
| Projects | Any `.db` path chosen by the local user | One `.db` per secret workspace |
| Access | Whoever reaches the port | Whoever holds the workspace link |
| Static files | Whole repository | Explicit allowlist |
| Agents | — | REST `/api/v1`, MCP `/mcp`, CLI `cli/trama.mjs` |

The hosted mode is additive. The local server keeps its historical behavior. Both use
`server/projectRoutes.js` for the project API.

## Access model

There are no accounts. The URL is the credential.

- `POST /new` (landing page) or `POST /api/v1/workspaces` creates a workspace. It returns the
  **edit token** once. The server stores only its SHA-256 hash, so a lost link cannot be recovered.
- `/w/<edit-token>` opens the editor for that workspace. The browser app receives
  `window.__TRAMA__.apiBase = "/w/<edit-token>"`. `src/app/api.js` prefixes every `/api/...` call
  with it.
- `/p/<share-token>` is a read-only publication. The server renders it with the same standalone
  exporter the editor uses (`src/export/standalone.js`). The page embeds the data and has no API
  access (`connect-src 'none'`). The share token can be rotated. Supported URL parameters:
  - `?map=<id>` selects the map;
  - `&mode=presentation` starts the story;
  - `?embed=presentation` shows a presentation-only view;
  - `?sidebar=0` hides the sidebar.
- `/w/<edit-token>/mcp` is an MCP endpoint already bound to the workspace.

In hosted mode, the local shell's "new / open / import project" actions create or open workspaces
and answer with `{ redirect }`. `followHostedRedirect()` in `src/app.js` handles that answer. The
open-by-path endpoints never touch the filesystem.

## Storage

```
$TRAMA_DATA_ROOT/
  registry.db              token hashes, share tokens, activity (WAL)
  workspaces/<id>.db       one Trama project per workspace (WAL)
  backups/<timestamp>/     nightly VACUUM INTO snapshots
```

SQLite is enough for one VPS:

- each workspace is an independent file, so writers never contend across workspaces;
- WAL plus `busy_timeout` handles concurrent editors of one workspace;
- the store cache (`TRAMA_OPEN_STORES`, default 64) bounds open file handles;
- loop and presentation version history is capped (`TRAMA_VERSION_RETENTION`, default 40 per
  record). The local mode keeps unlimited history.

Moving to Postgres is only necessary for multiple app servers or cross-workspace queries.

## Protection

- The static allowlist (`server/hosted/static.js`) serves only:
  - `dist/`;
  - CSS under `src/`;
  - fonts;
  - vendored Cytoscape (`/vendor/*`);
  - the hosted UI.

  Repository files, databases and `.git` return 404.
- Body limits:
  - JSON: 4 MB;
  - images: 8 MB;
  - bundle import: up to the workspace quota.
- Quotas per workspace:
  - 64 MB of storage;
  - 200 maps;
  - 200 presentations;
  - 300 images;
  - 400 views.
- Uploads accept only PNG, JPEG, GIF, WebP, AVIF and SVG. Assets are served with `nosniff` and a
  sandboxing CSP, so an SVG cannot run script in the app origin.
- Rate limits per client IP, on dynamic endpoints only (static files are not counted):
  - 1200 reads/min;
  - 600 writes/min;
  - 120 workspace creations/hour, sized for a workshop sharing one NAT.

  Behind Cloudflare, set `TRAMA_TRUST_PROXY=1` and `TRAMA_CLIENT_IP_HEADER=cf-connecting-ip`.
- Security headers:
  - CSP on the app;
  - `frame-ancestors 'none'` on the editor (share pages are embeddable);
  - `Referrer-Policy: no-referrer`, so edit links do not leak through `Referer`;
  - `noindex` on `/w/` and `/p/`.
- Secret links must never reach logs. The nginx site disables the access log. The app redacts
  `/w/` and `/p/` paths in error logs.
- Retention (`TRAMA_UNTOUCHED_DAYS`, `TRAMA_RETENTION_DAYS`):
  - workspaces never edited are removed after 14 days;
  - workspaces not opened for 365 days are removed.
- Takedown: `node scripts/trama-admin.mjs delete <reported share link> --yes`.

## Agents

- Guide: `/llms.txt` (also `GET /api/v1/guide` and the MCP tool `get_authoring_guide`).
- REST: `/api/v1`, documented by `/api/v1/openapi.json`, with `Authorization: Bearer <edit token>`.
  - `POST /workspaces`, `POST /validate/map`, `POST /validate/story`: open to anyone.
  - `GET|PATCH|DELETE /workspace`, `POST /workspace/share/rotate`, `GET /workspace/export`.
  - `GET|POST /maps`, `GET|PUT|DELETE /maps/:id`, `GET|PUT /maps/:id/presentation`.
  - `GET /presentations`, `GET|DELETE /presentations/:id`, `POST /publish`.
- MCP (Streamable HTTP, stateless JSON responses): `POST /mcp` or `POST /w/<edit token>/mcp`.
  Tools:
  - `get_authoring_guide`;
  - `create_workspace`;
  - `validate_map`;
  - `validate_story`;
  - `get_workspace`;
  - `get_map`;
  - `save_map`;
  - `delete_map`;
  - `save_presentation`;
  - `get_presentation`;
  - `publish`;
  - `rotate_share_link`.

  Claude Code: `claude mcp add --transport http trama https://trama.org-agents.work/w/<token>/mcp`.
- CLI: `cli/trama.mjs` has no dependencies and is also served at `/cli/trama.mjs`. Run
  `node trama.mjs help`.

The REST API, MCP and CLI share `server/hosted/operations.js` and `server/hosted/authoring.js`.
The authoring service encodes the workflow in `AGENTS.md`:

- the map compiles through `compileLoopMarkdown` / `importMermaid`;
- `validateModel` checks the model;
- `classifyLoop` compares each loop with its `R`/`B` label;
- the story compiles through `compilePresentationMarkdown`, and every scene gets
  `mapRef: { mapId }` and an explicit V2 camera (`fit-focus`, `follow-path`, `fit-set` or `fit-map`);
- `lintPresentation` runs against the real map;
- there is one presentation per map, and saving it again updates it.

## Deploying

`deploy/` contains everything needed for a generic single-host deployment:

- `Dockerfile` (repository root): a multi-arch Node 22 image that runs as `node` with `/data` as
  a volume.
- `deploy/docker-compose.yml`: container on `127.0.0.1:4180`, read-only root filesystem, dropped
  capabilities, memory limit and an explicit `name: trama` project.
- `deploy/trama.env.example`: public URL, contact, proxy trust, limits and retention.
- `deploy/nginx/trama.conf.example`: TLS reverse proxy with the access log off.
- `deploy/trama-backup.cron`: nightly `VACUUM INTO` snapshots through `scripts/trama-backup.mjs`.

Typical layout on a host:

```text
/srv/trama/
  app/                 this repository (rsync or git checkout)
  data/                owned by uid 1000 (the container's `node` user)
  trama.env            from deploy/trama.env.example
  docker-compose.yml   from deploy/docker-compose.yml
```

```bash
cd /srv/trama && docker compose up -d --build
curl -fsS http://127.0.0.1:4180/healthz
```

Then publish the hostname through your reverse proxy. Host-specific automation, such as a guarded
reload of a shared nginx, belongs in a private operations repository. The instance at
`trama.org-agents.work` is deployed that way.

Operations:

```bash
docker compose -p trama logs -f trama
docker exec trama node scripts/trama-admin.mjs stats
docker exec trama node scripts/trama-admin.mjs delete <reported share link> --yes
docker exec trama node scripts/trama-backup.mjs --data /data --out /data/backups
```

To restore data, stop the container and copy `registry.db` and `workspaces/*.db` from
`data/backups/<timestamp>/` back into `data/`. Then start the container again.

## Running locally

```bash
npm run build
TRAMA_PUBLIC_URL=http://localhost:4180 npm run serve:hosted
```

Tests: `npm test` includes `tests/hosted/*.test.mjs`. They cover:

- isolation and the static allowlist;
- the path-escape attempts;
- upload policy;
- the REST, MCP and CLI flows;
- quotas and rate limits;
- retention and token hashing.
