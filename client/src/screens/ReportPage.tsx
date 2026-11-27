import { Alert, Text } from '@mantine/core'
import { useParams } from '@tanstack/react-router'
import { useReport } from '../platform/meta'
import { useText } from '../platform/useText'
import { reportPageId } from '../platform/menu'
import { Page } from '../shell/Page'

/** One report. Placeholder until the generic report screen is built. */
export function ReportPage(): React.JSX.Element {
  const t = useText()
  const { reportKey } = useParams({ from: '/reports/$reportKey' })
  const report = useReport(reportKey)
  if (!report) return <Alert color="gray">{t('notInMeta')}</Alert>
  return (
    <Page title={report.label} favourite={reportPageId(report.key)}>
      <Text c="dimmed">{t('screenPending')}</Text>
    </Page>
  )
}
