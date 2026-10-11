import { useCallback, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  AdminScreen,
  AdminScreenBackground,
  DetailHeader,
  N1ConfirmDialog,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useOnSettled } from '../../../shared/hooks';
import { BILLING_STRINGS } from '../constants';
import type { LineItem } from '../types';
import { OperationSheet } from './OperationSheet';
import { OperationsBill } from './OperationsBill';

const I = BILLING_STRINGS.invoice;
const L = BILLING_STRINGS.lineItems;

const makeStyles = createN1Styles(t => ({
  content: { gap: t.spacing.lg },
}));

type Props = {
  /** The invoice or quote; absent while loading or when it's gone. */
  doc?: { id: string; lineItems: LineItem[]; quantity: number };
  /** "invoice" / "quote", for the delete question. */
  docLabel: string;
  /** Shown when there's no `doc`: loading, error or not found. */
  fallback: ReactNode;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onBack: () => void;
  /** Saves the whole list after one operation changes. */
  onSave: (lineItems: LineItem[]) => void;
  saving: boolean;
  saveError: string | null;
  testID: string;
};

/**
 * Phones: an invoice's or quote's process operations on their own screen,
 * laid out like a bill. The header's Edit gives each operation Edit and
 * Delete buttons and shows Add operation above the list. Edit and Add open
 * a sheet that saves that one operation straight away; Delete asks first.
 * Done returns to reading.
 */
export function OperationsBillScreen({
  doc,
  docLabel,
  fallback,
  editing,
  onEditingChange,
  onBack,
  onSave,
  saving,
  saveError,
  testID,
}: Props) {
  const styles = useN1Styles(makeStyles);
  // The operation in the sheet: `null` adds one, `undefined` is closed.
  const [sheetItem, setSheetItem] = useState<LineItem | null>();
  // The operation its Delete asked about.
  const [deleting, setDeleting] = useState<LineItem>();

  const openSheet = useCallback(
    (item: LineItem | null) => setSheetItem(item),
    [],
  );
  const closeSheet = useCallback(() => setSheetItem(undefined), []);
  const onAdd = useCallback(() => openSheet(null), [openSheet]);

  // Only a save from here closes the sheet or the dialog.
  const savingHere = useRef(false);
  const saveLines = (lineItems: LineItem[]) => {
    savingHere.current = true;
    onSave(lineItems);
  };
  useOnSettled(saving, saveError, () => {
    if (savingHere.current) {
      savingHere.current = false;
      closeSheet();
      setDeleting(undefined);
    }
  });

  const lines = doc?.lineItems ?? [];
  const saveItem = (item: LineItem) =>
    saveLines(
      lines.some(l => l.id === item.id)
        ? lines.map(l => (l.id === item.id ? item : l))
        : [...lines, item],
    );
  const confirmDelete = () => {
    if (deleting) {
      saveLines(lines.filter(l => l.id !== deleting.id));
    }
  };

  const header = (
    <DetailHeader
      title={editing ? I.editOperations : L.title}
      onBack={onBack}
      compactRight={
        doc ? (
          <N1IconButton
            icon={editing ? 'check' : 'edit'}
            variant="tile"
            accessibilityLabel={editing ? I.doneEditing : I.editOperations}
            onPress={() => onEditingChange(!editing)}
            testID={editing ? 'done-operations' : 'edit-operations'}
          />
        ) : undefined
      }
    />
  );

  return (
    <AdminScreenBackground.Provider value="surface">
      <AdminScreen header={header} testID={testID}>
        {doc ? (
          <View style={styles.content}>
            <N1Text color="secondary">{doc.id}</N1Text>
            <OperationsBill
              items={doc.lineItems}
              quantity={doc.quantity}
              editing={editing}
              onEdit={openSheet}
              onDelete={setDeleting}
              onAdd={onAdd}
            />
            <OperationSheet
              item={sheetItem}
              quantity={doc.quantity}
              saving={saving}
              error={saveError}
              onSave={saveItem}
              onClose={closeSheet}
            />
            <N1ConfirmDialog
              visible={!!deleting}
              tone="danger"
              icon="trash"
              title={I.deleteOperationTitle}
              message={
                deleting &&
                I.deleteOperationMessage(deleting.operation, docLabel)
              }
              confirmLabel={COMMON_STRINGS.delete}
              loading={saving}
              onConfirm={confirmDelete}
              onCancel={() => setDeleting(undefined)}
              testID="delete-operation-dialog"
            />
          </View>
        ) : (
          fallback
        )}
      </AdminScreen>
    </AdminScreenBackground.Provider>
  );
}
