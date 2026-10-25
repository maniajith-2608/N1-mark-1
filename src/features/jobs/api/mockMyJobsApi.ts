import { respond } from '../../../services/mock/mockServer';
import { jobCardsApi } from '../../jobCards/api/mockJobCardsApi';
import type { JobCard } from '../../jobCards/types';
import type { EmployeeRole } from '../../profile/types';
import { qcItem, type QcKind, type QcQueueEntry } from '../qc';

/** Jobs already on each role's list (job card ids). */
const SEED: Record<EmployeeRole, string[]> = {
  // 1041 is waiting on a re-initiate: RM QC rejected its material.
  supervisor: ['1041', '1042', '1040', '1035', '1034', '1038'],
  operator: ['1042', '1039', '1034', '1041', '1037'],
  qc: ['1042', '1039', '1041', '1034', '1036'],
};

const copy = () =>
  Object.fromEntries(
    Object.entries(SEED).map(([role, ids]) => [role, [...ids]]),
  ) as Record<EmployeeRole, string[]>;

// In-memory stand-in for myJobsApi (Jest and offline work).
let lists = copy();

async function list(role: EmployeeRole): Promise<JobCard[]> {
  const cards = await jobCardsApi.list();
  return lists[role].flatMap(id => cards.find(c => c.id === id) ?? []);
}

export const myJobsApi = {
  list,
  /** Puts the job at the top of the role's list (once). */
  watch: async (role: EmployeeRole, jobCardId: string) => {
    lists = {
      ...lists,
      [role]: [jobCardId, ...lists[role].filter(id => id !== jobCardId)],
    };
    return jobCardsApi.get(jobCardId);
  },
  qcQueue: async (): Promise<QcQueueEntry[]> => {
    const cards = await list('qc');
    const kinds: QcKind[] = ['rm', 'machine'];
    return respond(
      cards.flatMap(c =>
        kinds.map(kind => {
          const { status, stage, subject } = qcItem(c, kind);
          return { jobCardId: c.id, kind, status, stage, subject };
        }),
      ),
    );
  },
  reset: () => {
    lists = copy();
  },
};
