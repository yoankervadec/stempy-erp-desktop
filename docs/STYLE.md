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
  - the menu toggle
  - the app name
  - the command bar in the center (step 4)
  - the company and user menus
- **Left:** the navigation tree from `/meta.menu`. The toggle collapses it, and the
  choice is kept in `localStorage` (`stempy.navOpen`).
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

- **Lists:** a collapsible filter pane on the left of the grid (step 3).

## Keyboard (target; inspired by NAV / Business Central)

| Key                    | Command                                              |
| ---------------------- | ---------------------------------------------------- |
| `Alt+Q`, `Ctrl+K`      | command bar: pages, then the current page's commands |
| `Ctrl+N`               | new                                                  |
| `Ctrl+E`               | edit list                                            |
| `Enter`                | open the selected row                                |
| `Ctrl+Delete`          | delete                                               |
| `F5`                   | refresh                                              |
| `Shift+F3`             | toggle the filter pane                               |
| `Alt+F3`               | filter on the current cell's value                   |
| arrows, `PgUp`, `PgDn` | move through the grid                                |
| `Esc`                  | close the dialog or panel                            |

Every command the keyboard can reach is also listed in the command bar, with its
shortcut shown.
