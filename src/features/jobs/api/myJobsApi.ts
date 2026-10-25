import { fetchAllNodes, fromWireEnum } from '../../../services/api';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import type { JobCard } from '../../jobCards/types';
import type { EmployeeRole } from '../../profile/types';
import type { QcKind, QcQueueEntry, QcStatus } from '../qc';

// N1 Core API: myJobs (an operator's assigned work; a supervisor's or QC's
// own list, added to with watchJob) and qcQueue (QC's checks, as the server
// works them out).

type QcQueueNode = {
  jobCardId: string;
  kind: 'RM' | 'MACHINE';
  status: Uppercase<QcStatus>;
  stage: string;
  subject: string;
};

/**
 * The checks on QC's own list (watched), for both tabs. A literal page
 * size: the cost check counts a variable one as 100.
 */
async function qcQueue(): Promise<QcQueueEntry[]> {
  const nodes = await fetchAllNodes<QcQueueNode>(
    `query QcQueue($after: String) {
      qcQueue(first: 100, after: $after, filter: { watched: true }) {
        edges { node { jobCardId kind status stage subject } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    'qcQueue',
  );
  return nodes.map(node => ({
    jobCardId: node.jobCardId,
    kind: node.kind === 'RM' ? 'rm' : ('machine' as QcKind),
    status: fromWireEnum<QcStatus>(node.status),
    stage: node.stage,
    subject: node.subject,
  }));
}

export const myJobsApi = {
  /** The role's jobs, as whole job cards (the server knows whose). */
  list: (_role: EmployeeRole): Promise<JobCard[]> => jobCardsApi.myJobs(),
  /** Supervisor and QC: adds the job to their own list. */
  watch: (_role: EmployeeRole, jobCardId: string): Promise<JobCard> =>
    jobCardsApi.run(jobCardId, { type: 'watch' }),
  qcQueue,
};
