import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, type Variants } from 'framer-motion';
import React, { memo, type ReactNode } from 'react';
import { classNames } from '../../utils/classNames';
import { cubicEasingFn } from '../../utils/easings';
import { IconButton } from './UiIconButton';

export {
  Close as DialogClose,
  Root as DialogRoot,
} from '@radix-ui/react-dialog';

const transition = {
  duration: 0.15,
  ease: cubicEasingFn,
};

export const dialogBackdropVariants = {
  closed: {
    opacity: 0,
    transition,
  },
  open: {
    opacity: 1,
    transition,
  },
} satisfies Variants;

export const dialogVariants = {
  closed: {
    x: '-50%',
    y: '-40%',
    scale: 0.96,
    opacity: 0,
    transition,
  },
  open: {
    x: '-50%',
    y: '-50%',
    scale: 1,
    opacity: 1,
    transition,
  },
} satisfies Variants;

interface DialogButtonProps {
  type: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  onClick?: (event: React.UIEvent) => void;
}

export const DialogButton = memo(
  ({ type, children, onClick }: DialogButtonProps) => {
    return (
      <button
        className={classNames(
          'inline-flex h-[35px] items-center justify-center rounded-lg px-4 text-sm leading-none focus:outline-none',
          {
            'bg-blue-500 text-(--d-admin-text-color) hover:bg-blue-600':
              type === 'primary',
            'bg-gray-100 text-(--d-admin-text-color) hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700':
              type === 'secondary',
            'bg-red-500 text-(--d-admin-text-color) hover:bg-red-600':
              type === 'danger',
          },
        )}
        onClick={onClick}
      >
        {children}
      </button>
    );
  },
);

export const DialogTitle = memo(
  ({ className, children, ...props }: RadixDialog.DialogTitleProps) => {
    return (
      <RadixDialog.Title
        className={classNames(
          'flex items-center justify-between border-b border-gray-200 px-5 py-4 text-lg leading-6 font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Title>
    );
  },
);

export const DialogDescription = memo(
  ({ className, children, ...props }: RadixDialog.DialogDescriptionProps) => {
    return (
      <RadixDialog.Description
        className={classNames(
          'text-md px-5 py-4 text-gray-600 dark:text-gray-400',
          className,
        )}
        {...props}
      >
        {children}
      </RadixDialog.Description>
    );
  },
);

interface DialogProps {
  children: ReactNode | ReactNode[];
  className?: string;
  onBackdrop?: (event: React.UIEvent) => void;
  onClose?: (event: React.UIEvent) => void;
}

export const Dialog = memo(
  ({ className, children, onBackdrop, onClose }: DialogProps) => {
    return (
      <RadixDialog.Portal>
        <RadixDialog.Overlay onClick={onBackdrop} asChild>
          <motion.div
            className="z-max fixed inset-0 bg-black/50"
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogBackdropVariants}
          />
        </RadixDialog.Overlay>
        <RadixDialog.Content asChild>
          <motion.div
            className={classNames(
              'z-max fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-lg border border-gray-200 shadow-xl focus:outline-none dark:border-gray-800 dark:bg-zinc-900',
              className,
            )}
            initial="closed"
            animate="open"
            exit="closed"
            variants={dialogVariants}
          >
            {children}
            <RadixDialog.Close asChild onClick={onClose}>
              <IconButton
                icon="ph:x"
                className="absolute top-[10px] right-[10px]"
              />
            </RadixDialog.Close>
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    );
  },
);
