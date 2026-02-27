import { memo } from 'react';
import { classNames } from '../../utils/classNames';

interface PanelHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const PanelHeader = memo(({ className, children }: PanelHeaderProps) => {
  return (
    <div
      className={classNames(
        'bg-surface-b text-text-secondary flex min-h-[34px] items-center gap-2 border-b border-[var(--d-admin-surface-border)] px-4 py-1 text-sm',
        className,
      )}
    >
      {children}
    </div>
  );
});
