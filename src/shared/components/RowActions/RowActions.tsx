import { memo } from 'react';
import { View } from 'react-native';
import { N1IconButton, createN1Styles, useN1Styles } from '..';

export type RowActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel: string;
  deleteLabel: string;
  /**
   * 'table' (default): small circles at the end of a table row.
   * 'card': the grey squares of a phone list card's actions.
   */
  appearance?: 'table' | 'card';
};

const makeStyles = createN1Styles(t => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));

/** Edit + delete icon buttons at the end of a table row, or on a card. */
export const RowActions = memo(function RowActionsComponent({
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  appearance = 'table',
}: RowActionsProps) {
  const styles = useN1Styles(makeStyles);
  const card = appearance === 'card';
  return (
    <View style={styles.row}>
      {onEdit && (
        <N1IconButton
          icon="edit"
          variant={card ? 'card' : 'primary'}
          size={card ? 'md' : 'sm'}
          accessibilityLabel={editLabel}
          onPress={onEdit}
        />
      )}
      {onDelete && (
        <N1IconButton
          icon="trash"
          size={card ? 'md' : 'sm'}
          variant={card ? 'cardDanger' : 'danger'}
          accessibilityLabel={deleteLabel}
          onPress={onDelete}
        />
      )}
    </View>
  );
});
