import type { BuilderAction } from '../../types/actions';

export type ActionStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'aborted'
  | 'failed';

export type BaseActionState = BuilderAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
  output?: string;
  statusMessage?: string;
};

export type FailedActionState = BuilderAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

export type BaseActionUpdate = Partial<
  Pick<
    BaseActionState,
    'status' | 'abort' | 'executed' | 'output' | 'statusMessage'
  >
>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });
