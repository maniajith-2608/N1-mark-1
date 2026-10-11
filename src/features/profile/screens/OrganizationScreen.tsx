import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  KeyboardScrollView,
  AdminScreen,
  AdminScreenBackground,
  AsyncContent,
  DonutChart,
  EntityHero,
  N1Badge,
  N1Card,
  N1Divider,
  N1Tabs,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
  useN1Theme,
  useSectionTabsOptions,
} from '../../../shared/components';
import { SECTION_NAV_WIDTH } from '../../../shared/constants';
import { useOnSettled } from '../../../shared/hooks';
import { pickImage } from '../../../services/files/pickImage';
import { GstSettingsForm } from '../components/GstSettingsForm';
import { OrganizationSectionForm } from '../components/OrganizationSectionForm';
import { useSession } from '../hooks/useSession';
import {
  INDUSTRY_OPTIONS,
  ORGANIZATION_SECTIONS,
  ORGANIZATION_STRINGS as S,
  optionLabel,
  organizationCompletion,
  type OrganizationSection,
} from '../organization';

/** Phones: one swipeable page per organization section. */
const SectionTabs =
  createMaterialTopTabNavigator<Record<OrganizationSection, undefined>>();

const makeTabLabelStyles = createN1Styles(t => ({
  label: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  // Details still to fill in this section, as on the wide side menu.
  badge: {
    minWidth: t.iconSize.md,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    backgroundColor: t.colors.tone.warning.background,
  },
}));

function SectionTabLabel({
  title,
  missing,
  focused,
}: {
  title: string;
  missing?: number;
  focused: boolean;
}) {
  const styles = useN1Styles(makeTabLabelStyles);
  return (
    <View style={styles.label}>
      <N1Text
        variant="label"
        weight={focused ? 'bold' : undefined}
        color={focused ? 'primary' : 'secondary'}
      >
        {title}
      </N1Text>
      {missing ? (
        <View style={styles.badge}>
          <N1Text variant="caption" weight="bold">
            {missing}
          </N1Text>
        </View>
      ) : null}
    </View>
  );
}

const sectionTabLabel =
  (title: string, missing?: number) =>
  ({ focused }: { focused: boolean }) =>
    <SectionTabLabel title={title} missing={missing} focused={focused} />;

const makeStyles = createN1Styles(t => ({
  hero: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xl },
  heroIdentity: { flex: 1 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  progressText: { gap: t.spacing.xxs },
  // Wide screens: the card fills the window; only the fields scroll.
  card: { flex: 1, minHeight: 0 },
  panel: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: t.spacing.xl,
  },
  nav: {
    width: SECTION_NAV_WIDTH,
    paddingRight: t.spacing.xl,
    borderRightWidth: t.borderWidth.hairline,
    borderRightColor: t.colors.border,
  },
  content: { flex: 1 },
  contentInner: { flexGrow: 1, paddingBottom: t.spacing.xs },
  // The loader / error sits in the middle of the form area.
  loading: { flexGrow: 1, justifyContent: 'center' },
  heroPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.lg,
  },
  placeholderAvatar: {
    width: t.avatarSize.lg,
    height: t.avatarSize.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceMuted,
  },
  placeholderLines: { flex: 1, gap: t.spacing.sm },
  placeholderLine: {
    height: t.typography.h3.lineHeight,
    borderRadius: t.radius.xs,
    backgroundColor: t.colors.surfaceMuted,
  },
  placeholderTitle: { width: '40%' },
  placeholderSubtitle: { width: '25%' },
  // Phones: the organization above the swipeable section tabs.
  compactRoot: { flex: 1, backgroundColor: t.colors.surface },
  compactHero: { padding: t.spacing.lg },
  compactBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));

/**
 * The signed-in organization: General, Business details, Address, GST & tax,
 * Invoice settings and Document settings, one tab each. Fields stay locked
 * until the section's Edit is pressed.
 */
