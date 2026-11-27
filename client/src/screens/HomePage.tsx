import { Anchor, Stack, Text, UnstyledButton } from '@mantine/core'
import { useOpenCustomizeMenu, usePersonalMenu } from '../platform/menu'
import { useSessionInfo } from '../platform/session'
import { useText } from '../platform/useText'
import { Page } from '../shell/Page'
import classes from './HomePage.module.css'

/** The start page: the user's favourite pages, and a way to arrange the menu. */
export function HomePage(): React.JSX.Element {
  const t = useText()
  const info = useSessionInfo()
  const menu = usePersonalMenu()
  const customize = useOpenCustomizeMenu()
  return (
    <Page title={t('welcome', { name: info.user.name })}>
      <Stack gap="xs" maw={640}>
        <Text className={classes.sectionTitle}>{t('favourites')}</Text>
        {menu.favourites.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t('noFavourites')}
          </Text>
        ) : (
          <div className={classes.favourites}>
            {menu.favourites.map((p) => (
              <UnstyledButton key={p.id} className={classes.favourite} onClick={p.go}>
                <Text size="sm" fw={600} truncate>
                  {p.label}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {p.module}
                </Text>
              </UnstyledButton>
            ))}
          </div>
        )}
        <Anchor size="sm" component="button" onClick={customize} w="fit-content">
          {t('customizeMenu')}
        </Anchor>
      </Stack>
    </Page>
  )
}
