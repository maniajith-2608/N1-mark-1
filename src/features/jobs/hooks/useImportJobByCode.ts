import { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../../app/store/hooks';
import { COMMON_STRINGS } from '../../../shared/constants';
import { useOnSettled } from '../../../shared/hooks';
import { JOB_CARD_STRINGS } from '../../jobCards';
import { selectJobCardById } from '../../jobCards/store/selectors';
import { JOBS_STRINGS, ROLE_JOBS } from '../constants';
import type { QcKind } from '../qc';
import type { JobsScreenProps } from '../types';
import { useMyJobs } from './useMyJobs';
import { useOpenOverTabs } from './useOpenOverTabs';

type Navigation = JobsScreenProps<'EnterJobCode'>['navigation'];
const S = JOBS_STRINGS.code;

/**
 * Opens a job from a typed or scanned code (jobCardByQr), shared by Enter
 * Job Code and Scan QR Code. The supervisor goes on to the order; QC adds
 * the job to their list and opens its check; an operator opens their job.
 *
 * `importCode` returns an error message for a blank code, or `undefined`
 * once the lookup has started; a code nothing matches shows `importError`.
 */
export function useImportJobByCode(qcKind: QcKind = 'rm') {
  const navigation = useNavigation<Navigation>();
  const myJobs = useMyJobs();
  const openOverTabs = useOpenOverTabs();
  const { importTo } = ROLE_JOBS[myJobs.role];
  const looking = useRef(false);
  const { found } = myJobs;
  const foundCard = useAppSelector(state =>
    found ? selectJobCardById(state, found.jobCardId) : undefined,
  );

  // Operators run jobs that have a route card; QC can check any job card.
  const routeMissing =
    importTo === 'job' && foundCard && !foundCard.operations.length
      ? S.noRoute(JOB_CARD_STRINGS.workOrder(foundCard.number))
      : null;

  useOnSettled(myJobs.importing, myJobs.importError, () => {
    if (!looking.current || !found) {
      return;
    }
    looking.current = false;
    if (routeMissing) {
      return;
    }
    if (importTo === 'order') {
      navigation.navigate('ImportOrder', { orderId: found.orderId });
    } else if (importTo === 'qc') {
      openOverTabs('QcCheck', { jobCardId: found.jobCardId, kind: qcKind });
    } else {
      openOverTabs('OperatorJob', { jobCardId: found.jobCardId });
    }
  });

  const { lookup } = myJobs;
  const importCode = useCallback(
    (code: string): string | undefined => {
      if (!code.trim()) {
        return COMMON_STRINGS.required;
      }
      looking.current = true;
      lookup(code);
      return undefined;
    },
    [lookup],
  );

  return {
    importCode,
    loading: myJobs.importing,
    importError: myJobs.importError ?? routeMissing,
  } as const;
}
