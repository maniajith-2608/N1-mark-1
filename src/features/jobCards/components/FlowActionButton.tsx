import { memo } from 'react';
import { N1IconButton } from '../../../shared/components';
import { JOB_CARD_STRINGS as S } from '../constants';
import type { JobCard } from '../types';

/** "+" opens Create flow for a card with no route yet; the pencil opens Edit flow. */
export const FlowActionButton = memo(function FlowActionButtonComponent({
  jobCard,
  onPress,
  appearance = 'table',
}: {
  jobCard: JobCard;
  onPress: (jobCard: JobCard) => void;
  /** 'card': the grey square of a phone list card's actions. */
  appearance?: 'table' | 'card';
}) {
  const hasFlow = jobCard.operations.length > 0;
  return (
    <N1IconButton
      icon={hasFlow ? 'edit' : 'plus'}
      variant={appearance === 'card' ? 'card' : 'primary'}
      size={appearance === 'card' ? 'md' : 'sm'}
      accessibilityLabel={
        hasFlow
          ? S.a11y.editFlow(jobCard.number)
          : S.a11y.createFlow(jobCard.number)
      }
      onPress={() => onPress(jobCard)}
      testID={`flow-action-${jobCard.id}`}
    />
  );
});
