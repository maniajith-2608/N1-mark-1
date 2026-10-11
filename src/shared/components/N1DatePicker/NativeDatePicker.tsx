import React, { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../theme/N1ThemeProvider';
import { N1BottomSheet } from '../N1BottomSheet/N1BottomSheet';
import { N1Button } from '../N1Button/N1Button';

export type NativeDatePickerProps = {
  open: boolean;
  /** Where the picker starts: the chosen date, else today. */
  initial: Date;
  title?: string;
  onPick: (date: Date) => void;
  onClear: () => void;
  onClose: () => void;
  testID?: string;
};

const STRINGS = { clear: 'Clear', done: 'Done' } as const;
/** UIDatePicker's wheels are 216pt tall. */
const WHEELS_HEIGHT = 216;

const makeStyles = createN1Styles(t => ({
  // The native wheels' own size, full width so they can't collapse.
  wheel: { alignSelf: 'stretch', height: WHEELS_HEIGHT },
  actions: { flexDirection: 'row', gap: t.spacing.md },
  grow: { flex: 1 },
}));

/** The phones' native date picker is used in place of the calendar. */
export const HAS_NATIVE_DATE_PICKER = true;

/**
 * Phones: the platform's own date picker. iOS slides up a sheet with the
 * date wheels, Clear and Done; Android opens its system date dialog.
 */
export function NativeDatePicker(props: NativeDatePickerProps) {
  return Platform.OS === 'android' ? (
    <AndroidDialog {...props} />
  ) : (
    <IosSheet {...props} />
  );
}

function IosSheet({
  open,
  initial,
  title,
  onPick,
  onClear,
  onClose,
  testID,
}: NativeDatePickerProps) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  // The wheels' date, kept until Done.
  const [draft, setDraft] = useState(initial);
  useEffect(() => {
    if (open) {
      setDraft(initial);
    }
    // Only on opening: `initial` is a new Date each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <N1BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      showClose
      testID={testID && `${testID}-sheet`}
    >
      <DateTimePicker
        value={draft}
        mode="date"
        display="spinner"
        themeVariant={theme.mode}
        textColor={theme.colors.textPrimary}
        onValueChange={(_, date) => setDraft(date)}
        style={styles.wheel}
        testID={testID && `${testID}-wheels`}
      />
      <View style={styles.actions}>
        <N1Button
          title={STRINGS.clear}
          variant="secondary"
          style={styles.grow}
          onPress={onClear}
          testID={testID && `${testID}-clear`}
        />
        <N1Button
          title={STRINGS.done}
          style={styles.grow}
          onPress={() => onPick(draft)}
          testID={testID && `${testID}-done`}
        />
      </View>
    </N1BottomSheet>
  );
}

function AndroidDialog({
  open,
  initial,
  onPick,
  onClear,
  onClose,
}: NativeDatePickerProps) {
  // The dialog lives outside React: open it once per `open`.
  const handlers = useRef({ onPick, onClear, onClose });
  handlers.current = { onPick, onClear, onClose };
  useEffect(() => {
    if (!open) {
      return;
    }
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      neutralButton: { label: STRINGS.clear },
      onValueChange: (_, date) => handlers.current.onPick(date),
      onNeutralButtonPress: () => handlers.current.onClear(),
      onDismiss: () => handlers.current.onClose(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return null;
}
