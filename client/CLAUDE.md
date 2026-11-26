# Stempy ERP desktop client

Electron + React desktop client for the Stempy ERP server. The server lives in
`../stempy-erp-server` and owns every business rule, permission and text. This
client renders what the server describes.

## Output and code rules
- NEVER use emojis or pictographs in responses, comments, logs, or markdown headers.
- Keep all generated code and documentation standard ASCII/UTF-8, without decorative emojis.

## Workflow
- I work alone: merge feature branches into `main` locally, no pull requests.
- Do not push unless I ask.

## The contract: read these before building a screen
Do not copy these into this repo. They are the source of truth and change with the server.
- `../stempy-erp-server/docs/ARCHITECTURE.md` section 23 (server-driven UI):
  - 23.1 the rules this client follows
  - 23.2 what this client is (stack, generic screens, override registry)
  - 23.6 `GET /meta`, 23.7 layouts, 23.8 documents, 23.9 records and actions, 23.10 lists, 23.11 reports
- `../stempy-erp-server/docs/API_GUIDE.md`:
  - section 2 conventions and the error body, section 4 auth, section 5 entity routes,
    section 6 the `QUERY` body, section 9 GL, section 10 `GET /meta`
- When the docs and the server disagree, the server code wins:
  `platform/src/main/java/.../platform/web/MetaRoutes.java` builds `/meta`,
  `RecordMeta.java` builds `_meta`, `ApiError.java` is the error body.
- The wire types are in `src/api/types.ts`. Keep them in step with the server; when
  the server changes a shape, update the types first.

## Rules that are easy to break
- **The server decides, the client renders.** Never re-implement a permission check, a
  business rule, a default or a calculation. Hide what `/meta` leaves out, disable what
  it marks read-only (`writable`, `_meta.can`, `_meta.locked`). The server checks
  everything again, so the metadata is a convenience, not security.
- **No translation on the client.** Every label, message, enum label and confirmation
  comes from the server in the user's language. The client has no string bundles for
  server-owned texts. Only the client's own chrome (e.g. "Loading", "Retry") may need
  local texts, and those follow `/meta.language`.
- **The language is changed with `PATCH /auth/me`**, never with `Accept-Language`
  (Chromium always sends the OS language).
- **Format with `Intl`** using `/meta.language` (`fr` -> `fr-CA`, `en` -> `en-CA`), the
  field's `scale`, `format` (`money`, `percent`, `multiline`) and `currencyField`.
- **Decimals are strings on the wire.** Never parse them into JS numbers for storage or
  arithmetic; only for display. Send them back as strings.
- **Times are ISO-8601 UTC instants; dates are `YYYY-MM-DD`.** Do not shift a date
  through a `Date` object in local time.
- **Documents are written whole**: a header and its lines in one `POST` / `PATCH` with
  one `version`. A line with `id` is updated, without `id` is added, a stored line left
  out is removed. Never save lines one by one. Never send server-computed fields
  (`READ_ONLY`). Use `POST {path}/calculate` (debounced) for live totals.
- **Updates send `version`** (the one last read) and only the changed fields. On
  `409 VERSION_CONFLICT`, the body's `current` is the row as it is now: offer reload or
  reapply.
- **Field errors** come in `errors[]` with a `field` path (`name`, `lines[2].quantity`):
  map them onto the input or grid cell. Test against `code`, never `message`.
- **Lists use `QUERY`** (an HTTP method with a body), server-side sort / filter / paging.
  There is no total count: page with `page.hasMore`. Show `_refs` titles, not raw ids.
  Without a `sort`, send the resource's `defaultSort`.
- **Ignore keys you do not know** in any server answer. New keys appear without an
  `apiVersion` bump.

## Global behaviour
- `401` anywhere: drop the token and go to login.
- Login is sent with no `Authorization` header (a stale token gives `401` even there).
- `X-Company-Id` on every company-scoped request when the user has several companies and
  `defaultCompanyId` is null.
- Company switch: refetch `/meta`, clear the TanStack Query cache.
- `/meta` is fetched at login, on a company switch and on a language change, with
  `If-None-Match` (a `304` keeps the cached copy). There is no per-screen metadata call.
- `/meta.apiVersion` higher than `SUPPORTED_API_VERSION`: block and ask the user to update.
- Send an `X-Request-Id` per request and show the error's `requestId` in error dialogs, so
  a problem can be found in the server log.

## Stack
Electron + Vite + React + TypeScript; Mantine (forms, modals, comboboxes, dates);
mantine-react-table (TanStack Table, server-side mode); TanStack Query; TanStack Router;
react-hook-form. Do not add another UI kit or state library without asking.

## Screens
Generic screens serve every resource:
- **shell**: login, menu from `/meta.menu`, company switcher, language
- **list**: one per resource, from `fields`, `listColumns`, `defaultSort`, `searchable`
- **record**: modal or page (`presentation`), from `layout` (sections, collections, summary, tabs)
- **action dialog**: from an action's `params`, with its `confirm` text from `_meta.actions`
- **report**: from a `/meta.reports` entry (params form, figures, rows, columns, totals)

Screens the layouts cannot express go in the **override registry**, keyed by resource
key (`list`, `record`, per-field renderers). Keep it nearly empty; every entry needs a
reason in a comment. Known override: the GL manual journal entry form
(`glJournalEntry` has `can.create: false`; its body names accounts by `accountNo` and
lines by `debit` / `credit`, see API_GUIDE section 9).

## Running against the server
```bash
cd ../stempy-erp-server
./mvnw -q package -DskipTests
java -jar app/target/stempy-erp-server.jar      # http://localhost:8080
```
- Dev user: `U1`, `ADMINISTRATOR` in company `LCS` (id 1). Reset its password with
  `java -jar app/target/stempy-erp-server.jar set-password U1`.
- CORS: the renderer's origin must be in the server's `server.cors.origins`
  (`app/src/main/resources/application.properties`, empty by default), e.g.
  `server.cors.origins=app://stempy,http://localhost:5173`. Never `*`. Calls from the
  Electron main process need no CORS.
- Products need a currency and a unit of measure inserted in SQL first (API_GUIDE section 1).

## Security (Electron)
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; the renderer talks
  to the main process only through a typed preload bridge.
- Keep the session token in memory in the main process (or in the OS keychain via
  `safeStorage` if "stay signed in" is added), never in `localStorage`.
- Production renderer served from the `app://stempy` custom protocol, with a strict CSP.
