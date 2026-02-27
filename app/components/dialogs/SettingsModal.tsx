import { useState } from 'react';
import Modal from '../ui/Modal';
import {
  Settings,
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  Globe,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/zustand';
import { Icon } from '@iconify/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'api-keys';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('api-keys');
  const { apiKeys, setApiKey } = useSettingsStore();

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [tempKeys, setTempKeys] = useState<Record<string, string>>({});

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const API_PROVIDERS = [
    {
      id: 'google',
      name: 'Google Gemini',
      icon: 'logos:google-gemini',
      description: 'Used for the primary chat and reasoning models.',
      getKeyUrl: 'https://aistudio.google.com/app/apikey',
      isSet: !!apiKeys.google,
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: 'logos:anthropic-icon',
      description: 'Optional. Access to Claude 3.5 Sonnet and Opus.',
      getKeyUrl: 'https://console.anthropic.com/settings/keys',
      isSet: !!apiKeys.anthropic,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: 'logos:openai-icon',
      description: 'Optional. Access to TCP-4o and other OpenAI models.',
      getKeyUrl: 'https://platform.openai.com/api-keys',
      isSet: !!apiKeys.openai,
    },
    {
      id: 'vercel',
      name: 'Vercel Token',
      icon: 'logos:vercel-icon',
      description: 'Required for deploying your project to the web.',
      getKeyUrl: 'https://vercel.com/account/tokens',
      isSet: !!apiKeys.vercel,
    },
  ] as const;

  const handleSave = (providerId: string) => {
    const value = tempKeys[providerId];
    if (value) {
      setApiKey(providerId as any, value);
      setTempKeys((prev) => ({ ...prev, [providerId]: '' }));
    }
  };

  const handleRemove = (providerId: string) => {
    setApiKey(providerId as any, '');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Settings">
      <div className="flex flex-col md:flex-row h-[70vh] md:h-[500px] w-full gap-4 md:gap-6">
        <div className="flex w-full md:w-48 shrink-0 flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible border-b md:border-b-0 md:border-r border-[var(--d-admin-surface-border)] pb-4 md:pb-0 md:pr-4 no-scrollbar">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex flex-1 md:flex-none items-center justify-center md:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[var(--d-admin-surface-hover)] text-[var(--d-admin-text-color)]'
                : 'text-[var(--d-admin-text-color-secondary)] hover:bg-[var(--d-admin-surface-hover)] hover:text-[var(--d-admin-text-color)]'
            }`}
          >
            <Settings className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`flex flex-1 md:flex-none items-center justify-center md:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'api-keys'
                ? 'bg-[var(--d-admin-surface-hover)] text-[var(--d-admin-text-color)]'
                : 'text-[var(--d-admin-text-color-secondary)] hover:bg-[var(--d-admin-surface-hover)] hover:text-[var(--d-admin-text-color)]'
            }`}
          >
            <Key className="h-4 w-4" />
            API Keys
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {activeTab === 'general' && (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
              <div className="rounded-full bg-[var(--d-admin-surface-section)] p-4">
                <Settings className="h-8 w-8 text-[var(--d-admin-text-color-secondary)]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[var(--d-admin-text-color)]">
                  General Settings
                </h3>
                <p className="mt-1 text-sm text-[var(--d-admin-text-color-secondary)]">
                  Adjust standard editor preferences here.
                </p>
              </div>
              <div className="rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-4 text-sm text-[var(--d-admin-text-color-secondary)]">
                More settings coming soon...
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-[var(--d-admin-text-color)]">
                  API Configuration
                </h3>
                <p className="mt-1 text-sm text-[var(--d-admin-text-color-secondary)]">
                  Manage your API keys for AI providers and deployment services.
                  Keys are stored locally in your browser.
                </p>
              </div>

              <div className="space-y-4">
                {API_PROVIDERS.map((provider) => (
                  <div
                    key={provider.id}
                    className="group rounded-lg border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-ground)] p-4 transition-colors hover:border-[var(--d-admin-surface-hover)]"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--d-admin-surface-section)]">
                          <Icon icon={provider.icon} className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="flex items-center gap-2 font-medium text-[var(--d-admin-text-color)]">
                            {provider.name}
                            {provider.isSet && (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </h4>
                          <p className="text-xs text-[var(--d-admin-text-color-secondary)]">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      <a
                        href={provider.getKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--d-admin-primary-color)] hover:bg-[var(--d-admin-surface-hover)]"
                      >
                        Get Key
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={
                            provider.isSet
                              ? apiKeys[provider.id as keyof typeof apiKeys]
                              : tempKeys[provider.id] || ''
                          }
                          onChange={(e) =>
                            setTempKeys((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          disabled={provider.isSet}
                          placeholder={
                            provider.isSet
                              ? 'Key is set (remove to update)'
                              : `Enter ${provider.name} ${provider.id === 'vercel' ? 'Token' : 'Key'}`
                          }
                          className="w-full rounded-md border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] py-2 pl-3 pr-10 text-sm text-[var(--d-admin-text-color)] placeholder-[var(--d-admin-text-color-secondary)] focus:border-[var(--d-admin-primary-color)] focus:outline-none focus:ring-1 focus:ring-[var(--d-admin-primary-color)] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowKey(provider.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--d-admin-text-color-secondary)] hover:text-[var(--d-admin-text-color)]"
                        >
                          {showKeys[provider.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {provider.isSet ? (
                        <button
                          onClick={() => handleRemove(provider.id)}
                          className="flex items-center gap-2 rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 border border-red-500/20"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSave(provider.id)}
                          disabled={!tempKeys[provider.id]}
                          className="flex items-center gap-2 rounded-md bg-[var(--d-admin-surface-section)] px-4 py-2 text-sm font-medium text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)] border border-[var(--d-admin-surface-border)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    {provider.isSet && (
                      <p className="mt-2 text-xs text-[var(--d-admin-text-color-secondary)] flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {provider.name} is active and will be used for relevant
                        tasks.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md bg-blue-500/10 p-3 text-xs text-blue-500">
                <p className="flex items-center gap-2 font-medium">
                  <Globe className="h-3.5 w-3.5" />
                  Open Source Privacy Note
                </p>
                <p className="mt-1 opacity-90">
                  Your keys are stored locally in your browser's Local Storage.
                  They are never sent to any server other than the respective
                  API providers (Google, Anthropic, OpenAI, Vercel) when making
                  requests.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
