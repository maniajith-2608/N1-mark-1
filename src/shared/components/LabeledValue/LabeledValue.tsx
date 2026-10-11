import { memo } from 'react';
import { View } from 'react-native';
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
  // Up to half the row, so a long value on the left has space.
  end: { flex: 0, maxWidth: '50%', alignItems: 'flex-end' },
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
