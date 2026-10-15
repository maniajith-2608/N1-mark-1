import type { ReactNode } from 'react';
import { TextInput, View } from 'react-native';
import { N1Icon, createN1Styles, useN1Styles, useN1Theme } from '..';
import { SEARCH_INPUT_PROPS } from '../../constants';

export type HeaderSearchBarProps = {
  query: string;
  onQueryChange: (text: string) => void;
  placeholder: string;
  /** Beside the search, e.g. <FilterMenu variant="inverse" />. */
  right?: ReactNode;
  testID?: string;
  inputTestID?: string;
};

const makeStyles = createN1Styles(t => ({
  // Continues the black top bar above it.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
    backgroundColor: t.colors.surfaceInverse,
  },
  // Same dark tile as the top bar's menu button.
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    height: t.controlHeight.md,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceInverseActive,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    color: t.colors.textInverse,
    fontFamily: t.fontFamily.regular,
    fontSize: t.typography.body.fontSize,
  },
}));

/**
 * Phones: a list screen's search (and filter) on the black header, under the
 * top bar that shows the screen's name. With no filter the search takes the
 * whole width.
 */
export function HeaderSearchBar({
  query,
  onQueryChange,
  placeholder,
  right,
  testID,
  inputTestID,
}: HeaderSearchBarProps) {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  return (
    <View style={styles.bar} testID={testID}>
      <View style={styles.field}>
        <N1Icon name="search" size="sm" color="textTertiary" />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel={placeholder}
          selectionColor={theme.colors.textInverse}
          style={styles.input}
          testID={inputTestID}
          {...SEARCH_INPUT_PROPS}
        />
      </View>
      {right}
    </View>
  );
}
