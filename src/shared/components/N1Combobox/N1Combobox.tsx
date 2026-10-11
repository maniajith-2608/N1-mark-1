import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { createN1Styles, useN1Styles } from '../../../theme/N1ThemeProvider';
import { COMMON_STRINGS } from '../../constants';
import { useN1Breakpoint } from '../../hooks/useN1Breakpoint';
import { N1BottomSheet } from '../N1BottomSheet/N1BottomSheet';
import type { N1DropDownOption } from '../N1DropDown/N1DropDown';
import { N1FieldHelper, N1FieldLabel } from '../N1FieldLabel/N1FieldLabel';
import { N1Icon } from '../N1Icon/N1Icon';
import { N1Text } from '../N1Text/N1Text';
import { N1TextInput, type N1TextInputProps } from '../N1TextInput/N1TextInput';

export type N1ComboboxProps = Omit<
  N1TextInputProps,
  'value' | 'onChangeText' | 'onFocus' | 'onBlur'
> & {
  options: N1DropDownOption<string>[];
  /** The typed text: an option's label, or anything else. */
  value: string;
  onChangeText: (text: string) => void;
  /** An option was picked from the list. */
  onSelect: (option: N1DropDownOption<string>) => void;
};

/** About five matches before the list scrolls. */
const LIST_MAX_HEIGHT = 220;
/**
 * Leaving the field hides the list a moment later, so a press on a match
 * still lands (on web the field blurs before the press).
 */
const BLUR_DELAY_MS = 150;

const makeStyles = createN1Styles(t => ({
  root: { gap: t.spacing.xs },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
    padding: t.spacing.xs,
    borderRadius: t.radius.sm,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    boxShadow: t.shadow.raised,
  },
  option: {
    justifyContent: 'center',
    minHeight: t.controlHeight.sm,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.xs,
  },
  optionActive: { backgroundColor: t.colors.surfaceMuted },
  // Phones: the field opens a sheet. Matches N1DropDown's field.
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    height: t.fieldHeight.compact,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.sm,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  fieldError: { borderColor: t.colors.danger },
  fieldValue: { flex: 1 },
  sheetBody: { gap: t.spacing.md },
  // Sheet rows: taller for thumbs, with a tick on the chosen one.
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
    minHeight: t.controlHeight.lg,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.sm,
  },
  typedRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
}));

/** Options whose label contains the text, ignoring case. */
const filterOptions = (options: N1DropDownOption<string>[], text: string) => {
  const query = text.trim().toLowerCase();
  return query
    ? options.filter(o => o.label.toLowerCase().includes(query))
    : options;
};

/** Matches an option's label, ignoring case and outer spaces. */
export const findOptionByLabel = (
  options: N1DropDownOption<string>[],
  text: string,
) => {
  const wanted = text.trim().toLowerCase();
  return wanted
    ? options.find(o => o.label.toLowerCase() === wanted)
    : undefined;
};

/**
 * Text field that suggests matching options as you type. Pick one, or keep
 * typing a value that isn't in the list. On phones the field opens a bottom
 * sheet with a search box instead.
 */
export function N1Combobox(props: N1ComboboxProps) {
  const { isCompact } = useN1Breakpoint();
  return isCompact ? (
    <ComboboxSheet {...props} />
  ) : (
    <InlineCombobox {...props} />
  );
}

/**
 * Phones: the field shows the value; tapping it slides up a sheet with a
 * search box over the options. Pick one, or "Use" the typed text when it
 * matches none.
 */
