import {
  ActionIcon,
  Autocomplete,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Combobox,
  createTheme,
  Drawer,
  HoverCard,
  LoadingOverlay,
  Menu,
  Modal,
  MultiSelect,
  NativeSelect,
  NumberInput,
  Paper,
  PasswordInput,
  Popover,
  SegmentedControl,
  Select,
  Switch,
  Table,
  Tabs,
  Textarea,
  TextInput,
  Tooltip,
  type MantineColorsTuple
} from '@mantine/core'

/**
 * The look: plain, dense and still, in the spirit of Dynamics NAV. See
 * docs/STYLE.md for the rules; the matching global CSS is theme.css.
 */

/** Forest green, light to dark. Shade 7 is the primary in light mode. */
const forest: MantineColorsTuple = [
  '#edf5f0',
  '#d8e9de',
  '#b0d2bd',
  '#85b999',
  '#62a47b',
  '#4b9568',
  '#3d855b',
  '#2f6b49',
  '#255a3c',
  '#194a2f'
]

/** Nothing slides or fades: overlays appear and disappear at once. */
const still = { transitionProps: { duration: 0 } }

/** Controls default to the smallest size (its height is lowered in theme.css). */
const compact = { size: 'xs' }

/** One flat, hard edge for everything that floats (menus, popovers, modals). */
const edge = '2px 2px 0 rgba(0, 0, 0, 0.12)'

export const theme = createTheme({
  primaryColor: 'forest',
  primaryShade: { light: 7, dark: 6 },
  colors: { forest },
  autoContrast: true,

  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSizes: { xs: '11px', sm: '12px', md: '13px', lg: '15px', xl: '17px' },
  lineHeights: { xs: '1.35', sm: '1.4', md: '1.45', lg: '1.5', xl: '1.5' },
  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '20px', lineHeight: '1.3' },
      h2: { fontSize: '17px', lineHeight: '1.3' },
      h3: { fontSize: '15px', lineHeight: '1.3' },
      h4: { fontSize: '14px', lineHeight: '1.3' },
      h5: { fontSize: '13px', lineHeight: '1.3' },
      h6: { fontSize: '12px', lineHeight: '1.3' }
    }
  },

  spacing: { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  defaultRadius: 0,
  radius: { xs: '0', sm: '0', md: '0', lg: '0', xl: '0' },
  shadows: { xs: edge, sm: edge, md: edge, lg: edge, xl: edge },
  cursorType: 'pointer',
  focusRing: 'auto',

  components: {
    // Controls
    Button: Button.extend({ defaultProps: compact }),
    ActionIcon: ActionIcon.extend({ defaultProps: { ...compact, variant: 'default' } }),
    TextInput: TextInput.extend({ defaultProps: compact }),
    PasswordInput: PasswordInput.extend({ defaultProps: compact }),
    NumberInput: NumberInput.extend({ defaultProps: compact }),
    Textarea: Textarea.extend({ defaultProps: compact }),
    NativeSelect: NativeSelect.extend({ defaultProps: compact }),
    Checkbox: Checkbox.extend({ defaultProps: compact }),
    Switch: Switch.extend({ defaultProps: compact }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: { ...compact, transitionDuration: 0 }
    }),
    Badge: Badge.extend({ defaultProps: { size: 'sm', variant: 'outline', radius: 0 } }),
    Select: Select.extend({ defaultProps: { ...compact, comboboxProps: still } }),
    MultiSelect: MultiSelect.extend({ defaultProps: { ...compact, comboboxProps: still } }),
    Autocomplete: Autocomplete.extend({ defaultProps: { ...compact, comboboxProps: still } }),

    // Overlays
    Modal: Modal.extend({ defaultProps: { ...still, overlayProps: { backgroundOpacity: 0.3 } } }),
    Drawer: Drawer.extend({ defaultProps: still }),
    Menu: Menu.extend({ defaultProps: still }),
    Popover: Popover.extend({ defaultProps: still }),
    Combobox: Combobox.extend({ defaultProps: still }),
    HoverCard: HoverCard.extend({ defaultProps: still }),
    Tooltip: Tooltip.extend({ defaultProps: { ...still, openDelay: 400 } }),
    Collapse: Collapse.extend({ defaultProps: { transitionDuration: 0 } }),
    LoadingOverlay: LoadingOverlay.extend({
      defaultProps: {
        transitionProps: { duration: 0 },
        overlayProps: { blur: 0, backgroundOpacity: 0.15 },
        loaderProps: { size: 'sm' }
      }
    }),

    // Surfaces
    Paper: Paper.extend({ defaultProps: { withBorder: true } }),
    Tabs: Tabs.extend({ defaultProps: { variant: 'outline' } }),
    Table: Table.extend({
      defaultProps: {
        withTableBorder: true,
        withColumnBorders: true,
        striped: true,
        verticalSpacing: 3,
        horizontalSpacing: 'xs',
        fz: 'sm'
      }
    })
  }
})
