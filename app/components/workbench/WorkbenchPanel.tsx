import { useIsMobile } from '~/core/hooks/use-mobile';
import { Workbench } from './Workbench.client';

export function WorkbenchPanel() {
  const isMobile = useIsMobile();

  return (
    <div className="z-workbench h-full w-full">
      <div
        className={`relative h-full flex-1 overflow-hidden ${isMobile ? 'border-t border-[var(--d-admin-surface-border)]' : 'border-l border-[var(--d-admin-surface-border)]'}`}
      >
        <Workbench isStreaming={false} />
      </div>
    </div>
  );
}
