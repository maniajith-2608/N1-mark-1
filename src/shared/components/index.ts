/**
 * Shared design-system components (N1Modules), built from the AdminFlow design.
 *
 *   import { N1ThemeProvider, N1Button, N1TextInput } from '<path>/shared/components';
 *
 * Wrap the app in <N1ThemeProvider> once (AppProviders does this); every
 * component then follows the active light / dark theme. See README.md here
 * for the full list.
 */

// Theme
export {
  N1ThemeProvider,
  useN1Theme,
  useN1Styles,
  createN1Styles,
  type N1ThemeMode,
} from '../../theme/N1ThemeProvider';
export {
  lightTheme,
  darkTheme,
  type N1Theme,
  type N1Tone,
  type N1Colors,
  type N1ColorMode,
} from '../../theme/themes';
export type {
  N1Spacing,
  N1Radius,
  N1Size,
  N1TextVariant,
  N1FontWeight,
} from '../../theme/tokens';
export { useN1Breakpoint, type N1Breakpoint } from '../hooks/useN1Breakpoint';

// Icons
export {
  N1Icon,
  n1IconNames,
  type N1IconName,
  type N1IconProps,
  type N1IconColor,
} from './N1Icon';

// Layout & text
export { N1Text, type N1TextProps, type N1TextColor } from './N1Text';
export { N1View, type N1ViewProps, type N1ViewBackground } from './N1View';
export { N1Card, type N1CardProps } from './N1Card';
export { N1Divider, type N1DividerProps } from './N1Divider';

// Actions
export { N1Button, type N1ButtonProps, type N1ButtonVariant } from './N1Button';
export {
  N1IconButton,
  type N1IconButtonProps,
  type N1IconButtonVariant,
} from './N1IconButton';
export {
  FilterMenu,
  type FilterGroup,
  type FilterMenuProps,
  type FilterValues,
} from './FilterMenu';
export { N1Tabs, type N1TabsProps, type N1Tab } from './N1Tabs';
export { N1Pagination, type N1PaginationProps } from './N1Pagination';

// Form controls
export { N1TextInput, type N1TextInputProps } from './N1TextInput';
export {
  N1DropDown,
  type N1DropDownProps,
  type N1DropDownOption,
} from './N1DropDown';
export { N1DatePicker, type N1DatePickerProps } from './N1DatePicker';
export {
  N1Combobox,
  findOptionByLabel,
  type N1ComboboxProps,
} from './N1Combobox';
export {
  N1RadioButton,
  N1RadioGroup,
  type N1RadioButtonProps,
  type N1RadioGroupProps,
  type N1RadioOption,
} from './N1RadioButton';
export { N1Checkbox, type N1CheckboxProps } from './N1Checkbox';
export { N1Switch, type N1SwitchProps } from './N1Switch';
export { N1UploadBox, type N1UploadBoxProps } from './N1UploadBox';
export {
  N1Checklist,
  type N1ChecklistProps,
  type N1ChecklistItem,
} from './N1Checklist';
export { N1FieldLabel, N1FieldHelper } from './N1FieldLabel';

// Data display
export { N1Badge, type N1BadgeProps } from './N1Badge';
export { N1Chip, type N1ChipProps } from './N1Chip';
export { N1Avatar, getInitials, type N1AvatarProps } from './N1Avatar';
export { N1StatCard, type N1StatCardProps } from './N1StatCard';
export { N1ProgressBar, type N1ProgressBarProps } from './N1ProgressBar';
export { N1Table, type N1TableProps, type N1TableColumn } from './N1Table';

// Screen structure (userFlow)
export { N1Logo, type N1LogoProps } from './N1Logo';
export { N1Header, type N1HeaderProps } from './N1Header';
export { N1PageHeader, type N1PageHeaderProps } from './N1PageHeader';
export {
  N1BottomTabBar,
  type N1BottomTabBarProps,
  type N1BottomTab,
} from './N1BottomTabBar';
export {
  N1BottomBar,
  useInBottomBar,
  type N1BottomBarProps,
} from './N1BottomBar';

// Job details & workflow (userFlow)
export {
  N1KeyValueList,
  type N1KeyValueListProps,
  type N1KeyValueItem,
} from './N1KeyValueList';
export {
  N1DetailGrid,
  type N1DetailGridProps,
  type N1DetailGridItem,
} from './N1DetailGrid';
export { N1ListItem, type N1ListItemProps } from './N1ListItem';
export { N1SelectCard, type N1SelectCardProps } from './N1SelectCard';
export {
  N1ProcessStep,
  N1StepNumber,
  type N1ProcessStepProps,
  type N1StepNumberProps,
  type N1StepStatus,
} from './N1ProcessStep';
export {
  N1TimelineItem,
  type N1TimelineItemProps,
  type N1TimelineStatus,
} from './N1TimelineItem';
export { N1ScanFrame, type N1ScanFrameProps } from './N1ScanFrame';
export {
  N1QrScanner,
  useCameraAccess,
  type CameraAccess,
  type N1QrScannerProps,
} from './N1QrScanner';
export { N1Timer, formatElapsed, type N1TimerProps } from './N1Timer';

// Overlays
export { N1Modal, type N1ModalProps } from './N1Modal';
export { N1BottomSheet, type N1BottomSheetProps } from './N1BottomSheet';
export { N1ConfirmDialog, type N1ConfirmDialogProps } from './N1ConfirmDialog';

// App-level primitives
export { AppText } from './AppText';
export { Icon, type IconName } from './Icon';

// Admin layout and screen building blocks.
export * from './AdminLayout';
export * from './AdminScreen';
export * from './UserScreen';
export * from './DetailHeader';
export * from './SplitLayout';
export * from './ListToolbar';
export * from './AsyncContent';
export * from './ActivityCard';
export * from './DonutChart';
export * from './AvatarPicker';
export * from './EntityHero';
export * from './ComingSoon';
export * from './StatGrid';
export * from './FormRow';
export * from './FormScope';
export * from './EditableSectionHeader';
export * from './PasswordSetForm';
export * from './RowActions';
export * from './LabeledValue';
export * from './SectionTabs';
export * from './HeaderTabs';
export * from './FormFooter';
export {
  KeyboardScrollView,
  type KeyboardScrollViewProps,
} from './KeyboardScrollView';
export * from './HeaderSearchBar';
