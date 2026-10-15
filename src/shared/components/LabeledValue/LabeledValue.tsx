import { memo } from 'react';
import { Platform, View } from 'react-native';
import { N1Text, createN1Styles, useN1Styles } from '..';

export type LabeledValueProps = {
  title: string;
  value: string;
  /** The right-hand column: lines up right, only as wide as it needs. */
  end?: boolean;
  /** Larger and bold, for the figure that matters most (an amount). */
  strong?: boolean;
  testID?: string;
};

const makeStyles = createN1Styles(t => ({
  field: { flex: 1, gap: t.spacing.xxs },
  // As wide as its content, up to half the row, so a long value on the left
  // has space. On the web `flex: 0` is a zero-width basis that hides the
  // one-line value, so there it's spelled out: sized by its content.
  end: {
    ...Platform.select({
      web: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
      default: { flex: 0 },
    }),
    maxWidth: '50%',
    alignItems: 'flex-end',
  },
}));

/**
 * A value under its small grey title, as on the phone list cards. Put two
 * in a row for a left / right pair.
 */
export const LabeledValue = memo(function LabeledValueComponent({
  title,
  value,
  end,
  strong,
  testID,
}: LabeledValueProps) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={[styles.field, end && styles.end]} testID={testID}>
      <N1Text variant="caption" color="tertiary">
        {title}
      </N1Text>
      <N1Text
        variant={strong ? 'body' : 'small'}
        weight={strong ? 'bold' : undefined}
        numberOfLines={1}
      >
        {value}
      </N1Text>
    </View>
  );
});
