import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import {
  N1BottomSheet,
  N1Badge,
  N1Button,
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { formatFileSize, formatLongDate } from '../../../shared/utils';
import { JOB_CARD_STRINGS, QC_RESULT_META } from '../constants';
import type { QcEntry } from '../types';

const R = JOB_CARD_STRINGS.details.report;
const C = JOB_CARD_STRINGS.details.qcColumns;

/** Height of a picked image's preview. */
const PREVIEW_HEIGHT = 200;

const makeStyles = createN1Styles(t => ({
  body: { gap: t.spacing.lg },
  // The file: its icon, name, and kind and size.
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background,
  },
  fileIcon: {
    width: t.controlHeight.md,
    height: t.controlHeight.md,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  grow: { flex: 1 },
  preview: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background,
  },
  details: { gap: t.spacing.sm },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: t.spacing.md,
  },
  value: { flexShrink: 1, textAlign: 'right' },
  remark: { gap: t.spacing.xxs },
}));

type Props = {
  /** The check whose report is shown; null when closed. */
  entry: QcEntry | null;
  onClose: () => void;
  /** Opens the file itself; absent where files can't be opened yet. */
  onOpen?: (entry: QcEntry) => void;
};

/**
 * Phones: a QC report's details, from QC history. The file (with a preview
 * when it's a picked image) and the check it belongs to: stage, result,
 * inspector, date and remark.
 */
export function QcReportSheet({ entry, onClose, onOpen }: Props) {
  const styles = useN1Styles(makeStyles);
  const report = entry?.report;
  const meta = entry ? QC_RESULT_META[entry.result] : null;
  const isImage = !!report?.uri && /\.(png|jpe?g|gif|webp)$/i.test(report.name);

  const line = (label: string, value: ReactNode) => (
    <View key={label} style={styles.line}>
      <N1Text variant="small" color="secondary">
        {label}
      </N1Text>
      {typeof value === 'string' ? (
        <N1Text variant="small" weight="semiBold" style={styles.value}>
          {value || COMMON_STRINGS.dash}
        </N1Text>
      ) : (
        value
      )}
    </View>
  );

  return (
    <N1BottomSheet
      open={!!entry}
      onClose={onClose}
      title={R.title}
      showClose
      testID="qc-report-sheet"
    >
      {entry && report && meta && (
        <View style={styles.body}>
          <View style={styles.file}>
            <View style={styles.fileIcon}>
              <N1Icon name="file" size="md" color="textSecondary" />
            </View>
            <View style={styles.grow}>
              <N1Text weight="semiBold" numberOfLines={2}>
                {report.name}
              </N1Text>
              <N1Text variant="caption" color="tertiary">
                {[report.kind || R.kind, formatFileSize(report.sizeBytes)]
                  .filter(Boolean)
                  .join(' · ')}
              </N1Text>
            </View>
          </View>
          {isImage && (
            <Image
              source={{ uri: report.uri }}
              style={styles.preview}
              resizeMode="contain"
              accessibilityLabel={report.name}
            />
          )}
          <View style={styles.details} testID="qc-report-details">
            {line(C.stage, entry.stage)}
            {line(C.result, <N1Badge label={meta.label} tone={meta.tone} />)}
            {line(C.inspector, entry.inspector ?? '')}
            {line(C.date, formatLongDate(entry.at))}
            <View style={styles.remark}>
              <N1Text variant="small" color="secondary">
                {C.remark}
              </N1Text>
              <N1Text variant="small">
                {entry.remark || COMMON_STRINGS.dash}
              </N1Text>
            </View>
          </View>
          {onOpen && (
            <N1Button
              title={R.openFile}
              leftIcon="eye"
              variant="secondary"
              fullWidth
              onPress={() => onOpen(entry)}
              testID="qc-report-open"
            />
          )}
        </View>
      )}
    </N1BottomSheet>
  );
}
