import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type HostInstance,
} from 'react-native';
import { N1Icon } from '../N1Icon/N1Icon';
import { N1IconButton } from '../N1IconButton/N1IconButton';
import { createN1Styles, useN1Styles } from '../../../theme/N1ThemeProvider';
import { N1FieldHelper, N1FieldLabel } from '../N1FieldLabel/N1FieldLabel';
import { useN1Breakpoint } from '../../hooks/useN1Breakpoint';
import { N1Text } from '../N1Text/N1Text';
import { HAS_NATIVE_DATE_PICKER, NativeDatePicker } from './NativeDatePicker';

export type N1DatePickerProps = {
  /** DD/MM/YYYY, or '' for no date. */
  value: string;
  /** Called with DD/MM/YYYY, or '' when cleared. */
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  testID?: string;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
/** Weeks start on Monday. */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const STRINGS = {
  previous: 'Previous month',
  next: 'Next month',
  today: 'Today',
  clear: 'Clear',
  close: 'Close calendar',
} as const;

const DAY_SIZE = 36;
/** Seven days plus the calendar's padding. */
const CALENDAR_WIDTH = DAY_SIZE * 7 + 24;
/** Header, weekdays, six weeks and the footer. */
const CALENDAR_HEIGHT = 360;
/** Space between the field and the calendar. */
const GAP = 6;

const pad2 = (n: number) => String(n).padStart(2, '0');
const toText = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
/** A valid DD/MM/YYYY as a Date; anything else is null. */
const fromText = (text: string): Date | null => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const [, dd, mm, yyyy] = match.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  return d.getMonth() === mm - 1 && d.getDate() === dd ? d : null;
};
const sameDay = (a: Date, b: Date | null) =>
  Boolean(b) &&
  a.getFullYear() === b!.getFullYear() &&
  a.getMonth() === b!.getMonth() &&
  a.getDate() === b!.getDate();

/** The 42 days (six weeks) shown for a month, Monday first. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, i) => new Date(year, month, 1 - offset + i),
  );
}

type Anchor = { left: number } & ({ top: number } | { bottom: number });

const makeStyles = createN1Styles(t => ({
  container: { gap: t.spacing.xs + t.spacing.xxs },
  // Matches N1TextInput / N1DropDown.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    height: t.fieldHeight.regular,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.sm,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  fieldCompact: { height: t.fieldHeight.compact },
  fieldOpen: {
    borderColor: t.colors.tone.neutral.solid,
    boxShadow: `0 0 0 ${t.borderWidth.thick + 1}px ${
      t.colors.tone.neutral.background
    }`,
  },
  fieldError: { borderColor: t.colors.danger },
  disabled: { opacity: t.opacity.disabled },
  value: { flex: 1 },
  backdrop: { flex: 1 },
  calendar: {
    position: 'absolute',
    width: CALENDAR_WIDTH,
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    boxShadow: t.shadow.raised,
  },
  // Hidden for the moment before the field has been measured.
  measuring: { opacity: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  week: { flexDirection: 'row' },
  cell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
  },
  today: {
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.primary,
  },
  selected: { backgroundColor: t.colors.primary },
  hovered: { backgroundColor: t.colors.surfaceMuted },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: t.spacing.sm,
    borderTopWidth: t.borderWidth.hairline,
    borderTopColor: t.colors.border,
  },
  link: { paddingVertical: t.spacing.xxs, paddingHorizontal: t.spacing.xs },
  pressed: { opacity: t.opacity.pressed },
}));

/**
 * Date field: shows DD/MM/YYYY. On the web it opens a month calendar under
 * the field (today ringed, the chosen day filled; Today / Clear underneath);
 * on iOS and Android, the platform's own date picker.
 */
