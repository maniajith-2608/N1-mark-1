import { useCallback } from 'react';
import { JOB_CARD_STRINGS } from '../constants';
import type { JobCardsScreenProps } from '../types';

const D = JOB_CARD_STRINGS.details;

type Props = JobCardsScreenProps<'JobCardDetails'>;

/**
 * Back for the job card screens: the screen below it in its stack (the
 * employee, dashboard or order that pushed it; the Job Cards list; My Jobs
 * on the shop floor), else the admin screen named by `from`.
 */
export function useJobCardBack(
  { route, navigation }: Props,
  /** The card's order, once the card has loaded. */
  orderId: string | undefined,
) {
  const { from, fromUserId } = route.params;
  const goBack = useCallback(() => {
    // Pushed onto another module's stack (an employee, the dashboard, an
    // order): the screen that opened it is right below.
    if (navigation.getState().index > 0) {
      navigation.goBack();
      return;
    }
    switch (from) {
      case 'dashboard':
        navigation.navigate('Overview');
        return;
      case 'order':
        if (orderId) {
          navigation.navigate('Orders', {
            screen: 'OrderDetails',
            params: { orderId },
            initial: false,
          });
          return;
        }
        break;
      case 'employee':
        if (fromUserId) {
          navigation.navigate('Users', {
            screen: 'UserDetails',
            params: { userId: fromUserId, section: 'work' },
            initial: false,
          });
          return;
        }
        break;
    }
    navigation.goBack();
  }, [navigation, from, fromUserId, orderId]);

  const label = from ? D.backTo[from] : D.back;
  return { goBack, label };
}
