import { Alert } from '@mantine/core'
import { useParams } from '@tanstack/react-router'
import { ListScreen } from '../list/ListScreen'
import { overrides } from '../overrides/registry'
import { useResource } from '../platform/meta'
import { useText } from '../platform/useText'

/** One resource's list: the generic one, unless the override registry names another. */
export function ResourcePage(): React.JSX.Element {
  const t = useText()
  const { resourceKey } = useParams({ from: '/r/$resourceKey' })
  const resource = useResource(resourceKey)
  if (!resource) return <Alert color="gray">{t('notInMeta')}</Alert>
  const List = overrides[resource.key]?.list ?? ListScreen
  // Keyed by resource: its sort, filters and page start fresh on another resource.
  return <List key={resource.key} resource={resource} />
}
