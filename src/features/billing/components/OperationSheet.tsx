import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  N1BottomSheet,
  N1Button,
  N1Text,
  N1TextInput,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { formatCurrency } from '../../../shared/utils';
import { BILLING_STRINGS } from '../constants';
import type { LineItem, LineItemDraft } from '../types';
import { fromDraft, lineAmount, newDraft, toDraft } from '../utils';

const I = BILLING_STRINGS.invoice;
const L = BILLING_STRINGS.lineItems;

const makeStyles = createN1Styles(t => ({
  form: { gap: t.spacing.md },
  pair: { flexDirection: 'row', gap: t.spacing.md },
  grow: { flex: 1 },
  amount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}));

type Props = {
  /** The operation to edit, `null` to add one, `undefined` when closed. */
  item: LineItem | null | undefined;
  quantity: number;
  saving: boolean;
  error?: string | null;
  onSave: (item: LineItem) => void;
  onClose: () => void;
};

/** Phones: one process operation's fields, saved on their own. */
export function OperationSheet({
  item,
  quantity,
  saving,
  error,
  onSave,
  onClose,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const open = item !== undefined;
  const [draft, setDraft] = useState<LineItemDraft>(newDraft);
  const [nameError, setNameError] = useState<string>();

  // Each opening starts from the tapped operation, or a blank one.
  useEffect(() => {
    if (open) {
      setDraft(item ? toDraft(item) : newDraft());
      setNameError(undefined);
    }
  }, [open, item]);

  const set = (field: Exclude<keyof LineItemDraft, 'id'>) => (v: string) =>
    setDraft(d => ({ ...d, [field]: v }));
  const save = () => {
    if (!draft.operation.trim()) {
      setNameError(I.operationRequired);
      return;
    }
    onSave(fromDraft(draft));
  };

  return (
    <N1BottomSheet
      open={open}
      onClose={onClose}
      title={item ? I.editOperation : I.addOperation}
      showClose
      testID="operation-sheet"
    >
      <View style={styles.form}>
        <N1TextInput
          label={L.operation}
          required
          value={draft.operation}
          onChangeText={set('operation')}
          placeholder={L.operationPlaceholder}
          errorText={nameError}
          testID="operation-name"
        />
        <N1TextInput
          label={L.description}
          value={draft.description}
          onChangeText={set('description')}
          placeholder={L.descriptionPlaceholder}
          testID="operation-description"
        />
        <View style={styles.pair}>
          <N1TextInput
            label={L.minutesHeader}
            value={draft.minutes}
            onChangeText={set('minutes')}
            keyboardType="decimal-pad"
            containerStyle={styles.grow}
            testID="operation-minutes"
          />
          <N1TextInput
            label={L.setupHeader}
            value={draft.setup}
            onChangeText={set('setup')}
            keyboardType="decimal-pad"
            containerStyle={styles.grow}
            testID="operation-setup"
          />
        </View>
        <N1TextInput
          label={L.rateHeader}
          value={draft.rate}
          onChangeText={set('rate')}
          keyboardType="decimal-pad"
          testID="operation-rate"
        />
        <View style={styles.amount}>
          <N1Text color="secondary">{L.amount}</N1Text>
          <N1Text variant="h3" testID="operation-amount">
            {formatCurrency(lineAmount(fromDraft(draft), quantity))}
          </N1Text>
        </View>
        {!!error && (
          <N1Text variant="small" color="danger">
            {error}
          </N1Text>
        )}
        <N1Button
          title={I.saveOperation}
          fullWidth
          loading={saving}
          onPress={save}
          testID="save-operation"
        />
      </View>
    </N1BottomSheet>
  );
}
