import { matchesAny } from '../../shared/hooks';
import { workOrderSearchTerms } from '../../shared/utils';
import { MACHINE_STRINGS, MACHINE_TYPE_LABELS } from './constants';
import type { Machine, MachineFilters, MachineWork } from './types';

/** What the list's search box looks through. */
export const machineSearchText = (m: Machine) =>
  `${m.code} ${m.name} ${m.model} ${MACHINE_TYPE_LABELS[m.type]} ${
    m.location
  } ${workOrderSearchTerms(m.currentWork?.workOrderNumber ?? '')} ${
    m.currentWork?.operator ?? ''
  }`;

export const matchesMachineFilters = (m: Machine, f: MachineFilters) =>
  matchesAny(f.status, m.status);

export const INITIAL_MACHINE_FILTERS: MachineFilters = { status: [] };

/** "WO #1036 · Coupling — Job G", or just the title without a WO number. */
export const workTitle = (work: MachineWork) =>
  [
    work.workOrderNumber && MACHINE_STRINGS.workOrder(work.workOrderNumber),
    work.title,
  ]
    .filter(Boolean)
    .join(' · ');
