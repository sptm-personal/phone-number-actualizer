import { WorkerAction } from './WorkerAction';
import { WorkerApplication } from './WorkerApplication';

type WorkerData = {
  action: WorkerAction;
  channel: string;
  application: WorkerApplication;
  callerId: number;
};

export { WorkerData };