function ComboboxSheet({
  options,
  value,
  onChangeText,
  onSelect,
  label,
  required,
  placeholder,
  leftIcon,
  helperText,
  errorText,
  testID,
}: N1ComboboxProps) {
  const styles = useN1Styles(makeStyles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const matches = useMemo(
    () => filterOptions(options, query),
    [options, query],
  );
  const typed = query.trim();
  const exact = findOptionByLabel(options, typed);
  const chosen = findOptionByLabel(options, value);

  const show = () => {
    setQuery('');
    setOpen(true);
  };
  const choose = (option: N1DropDownOption<string>) => {
    setOpen(false);
    onSelect(option);
  };
  const keepTyped = () => {
    setOpen(false);
    onChangeText(typed);
  };

  return (
    <View style={styles.root}>
      {label && <N1FieldLabel label={label} required={required} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        aria-valuetext={value || placeholder}
        aria-expanded={open}
        onPress={show}
        style={[styles.field, Boolean(errorText) && styles.fieldError]}
        testID={testID}
      >
        {leftIcon && <N1Icon name={leftIcon} size="sm" color="textSecondary" />}
        <N1Text
          variant="small"
          color={value ? 'primary' : 'tertiary'}
          numberOfLines={1}
          style={styles.fieldValue}
        >
          {value || placeholder}
        </N1Text>
        <N1Icon name="chevron-down" size="sm" />
      </Pressable>
      <N1FieldHelper helperText={helperText} errorText={errorText} />

      <N1BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        // Stays the same height as the results narrow.
        fixedHeight
        testID={testID && `${testID}-sheet`}
      >
        <View style={styles.sheetBody}>
          <N1TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            leftIcon="search"
            autoFocus
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel={placeholder ?? label}
            testID={testID && `${testID}-search`}
          />
          <View accessibilityRole="list">
            {typed !== '' && !exact && (
              <Pressable
                accessibilityRole="menuitem"
                onPress={keepTyped}
                style={({ pressed }) => [
                  styles.sheetOption,
                  pressed && styles.optionActive,
                ]}
                testID={testID && `${testID}-use-typed`}
              >
                <View style={styles.typedRow}>
                  <N1Icon name="plus" size="sm" />
                  <N1Text weight="semiBold">
                    {COMMON_STRINGS.keepTyped(typed)}
                  </N1Text>
                </View>
              </Pressable>
            )}
            {matches.map(option => {
              const isSelected = option.value === chosen?.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="menuitem"
                  aria-selected={isSelected}
                  onPress={() => choose(option)}
                  style={({ pressed }) => [
                    styles.sheetOption,
                    (isSelected || pressed) && styles.optionActive,
                  ]}
                >
                  <N1Text weight={isSelected ? 'semiBold' : 'regular'}>
                    {option.label}
                  </N1Text>
                  {isSelected ? <N1Icon name="check" size="md" /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </N1BottomSheet>
    </View>
  );
}

/** Wide screens: type in the field; matches list right under it. */
function InlineCombobox({
  options,
  value,
  onChangeText,
  onSelect,
  testID,
  ...inputProps
}: N1ComboboxProps) {
  const styles = useN1Styles(makeStyles);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current);
      }
    },
    [],
  );

  const matches = useMemo(
    () => filterOptions(options, value),
    [options, value],
  );

  const focus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
    }
    setOpen(true);
  };
  const blur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), BLUR_DELAY_MS);
  };
  const change = (text: string) => {
    setOpen(true);
    onChangeText(text);
  };
  const choose = (option: N1DropDownOption<string>) => {
    setOpen(false);
    onSelect(option);
  };

  return (
    <View style={styles.root}>
      <N1TextInput
        {...inputProps}
        value={value}
        onChangeText={change}
        onFocus={focus}
        onBlur={blur}
        autoCorrect={false}
        autoComplete="off"
        aria-expanded={open && matches.length > 0}
        testID={testID}
      />
      {open && matches.length > 0 && (
        <View style={styles.list} testID={testID && `${testID}-list`}>
          <ScrollView
            accessibilityRole="list"
            keyboardShouldPersistTaps="handled"
          >
            {matches.map(option => (
              <Pressable
                key={option.value}
                accessibilityRole="menuitem"
                onPress={() => choose(option)}
                onHoverIn={() => setHovered(option.value)}
                onHoverOut={() => setHovered(null)}
                style={({ pressed }) => [
                  styles.option,
                  (pressed || hovered === option.value) && styles.optionActive,
                ]}
              >
                <N1Text variant="small">{option.label}</N1Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
