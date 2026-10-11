import { memo } from 'react';
import { View } from 'react-native';
import {
  N1Avatar,
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import { RowActions } from '../../../shared/components';
import { formatDate } from '../../../shared/utils';
import { USER_STRINGS } from '../constants';
import { userContact } from '../utils';
import type { AdminUser } from '../types';
import { RoleBadge, UserStatusBadge } from './UserBadges';

type Props = {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
};

const makeStyles = createN1Styles(t => ({
  card: {
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.compact,
    backgroundColor: t.colors.surface,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  text: { flex: 1, gap: t.spacing.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  // Separates who the user is from the date and actions below.
  divider: {
    height: t.borderWidth.hairline,
    backgroundColor: t.colors.border,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  joined: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
  },
}));

/**
 * One user on the phone list: who they are with their role and status, then
 * a line, then when they joined with Edit and Delete.
 */
export const UserCard = memo(function UserCardComponent({
  user,
  onEdit,
  onDelete,
}: Props) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.card} testID={`user-card-${user.id}`}>
      <View style={styles.identity}>
        <N1Avatar name={user.name} />
        <View style={styles.text}>
          <N1Text variant="title" weight="bold" numberOfLines={1}>
            {user.name}
          </N1Text>
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {userContact(user)}
          </N1Text>
        </View>
      </View>
      <View style={styles.badges}>
        <RoleBadge role={user.role} />
        <UserStatusBadge status={user.status} />
      </View>
      <View style={styles.divider} />
      <View style={styles.footer}>
        <View style={styles.joined}>
          <N1Icon name="calendar" size="sm" color="textTertiary" />
          <N1Text variant="small" color="secondary" numberOfLines={1}>
            {USER_STRINGS.details.joined(formatDate(user.joinedAt))}
          </N1Text>
        </View>
        <RowActions
          appearance="card"
          onEdit={() => onEdit(user)}
          onDelete={() => onDelete(user)}
          editLabel={USER_STRINGS.a11y.edit(user.name)}
          deleteLabel={USER_STRINGS.a11y.delete(user.name)}
        />
      </View>
    </View>
  );
});
