import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardScrollView } from '../KeyboardScrollView/KeyboardScrollView';
import { N1BottomBar, createN1Styles, useN1Styles } from '..';

export type UserScreenProps = {
  /** Fixed above the scrolling content, e.g. <N1Header />. */
  header?: ReactNode;
  /** Buttons pinned to the bottom (Save changes, Create Job Card). */
  footer?: ReactNode;
  /** 'muted': light grey page, e.g. under white cards. */
  background?: 'surface' | 'muted';
  /** Edge to edge: no padding or gap around the content (e.g. a cover). */
  flush?: boolean;
  children: ReactNode;
  testID?: string;
};

const makeStyles = createN1Styles(t => ({
  root: { flex: 1, backgroundColor: t.colors.surface },
  muted: { backgroundColor: t.colors.background },
  scroll: { flex: 1 },
  content: {
    width: '100%',
    // Phone-sized column, centred on wide screens.
    maxWidth: t.breakpoints.tablet,
    alignSelf: 'center',
    gap: t.spacing.lg,
    padding: t.spacing.lg,
  },
  flush: { gap: 0, padding: 0 },
}));

/** Scrolling page body for the shop-floor (non-admin) screens. */
export function UserScreen({
  header,
  footer,
  background = 'surface',
  flush = false,
  children,
  testID,
}: UserScreenProps) {
  const styles = useN1Styles(makeStyles);
  return (
    <View
      style={[styles.root, background === 'muted' && styles.muted]}
      testID={testID}
    >
      {header}
      <KeyboardScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, flush && styles.flush]}
      >
        {children}
      </KeyboardScrollView>
      {footer && <N1BottomBar>{footer}</N1BottomBar>}
    </View>
  );
}
