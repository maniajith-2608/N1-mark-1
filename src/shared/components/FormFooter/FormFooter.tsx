import { View } from 'react-native';
import { N1Button, createN1Styles, useN1Styles, type N1IconName } from '..';
import { COMMON_STRINGS } from '../../constants';
import { useInBottomBar } from '../N1BottomBar/N1BottomBar';

export type FormFooterProps = {
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  loading?: boolean;
  submitIcon?: N1IconName;
  /** 'danger' for destructive confirmations. */
  tone?: 'primary' | 'danger';
  /** Keep buttons their natural width (right-aligned page footers). */
  compact?: boolean;
  submitTestID?: string;
};

const makeStyles = createN1Styles(t => ({
  grow: { flex: 1 },
  // In a bottom bar: share the row's width without `flex`, which native
  // layout can read as height there and collapse the buttons.
  share: { flexGrow: 1, flexBasis: 0 },
  // One row of its own, so the buttons sit side by side wherever it's
  // placed: a modal's footer or a phone's bottom bar. flexGrow, not flex: 1,
  // so a parent that sizes to its content (the bottom bar) counts the row's
  // height; flex: 1 zeroes it there and the buttons spill out.
  row: { flexGrow: 1, flexDirection: 'row', gap: t.spacing.md },
}));

/** Cancel + primary action, sharing the width, for modal and page forms. */
export function FormFooter({
  submitLabel,
  onSubmit,
  onCancel,
  cancelLabel = COMMON_STRINGS.cancel,
  loading = false,
  submitIcon,
  tone = 'primary',
  compact = false,
  submitTestID,
}: FormFooterProps) {
  const styles = useN1Styles(makeStyles);
  const inBottomBar = useInBottomBar();
  const grow = compact ? undefined : inBottomBar ? styles.share : styles.grow;
  const buttons = (
    <>
      {onCancel && (
        <N1Button
          title={cancelLabel}
          variant="secondary"
          fullWidth={!compact}
          style={grow}
          disabled={loading}
          onPress={onCancel}
        />
      )}
      <N1Button
        title={submitLabel}
        variant={tone}
        leftIcon={submitIcon}
        fullWidth={!compact}
        style={grow}
        loading={loading}
        onPress={onSubmit}
        testID={submitTestID}
      />
    </>
  );
  // Compact buttons keep their natural width in the parent's own row.
  return compact ? buttons : <View style={styles.row}>{buttons}</View>;
}
