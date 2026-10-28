import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RequestStatus } from '../../../shared/types';
import type { EmployeeRole } from '../../profile/types';
import type { QcQueueEntry } from '../qc';
import type { RawMaterialInput } from '../types';

/** The job a scanned or typed code found. */
export type FoundJob = { jobCardId: string; orderId: string };

export type MyJobsState = {
  /** Whose list is loaded; another role signing in reloads it. */
  role: EmployeeRole | null;
  /** Job card ids on the list, as the server orders them. */
  ids: string[];
  /** QC: each listed job's checks, as the server's queue reports them. */
  qcQueue: QcQueueEntry[];
  status: RequestStatus;
  error: string | null;
  /** A code lookup or an import is in flight. */
  importing: boolean;
  importError: string | null;
  /** What the last lookup found. */
  found: FoundJob | null;
};

const initialState: MyJobsState = {
  role: null,
  ids: [],
  qcQueue: [],
  status: 'idle',
  error: null,
  importing: false,
  importError: null,
  found: null,
};

export type LookupJobPayload = { role: EmployeeRole; code: string };

export type ImportJobPayload = {
  role: EmployeeRole;
  orderId: string;
  /**
   * Blank for an order without a job card yet (FE-007): saving its raw
   * material on the order opens the card.
   */
  jobCardId: string;
  /**
   * Supervisor only: saved on the job card first (saveJobCardRawMaterial).
   * Replacement material after an RM QC rejection goes the same way, and RM
   * QC inspects it again.
   */
  rawMaterial?: RawMaterialInput;
};

const myJobsSlice = createSlice({
  name: 'myJobs',
  initialState,
  reducers: {
    fetchRequest: (state, action: PayloadAction<EmployeeRole>) => {
      state.role = action.payload;
      state.status = 'loading';
      state.error = null;
    },
    fetchSuccess: (
      state,
      action: PayloadAction<{ ids: string[]; qcQueue?: QcQueueEntry[] }>,
    ) => {
      state.ids = action.payload.ids;
      state.qcQueue = action.payload.qcQueue ?? [];
      state.status = 'succeeded';
    },
    fetchFailure: (state, action: PayloadAction<string>) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    /**
     * Finds the job behind a code (jobCardByQr). QC also adds it to their
     * list; the others go on from what was found.
     */
    lookupRequest: (state, _action: PayloadAction<LookupJobPayload>) => {
      state.importing = true;
      state.importError = null;
      state.found = null;
    },
    lookupSuccess: (
      state,
      action: PayloadAction<{ found: FoundJob; ids?: string[] }>,
    ) => {
      state.found = action.payload.found;
      state.ids = action.payload.ids ?? state.ids;
      state.importing = false;
    },
    /** Adds a job to the list (Supervisor: saves its raw material first). */
    importRequest: (state, _action: PayloadAction<ImportJobPayload>) => {
      state.importing = true;
      state.importError = null;
    },
    importSuccess: (state, action: PayloadAction<string[]>) => {
      state.ids = action.payload;
      state.importing = false;
    },
    importFailure: (state, action: PayloadAction<string>) => {
      state.importing = false;
      state.importError = action.payload;
    },
  },
});

export const myJobsActions = myJobsSlice.actions;
export default myJobsSlice.reducer;
