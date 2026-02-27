import { AnimatePresence, cubicBezier, motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface SendButtonProps {
  show: boolean;
  isStreaming?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const customEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export function SendButton({ show, isStreaming, onClick }: SendButtonProps) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          className="transition-theme flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--d-admin-blue-600)] p-1 text-white enabled:hover:brightness-94 disabled:cursor-not-allowed disabled:opacity-50"
          transition={{ ease: customEasingFn, duration: 0.17 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          onClick={(event) => {
            event.preventDefault();
            onClick?.(event);
          }}
        >
          <div className="flex items-center justify-center text-lg">
            {!isStreaming ? (
              <Icon
                icon="heroicons-outline:arrow-up"
                className="size-4"
                style={{ opacity: 1, filter: 'blur(0px)', transform: 'none' }}
              />
            ) : (
              <Icon
                icon="ph:stop-circle-bold"
                className="text-xl"
                style={{ opacity: 1, filter: 'blur(0px)', transform: 'none' }}
              />
            )}
          </div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
