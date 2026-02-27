'use client';

import { useCallback } from 'react';

import { useDeploymentStore } from '../stores/deployment-store';

interface DeploymentConfig {
  projectName: string;
  framework?: string | null;
  rootDirectory?: string | null;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  installCommand?: string | null;
  envVars?: { key: string; value: string }[];
}

interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  teamId?: string;
  url?: string;
  error?: string;
}

export type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';

export function useDeployment() {
  const {
    status,
    deploymentUrl,
    errorMessage,
    currentStep,
    progress,
    setStatus,
    setDeploymentUrl,
    setErrorMessage,
    setCurrentStep,
    setProgress,
    reset,
  } = useDeploymentStore();

  const pollDeploymentStatus = useCallback(
    async (deploymentId: string, teamId?: string) => {
      const pollInterval = setInterval(async () => {
        try {
          const url = teamId
            ? `/api/deploy/status?id=${deploymentId}&teamId=${teamId}`
            : `/api/deploy/status?id=${deploymentId}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.success) {
            if (data.status === 'QUEUED' || data.status === 'INITIALIZING') {
              setCurrentStep(1);
              setProgress(10);
            } else if (
              data.status === 'BUILDING' ||
              data.status === 'ANALYZING'
            ) {
              setCurrentStep(2);
              const currentProgress = useDeploymentStore.getState().progress;
              setProgress(Math.min(currentProgress + 5, 60));
            } else if (data.status === 'DEPLOYING') {
              setCurrentStep(4);
              setProgress(80);
            } else if (data.status === 'READY') {
              clearInterval(pollInterval);
              setCurrentStep(6);
              setProgress(100);

              setTimeout(() => {
                setStatus('success');
                setDeploymentUrl(data.url);
              }, 1000);
            } else if (data.status === 'ERROR' || data.status === 'CANCELED') {
              clearInterval(pollInterval);
              setStatus('error');
              setErrorMessage('Deployment failed or was canceled by Vercel.');
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 1000);

      return () => clearInterval(pollInterval);
    },
    [setCurrentStep, setProgress, setStatus, setDeploymentUrl, setErrorMessage],
  );

  const deploy = useCallback(
    async (files: any[], config: DeploymentConfig) => {
      setStatus('deploying');
      setErrorMessage('');
      setCurrentStep(1);
      setProgress(5);

      try {
        const response = await fetch('/api/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectName: config.projectName,
            files,
            framework: config.framework,
            rootDirectory: config.rootDirectory,
            buildCommand: config.buildCommand,
            outputDirectory: config.outputDirectory,
            installCommand: config.installCommand,
            envVars: config.envVars || [],
          }),
        });

        const result: DeploymentResult = await response.json();

        if (response.ok && result.success && result.deploymentId) {
          await pollDeploymentStatus(result.deploymentId, result.teamId);
        } else {
          throw new Error(result.error || 'Deployment failed');
        }
      } catch (error: any) {
        console.error('Deployment error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An error occurred during deployment');
      }
    },
    [
      pollDeploymentStatus,
      setStatus,
      setErrorMessage,
      setCurrentStep,
      setProgress,
    ],
  );

  return {
    status,
    deploymentUrl,
    errorMessage,
    currentStep,
    progress,
    deploy,
    reset,
  };
}
