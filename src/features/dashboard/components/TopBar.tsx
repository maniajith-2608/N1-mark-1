import React from 'react';
import { Pressable, View } from 'react-native';
import { N1Avatar, N1Text, useN1Styles } from '../../../shared/components';
import { NAV_STRINGS } from '../../../shared/constants';
import { useSession } from '../../profile';
import { ORGANIZATION_STRINGS } from '../../profile/organization';
import { makeTopBarStyles } from '../styles';
import type { TopBarAction } from '../types';
import CompactTopBar from './CompactTopBar';

type Props = {
  compact: boolean;
  /** Phones: a screen name in place of the greeting, e.g. "My profile". */
  title?: string;
  /** Phones: an action in place of the user's initials. */
  action?: TopBarAction;
  onMenuPress: () => void;
  /** Opens My profile from the signed-in user. */
  onProfilePress: () => void;
  /** Wide screens: the organization's name, which opens its details. */
  organizationName: string;
  onOrganizationPress: () => void;
};

/**
 * Wide screens: organization name and the signed-in user.
 * Phones: CompactTopBar, the user's greeting and the menu.
 */
function TopBar({
  compact,
  title,
  action,
  onMenuPress,
  onProfilePress,
  organizationName,
  onOrganizationPress,
}: Props) {
  const styles = useN1Styles(makeTopBarStyles);
  const { shellUser } = useSession();

  if (compact) {
    return (
      <CompactTopBar
        userName={shellUser?.name ?? ''}
        title={title}
        action={action}
        onMenuPress={onMenuPress}
        onProfilePress={onProfilePress}
      />
    );
  }

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={ORGANIZATION_STRINGS.open(organizationName)}
        onPress={onOrganizationPress}
        style={({ pressed }) => [
          styles.organization,
          pressed && styles.pressed,
        ]}
        testID="open-organization"
      >
        <N1Text variant="h3" numberOfLines={1}>
          {organizationName}
        </N1Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={NAV_STRINGS.openProfile}
        onPress={onProfilePress}
        style={({ pressed }) => [styles.user, pressed && styles.pressed]}
        testID="open-profile"
      >
        <N1Avatar name={shellUser?.name ?? ''} />
        <View>
          <N1Text variant="title">{shellUser?.name}</N1Text>
          <N1Text variant="small" color="secondary">
            {shellUser?.email}
          </N1Text>
        </View>
      </Pressable>
    </View>
  );
}

export default React.memo(TopBar);
