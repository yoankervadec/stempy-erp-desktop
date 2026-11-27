import { AppShell, Button, Group, Menu, Text, UnstyledButton } from '@mantine/core'
import { useClickOutside, useHotkeys } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CommandContext, CommandStore, type Command } from '../platform/commands'
import type { LanguageChoice } from '../../../src/shared/bridge'
import { ApiError } from '../api/client'
import { useMeta } from '../platform/meta'
import { isBoolean, usePreference } from '../platform/preferences'
import { useSession, useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'
import classes from './AppLayout.module.css'
import { CommandBar } from './CommandBar'

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

function UserMenu(): React.JSX.Element {
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
 * The menu bar, from /meta.menu: one dropdown per module, its resources then its
 * reports. The module holding the open page is marked.
 */
function MenuBar({
  pinned,
  onTogglePin,
  onNavigate
}: {
  pinned: boolean
  onTogglePin: () => void
  onNavigate: () => void
}): React.JSX.Element {
  const t = useText()
  const meta = useMeta()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const label = (key: string, list: { key: string; label: string }[]): string =>
    list.find((x) => x.key === key)?.label ?? key
  const isResource = (key: string): boolean =>
    pathname === `/r/${key}` || pathname.startsWith(`/r/${key}/`)
  const isReport = (key: string): boolean => pathname === `/reports/${key}`
  const go = (to: () => Promise<void>): void => {
    onNavigate()
    void to()
  }

  return (
    <nav className={classes.menuBar} aria-label={t('menu')}>
      <Group gap={0} wrap="nowrap" className={classes.menuGroups}>
        {meta.menu.map((group) => {
          const active = group.resources.some(isResource) || group.reports.some(isReport)
          return (
            // Not portaled: an unpinned bar closes on a click outside it, and its
            // dropdowns must count as inside.
            <Menu key={group.module} position="bottom-start" offset={0} withinPortal={false}>
              <Menu.Target>
                <UnstyledButton className={classes.menuButton} data-active={active || undefined}>
                  {group.label}
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown miw={200}>
                {group.resources.map((key) => (
                  <Menu.Item
                    key={key}
                    data-active={isResource(key) || undefined}
                    onClick={() =>
                      go(() => navigate({ to: '/r/$resourceKey', params: { resourceKey: key } }))
                    }
                  >
                    {label(key, meta.resources)}
                  </Menu.Item>
                ))}
                {group.resources.length > 0 && group.reports.length > 0 && <Menu.Divider />}
                {group.reports.map((key) => (
                  <Menu.Item
                    key={key}
                    data-active={isReport(key) || undefined}
                    onClick={() =>
                      go(() => navigate({ to: '/reports/$reportKey', params: { reportKey: key } }))
                    }
                  >
                    {label(key, meta.reports)}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )
        })}
      </Group>
      <UnstyledButton
        className={classes.pinButton}
        aria-pressed={pinned}
        aria-label={pinned ? t('unpinMenu') : t('pinMenu')}
        title={pinned ? t('unpinMenu') : t('pinMenu')}
        onClick={onTogglePin}
      >
        <PinIcon pinned={pinned} />
      </UnstyledButton>
    </nav>
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
    { id: 'app:signOut', label: t('signOut'), run: () => void logout() }
  ]

  return (
    <CommandContext.Provider value={commands}>
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
              <UserMenu />
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
              />
            </div>
          )}
        </AppShell.Header>
        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </CommandContext.Provider>
  )
}
