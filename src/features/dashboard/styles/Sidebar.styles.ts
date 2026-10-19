import { createN1Styles } from '../../../theme';

export const makeSidebarStyles = createN1Styles(t => ({
  root: {
    flex: 1,
    gap: t.spacing.lg,
    padding: t.spacing.sm,
    backgroundColor: t.colors.sidebar,
  },
  // The N1 brand mark (169×120 artwork), tinted to the sidebar's text colour.
  // Sized to fit the collapsed rail without moving.
  // Explicit width too: iOS otherwise draws the image at its full size.
  brand: {
    width: (t.iconSize.lg * 169) / 120,
    height: t.iconSize.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Lines the logo up with the menu icons below it.
    paddingLeft: t.spacing.md,
    minHeight: t.controlHeight.sm,
  },
  menu: {
    gap: t.spacing.xs,
  },
  // The menu takes the free height, which pins the account rows to the bottom.
  menuScroll: {
    flex: 1,
  },
  // Bottom: the organization's name, above the user card.
  organization: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.compact,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.compact,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    // Centres the small avatar on the same line as the menu icons.
    padding: (t.spacing.md * 2 + t.iconSize.lg - t.avatarSize.sm) / 2,
    borderRadius: t.radius.compact,
  },
  userCardActive: {
    backgroundColor: t.colors.sidebarActive,
  },
  userCardText: {
    flex: 1,
  },
  userCardPressed: { opacity: t.opacity.pressed },
}));
