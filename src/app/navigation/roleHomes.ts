import type React from 'react';
import { MyJobsScreen, QcListScreen } from '../../features/jobs';

// Each role's home: its jobs screen, under the header whose initials open
// Profile. There's no tab bar.
export const SUPERVISOR_HOME: React.ComponentType = MyJobsScreen;
export const OPERATOR_HOME: React.ComponentType = MyJobsScreen;
export const QC_HOME: React.ComponentType = QcListScreen;
