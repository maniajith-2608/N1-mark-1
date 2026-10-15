import React, { useCallback, useContext, type ReactNode } from 'react';
import { Image, Platform, Pressable, StatusBar, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  N1Text,
  createN1Styles,
  getInitials,
  useN1Styles,
  useN1Theme,
} from '../../../shared/components';
import { NAV_STRINGS } from '../../../shared/constants';
import { useEmployeeProfile } from '../hooks/useEmployeeProfile';
import type { EmployeeProfileParamList } from '../types';

// The admin sidebar's logo (169 × 120), white on the black.
const BRAND_LOGO = require('../../../../assets/images/n1-logo-light.png');
const LOGO_RATIO = 169 / 120;

const makeStyles = createN1Styles(t => ({
  // Black; the search row continues it.
  bar: {
    gap: t.spacing.md,
    paddingBottom: t.spacing.xs,
    backgroundColor: t.colors.surfaceInverse,
  },
  logo: {
    width: t.controlHeight.sm * LOGO_RATIO,
    height: t.controlHeight.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
  },
  // Centred on the bar, whatever the logo and initials' widths.
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: t.controlHeight.md,
  },
  // Like the admin phone top bar's profile button: a dark rounded square.
  profile: {
    width: t.controlHeight.md,
    height: t.controlHeight.md,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceInverseActive,
  },
  pressed: { opacity: t.opacity.pressed },
}));

type Props = {
  /** In the middle, e.g. "My Jobs". */
  title: string;
  /** Under the top row on the black, e.g. the search, filter and scan. */
  children?: ReactNode;
};

/**
 * Home header for the non-admin roles: the N1 logo, the screen's name in the
 * middle and the user's initials (opening Profile) on the black, with the
 * screen's search row underneath.
 */
export const EmployeeHomeHeader = React.memo(
  function EmployeeHomeHeaderComponent({ title, children }: Props) {
    const styles = useN1Styles(makeStyles);
    const theme = useN1Theme();
    const topInset = useContext(SafeAreaInsetsContext)?.top ?? 0;
    const navigation =
      useNavigation<NavigationProp<EmployeeProfileParamList>>();
    const { profile } = useEmployeeProfile();
    const openProfile = useCallback(
      () => navigation.navigate('Profile'),
      [navigation],
    );

    return (
      <View
        style={[styles.bar, { paddingTop: topInset }]}
        testID="employee-home-header"
      >
        {/* Light status bar text over the black (web has no status bar). */}
        {Platform.OS !== 'web' && <StatusBar barStyle="light-content" />}
        <View style={styles.topRow}>
          <N1Text
            variant="h2"
            color="inverse"
            numberOfLines={1}
            accessibilityRole="header"
            style={styles.title}
          >
            {title}
          </N1Text>
          <Image
            source={BRAND_LOGO}
            style={styles.logo}
            tintColor={theme.colors.textInverse}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="N1"
            testID="employee-home-logo"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={NAV_STRINGS.openProfile}
            onPress={openProfile}
            style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
            testID="open-profile"
          >
            <N1Text variant="label" weight="bold" color="inverse">
              {getInitials(profile?.name ?? '')}
            </N1Text>
          </Pressable>
        </View>
        {children}
      </View>
    );
  },
);
