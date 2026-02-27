import { Icon } from '@iconify/react';
export type ModelProvider = 'anthropic' | 'google' | 'openai';

interface ModelSelectorProps {
  value: ModelProvider;
  handleSelectModel: (value: ModelProvider) => void;
  className?: string;
}

export const MODELS = [
  {
    value: 'google' as const,
    label: 'Gemini 3 Pro',
    icon: 'logos:google-gemini',
  },
  {
    value: 'anthropic' as const,
    label: 'Claude 4.5 Sonnet',
    icon: 'logos:claude-icon',
  },
  {
    value: 'openai' as const,
    label: 'OpenAI (GPT-4o)',
    icon: 'logos:openai-icon',
  },
];

export function ModelSelector({
  value,
  handleSelectModel,
  className,
}: ModelSelectorProps) {
  return (
    <div className="animate-in fade-in zoom-in-95 absolute bottom-full left-0 z-50 mb-2 w-64 origin-bottom-left overflow-hidden rounded-xl border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-1 shadow-lg duration-100">
      <div className="flex flex-col gap-0.5">
        <div className="px-2 py-1.5 text-xs font-medium text-[var(--d-admin-gray-600)]">
          AI Agent Model
        </div>

        {MODELS.map((model) => (
          <button
            key={model.value}
            value={model.value}
            onClick={() => handleSelectModel(model.value)}
            className="flex w-full items-center gap-2 rounded-lg bg-[var(--d-admin-surface-hover)]/50 px-2 py-1.5 text-left text-sm text-[var(--d-admin-text-color)] transition-colors hover:bg-[var(--d-admin-surface-hover)]"
          >
            <Icon icon={model.icon} className="text-lg" />
            <div className="flex flex-col">
              <span>{model.label}</span>
              <span className="text-[10px] text-[var(--d-admin-gray-600)]">
                Most intelligent model
              </span>
            </div>
            {value === model.value && (
              <Icon
                icon="ph:check"
                className="ml-auto text-[var(--d-admin-text-color-secondary)]"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
