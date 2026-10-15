import { useCallback } from 'react';
import {
  useNavigation,
  type PartialRoute,
  type Route,
} from '@react-navigation/native';
import type { JobsScreenProps, JobsStackParamList } from '../types';

type Navigation = JobsScreenProps<'ScanJob'>['navigation'];
/** The role navigator's home, My Jobs (see RoleNavigation). */
const TABS = 'Home';
type JobRoute = 'JobCardDetails' | 'OperatorJob' | 'QcCheck';

/**
 * Replaces the history with the role's home (My Jobs) plus one job screen,
 * so the import screens drop out and Back returns to My Jobs.
 */
export function useOpenOverTabs() {
  const navigation = useNavigation<Navigation>();
  return useCallback(
    <R extends JobRoute>(name: R, params: JobsStackParamList[R]) => {
      // Home isn't in the history when a job screen was opened by URL.
      const tabs = navigation
        .getState()
        .routes.find(route => (route.name as string) === TABS);
      const routes = [
        tabs ? { key: tabs.key, name: TABS } : { name: TABS },
        { name, params },
      ] as PartialRoute<Route<keyof JobsStackParamList>>[];
      navigation.reset({ index: routes.length - 1, routes });
    },
    [navigation],
  );
}
