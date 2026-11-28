import { Alert } from '@mantine/core'
import { useParams } from '@tanstack/react-router'
import { screens } from '../overrides/registry'
import { useScreen } from '../platform/meta'
import { useText } from '../platform/useText'

/** One screen of /meta.screens, as the registry builds it. */
export function ScreenPage(): React.JSX.Element {
  const t = useText()
  const { screenKey } = useParams({ from: '/s/$screenKey' })
  const screen = useScreen(screenKey)
  if (!screen) return <Alert color="gray">{t('notInMeta')}</Alert>
  const Screen = screens[screen.key]
  // A screen a newer server offers that this client does not build yet.
  if (!Screen) return <Alert color="gray">{t('screenPending')}</Alert>
  return <Screen key={screen.key} screen={screen} />
}
