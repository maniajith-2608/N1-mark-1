import { createN1Styles } from '../../../theme';

export const makeAuthLayoutStyles = createN1Styles(t => ({
  // Tablet / desktop: hero panel on the left, form on the right.
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: t.spacing.sm,
    padding: t.spacing.sm,
    backgroundColor: t.colors.background,
  },
  // The shadow sits on the pane: the scroll area would clip one on its content.
  formPane: {
    flex: 1,
    borderRadius: t.radius.xl,
    boxShadow: t.shadow.card,
  },
  formPaneContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: t.spacing.xxl,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    paddingHorizontal: t.spacing.xxl,
  },
  formWidth: {
    width: '100%',
    maxWidth: t.modalWidth.md,
    gap: t.spacing.xxl,
  },
  wideFormWidth: {
    maxWidth: t.modalWidth.lg,
  },
  // A pane that doesn't scroll: the form inside fills its height instead.
  fixedPaneContent: {
    alignItems: 'center',
    paddingVertical: t.spacing.xxl,
    paddingHorizontal: t.spacing.xxl,
    backgroundColor: t.colors.surface,
  },
  fixedFormWidth: {
    flex: 1,
    minHeight: 0,
  },

  // Phone: single column with the footer pushed to the bottom.
  compactSafeArea: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  compactContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: t.spacing.xxxl,
    padding: t.spacing.xxl,
  },
}));