export function OrganizationScreen() {
  const styles = useN1Styles(makeStyles);
  const theme = useN1Theme();
  const sectionTabsOptions = useSectionTabsOptions();
  const { isCompact } = useN1Breakpoint();
  const { organization, status, error, reload, updateOrganization, saving } =
    useSession();
  const [logoSaving, setLogoSaving] = useState(false);
  const [tab, setTab] = useState<OrganizationSection>('general');
  const [editing, setEditing] = useState(false);
  const startEdit = useCallback(() => setEditing(true), []);
  const stopEdit = useCallback(() => setEditing(false), []);
  // Leaving a section drops its unsaved edits.
  const changeTab = useCallback((key: OrganizationSection) => {
    setTab(key);
    setEditing(false);
  }, []);
  // The logo saves as soon as it's picked; no Edit needed.
  const changeLogo = useCallback(async () => {
    const logo = await pickImage('logo', 'logo.png');
    if (logo) {
      setLogoSaving(true);
      updateOrganization({ logo });
    }
  }, [updateOrganization]);
  useOnSettled(saving, null, () => setLogoSaving(false));

  const completion = useMemo(
    () => (organization ? organizationCompletion(organization) : null),
    [organization],
  );
  const sectionTabs = useMemo(
    () =>
      ORGANIZATION_SECTIONS.map(({ key, title, icon }) => ({
        key,
        label: title,
        icon,
        badge: completion?.missingBySection[key],
      })),
    [completion],
  );

  const tabs = (
    <N1Tabs
      tabs={sectionTabs}
      value={tab}
      onChange={changeTab}
      variant="menu"
      testID="organization-tab"
    />
  );

  // `active`: only the open section's form can be in edit mode.
  const formFor = (section: OrganizationSection, active: boolean) =>
    !organization ? (
      <View style={styles.loading}>
        <AsyncContent status={status} error={error} onRetry={reload}>
          {null}
        </AsyncContent>
      </View>
    ) : section === 'gst' ? (
      <GstSettingsForm
        organization={organization}
        editing={active && editing}
        onEdit={startEdit}
        onDone={stopEdit}
      />
    ) : (
      <OrganizationSectionForm
        key={section}
        section={section}
        organization={organization}
        editing={active && editing}
        onEdit={startEdit}
        onDone={stopEdit}
      />
    );

  // Phones: the organization on top, then Material top tabs: swipe between
  // the sections or tap a tab, the underline sliding along. Each page
  // scrolls its own form. No card, and no completion ring.
  if (isCompact) {
    return (
      <AdminScreenBackground.Provider value="surface">
        <View style={styles.compactRoot} testID="organization-screen">
          {organization && (
            <View style={styles.compactHero}>
              <EntityHero
                name={organization.name}
                subtitle={optionLabel(INDUSTRY_OPTIONS, organization.industry)}
                // Completion beside the code, so the block keeps its height.
                badges={
                  <View style={styles.compactBadges}>
                    <N1Badge label={organization.code} tone="info" />
                    {completion && (
                      <N1Badge
                        label={S.completionShort(completion.percent)}
                        tone={completion.missing ? 'warning' : 'success'}
                        testID="organization-completion"
                      />
                    )}
                  </View>
                }
                avatarUri={organization.logo?.uri}
                onAvatarPress={changeLogo}
                avatarLabel={S.changeLogo}
                avatarLoading={logoSaving}
                testID="organization-hero"
              />
            </View>
          )}
          <SectionTabs.Navigator
            screenOptions={sectionTabsOptions}
            // Leaving a section drops its unsaved edits.
            screenListeners={({ route }) => ({
              focus: () => changeTab(route.name),
            })}
          >
            {ORGANIZATION_SECTIONS.map(({ key, title }) => {
              const missing = completion?.missingBySection[key];
              return (
                <SectionTabs.Screen
                  key={key}
                  name={key}
                  options={{
                    title,
                    tabBarAccessibilityLabel: title,
                    tabBarButtonTestID: `organization-tab-${key}`,
                    tabBarLabel: sectionTabLabel(title, missing),
                  }}
                >
                  {() => (
                    <AdminScreen testID={`organization-${key}`}>
                      {formFor(key, key === tab)}
                    </AdminScreen>
                  )}
                </SectionTabs.Screen>
              );
            })}
          </SectionTabs.Navigator>
        </View>
      </AdminScreenBackground.Provider>
    );
  }

  return (
    <AdminScreen fixed testID="organization-screen">
      <N1Card radius="sm" style={styles.card}>
        {organization && completion ? (
          <View style={styles.hero}>
            <View style={styles.heroIdentity}>
              <EntityHero
                name={organization.name}
                subtitle={optionLabel(INDUSTRY_OPTIONS, organization.industry)}
                badges={<N1Badge label={organization.code} tone="info" />}
                avatarUri={organization.logo?.uri}
                onAvatarPress={changeLogo}
                avatarLabel={S.changeLogo}
                avatarLoading={logoSaving}
                testID="organization-hero"
              />
            </View>
            <View style={styles.progress} testID="organization-completion">
              <DonutChart
                size="xs"
                centerValue={`${completion.percent}%`}
                // Empty segments are dropped so a full ring has no gap.
                segments={[
                  {
                    key: 'done',
                    label: S.completion,
                    value: completion.percent,
                    color: theme.colors.primary,
                  },
                  {
                    key: 'left',
                    label: S.completionLeft,
                    value: 100 - completion.percent,
                    color: theme.colors.surfaceMuted,
                  },
                ].filter(segment => segment.value > 0)}
              />
              <View style={styles.progressText}>
                <N1Text weight="semiBold">{S.completion}</N1Text>
                <N1Text variant="small" color="secondary">
                  {completion.missing
                    ? S.completionMissing(completion.missing)
                    : S.completionDone}
                </N1Text>
              </View>
            </View>
          </View>
        ) : (
          // Same size as the hero, so nothing jumps when it loads.
          <View style={styles.heroPlaceholder}>
            <View style={styles.placeholderAvatar} />
            <View style={styles.placeholderLines}>
              <View style={[styles.placeholderLine, styles.placeholderTitle]} />
              <View
                style={[styles.placeholderLine, styles.placeholderSubtitle]}
              />
            </View>
          </View>
        )}
        <N1Divider spacing="xl" />
        <View style={styles.panel}>
          <View style={styles.nav}>{tabs}</View>
          <KeyboardScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            testID={`organization-${tab}`}
          >
            {formFor(tab, true)}
          </KeyboardScrollView>
        </View>
      </N1Card>
    </AdminScreen>
  );
}
