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
- **Buttons:** Mantine's filled variant is kept for the one primary action of a screen
  (New, Save, Sign in). Every other button is `variant="default"`, a bordered push button.
- **Color scheme:** light and dark both follow the OS. Light is the reference: check it
  first.

## Layout (target; being built)

- **App header:**
  - the app name
  - a command bar in the center, like VS Code's or Business Central's "Tell me"
  - the company and user menus
- **Left:** the navigation tree from `/meta.menu`, which can be collapsed.
- **Page header**, one generic component on every list, record and report page:
  - the title
  - an action bar with the generic actions (New, Edit list, Delete, Refresh), shown
    according to `can.*`
  - then the resource's actions from `/meta`

  Domain actions always come from the server; the client never invents one.

- **Lists:** a collapsible filter pane on the left of the grid.

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
