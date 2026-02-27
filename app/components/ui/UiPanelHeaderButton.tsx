import { memo } from 'react';
import { classNames } from '../../utils/classNames';

interface PanelHeaderButtonProps {
  className?: string;
  disabledClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const PanelHeaderButton = memo(
  ({
    className,
    disabledClassName,
    disabled = false,
    children,
    onClick,
  }: PanelHeaderButtonProps) => {
    return (
      <button
        className={classNames(
          'text-text-secondary enabled:hover:text-text enabled:hover:bg-surface-c flex shrink-0 items-center gap-1.5 rounded-md bg-transparent px-1.5 py-0.5 disabled:cursor-not-allowed',
          {
            [classNames('opacity-30', disabledClassName)]: disabled,
          },
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          if (disabled) {
            return;
          }

          onClick?.(event);
        }}
      >
        {children}
      </button>
    );
  },
);
