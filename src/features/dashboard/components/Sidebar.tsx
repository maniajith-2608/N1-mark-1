import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { StackActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  N1Avatar,
  N1ConfirmDialog,
  N1Icon,
  N1IconButton,
  N1Text,
  useN1Styles,
  useN1Theme,
} from '../../../shared/components';
import { NAV_STRINGS } from '../../../shared/constants';
import { useAuthSession } from '../../auth';
import { PROFILE_STRINGS } from '../../profile/constants';
import { useOrganizationName, useSession } from '../../profile';
import { useToggle } from '../../../shared/hooks';
import { ORGANIZATION_STRINGS } from '../../profile/organization';
import { MENU_ITEMS } from '../constants';
import { makeSidebarStyles } from '../styles';
import type { MenuItem } from '../types';
import { visibleMenuItems } from '../utils';
import SidebarItem from './SidebarItem';
import SidebarSearch from './SidebarSearch';

const BRAND_LOGO = require('../../../../assets/images/n1-logo-light.png');

type Props = DrawerContentComponentProps & {
  /** Phone drawer: close button, shorter menu and the user card. */
  compact: boolean;
  /** Wide screens only: icon-only rail. */
  collapsed: boolean;
  onToggleCollapse: () => void;
};

function Sidebar({
  state,
  navigation,
  compact,
  collapsed,
  onToggleCollapse,
}: Props) {
  const styles = useN1Styles(makeSidebarStyles);
  const theme = useN1Theme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  // Set when the rail's search icon expands the sidebar.
  const [focusSearch, setFocusSearch] = useState(false);
  const openSearch = () => {
    setFocusSearch(true);
    onToggleCollapse();
  };
  const expand = () => {
    setFocusSearch(false);
    onToggleCollapse();
  };
  const activeRoute = state.routes[state.index]?.name;
  const items = visibleMenuItems(MENU_ITEMS, { compact, query });

  // A menu item always opens its module's list: if the module is showing a
  // details or form screen (e.g. it's open already, or a job card was opened
  // from the dashboard), its stack goes back to the first screen.
  const handlePress = (item: MenuItem) => {
    const stack = state.routes.find(r => r.name === item.route)?.state;
    if (stack?.key && stack.index) {
      navigation.dispatch({ ...StackActions.popToTop(), target: stack.key });
    }
    navigation.navigate(item.route);
    if (compact) {
      navigation.closeDrawer();
    }
  };

  const organizationName = useOrganizationName();
  const { logout, shellUser } = useSession();
  const { signOut } = useAuthSession();
  const [logoutOpen, openLogout, closeLogout] = useToggle(false);
  // Same as My profile's Log out: the root navigator then shows Login.
  const confirmLogout = useCallback(() => {
    closeLogout();
    logout();
    signOut();
  }, [closeLogout, logout, signOut]);
  const openOrganization = () => {
    navigation.navigate('Organization');
    if (compact) {
      navigation.closeDrawer();
    }
  };

  const openProfile = () => {
    navigation.navigate('Profile');
    if (compact) {
      navigation.closeDrawer();
    }
  };

  return (
    <View
      style={[
        styles.root,
        // Safe-area insets add to the normal padding (they are 0 on web).
        {
          paddingTop: insets.top + theme.spacing.sm,
          paddingBottom: insets.bottom + theme.spacing.sm,
        },
      ]}
    >
      <View style={styles.header}>
        {collapsed ? (
          // Rail: the brand mark doubles as the expand button.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Expand sidebar"
            onPress={expand}
            style={({ pressed }) => pressed && styles.userCardPressed}
          >
            <Image
              source={BRAND_LOGO}
              style={styles.brand}
              tintColor={theme.colors.textInverse}
              resizeMode="contain"
            />
          </Pressable>
        ) : (
          <Image
            source={BRAND_LOGO}
            style={styles.brand}
            tintColor={theme.colors.textInverse}
            resizeMode="contain"
            accessibilityLabel="N1"
          />
        )}
        {collapsed ? null : compact ? (
          <N1IconButton
            icon="close"
            variant="inverse"
            size="sm"
            accessibilityLabel="Close menu"
            onPress={() => navigation.closeDrawer()}
          />
        ) : (
          <N1IconButton
            icon="sidebar"
            variant="inverse"
            size="sm"
            accessibilityLabel="Collapse sidebar"
            onPress={onToggleCollapse}
          />
        )}
      </View>

      <SidebarSearch
        value={query}
        onChangeText={setQuery}
        shortcut={!compact}
        autoFocus={focusSearch}
        collapsed={collapsed}
        onExpand={openSearch}
      />

      <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menu}>
        {items.map(item => (
          <SidebarItem
            key={item.route}
            item={item}
            active={item.route === activeRoute}
            collapsed={collapsed}
            onPress={handlePress}
          />
        ))}
      </ScrollView>

      {/* Organization, My profile and Log out (no top bar on wide screens).
          Collapsed: the same rows with the text hidden, so nothing moves. */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={ORGANIZATION_STRINGS.open(organizationName)}
        onPress={openOrganization}
        accessibilityState={{ selected: activeRoute === 'Organization' }}
        style={({ pressed }) => [
          styles.organization,
          // Highlighted like a menu item, only while Organization is open.
          activeRoute === 'Organization' && styles.userCardActive,
          pressed && styles.userCardPressed,
        ]}
        testID="open-organization"
      >
        <N1Icon name="building" size="lg" color="textTertiary" />
        {collapsed ? null : (
          <N1Text
            variant="small"
            color="inverse"
            numberOfLines={1}
            style={styles.userCardText}
          >
            {organizationName}
          </N1Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={NAV_STRINGS.openProfile}
        onPress={openProfile}
        accessibilityState={{ selected: activeRoute === 'Profile' }}
        style={({ pressed }) => [
          styles.userCard,
          // Highlighted like a menu item, only while My profile is open.
          activeRoute === 'Profile' && styles.userCardActive,
          pressed && styles.userCardPressed,
        ]}
        testID="sidebar-open-profile"
      >
        <N1Avatar name={shellUser?.name ?? ''} tone="info" size="sm" />
        {collapsed ? null : (
          <View style={styles.userCardText}>
            <N1Text variant="label" color="inverse" numberOfLines={1}>
              {shellUser?.name}
            </N1Text>
            <N1Text variant="caption" color="tertiary" numberOfLines={1}>
              {shellUser?.subtitle}
            </N1Text>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={PROFILE_STRINGS.logout}
        onPress={openLogout}
        style={({ pressed }) => [
          styles.logout,
          pressed && styles.userCardPressed,
        ]}
        testID="sidebar-logout"
      >
        <N1Icon name="logout" size="lg" color="textTertiary" />
        {collapsed ? null : (
          <N1Text color="inverse">{PROFILE_STRINGS.logout}</N1Text>
        )}
      </Pressable>
      <N1ConfirmDialog
        visible={logoutOpen}
        title={PROFILE_STRINGS.logoutTitle}
        message={PROFILE_STRINGS.logoutMessage}
        confirmLabel={PROFILE_STRINGS.logout}
        icon="logout"
        onConfirm={confirmLogout}
        onCancel={closeLogout}
        testID="sidebar-logout-dialog"
      />
    </View>
  );
}

export default React.memo(Sidebar);
