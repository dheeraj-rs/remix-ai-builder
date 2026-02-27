import { memo } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Icon } from '@iconify/react';
import type { PreviewInfo } from '../../stores/previews';

interface PortDropdownProps {
  activePreviewIndex: number;
  setActivePreviewIndex: (index: number) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (value: boolean) => void;
  setHasSelectedPreview: (value: boolean) => void;
  previews: PreviewInfo[];
}

export const PortDropdown = memo(
  ({
    activePreviewIndex,
    setActivePreviewIndex,
    isDropdownOpen,
    setIsDropdownOpen,
    setHasSelectedPreview,
    previews,
  }: PortDropdownProps) => {
    const allReadyPreviews = previews
      .map((previewInfo, index) => ({ ...previewInfo, index }))
      .filter((preview) => preview.ready);
    const sortedPreviews = allReadyPreviews.sort((a, b) => a.port - b.port);

    return (
      <DropdownMenu.Root open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            className="flex items-center gap-2 rounded-md bg-transparent p-1 text-gray-500 outline-none hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-200"
            onClick={(e) => {
              // Trigger automatically handles click, but we want to toggle.
              // Controlled state handling needs care. Radix Trigger toggles automatically.
            }}
          >
            <Icon icon="ph:plug" className="text-xl" />
            <span className="text-text text-sm font-medium">
              {previews[activePreviewIndex]?.port}
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="data-[side=top]:animate-slide-up-fade data-[side=right]:animate-slide-right-fade data-[side=bottom]:animate-slide-down-fade data-[side=left]:animate-slide-left-fade z-[9999] min-w-[140px] overflow-hidden rounded border border-[var(--d-admin-surface-border)] bg-[var(--d-admin-surface-section)] p-1 shadow-sm"
            align="end"
            sideOffset={5}
          >
            <div className="mb-1 border-b border-[var(--d-admin-surface-border)] px-2 py-1.5 text-xs font-semibold text-[var(--d-admin-text-color)]">
              Ports
            </div>
            {sortedPreviews.map((preview) => (
              <DropdownMenu.Item
                key={preview.port}
                className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-[var(--d-admin-text-color)] outline-none data-[highlighted]:bg-[var(--d-admin-surface-hover)]"
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <div
                  className="flex flex-1 items-center gap-2"
                  onClick={() => {
                    setActivePreviewIndex(preview.index);
                    setHasSelectedPreview(true);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span
                    className={
                      activePreviewIndex === preview.index
                        ? 'text-[var(--d-admin-primary-color)]'
                        : 'text-[var(--d-admin-text-color-secondary)]'
                    }
                  >
                    {preview.port}
                  </span>
                  {activePreviewIndex === preview.index && (
                    <Icon
                      icon="ph:check"
                      className="text-[var(--d-admin-primary-color)]"
                    />
                  )}
                </div>

                <button
                  className="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-red-500/10 hover:text-red-500 text-text-tertiary"
                  title="Kill Port"
                  onClick={async (e) => {
                    e.stopPropagation();
                  }}
                >
                  <Icon icon="ph:trash" />
                </button>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    );
  },
);
