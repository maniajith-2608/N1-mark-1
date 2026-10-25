import { memo } from 'react';
import { View } from 'react-native';
import {
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import type { MachineWork } from '../types';
import { workTitle } from '../utils';

const makeStyles = createN1Styles(t => ({
  panel: {
    gap: t.spacing.xxs,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background,
  },
}));

/** "WO #1036 · Coupling — Job G" over the operator's name. */
export const CurrentWork = memo(function CurrentWorkComponent({
  work,
  variant = 'plain',
}: {
  work: MachineWork | null;
  variant?: 'plain' | 'panel';
}) {
  const styles = useN1Styles(makeStyles);
  if (!work) {
    return variant === 'panel' ? null : (
      <N1Text color="tertiary">{COMMON_STRINGS.dash}</N1Text>
    );
  }
  return (
    <View style={variant === 'panel' && styles.panel}>
      <N1Text variant="small" weight="bold" numberOfLines={1}>
        {workTitle(work)}
      </N1Text>
      <N1Text variant="caption" color="secondary">
        {work.operator}
      </N1Text>
    </View>
  );
});
