# User preferences API (proposed)

The desktop client keeps each user's layout choices: list columns (order, width, shown or
hidden), sort, page size, saved filter views, menu choices, the menu bar pinned or not.
They should follow the user from one machine to another, so the server stores them.

The server does not need to understand them. Each one is a JSON value under a key
the client chooses. The server only checks the size and shape limits below, and
the client checks a value's shape when it reads it. New preferences need no
server change.

Until these routes exist, the client keeps the preferences on the machine (one file per
server and user). The first time `GET /auth/me/preferences` answers `200`, the client sends
up the local keys the server does not have, then deletes its local copy.

The window's size, position and full screen state are not part of this: they describe the
machine's screens, so they stay on the machine.

## Routes

All three act on the signed-in user (the session's token), whatever their companies.
No permission beyond being signed in; a user only ever sees and changes their own.
They are not company-scoped: `X-Company-Id` is ignored.

### `GET /auth/me/preferences`

All the user's preferences.

```json
200
{
  "items": [
    { "key": "shell.menuPinned", "value": false, "updatedAt": "2026-11-27T18:04:11Z" },
    { "key": "list.product", "value": { "columns": [ ... ], "pageSize": 50 }, "updatedAt": "..." }
  ]
}
```

A user with none: `200 { "items": [] }`. Never `404`: the client reads `404` as "this
server does not store preferences yet" and keeps them locally.

### `PUT /auth/me/preferences/{key}`

Creates or replaces one preference.

```json
PUT /auth/me/preferences/list.product
{ "value": { "columns": [ ... ], "pageSize": 50 } }

200
{ "key": "list.product", "value": { ... }, "updatedAt": "2026-11-27T18:04:11Z" }
```

- `value` is required and may be any JSON value except `null`. Use `DELETE` to remove
  a preference.
- The last write wins. There is no `version`: these are layout choices, and a lost
  change costs little. The client waits about a second after the last change before
  writing, so dragging a column sends one request, not one per pixel.

### `DELETE /auth/me/preferences/{key}`

`204`, also when the key did not exist (the client resets to its default this way).

## Limits and errors

| Rule | Error |
|---|---|
| Key: `^[A-Za-z0-9._:@-]{1,100}$` | `400`, `errors[]` with `field: "key"` |
| Body has `value` (not `null`) | `400`, `field: "value"` |
| `value` as JSON at most 64 KB | `400`, `field: "value"` (a code like `TOO_LARGE`) |
| At most 500 keys per user | `400` or `409`, a code like `TOO_MANY_PREFERENCES` |

Errors use the usual problem body (API_GUIDE section 2). The client does not interrupt the
user for them: it logs them, and the next change tries again.

## Keys the client uses

The client owns the key names. They are listed here only so a stored row can be read.

| Key | Value |
|---|---|
| `shell.menuPinned` | `boolean`, the menu bar always visible |
| `list.filterPaneOpen` | `boolean`, the filter pane open on every list |
| `list.<resourceKey>` | (step 2) columns, sort, page size of that list |
| `views.<resourceKey>@<companyId>` | (step 3) the list's saved filter views in one company: filter values name that company's records |
| `menu` | (step 4) hidden menu entries, order, favourites |

## Storage suggestion

One table, for example:

```sql
CREATE TABLE user_preferences (
  user_id     BIGINT       NOT NULL,
  pref_key    VARCHAR(100) NOT NULL,
  value_json  JSON         NOT NULL,
  updated_at  TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (user_id, pref_key),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
```
