import type React from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { JobCardDetailsScreen } from '../../features/jobCards';
import {
  AssignMachineScreen,
  DrawingScreen,
  EnterJobCodeScreen,
  ImportOrderScreen,
  OperatorJobScreen,
  OrderDetailsModalScreen,
  QcCheckScreen,
  QcFailScreen,
  RawMaterialScreen,
  ScanJobScreen,
} from '../../features/jobs';
import type { RoleStackParamList } from './types';

/** A screen a role opens over its home. */
export type RoleScreen = {
  name: Exclude<keyof RoleStackParamList, 'Home' | 'Profile'>;
  // Screens come typed for the navigator they were built for; any stack that
  // registers the same route names and params can host them.
  component: React.ComponentType<any>;
  options?: NativeStackNavigationOptions;
};

// Slides up from the bottom and closes downwards.
const MODAL: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
};

// Covers the whole screen, sliding up from the bottom.
const FULL_SCREEN_MODAL: NativeStackNavigationOptions = {
  presentation: 'fullScreenModal',
  animation: 'slide_from_bottom',
};

// The drawing opens full screen over the job or order it came from.
const DRAWING: RoleScreen = {
  name: 'Drawing',
  component: DrawingScreen,
  options: FULL_SCREEN_MODAL,
};

// Supervisor: import a job (scan / code → order → raw material modal →
// job card) and manage its job card. Job card and flow reuse the admin screens' phone layouts.
export const SUPERVISOR_SCREENS: RoleScreen[] = [
  { name: 'ScanJob', component: ScanJobScreen },
  { name: 'EnterJobCode', component: EnterJobCodeScreen },
  { name: 'ImportOrder', component: ImportOrderScreen },
  { name: 'RawMaterial', component: RawMaterialScreen, options: MODAL },
  { name: 'JobCardDetails', component: JobCardDetailsScreen },
  DRAWING,
];

// Operator: import a job (scan / code) straight to its Job Detail,
// then start (after Assign Machine), pause and complete operations.
export const OPERATOR_SCREENS: RoleScreen[] = [
  { name: 'ScanJob', component: ScanJobScreen },
  { name: 'EnterJobCode', component: EnterJobCodeScreen },
  { name: 'OperatorJob', component: OperatorJobScreen },
  { name: 'AssignMachine', component: AssignMachineScreen },
  {
    name: 'OrderDetails',
    component: OrderDetailsModalScreen,
    options: FULL_SCREEN_MODAL,
  },
  DRAWING,
];

// QC: import a job (scan / code) into the open tab's QC Check, then pass it,
// or fail it with remarks.
export const QC_SCREENS: RoleScreen[] = [
  { name: 'ScanJob', component: ScanJobScreen },
  { name: 'EnterJobCode', component: EnterJobCodeScreen },
  { name: 'QcCheck', component: QcCheckScreen },
  { name: 'QcFail', component: QcFailScreen },
  {
    name: 'OrderDetails',
    component: OrderDetailsModalScreen,
    options: FULL_SCREEN_MODAL,
  },
  DRAWING,
];
