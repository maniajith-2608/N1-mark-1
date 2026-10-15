import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AsyncContent,
  N1Badge,
  N1ConfirmDialog,
  N1Header,
  N1Icon,
  N1Text,
  UserScreen,
  createN1Styles,
  getInitials,
  useN1Styles,
  type N1IconName,
} from '../../../shared/components';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useToggle } from '../../../shared/hooks';
import { useAuthSession } from '../../auth/hooks';
import { formatLongDate } from '../../../shared/utils';
import {
  EMPLOYEE_PROFILE_STRINGS as S,
  EMPLOYEE_ROLE_LABELS,
} from '../constants';
import { useEmployeeProfile } from '../hooks/useEmployeeProfile';

/** The big initials circle, left-aligned and half over the cover. */
const AVATAR = 96;
/** Height of the black cover under the header. */
const COVER = 112;
/** The cover's decorative rings: diameter and stroke. */
const RING = 180;
const RING_STROKE = 28;
/** The small solid dot beside the rings. */
const DOT = 28;
/** The white ring around the avatar. */
const AVATAR_RING = 4;
/** The rounded-square icon beside each detail row. */
const ROW_ICON = 44;

const makeStyles = createN1Styles(t => ({
  // Solid black, carrying on from the header, edge to edge.
  cover: {
    height: COVER,
    overflow: 'hidden',
    backgroundColor: t.colors.surfaceInverse,
  },
  // Two overlapping rings off the right edge and a small dot: flat shapes in
  // slightly lighter blacks, no blur.
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: RING_STROKE,
    borderColor: t.colors.sidebar,
  },
  ringBack: { top: -RING / 2, right: -RING / 4 },
  ringFront: {
    top: COVER / 3,
    right: RING / 4,
    borderColor: t.colors.surfaceInverseActive,
  },
  dot: {
    position: 'absolute',
    top: t.spacing.lg,
    right: RING,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: t.colors.surfaceInverseActive,
  },
  body: {
    gap: t.spacing.xl,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    marginTop: -AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: AVATAR_RING,
    borderColor: t.colors.surface,
    backgroundColor: t.colors.surfaceInverse,
    boxShadow: t.shadow.soft,
  },
  identity: { gap: t.spacing.xxs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: t.spacing.lg,
    rowGap: t.spacing.xs,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  section: { gap: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  rowIcon: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  logoutIcon: {
    borderColor: t.colors.tone.danger.background,
    backgroundColor: t.colors.tone.danger.background,
  },
  pressed: { opacity: t.opacity.pressed },
  grow: { flex: 1 },
}));

/** The solid black cover with its flat rings, under the header. */
function ProfileCover() {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.cover} testID="employee-profile-cover">
      <View style={[styles.ring, styles.ringBack]} />
      <View style={[styles.ring, styles.ringFront]} />
      <View style={styles.dot} />
    </View>
  );
}

/** A grey icon and a short fact beside it: "🕑 Joined 01 Jun 2022". */
function Stat({ icon, text }: { icon: N1IconName; text: string }) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.stat}>
      <N1Icon name={icon} size="sm" color="textSecondary" />
      <N1Text color="secondary">{text}</N1Text>
    </View>
  );
}

/** A detail row: icon in a rounded square, the value over its label. */
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: N1IconName;
  label: string;
  value: string;
}) {
  const styles = useN1Styles(makeStyles);
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <N1Icon name={icon} size="sm" color="textPrimary" />
      </View>
      <View style={styles.grow}>
        <N1Text variant="title" numberOfLines={2}>
          {value || COMMON_STRINGS.dash}
        </N1Text>
        <N1Text variant="small" color="tertiary">
          {label}
        </N1Text>
      </View>
    </View>
  );
}

/**
 * Profile, opened from the home header's initials; shared by every non-admin
 * role. Read-only: a black header (Back, "My profile" in the middle), then
 * edge to edge a soft cover, the big initials, name and role, tags and stats, then work and contact details,
 * ending with Log out. Back returns to the jobs.
 */
export function EmployeeProfileScreen() {
  const styles = useN1Styles(makeStyles);
  const navigation = useNavigation();
  const { profile, status, error, reload, logout } = useEmployeeProfile();
  const [logoutOpen, openLogout, closeLogout] = useToggle(false);
  const { signOut } = useAuthSession();

  const confirmLogout = useCallback(() => {
    closeLogout();
    logout();
    // The root navigator swaps this area for the login screens, so Back
    // can't return here.
    signOut();
  }, [closeLogout, logout, signOut]);

  const header = (
    <N1Header
      variant="inverse"
      centerTitle
      title={S.title}
      leftIcon="arrow-left"
      leftAccessibilityLabel={COMMON_STRINGS.back}
      onLeftPress={() => navigation.goBack()}
      testID="employee-profile-header"
    />
  );

  return (
    <UserScreen testID="employee-profile-screen" header={header} flush>
      {profile ? (
        <View>
          <ProfileCover />
          <View style={styles.body}>
            <View style={styles.avatar}>
              <N1Text variant="h1" color="inverse">
                {getInitials(profile.name)}
              </N1Text>
            </View>

            <View style={styles.identity}>
              <N1Text variant="h1" accessibilityRole="header">
                {profile.name}
              </N1Text>
              <N1Text variant="title" color="secondary">
                {EMPLOYEE_ROLE_LABELS[profile.role]}
              </N1Text>
            </View>

            <View style={styles.tags}>
              {!!profile.department && (
                <N1Badge label={profile.department} tone="success" />
              )}
              {!!profile.employeeId && (
                <N1Badge label={profile.employeeId} tone="info" />
              )}
            </View>

            <View style={styles.stats}>
              <Stat
                icon="calendar"
                text={`${S.joined} ${formatLongDate(profile.joinedOn)}`}
              />
              <Stat icon="clock" text={profile.shift || COMMON_STRINGS.dash} />
            </View>

            <View style={styles.section}>
              <N1Text variant="h3">{S.work}</N1Text>
              <DetailRow
                icon="user"
                label={S.employeeId}
                value={profile.employeeId}
              />
              <DetailRow
                icon="building"
                label={S.department}
                value={profile.department}
              />
              <DetailRow icon="clock" label={S.shift} value={profile.shift} />
            </View>

            <View style={styles.section}>
              <N1Text variant="h3">{S.contact}</N1Text>
              <DetailRow icon="phone" label={S.phone} value={profile.phone} />
              <DetailRow icon="mail" label={S.email} value={profile.email} />
              <Pressable
                accessibilityRole="button"
                onPress={openLogout}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                testID="employee-logout"
              >
                <View style={[styles.rowIcon, styles.logoutIcon]}>
                  <N1Icon name="logout" size="sm" color="danger" />
                </View>
                <N1Text variant="title" color="danger" style={styles.grow}>
                  {S.logout}
                </N1Text>
                <N1Icon name="chevron-right" size="sm" color="danger" />
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <AsyncContent status={status} error={error} onRetry={reload}>
          {null}
        </AsyncContent>
      )}
      <N1ConfirmDialog
        visible={logoutOpen}
        title={S.logoutTitle}
        message={S.logoutMessage}
        confirmLabel={S.logout}
        icon="logout"
        onConfirm={confirmLogout}
        onCancel={closeLogout}
        testID="employee-logout-dialog"
      />
    </UserScreen>
  );
}
