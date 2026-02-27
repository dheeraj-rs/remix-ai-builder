import { WebContainer } from '@webcontainer/api';
import { useWorkbenchStore } from '../../stores/zustand';
import type { ActionCallbackData } from './message-parser';
import { unreachable } from '../../utils/unreachable';
import { createScopedLogger } from '../../utils/logger';
import type { ActionState, ActionStateUpdate } from './action-types';
export type * from './action-types';
import { runShellAction } from './action-shell';
import { runFileAction } from './action-file';

const logger = createScopedLogger('ActionRunner');

// ============================================================================
// ACTION RUNNER CLASS
// ============================================================================

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #artifactId: string;
  #projectSwitched = false;

  constructor(webcontainerPromise: Promise<WebContainer>, artifactId: string) {
    this.#webcontainer = webcontainerPromise;
    this.#artifactId = artifactId;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const artifact = useWorkbenchStore.getState().artifacts[this.#artifactId];
    const actions = artifact?.actions || {};
    const action = actions[actionId];

    if (action) return;

    const abortController = new AbortController();

    const newAction: ActionState = {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
      output: '',
    };

    this.#updateArtifactActions({ ...actions, [actionId]: newAction });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData) {
    const { actionId } = data;
    const actions =
      useWorkbenchStore.getState().artifacts[this.#artifactId]?.actions || {};
    const action = actions[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return;
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: true });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        logger.error('Action failed:', error);
      });
  }

  async retryAction(actionId: string) {
    const actions =
      useWorkbenchStore.getState().artifacts[this.#artifactId]?.actions || {};
    const action = actions[actionId];

    if (!action) {
      logger.error(`Action ${actionId} not found`);
      return;
    }

    this.#updateAction(actionId, {
      status: 'pending',
      output: '',
      error: undefined,
    } as any);

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        logger.error('Retry failed:', error);
      });
  }

  async #executeAction(actionId: string) {
    const actions =
      useWorkbenchStore.getState().artifacts[this.#artifactId]?.actions || {};
    const action = actions[actionId];

    if (!action) {
      logger.warn(`Action ${actionId} not found, skipping execution`);
      return;
    }

    logger.info(`Executing action ${actionId}, type: ${action.type}`);
    console.time(`[ActionRunner] Action ${actionId}`);

    this.#updateAction(actionId, { status: 'running' });

    const self = this;

    try {
      switch (action.type) {
        case 'shell': {
          await runShellAction({
            action,
            actionId,
            webcontainerPromise: this.#webcontainer,
            updateAction: (id, newState) => this.#updateAction(id, newState),
            projectContext: {
              get switched() {
                return self.#projectSwitched;
              },
              set switched(val: boolean) {
                self.#projectSwitched = val;
              },
            },
          });
          break;
        }
        case 'file': {
          await runFileAction(action, this.#webcontainer);
          break;
        }
      }

      console.timeEnd(`[ActionRunner] Action ${actionId}`);
      this.#updateAction(actionId, {
        status: action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error: any) {
      console.timeEnd(`[ActionRunner] Action ${actionId}`);
      logger.warn(`Action ${actionId} failed:`, error);

      this.#updateAction(actionId, {
        status: 'failed',
        error: error.message || 'Action failed',
      });
    }
  }

  // ==========================================================================
  // STATE MANAGEMENT HELPERS
  // ==========================================================================

  #updateAction(id: string, newState: ActionStateUpdate) {
    const artifact = useWorkbenchStore.getState().artifacts[this.#artifactId];
    const actions = artifact?.actions || {};
    this.#updateArtifactActions({
      ...actions,
      [id]: { ...actions[id]!, ...newState } as ActionState,
    });
  }

  #updateArtifactActions(actions: Record<string, ActionState>) {
    const artifact = useWorkbenchStore.getState().artifacts[this.#artifactId];
    if (artifact) {
      useWorkbenchStore
        .getState()
        .setArtifact(this.#artifactId, { ...artifact, actions });
    }
  }
}
