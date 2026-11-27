# Look and interaction

The model is Microsoft Dynamics 365 Business Central / NAV: a dense, keyboard-first
business application. The look is plain and a little retro. It is purely functional,
with no decoration and almost no motion.

The theme lives in `client/src/theme.ts` (Mantine `createTheme`) and
`client/src/theme.css` (the rules the theme object cannot express). Change the look
there, not with inline styles on a screen.

## Visual rules

- **Accent:** forest green (`forest` in the theme; shade 7 in light mode, 6 in dark).
  It is used for the primary action, the active menu entry, focus and selection only.
  Everything else is gray.
- **No rounding:** the radius is 0 everywhere, including badges.
- **Borders, not shadows:** surfaces are separated by 1px gray borders. Things that float
  (menus, popovers, modals) get one flat hard edge (`2px 2px 0`), never a soft blur.
- **Dense:**
  - The base text is 13px and grids are 12px.
  - Controls are size `xs`, lowered to 26px high in `theme.css`.
  - Grid rows use 3px vertical padding.
  - Spacing runs from 6px to 24px.
- **Type:** the system font, with headings at weight 600 (h2 is 17px). There are no
  display sizes.
- **No motion:**
  - CSS transitions are off globally.
  - Overlays (modals, menus, popovers, comboboxes, tooltips) open and close at once
    (`duration: 0`).
  - Collapses snap.
  - Only loaders animate.
- **Grids:** these are on by default for every `Table`:
  - outer and column borders
  - striped rows
  - a gray header band
  - a hover row tinted with `forest-0`
- **Buttons:**
  - Page and modal commands go in the action bar (`shell/Page.tsx`, `PageAction` data,
    not buttons), drawn flat.
  - Only the one commit action (Save) is filled.
  - Tools beside the bar and buttons inside forms are `variant="default"` bordered
    push buttons.
- **Color scheme:** light and dark both follow the OS. Light is the reference: check it
  first.

## Layout

- **App header:** a solid `forest-8` band, 36px high. It holds:
  - the menu button (only while the menu bar is unpinned)
  - the app name
  - the command bar trigger in the center
  - the company and user menus
- **Menu bar:** a 30px bar under the app header, built from `/meta.menu`.
  - Each module is a dropdown listing its resources, then a rule, then its reports.
  - The module holding the open page is underlined in the accent color.
  - **Pinned** (the default): the bar always shows and the page sits below it.
  - **Unpinned:** the bar is hidden. The menu button shows it over the page, and it
    hides again on navigation, `Esc` or a click outside.
  - The pin button sits at the right end of the bar. The choice is kept in
    `localStorage` (`stempy.menuPinned`).
  - There is no side navigation.
- **Page:** every signed-in screen renders `<Page>` (`client/src/shell/Page.tsx`), a
  sticky gray header band. In order, it holds:
  - an optional parent link (the breadcrumb)
  - the title and an optional badge
  - the action bar
  - tools at the right end (search box, column chooser)
- **Action bar:** groups of `PageAction`, separated by a vertical rule. The groups are,
  in order:
  - lists: New, then the resource's actions, then Refresh
  - records: Save and Cancel, then Delete, then the record's actions

  Domain actions always come from `/meta`; the client never invents one. A modal record
  shows the same bar at the top of the modal.

- **Lists:** a filter pane, 260px wide, on the left of the grid (`list/FilterPane.tsx`).
  - It shows the applied conditions one per row (field, then operator and value), each
    with a remove button.
  - An "Add filter" form opens inline in the pane.
  - "Clear all" appears from two conditions up.
  - The "Filters (n)" tool in the page header toggles the pane. Its state is shared by
    all lists and kept in `localStorage` (`stempy.filterPaneOpen`).
  - Filters stay applied while the pane is closed.

## Command bar

- It opens with `Alt+Q` (the physical Q key, so it works on a Mac too), `Ctrl+K` or
  `Cmd+K`, or a click on the trigger.
- It lists three sections:
  - **This page:** the front-most action bar, plus a page's extra commands (such as
    show or hide filters)
  - **Go to:** every page from `/meta.menu`, with its module as a hint
  - **Application:** home, pin or unpin the menu, sign out
- Matching ignores case and accents and needs every typed word. Labels that start with
  the first word come first.
- Arrow keys move, `Enter` runs and `Esc` closes. A disabled action is listed but does
  not run.
- How a screen offers commands:
  - `Page` registers its `actions` automatically, plus its `commands` prop.
  - A record modal registers its bar at the `modal` level, which covers the page's.
  - The store (`platform/commands.ts`) lives outside React state: the bar reads it when
    it opens.
- `PageAction.shortcut` is shown beside a command.

## Keyboard

Shortcuts are part of the commands: give a `PageAction` (or a `Command`) a `hotkey` in
Mantine's notation, and it is shown in the command bar and on hover.

- One window listener runs the front-most layer's hotkeys, even from inside a field
  (every page hotkey has a modifier or is a function key). A record modal covers its
  page.
- A confirmation or action dialog registers an empty layer, so no page shortcut acts
  under it.
- Keys are matched on physical keys. `mod` is Cmd on a Mac and Ctrl elsewhere, and Alt is
  shown as Option on a Mac.

| Key                             | Command                                          | Where      |
| ------------------------------- | ------------------------------------------------ | ---------- |
| `Alt+Q`, `Ctrl+K` / `Cmd+K`     | command bar                                      | everywhere |
| `Ctrl+N` / `Cmd+N`              | new                                              | list       |
| `F5`                            | refresh                                          | list       |
| `Shift+F3`                      | show or hide the filter pane                     | list       |
| `Alt+F3`                        | filter on the value of the cell the cursor is on | list       |
| `Ctrl+S` / `Cmd+S`              | save                                             | record     |
| `Ctrl+Delete` / `Cmd+Backspace` | delete (asks first)                              | record     |
| `Ctrl+E`                        | edit list (step 6)                               | list       |
| `Esc`                           | close the command bar, a dialog or a modal       | everywhere |

On a Mac, `Cmd+Backspace` is ignored while you type in a field, where it deletes text.

The grid (`grid/DataGrid.tsx`) is one focusable element with a cell cursor:

- Arrow keys move the cursor. `PgUp` / `PgDn` move 10 rows.
- `Home` / `End` go to the row's first or last cell; with `Ctrl`, to the first or last
  row.
- `Enter` opens the row.
- A click moves the cursor. A click in the first column (drawn as a link) or a double
  click opens the row.

## Edit list

As in NAV, the list's cells become inputs (`list/useListEditor.ts`, `list/ListCell.tsx`).

- **Offered** only with `can.update`, and not on documents (they are written whole,
  header and lines in one request).
- **Editable cells:** fields with `writable.update`, minus the server-managed ones. A
  list row has no `_meta`, so locks are not known here: the server refuses a locked
  field, and its error lands on the cell.
- **Saving:** each changed row is one `PATCH` with the version it was read at and only
  its changed fields. A row is saved when the cursor leaves it, on Save (`Ctrl+S`), and
  before going back to view mode. Leaving the page with unsaved rows asks first.
- **Marks:** a bar at the start of a row marks it as changed (yellow), saving (gray) or
  refused (red).
- **Errors:** field errors put a red edge on the cell (the message is on hover). Every
  refused row is listed above the grid with its messages. On `VERSION_CONFLICT`, that
  row offers Reload or Keep my changes.
- **Keys:**
  - `Up` / `Down` and `Enter` move between rows; `Tab` moves between cells.
  - Inside an open dropdown or a text area, the keys belong to the field.
  - Rows don't open in edit mode.
