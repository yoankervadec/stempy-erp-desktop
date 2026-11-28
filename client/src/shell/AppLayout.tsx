import { AppShell, Button, Group, Menu, Text, UnstyledButton } from '@mantine/core'
import { useClickOutside, useHotkeys } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CommandContext, CommandStore, type Command } from '../platform/commands'
import type { LanguageChoice } from '../../../src/shared/bridge'
import { ApiError } from '../api/client'
import { CustomizeMenuContext, usePersonalMenu, type MenuPage } from '../platform/menu'
import { isBoolean, usePreference } from '../platform/preferences'
import { useSession, useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'
import classes from './AppLayout.module.css'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { CommandBar } from './CommandBar'
import { CustomizeMenu } from './CustomizeMenu'

function showError(error: unknown, requestIdLabel: string): void {
  const p = error instanceof ApiError ? error.problem : null
  notifications.show({
    color: 'red',
    title: p?.title ?? String(error),
    message: [p?.detail, p?.requestId && `${requestIdLabel}: ${p.requestId}`]
      .filter(Boolean)
      .join(' - ')
  })
}

function CompanyMenu(): React.JSX.Element | null {
  const t = useText()
  const info = useSessionInfo()
  const { setCompany } = useSession()
  const navigate = useNavigate()
  const current = info.companies.find((c) => c.id === info.companyId)
  if (info.companies.length < 2) {
    return current ? (
      <Text size="sm" className={classes.headerText}>
        {current.code}
      </Text>
    ) : null
  }
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button variant="subtle" className={classes.headerButton} title={t('company')}>
          {current?.code}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('company')}</Menu.Label>
        {info.companies.map((c) => (
          <Menu.Item
            key={c.id}
            disabled={c.id === info.companyId}
            onClick={async () => {
              // The open screen showed the other company's records.
              await navigate({ to: '/' })
              await setCompany(c.id)
            }}
          >
            {c.code}
            {c.description ? ` - ${c.description}` : ''}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

function UserMenu({ onChangePassword }: { onChangePassword: () => void }): React.JSX.Element {
  const t = useText()
  const info = useSessionInfo()
  const { setLanguage, logout } = useSession()
  const choices: { value: LanguageChoice; label: string }[] = [
    { value: null, label: t('languageCompanyDefault') },
    { value: 'fr', label: t('languageFr') },
    { value: 'en', label: t('languageEn') }
  ]
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button variant="subtle" className={classes.headerButton}>
          {info.user.name}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('language')}</Menu.Label>
        {choices.map((c) => (
          <Menu.Item
            key={String(c.value)}
            disabled={info.user.language === c.value}
            onClick={() => setLanguage(c.value).catch((e) => showError(e, t('requestId')))}
          >
            {c.label}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item onClick={onChangePassword}>{t('changePassword')}</Menu.Item>
        <Menu.Item color="red" onClick={() => logout()}>
          {t('signOut')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}

const BAR_HEIGHT = 30
const HEADER_HEIGHT = 36

function PinIcon({ pinned }: { pinned: boolean }): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path
        d="M4 1h4M5 1v4L3 7h6L7 5V1M6 7v4"
        stroke="currentColor"
        strokeWidth="1.2"
        fill={pinned ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

/**
 * The menu bar, from /meta.menu as the user arranged it: favourites first, then
 * one dropdown per module, its resources then its reports. The module holding
 * the open page is marked.
 */
function MenuBar({
  pinned,
  onTogglePin,
  onNavigate,
  onCustomize
}: {
  pinned: boolean
  onTogglePin: () => void
  onNavigate: () => void
  onCustomize: () => void
}): React.JSX.Element {
  const t = useText()
  const menu = usePersonalMenu()
  const { pathname } = useLocation()
  const isOpen = (id: string): boolean => {
    const [kind, key] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)]
    if (kind === 'r') return pathname === `/r/${key}` || pathname.startsWith(`/r/${key}/`)
    if (kind === 'screen') return pathname === `/s/${key}`
    return pathname === `/reports/${key}`
  }
  const item = (p: MenuPage): React.JSX.Element => (
    <Menu.Item
      key={p.id}
      data-active={isOpen(p.id) || undefined}
      onClick={() => {
        onNavigate()
        p.go()
      }}
    >
      {p.label}
    </Menu.Item>
  )
  const dropdown = (
    id: string,
    label: string,
    active: boolean,
    body: React.ReactNode
  ): React.JSX.Element => (
    // Not portaled: an unpinned bar closes on a click outside it, and its
    // dropdowns must count as inside.
    <Menu key={id} position="bottom-start" offset={0} withinPortal={false}>
      <Menu.Target>
        <UnstyledButton className={classes.menuButton} data-active={active || undefined}>
          {label}
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown miw={200}>{body}</Menu.Dropdown>
    </Menu>
  )

  return (
    <nav className={classes.menuBar} aria-label={t('menu')}>
      <Group gap={0} wrap="nowrap" className={classes.menuGroups}>
        {menu.favourites.length > 0 &&
          dropdown('favourites', t('favourites'), false, menu.favourites.map(item))}
        {menu.favourites.length > 0 && <span className={classes.menuRule} />}
        {menu.shown.map((m) => {
          // Screens are pages of records too: with the resources, above the reports.
          const isReport = (p: MenuPage): boolean => p.id.startsWith('report:')
          const resources = m.pages.filter((p) => !isReport(p))
          const reports = m.pages.filter(isReport)
          return dropdown(
            m.id,
            m.label,
            m.pages.some((p) => isOpen(p.id)),
            <>
              {resources.map(item)}
              {resources.length > 0 && reports.length > 0 && <Menu.Divider />}
              {reports.map(item)}
            </>
          )
        })}
      </Group>
      <Group gap={0} wrap="nowrap">
        <UnstyledButton
          className={classes.pinButton}
          aria-label={t('customizeMenu')}
          title={t('customizeMenu')}
          onClick={onCustomize}
        >
          <CustomizeIcon />
        </UnstyledButton>
        <UnstyledButton
          className={classes.pinButton}
          aria-pressed={pinned}
          aria-label={pinned ? t('unpinMenu') : t('pinMenu')}
          title={pinned ? t('unpinMenu') : t('pinMenu')}
          onClick={onTogglePin}
        >
          <PinIcon pinned={pinned} />
        </UnstyledButton>
      </Group>
    </nav>
  )
}

/** Three sliders: arrange the menu. */
function CustomizeIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      <path d="M1 2.5h10M1 6h10M1 9.5h10" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3 1v3M8 4.5v3M5 8v3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function MenuIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M1 3h12M1 7h12M1 11h12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function AppLayout(): React.JSX.Element {
  const t = useText()
  const navigate = useNavigate()
  const [pinned, setPinned] = usePreference('shell.menuPinned', true, isBoolean)
  // Unpinned, the bar shows over the page until a page is chosen or the user looks away.
  const [shown, setShown] = useState(false)
  const header = useClickOutside(() => setShown(false))
  useHotkeys([['Escape', () => setShown(false)]], [], true)
  const barVisible = pinned || shown
  const [commands] = useState(() => new CommandStore())
  const [customizing, setCustomizing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const customize = (): void => {
    setShown(false)
    setCustomizing(true)
  }
  const { logout } = useSession()
  const appCommands: Command[] = [
    { id: 'app:home', label: t('home'), run: () => void navigate({ to: '/' }) },
    {
      id: 'app:pin',
      label: pinned ? t('unpinMenu') : t('pinMenu'),
      run: () => {
        setPinned((p) => !p)
        setShown(false)
      }
    },
    { id: 'app:customizeMenu', label: t('customizeMenu'), run: customize },
    { id: 'app:changePassword', label: t('changePassword'), run: () => setChangingPassword(true) },
    { id: 'app:signOut', label: t('signOut'), run: () => void logout() }
  ]

  return (
    <CommandContext.Provider value={commands}>
      <CustomizeMenuContext.Provider value={customize}>
        <AppShell
          header={{ height: pinned ? HEADER_HEIGHT + BAR_HEIGHT : HEADER_HEIGHT }}
          padding={0}
          transitionDuration={0}
        >
          <AppShell.Header className={classes.header} ref={header}>
            <Group h={HEADER_HEIGHT} px="xs" justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                {!pinned && (
                  <UnstyledButton
                    className={classes.headerIcon}
                    aria-label={t('toggleMenu')}
                    title={t('toggleMenu')}
                    aria-expanded={shown}
                    onClick={() => setShown((o) => !o)}
                  >
                    <MenuIcon />
                  </UnstyledButton>
                )}
                <UnstyledButton
                  className={classes.appName}
                  onClick={() => {
                    setShown(false)
                    void navigate({ to: '/' })
                  }}
                >
                  {t('appName')}
                </UnstyledButton>
              </Group>
              <CommandBar appCommands={appCommands} />
              <Group gap={2} wrap="nowrap">
                <CompanyMenu />
                <UserMenu onChangePassword={() => setChangingPassword(true)} />
              </Group>
            </Group>
            {barVisible && (
              <div className={pinned ? undefined : classes.floatingBar}>
                <MenuBar
                  pinned={pinned}
                  onTogglePin={() => {
                    setPinned((p) => !p)
                    setShown(false)
                  }}
                  onNavigate={() => setShown(false)}
                  onCustomize={customize}
                />
              </div>
            )}
          </AppShell.Header>
          <AppShell.Main>
            <Outlet />
          </AppShell.Main>
        </AppShell>
        <CustomizeMenu opened={customizing} onClose={() => setCustomizing(false)} />
        {changingPassword && <ChangePasswordDialog onClose={() => setChangingPassword(false)} />}
      </CustomizeMenuContext.Provider>
    </CommandContext.Provider>
  )
}
