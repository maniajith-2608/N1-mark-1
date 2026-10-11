import { createN1Styles } from '../../../theme';

/** Extra black above the page, so pulling the page down shows no white. */
export const HERO_OVERSCROLL = 1000;

export const makeDashboardHeroStyles = createN1Styles(t => ({
  // Behind the top of the page, bleeding past its padding.
  backdrop: {
    position: 'absolute',
    top: -HERO_OVERSCROLL,
    left: 0,
    right: 0,
    backgroundColor: t.colors.surfaceInverse,
  },
}));
