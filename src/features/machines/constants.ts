import type { N1DropDownOption } from '../../shared/components';
import type { StatusMeta } from '../../shared/types';
import type { MachineOperation, MachineStatus, MachineType } from './types';

export const MACHINE_STRINGS = {
  title: 'Machines',
  add: 'Add Machine',
  addA11y: 'Add machine',
  noun: 'machines',
  search: 'Search by WO #, machine or code',
  statusFilter: 'Status',
  /** Pagination bar: "Showing 10 of 10 machines · 5 running · …". */
  summary: (
    showing: string,
    s: { running: number; idle: number; maintenance: number },
  ) =>
    `${showing} · ${s.running} running · ${s.idle} idle · ${s.maintenance} under maintenance`,
  columns: {
    code: 'Code',
    type: 'Type',
    operation: 'Operation',
    location: 'Location',
    work: 'Current work',
    operator: 'Operator',
    status: 'Status',
    actions: 'Actions',
  },
  workOrder: (id: string) => `WO #${id}`,
  form: {
    addTitle: 'Add machine',
    addSubtitle: 'Register a new machine on the shop floor.',
    editTitle: 'Edit machine',
    editSubtitle: (name: string) => `Update ${name}'s details.`,
    submitAdd: 'Add machine',
    code: 'Machine Code',
    codePlaceholder: 'e.g. CNC-05',
    codeTaken: 'Another machine already uses this code',
    model: 'Model',
    modelPlaceholder: 'e.g. Haas ST-20',
    type: 'Machine Type',
    operation: 'Operation',
    operationPlaceholder: 'Select operation',
    location: 'Location / Bay',
    locationPlaceholder: 'e.g. Bay 1',
    status: 'Status',
    notes: 'Notes',
    notesPlaceholder: 'Any additional details',
    noNotes: 'No notes added',
  },
  details: {
    title: 'Machine details',
    back: 'Back to machines',
    section: 'Machine info',
    currentWork: 'Current work',
    notFound: 'This machine could not be found.',
  },
  a11y: {
    edit: (name: string) => `Edit ${name}`,
  },
} as const;

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  cnc: 'CNC',
  lathe: 'Lathe',
  vmc: 'VMC',
};

export const MACHINE_OPERATION_LABELS: Record<MachineOperation, string> = {
  facing: 'Facing',
  turning: 'Turning',
  drilling: 'Drilling',
  grooving: 'Grooving',
  tapping: 'Tapping',
  threading: 'Threading',
  pattern_repeating: 'Pattern repeating',
};

export const MACHINE_STATUS_META: Record<MachineStatus, StatusMeta> = {
  running: { label: 'Running', tone: 'info' },
  idle: { label: 'Idle', tone: 'neutral' },
  maintenance: { label: 'Maintenance', tone: 'warning' },
};

export const MACHINE_TYPE_OPTIONS: N1DropDownOption<MachineType>[] = (
  Object.keys(MACHINE_TYPE_LABELS) as MachineType[]
).map(value => ({ value, label: MACHINE_TYPE_LABELS[value] }));

export const MACHINE_OPERATION_OPTIONS: N1DropDownOption<MachineOperation>[] =
  (Object.keys(MACHINE_OPERATION_LABELS) as MachineOperation[]).map(value => ({
    value,
    label: MACHINE_OPERATION_LABELS[value],
  }));

export const MACHINE_STATUS_OPTIONS: N1DropDownOption<MachineStatus>[] = (
  Object.keys(MACHINE_STATUS_META) as MachineStatus[]
).map(value => ({ value, label: MACHINE_STATUS_META[value].label }));

/**
 * What the app may set: Running only comes from a started step, so a running
 * machine's status is shown but can't be changed here.
 */
export const MACHINE_SETTABLE_STATUS_OPTIONS = MACHINE_STATUS_OPTIONS.filter(
  option => option.value !== 'running',
);
