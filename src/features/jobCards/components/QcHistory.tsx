import { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1Badge,
  N1Button,
  N1Icon,
  N1Table,
  N1Text,
  createN1Styles,
  useN1Styles,
  type N1TableColumn,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatDayMonth } from '../../../shared/utils';
import { JOB_CARD_STRINGS, QC_RESULT_META } from '../constants';
import type { QcEntry } from '../types';

const C = JOB_CARD_STRINGS.details.qcColumns;
const R = JOB_CARD_STRINGS.details.report;

const resultBadge = (e: QcEntry) => (
  <N1Badge
    label={QC_RESULT_META[e.result].label}
    tone={QC_RESULT_META[e.result].tone}
  />
);

const makeStyles = createN1Styles(t => ({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  // Phones: a line between checks, so each reads as its own entry.
  itemDivider: {
    borderTopWidth: t.borderWidth.hairline,
    borderTopColor: t.colors.border,
  },
  text: { flex: 1, gap: t.spacing.xs },
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xxs,
    maxWidth: '100%',
  },
  reportName: { flexShrink: 1 },
  pressed: { opacity: t.opacity.pressed },
}));

type Props = {
  entries: QcEntry[];
  /** Picks a file and attaches it to this check. */
  onUpload: (entry: QcEntry) => void;
  /** The check whose report was tapped. */
  onOpenReport: (entry: QcEntry) => void;
  /** The check whose report is uploading. */
  uploadingId?: string | null;
};

/**
 * QC checks logged against the job, each with its uploaded report (or an
 * Upload button): a table on wide screens, a list on phones.
 */
export const QcHistory = memo(function QcHistoryComponent({
  entries,
  onUpload,
  onOpenReport,
  uploadingId,
}: Props) {
  const styles = useN1Styles(makeStyles);

  const report = useCallback(
    (e: QcEntry) =>
      e.report ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={R.a11y.open(e.report.name)}
          onPress={() => onOpenReport(e)}
          style={({ pressed }) => [styles.report, pressed && styles.pressed]}
          testID={`qc-report-${e.id}`}
        >
          <N1Icon name="file" size="sm" />
          <N1Text weight="semiBold" numberOfLines={1} style={styles.reportName}>
            {e.report.name}
          </N1Text>
        </Pressable>
      ) : (
        <N1Button
          title={R.upload}
          leftIcon="upload"
          variant="secondary"
          size="sm"
          loading={uploadingId === e.id}
          onPress={() => onUpload(e)}
          accessibilityLabel={R.a11y.upload(e.stage)}
          testID={`qc-report-upload-${e.id}`}
        />
      ),
    [styles, onOpenReport, onUpload, uploadingId],
  );

  const columns = useMemo<N1TableColumn<QcEntry>[]>(
    () => [
      {
        key: 'stage',
        title: C.stage,
        render: e => <N1Text weight="semiBold">{e.stage}</N1Text>,
      },
      { key: 'result', title: C.result, render: resultBadge },
      {
        key: 'remark',
        title: C.remark,
        flex: 1.5,
        render: e => (
          <N1Text color="secondary">{e.remark || COMMON_STRINGS.dash}</N1Text>
        ),
      },
      {
        key: 'inspector',
        title: C.inspector,
        render: e => <N1Text>{e.inspector || COMMON_STRINGS.dash}</N1Text>,
      },
      {
        key: 'date',
        title: C.date,
        render: e => <N1Text>{formatDayMonth(e.at)}</N1Text>,
      },
      {
        key: 'report',
        title: C.report,
        flex: 1.5,
        interactive: true,
        render: report,
      },
    ],
    [report],
  );

  const firstId = entries[0]?.id;
  const renderCompactItem = useCallback(
    (e: QcEntry) => (
      <View
        style={[styles.item, e.id !== firstId && styles.itemDivider]}
        testID={`qc-entry-${e.id}`}
      >
        <View style={styles.text}>
          <N1Text weight="semiBold">{e.stage}</N1Text>
          <N1Text variant="small" color="secondary">
            {[
              e.remark || COMMON_STRINGS.dash,
              e.inspector,
              formatDayMonth(e.at),
            ]
              .filter(Boolean)
              .join(' · ')}
          </N1Text>
          {report(e)}
        </View>
        {resultBadge(e)}
      </View>
    ),
    [styles, report, firstId],
  );
  if (!entries.length) {
    return <N1Text color="secondary">{JOB_CARD_STRINGS.details.noQc}</N1Text>;
  }
  return (
    <N1Table
      columns={columns}
      data={entries}
      keyExtractor={e => e.id}
      renderCompactItem={renderCompactItem}
      testID="qc-history"
    />
  );
});
