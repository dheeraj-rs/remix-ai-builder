'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import { useDeployment } from '../../hooks/useDeployment';
import { useFilesStore } from '../../stores/zustand';
import {
  extractFilesForDeployment,
  validateDeploymentFiles,
} from '../../lib/utils/extractFiles';
import {
  Rocket,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  GitBranch,
  ArrowLeft,
  X,
} from 'lucide-react';

const DEPLOYMENT_STEPS = [
  { id: 1, label: 'Initiating deployment...', duration: 1000 },
  { id: 2, label: 'Building project files...', duration: 2000 },
  { id: 3, label: 'Optimizing assets...', duration: 1500 },
  { id: 4, label: 'Uploading to Vercel...', duration: 2000 },
  { id: 5, label: 'Finalizing deployment...', duration: 1000 },
];

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string;
}

function generateProjectName() {
  const uniqueSuffix = Math.random().toString(36).substring(2, 7);
  return `my-website-${uniqueSuffix}`;
}

export default function DeploymentModal({
  isOpen,
  onClose,
}: DeploymentModalProps) {
  const files = useFilesStore((state) => state.files);
  const {
    status,
    deploymentUrl,
    errorMessage,
    currentStep,
    progress,
    deploy,
    reset,
  } = useDeployment();

  const initializedRef = useRef(false);

  const [projectName, setProjectName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [framework, setFramework] = useState('other');
  const [rootDirectory, setRootDirectory] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [outputDirectory, setOutputDirectory] = useState('');
  const [installCommand, setInstallCommand] = useState('');
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setProjectName(generateProjectName());
        setShowAdvanced(false);
        setFramework('other');
        setRootDirectory('');
        setBuildCommand('');
        setOutputDirectory('');
        setInstallCommand('');
        setEnvVars([]);
      }
    } else {
      initializedRef.current = false;
    }
  }, [isOpen]);

  const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setProjectName(sanitized);
  };

  const handleClearProjectName = () => {
    setProjectName('');
  };

  const handleDeploy = async () => {
    if (!projectName.trim() || fileCount === 0) return;

    try {
      const deploymentFiles = extractFilesForDeployment(files);
      const validation = validateDeploymentFiles(deploymentFiles);

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      await deploy(deploymentFiles, {
        projectName: projectName.trim(),
        framework: showAdvanced && framework !== 'other' ? framework : null,
        rootDirectory: showAdvanced ? rootDirectory : null,
        buildCommand: showAdvanced ? buildCommand : null,
        outputDirectory: showAdvanced ? outputDirectory : null,
        installCommand: showAdvanced ? installCommand : null,
        envVars: showAdvanced ? envVars : [],
      });
    } catch (error: any) {
      console.error('Deployment error:', error);
    }
  };

  const handleClose = () => {
    if (status !== 'deploying') {
      reset();
      onClose();
    }
  };

  const handleBackToBuilder = () => {
    reset();
    onClose();
  };

  const fileCount = Object.keys(files).filter(
    (path) => files[path]?.type !== 'folder',
  ).length;

  const isDeployDisabled = !projectName.trim() || fileCount === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      showCloseButton={status !== 'deploying'}
    >
      {status === 'idle' && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--d-admin-surface-section)] border border-[var(--d-admin-surface-border)]">
              <Rocket className="h-5 w-5 text-[var(--d-admin-surface-text-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--d-admin-surface-text-primary)]">
                Deploy to Vercel
              </h2>
              <p className="text-xs text-[var(--d-admin-surface-text-secondary)]">
                Deploy your website to a global edge network
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--d-admin-surface-border)]" />
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--d-admin-surface-text-primary)]">
              Project Name
            </label>
            <div className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={projectName}
                  onChange={handleProjectNameChange}
                  placeholder="my-awesome-website"
                  className="w-full rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] px-3 py-2 pr-8 text-sm text-[var(--d-admin-surface-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--d-admin-primary-color)]"
                />
                {projectName && (
                  <button
                    type="button"
                    onClick={handleClearProjectName}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--d-admin-surface-text-secondary)] hover:text-[var(--d-admin-surface-text-primary)] transition-colors"
                    title="Clear project name"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] px-3 py-2 text-sm text-[var(--d-admin-surface-text-secondary)] shrink-0">
                .vercel.app
              </div>
            </div>
            {!projectName.trim() && (
              <p className="mt-1.5 text-xs text-amber-500">
                Project name is required to deploy.
              </p>
            )}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[var(--d-admin-primary-color)]">
              Project Stats
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] p-3 text-center">
                <div className="text-xl font-bold text-blue-500">
                  {fileCount}
                </div>
                <div className="mt-0.5 text-xs text-[var(--d-admin-surface-text-secondary)]">
                  Files
                </div>
              </div>
              <div className="rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] p-3 text-center">
                <div className="text-xl font-bold text-green-500">
                  {Object.keys(files).filter((p) => p.endsWith('.html')).length}
                </div>
                <div className="mt-0.5 text-xs text-[var(--d-admin-surface-text-secondary)]">
                  HTML
                </div>
              </div>
              <div className="rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] p-3 text-center">
                <div className="text-xl font-bold text-purple-500">
                  {
                    Object.keys(files).filter(
                      (p) => p.endsWith('.css') || p.endsWith('.scss'),
                    ).length
                  }
                </div>
                <div className="mt-0.5 text-xs text-[var(--d-admin-surface-text-secondary)]">
                  CSS
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--d-admin-surface-border)]" />
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={showAdvanced}
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  showAdvanced
                    ? 'bg-[var(--d-admin-primary-color)]'
                    : 'bg-[var(--d-admin-surface-section)]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    showAdvanced ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <label
                className="cursor-pointer text-sm font-medium text-[var(--d-admin-primary-color)]"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                Advanced Configuration
              </label>
            </div>

            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] p-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--d-admin-surface-text-primary)]">
                    Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] px-3 py-2 text-sm text-[var(--d-admin-surface-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--d-admin-primary-color)]"
                  >
                    <option value="html">HTML (Static)</option>
                    <option value="nextjs">Next.js</option>
                    <option value="vite">Vite</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-[var(--d-admin-surface-border)]" />
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] px-4 py-2.5 text-sm font-semibold text-[var(--d-admin-surface-text-primary)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeployDisabled}
              title={
                fileCount === 0
                  ? 'No files found. Please generate a website first.'
                  : !projectName.trim()
                    ? 'Enter a project name to deploy.'
                    : 'Deploy to Vercel'
              }
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-transparent bg-[var(--d-admin-primary-color)] px-4 py-2.5 text-sm font-semibold text-[var(--d-admin-primary-text)] transition-colors hover:bg-[var(--d-admin-primary-color)]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Rocket className="h-4 w-4" />
              Deploy to Vercel
            </button>
          </div>
          {fileCount === 0 && (
            <p className="text-center text-sm text-amber-500">
              No files found. Please generate a website first.
            </p>
          )}
        </div>
      )}
      {status === 'deploying' && (
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--d-admin-surface-text-primary)]">
              Deploying to Vercel
            </h2>
            <p className="text-sm text-[var(--d-admin-surface-text-secondary)]">
              Please wait while we build and deploy your application
            </p>
          </div>
          <div className="mx-auto w-full max-w-md space-y-3">
            {DEPLOYMENT_STEPS.map((step) => {
              const isDone = currentStep > step.id;
              const isActive = currentStep === step.id;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                      isDone
                        ? 'bg-green-500'
                        : isActive
                          ? 'bg-blue-500'
                          : 'bg-[var(--d-admin-surface-border)]'
                    }`}
                  >
                    {isDone && <CheckCircle2 className="h-4 w-4 text-white" />}
                    {isActive && (
                      <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      currentStep >= step.id
                        ? 'font-medium text-[var(--d-admin-surface-text-primary)]'
                        : 'text-[var(--d-admin-surface-text-secondary)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mx-auto w-full max-w-md">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--d-admin-surface-border)]">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {status === 'success' && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--d-admin-surface-text-primary)]">
              Deployment Successful!
            </h2>
            <p className="text-sm text-[var(--d-admin-surface-text-secondary)]">
              Your website is now live on Vercel
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--d-admin-surface-text-secondary)]">
                Deployment URL
              </label>
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--d-admin-primary-color)] hover:underline"
              >
                {deploymentUrl.replace('https://', '')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--d-admin-surface-text-secondary)]">
                  Status
                </label>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-[var(--d-admin-surface-text-primary)]">
                    Ready
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--d-admin-surface-text-secondary)]">
                  Source
                </label>
                <div className="flex items-center gap-2 text-sm text-[var(--d-admin-surface-text-primary)]">
                  <GitBranch className="h-3 w-3" />
                  <span>main</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBackToBuilder}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] px-4 py-2.5 text-sm font-semibold text-[var(--d-admin-primary-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Builder
            </button>
            <a
              href={deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-transparent bg-[var(--d-admin-primary-color)] px-4 py-2.5 text-center text-sm font-semibold text-[var(--d-admin-primary-text)] transition-colors hover:bg-[var(--d-admin-primary-color)]/90"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Website
            </a>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[var(--d-admin-surface-text-primary)]">
              Deployment Failed
            </h2>
            <p className="text-sm text-[var(--d-admin-surface-text-secondary)]">
              We encountered an error while deploying
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-sm text-red-500">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBackToBuilder}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] px-4 py-2.5 text-sm font-semibold text-[var(--d-admin-primary-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Builder
            </button>
            <button
              onClick={reset}
              className="flex-1 rounded-md border border-transparent bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
