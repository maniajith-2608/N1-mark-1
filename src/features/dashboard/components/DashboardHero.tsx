import React, { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import {
  HeaderTabs,
  useN1Styles,
  useN1Theme,
} from '../../../shared/components';
import { DASHBOARD_STRINGS as S } from '../constants';
import { HERO_OVERSCROLL, makeDashboardHeroStyles } from '../styles';
import type { DashboardPeriod } from '../types';

/** How far the black runs into the stat cards below the period chips. */
const CARD_OVERLAP = 64;

type Props = {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
};

/**
 * Top of the phone dashboard's scrolling page, under the CompactTopBar header: the
 * period chips on black. The black reaches into the stat cards below.
 */
function DashboardHero({ period, onPeriodChange }: Props) {
  const styles = useN1Styles(makeDashboardHeroStyles);
  const theme = useN1Theme();
  const [heroBottom, setHeroBottom] = useState(0);

  const onLayout = useCallback(
    ({ nativeEvent: { layout } }: LayoutChangeEvent) =>
      setHeroBottom(layout.y + layout.height),
    [],
  );

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            height:
              HERO_OVERSCROLL + heroBottom + theme.spacing.lg + CARD_OVERLAP,
          },
        ]}
      />
      {/* Period chips: dark on the black, the chosen one white. */}
      <HeaderTabs
        variant="bare"
        tabs={S.periods}
        value={period}
        onChange={onPeriodChange}
        onLayout={onLayout}
      />
    </>
  );
}

export default React.memo(DashboardHero);