export function N1DatePicker({
  value,
  onChange,
  label,
  required,
  placeholder = 'DD/MM/YYYY',
  helperText,
  errorText,
  disabled = false,
  testID,
}: N1DatePickerProps) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const window = useWindowDimensions();
  const field = useRef<HostInstance | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const selected = fromText(value);
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const days = useMemo(
    () => monthGrid(month.year, month.month),
    [month.year, month.month],
  );

  const native = HAS_NATIVE_DATE_PICKER && Platform.OS !== 'web';
  const [nativeOpen, setNativeOpen] = useState(false);

  const show = () => {
    if (native) {
      setNativeOpen(true);
      return;
    }
    // Open on the chosen date's month, else this month.
    const start = selected ?? today;
    setMonth({ year: start.getFullYear(), month: start.getMonth() });
    setAnchor(null);
    setOpen(true);
    field.current?.measureInWindow((x, y, _w, h) => {
      const below = window.height - (y + h + GAP);
      const left = Math.max(
        GAP,
        Math.min(x, window.width - CALENDAR_WIDTH - GAP),
      );
      setAnchor(
        below < CALENDAR_HEIGHT && y > below
          ? { left, bottom: window.height - y + GAP }
          : { left, top: y + h + GAP },
      );
    });
  };
  const close = () => setOpen(false);
  const pick = (d: Date) => {
    onChange(toText(d));
    close();
  };
  const shift = (by: number) =>
    setMonth(m => {
      const d = new Date(m.year, m.month + by, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const footerLink = (title: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <N1Text variant="small" weight="semiBold">
        {title}
      </N1Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      {label && <N1FieldLabel label={label} required={required} />}
      <Pressable
        ref={field}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-valuetext={value || placeholder}
        aria-expanded={open || nativeOpen}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={show}
        style={[
          styles.field,
          isCompact && styles.fieldCompact,
          (open || nativeOpen) && styles.fieldOpen,
          Boolean(errorText) && styles.fieldError,
        ]}
      >
        <N1Icon name="calendar" size="sm" color="textSecondary" />
        <N1Text
          variant="small"
          style={styles.value}
          color={value ? 'primary' : 'tertiary'}
          numberOfLines={1}
        >
          {value || placeholder}
        </N1Text>
      </Pressable>
      <N1FieldHelper helperText={helperText} errorText={errorText} />

      {native && (
        <NativeDatePicker
          open={nativeOpen}
          initial={selected ?? today}
          title={label}
          onPick={d => {
            onChange(toText(d));
            setNativeOpen(false);
          }}
          onClear={() => {
            onChange('');
            setNativeOpen(false);
          }}
          onClose={() => setNativeOpen(false)}
          testID={testID}
        />
      )}

      <Modal visible={open} transparent onRequestClose={close}>
        <Pressable
          accessibilityLabel={STRINGS.close}
          style={styles.backdrop}
          onPress={close}
        />
        <View
          style={[styles.calendar, anchor ?? styles.measuring]}
          testID={testID && `${testID}-calendar`}
        >
          <View style={styles.header}>
            <N1IconButton
              icon="chevron-left"
              size="sm"
              accessibilityLabel={STRINGS.previous}
              onPress={() => shift(-1)}
            />
            <N1Text weight="semiBold" testID={testID && `${testID}-month`}>
              {`${MONTHS[month.month]} ${month.year}`}
            </N1Text>
            <N1IconButton
              icon="chevron-right"
              size="sm"
              accessibilityLabel={STRINGS.next}
              onPress={() => shift(1)}
            />
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map(day => (
              <View key={day} style={styles.cell}>
                <N1Text variant="caption" color="tertiary">
                  {day}
                </N1Text>
              </View>
            ))}
          </View>
          {[0, 1, 2, 3, 4, 5].map(week => (
            <View key={week} style={styles.week}>
              {days.slice(week * 7, week * 7 + 7).map(d => {
                const time = d.getTime();
                const isSelected = sameDay(d, selected);
                const inMonth = d.getMonth() === month.month;
                return (
                  <Pressable
                    key={time}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.getDate()} ${
                      MONTHS[d.getMonth()]
                    } ${d.getFullYear()}`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => pick(d)}
                    onHoverIn={() => setHovered(time)}
                    onHoverOut={() => setHovered(null)}
                    style={[
                      styles.cell,
                      sameDay(d, today) && styles.today,
                      hovered === time && !isSelected && styles.hovered,
                      isSelected && styles.selected,
                    ]}
                  >
                    <N1Text
                      variant="small"
                      weight={isSelected ? 'semiBold' : 'regular'}
                      color={
                        isSelected
                          ? 'onPrimary'
                          : inMonth
                          ? 'primary'
                          : 'tertiary'
                      }
                    >
                      {d.getDate()}
                    </N1Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.footer}>
            {footerLink(STRINGS.clear, () => {
              onChange('');
              close();
            })}
            {footerLink(STRINGS.today, () => pick(today))}
          </View>
        </View>
      </Modal>
    </View>
  );
}
