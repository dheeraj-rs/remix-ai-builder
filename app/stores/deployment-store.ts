import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';

interface DeploymentState {
  status: DeploymentStatus;
  deploymentUrl: string;
  errorMessage: string;
  currentStep: number;
  progress: number;

  setStatus: (status: DeploymentStatus) => void;
  setDeploymentUrl: (url: string) => void;
  setErrorMessage: (message: string) => void;
  setCurrentStep: (step: number) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
}

export const useDeploymentStore = create<DeploymentState>()(
  devtools(
    persist(
      (set) => ({
        status: 'idle',
        deploymentUrl: '',
        errorMessage: '',
        currentStep: 0,
        progress: 0,
        setStatus: (status) => set({ status }),
        setDeploymentUrl: (url) => set({ deploymentUrl: url }),
        setErrorMessage: (message) => set({ errorMessage: message }),
        setCurrentStep: (step) => set({ currentStep: step }),
        setProgress: (progress) => set({ progress }),
        reset: () =>
          set({
            status: 'idle',
            deploymentUrl: '',
            errorMessage: '',
            currentStep: 0,
            progress: 0,
          }),
      }),
      {
        name: 'd-admin-deployment-storage',
        partialize: (state) => ({
          status: state.status,
          deploymentUrl: state.deploymentUrl,
        }),
      },
    ),
    { name: 'DeploymentStore' },
  ),
);
