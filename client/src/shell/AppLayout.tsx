import { AppShell, Button, Group, Menu, NavLink, ScrollArea, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import type { LanguageChoice } from '../../../src/shared/bridge'
import { ApiError } from '../api/client'
import { useMeta } from '../platform/meta'
import { useSession, useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'

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
    return current ? <Text size="sm">{current.code}</Text> : null
  }
  return (
    <Menu position="bottom-end">
      <Menu.Target>
        <Button variant="default" size="xs" title={t('company')}>
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
        <Button variant="subtle" size="xs">
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

/** The menu, from /meta.menu: one group per module, its resources then its reports. */
function Navigation(): React.JSX.Element {
  const meta = useMeta()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const label = (key: string, list: { key: string; label: string }[]): string =>
    list.find((x) => x.key === key)?.label ?? key
  return (
    <ScrollArea>
      {meta.menu.map((group) => (
        <NavLink key={group.module} label={group.label} defaultOpened childrenOffset="sm">
          {group.resources.map((key) => (
            <NavLink
              key={key}
              label={label(key, meta.resources)}
              active={pathname === `/r/${key}` || pathname.startsWith(`/r/${key}/`)}
              onClick={() => navigate({ to: '/r/$resourceKey', params: { resourceKey: key } })}
            />
          ))}
          {group.reports.map((key) => (
            <NavLink
              key={key}
              label={label(key, meta.reports)}
              active={pathname === `/reports/${key}`}
              onClick={() => navigate({ to: '/reports/$reportKey', params: { reportKey: key } })}
            />
          ))}
        </NavLink>
      ))}
    </ScrollArea>
  )
}

export function AppLayout(): React.JSX.Element {
  const t = useText()
  const navigate = useNavigate()
  return (
    <AppShell header={{ height: 48 }} navbar={{ width: 260, breakpoint: 0 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4} style={{ cursor: 'pointer' }} onClick={() => navigate({ to: '/' })}>
            {t('appName')}
          </Title>
          <Group gap="xs">
            <CompanyMenu />
            <UserMenu />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        <Navigation />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
