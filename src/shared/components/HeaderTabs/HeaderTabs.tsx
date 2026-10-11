import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { N1Text, createN1Styles, useN1Styles, type N1Tab } from '..';

export type HeaderTabsProps<K extends string> = {
  tabs: N1Tab<K>[];
  value: K;
  onChange: (key: K) => void;
  /**
   * 'bar' (default): its own strip of the black header, under the search.
   * 'bare': just the chips, for a black area drawn elsewhere (Dashboard).
   */
  variant?: 'bar' | 'bare';
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Each tab gets `${testID}-${key}`. */
  testID?: string;
};

const makeStyles = createN1Styles(t => ({
  // Continues the black header above it, like HeaderSearchBar.
  bar: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
    backgroundColor: t.colors.surfaceInverse,
  },
  row: { flexDirection: 'row', gap: t.spacing.sm },
  // Dark tiles like the top bar's buttons; the open one white.
  tab: {
    flex: 1,
    height: t.controlHeight.md,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceInverseActive,
  },
  selected: { backgroundColor: t.colors.surface },
  pressed: { opacity: t.opacity.pressed },
}));

/**
 * Phones: tabs on the black header (Dashboard's Week / Month / Year,
 * Billing's Invoices / Quotes), sharing the width evenly.
 */
export function HeaderTabs<K extends string>({
  tabs,
  value,
  onChange,
  variant = 'bar',
  onLayout,
  testID,
}: HeaderTabsProps<K>) {
  const styles = useN1Styles(makeStyles);
  return (
    <View
      style={variant === 'bar' && styles.bar}
      onLayout={onLayout}
      testID={testID}
    >
      <View style={styles.row} accessibilityRole="tablist">
        {tabs.map(tab => {
          const selected = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              aria-selected={selected}
              onPress={() => onChange(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}
              testID={testID && `${testID}-${tab.key}`}
            >
              <N1Text variant="label" color={selected ? 'primary' : 'inverse'}>
                {tab.label}
              </N1Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
