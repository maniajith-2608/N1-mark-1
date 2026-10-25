import { createN1Styles } from '../../../theme';

export const makeCreateOrganizationFormStyles = createN1Styles(t => ({
  form: {
    gap: t.spacing.lg,
  },
  header: {
    gap: t.spacing.sm,
    alignItems: 'flex-start',
  },
  // Pull the ghost button's own padding back so its chevron lines up with the title.
  backButton: {
    marginLeft: -t.spacing.xs,
  },
  // Two fields side by side on wide screens; stacked on phones.
  row: {
    flexDirection: 'row',
    gap: t.spacing.lg,
  },
  rowItem: {
    flex: 1,
  },

  // Phones: header and submit button stay put while the fields scroll.
  screen: {
    flex: 1,
  },
  stickyHeader: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.none,
    paddingBottom: t.spacing.lg,
    borderBottomWidth: t.borderWidth.hairline,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.xxl,
  },
  stickyFooter: {
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
    borderTopWidth: t.borderWidth.hairline,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
}));
