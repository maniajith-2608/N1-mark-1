import {
  fetchAllNodes,
  fromWireEnum,
  graphqlRequest,
  toWireEnum,
} from '../../../services/api';
import { jobCardsApi } from '../../jobCards/api/jobCardsApi';
import type {
  Machine,
  MachineInput,
  MachineStatus,
  MachineType,
} from '../types';

// N1 Core API: machines / createMachine / updateMachine / deleteMachine on
// POST /graphql, plus jobCard for the WO number of each machine's current
// work.

const MACHINE_FIELDS = `
  fragment MachineFields on Machine {
    id name code model type location notes status
    currentWork { workOrderId title operator }
    currentAssignment { jobCardId }
  }
`;

type WireMachineType =
  | 'CNC_LATHE'
  | 'CNC_MILL'
  | 'LATHE'
  | 'WELDING'
  | 'INSPECTION'
  | 'PACKING';

// The API has no CNC or VMC type yet: CNC is stored as its CNC lathe and a VMC
// (a vertical mill) as its CNC mill. Its other kinds read as CNC.
const TYPE_TO_WIRE: Record<MachineType, WireMachineType> = {
  cnc: 'CNC_LATHE',
  lathe: 'LATHE',
  vmc: 'CNC_MILL',
};
const typeFromWire = (type: WireMachineType): MachineType =>
  type === 'LATHE' ? 'lathe' : type === 'CNC_MILL' ? 'vmc' : 'cnc';

type MachineNode = Omit<Machine, 'type' | 'status' | 'currentWork'> & {
  type: WireMachineType;
  status: Uppercase<MachineStatus>;
  currentWork: { workOrderId: string; title: string; operator: string } | null;
  currentAssignment: { jobCardId: string } | null;
};

/** "WO-12" → "12": the app writes work orders as "WO #12". */
const bareNumber = (number: string | null | undefined) =>
  (number ?? '').replace(/^WO-?/i, '');

/**
 * The WO numbers of the job cards the machines are running. Current work
 * only carries the order's id, so without this the list could only show a
 * UUID. Production runs only registered documents (backend N1C-031), so this
 * reuses the job card query, one request per card. Best effort: a card that
 * fails shows without a number.
 */
async function workOrderNumbers(
  nodes: readonly MachineNode[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      nodes.flatMap(n =>
        n.currentAssignment ? [n.currentAssignment.jobCardId] : [],
      ),
    ),
  ];
  const results = await Promise.allSettled(ids.map(id => jobCardsApi.get(id)));
  return new Map(
    results.flatMap(r =>
      r.status === 'fulfilled'
        ? [[r.value.id, bareNumber(r.value.number)] as const]
        : [],
    ),
  );
}

function toMachine(node: MachineNode, numbers: Map<string, string>): Machine {
  const { currentAssignment, currentWork, ...rest } = node;
  return {
    ...rest,
    type: typeFromWire(node.type),
    status: fromWireEnum<MachineStatus>(node.status),
    currentWork: currentWork && {
      ...currentWork,
      workOrderNumber: currentAssignment
        ? numbers.get(currentAssignment.jobCardId) ?? ''
        : '',
    },
  };
}

async function toMachines(nodes: MachineNode[]): Promise<Machine[]> {
  const numbers = await workOrderNumbers(nodes);
  return nodes.map(node => toMachine(node, numbers));
}

/**
 * The MachineInput for what was given. Status is only ever Idle or
 * Maintenance from the app: Running comes from a started step, and a new
 * machine starts Idle.
 */
function toWireInput(
  input: Partial<MachineInput>,
  name: string,
): Record<string, unknown> {
  const fields: Record<string, unknown> = { name };
  (['code', 'model', 'location', 'notes'] as const).forEach(key => {
    if (input[key] !== undefined) {
      // Text the API returns as non-null: "" clears it, null would not.
      fields[key] = input[key]!.trim();
    }
  });
  if (input.type !== undefined) {
    fields.type = TYPE_TO_WIRE[input.type];
  }
  return fields;
}

// Each machine's last-known name and status: the API needs the name on every
// update, and status is only sent when it changed. The form has no name, so
// the code (unique in the shop, like the name) is sent as the name.
const known = new Map<string, Pick<Machine, 'name' | 'status'>>();
const remember = (machine: Machine) => {
  known.set(machine.id, { name: machine.name, status: machine.status });
  return machine;
};

/** Every machine, by code. */
async function list(): Promise<Machine[]> {
  const nodes = await fetchAllNodes<MachineNode>(
    `query Machines($after: String) {
      machines(
        first: 100
        after: $after
        sort: { field: CODE, direction: ASC }
      ) {
        edges { node { ...MachineFields } }
        pageInfo { hasNextPage endCursor }
      }
    }
    ${MACHINE_FIELDS}`,
    'machines',
  );
  return (await toMachines(nodes)).map(remember);
}

async function create(input: MachineInput): Promise<Machine> {
  const data = await graphqlRequest<{ createMachine: MachineNode }>(
    `mutation CreateMachine($input: MachineInput!) {
      createMachine(input: $input) { ...MachineFields }
    }
    ${MACHINE_FIELDS}`,
    { input: toWireInput(input, input.code.trim()) },
  );
  return remember((await toMachines([data.createMachine]))[0]);
}

/**
 * updateMachine, with the status too when it changed (into or out of
 * maintenance). The API refuses maintenance while a step runs on the machine
 * (MACHINE_IN_USE).
 */
async function update(
  id: string,
  changes: Partial<MachineInput>,
): Promise<Machine> {
  const current = known.get(id);
  const input = toWireInput(
    changes,
    changes.code?.trim() || current?.name || '',
  );
  if (
    changes.status !== undefined &&
    changes.status !== 'running' &&
    changes.status !== current?.status
  ) {
    input.status = toWireEnum(changes.status);
  }
  const data = await graphqlRequest<{ updateMachine: MachineNode }>(
    `mutation UpdateMachine($id: ID!, $input: MachineInput!) {
      updateMachine(id: $id, input: $input) { ...MachineFields }
    }
    ${MACHINE_FIELDS}`,
    { id, input },
  );
  return remember((await toMachines([data.updateMachine]))[0]);
}

async function remove(id: string): Promise<string> {
  await graphqlRequest(
    `mutation DeleteMachine($id: ID!) { deleteMachine(id: $id) }`,
    { id },
  );
  known.delete(id);
  return id;
}

export const machinesApi = { list, create, update, remove };
