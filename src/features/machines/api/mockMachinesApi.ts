import {
  createMockCollection,
  nextSequentialId,
} from '../../../services/mock/mockServer';
import type { Machine, MachineInput } from '../types';
import { MOCK_MACHINES } from './mockData';

// In-memory stand-in for machinesApi (Jest and offline work).
const machines = createMockCollection<Machine, MachineInput>({
  seed: MOCK_MACHINES,
  nextId: rows => nextSequentialId(rows, 'MCH-'),
  // Like the API: a new machine starts idle; running comes from a started step.
  // The code doubles as the name, like machinesApi.
  build: (input, id) => ({
    ...input,
    id,
    name: input.code,
    status: 'idle',
    currentWork: null,
  }),
});

export const machinesApi = {
  list: machines.list,
  create: machines.create,
  update: machines.update,
  remove: machines.remove,
  reset: machines.reset,
};
