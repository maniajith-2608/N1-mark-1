import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { AdminDrawerParamList } from '../dashboard/types';

export type MachineType =
  | 'cnc_lathe'
  | 'cnc_mill'
  | 'lathe'
  | 'welding'
  | 'inspection'
  | 'packing';
export type MachineStatus = 'running' | 'idle' | 'maintenance';

/** The job a machine is working on, as the shop-floor API reports it. */
export type MachineWork = {
  /** The work order's id. */
  workOrderId: string;
  /** Its number as people know it ("1042"); blank if it couldn't be read. */
  workOrderNumber: string;
  title: string;
  operator: string;
};

export type Machine = {
  id: string;
  code: string;
  name: string;
  model: string;
  type: MachineType;
  location: string;
  status: MachineStatus;
  currentWork: MachineWork | null;
  notes: string;
};

export type MachineInput = Pick<
  Machine,
  'name' | 'code' | 'model' | 'type' | 'location' | 'status' | 'notes'
>;

/** Multi-select list filters; an empty list shows every machine. */
export type MachineFilters = {
  status: MachineStatus[];
};

// Stack nested inside the admin drawer's "Machines" item.
export type MachinesStackParamList = {
  MachinesList: undefined;
  MachineDetails: { machineId: string };
};

export type MachinesNavigation =
  NativeStackNavigationProp<MachinesStackParamList>;

/** Screen props that can also reach the other admin drawer items. */
export type MachinesScreenProps<R extends keyof MachinesStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<MachinesStackParamList, R>,
    DrawerScreenProps<AdminDrawerParamList>
  >;
