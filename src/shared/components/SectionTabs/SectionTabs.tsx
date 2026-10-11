import { useMemo } from 'react';
import { createN1Styles, useN1Styles, useN1Theme } from '..';
import { N1Text } from '../N1Text/N1Text';

const makeStyles = createN1Styles(t => ({
  tabBar: {
    backgroundColor: t.colors.surface,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
  },
  tabItem: { width: 'auto', paddingHorizontal: t.spacing.lg },
  tabIndicator: {
    height: t.borderWidth.thick,
    backgroundColor: t.colors.primary,
  },
}));

/**
 * Phones: the swipeable section tabs on a detail screen (Employee,
 * Customer, Order, Organization) — a white bar of scrolling labels with a
 * black line under the open one. Spread into a material top tab
 * navigator's `screenOptions`.
 */
export function useSectionTabsOptions() {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  return useMemo(
    () => ({
      tabBarScrollEnabled: true,
      tabBarStyle: styles.tabBar,
      tabBarItemStyle: styles.tabItem,
      tabBarIndicatorStyle: styles.tabIndicator,
      tabBarPressColor: theme.colors.surfaceMuted,
    }),
    [styles, theme],
  );
}

export function SectionTabLabel({
  title,
  focused,
}: {
  title: string;
  focused: boolean;
}) {
  return (
    <N1Text
      variant="label"
      weight={focused ? 'bold' : undefined}
      color={focused ? 'primary' : 'secondary'}
    >
      {title}
    </N1Text>
  );
}

/** A section tab's `tabBarLabel`: bold when it's the open one. */
export const sectionTabLabel =
  (title: string) =>
  ({ focused }: { focused: boolean }) =>
    <SectionTabLabel title={title} focused={focused} />;
