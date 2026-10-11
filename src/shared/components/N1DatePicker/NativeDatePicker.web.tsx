import type { NativeDatePickerProps } from './NativeDatePicker';

export type { NativeDatePickerProps };

/** Web keeps the calendar under the field: there's no native picker. */
export const HAS_NATIVE_DATE_PICKER = false;

export function NativeDatePicker(_props: NativeDatePickerProps) {
  return null;
}
