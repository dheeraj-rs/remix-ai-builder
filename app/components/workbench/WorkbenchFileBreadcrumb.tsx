import { Icon } from '@iconify/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { memo, useEffect, useRef, useState } from 'react';
import type { FileMap } from '../../stores/files';
import { classNames } from '../../utils/classNames';
import { WORK_DIR } from '../../utils/constants';
import { cubicEasingFn } from '../../utils/easings';
import { renderLogger } from '../../utils/logger';
import { FileTree } from './WorkbenchFileTree';

const WORK_DIR_REGEX = new RegExp(
  `^${WORK_DIR.split('/').slice(0, -1).join('/').replaceAll('/', '\\/')}/`,
);

interface FileBreadcrumbProps {
  files?: FileMap;
  pathSegments?: string[];
  onFileSelect?: (filePath: string) => void;
}

const contextMenuVariants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.15,
      ease: cubicEasingFn,
    },
  },
  close: {
    y: 6,
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const FileBreadcrumb = memo<FileBreadcrumbProps>(
  ({ files, pathSegments = [], onFileSelect }) => {
    renderLogger.trace('FileBreadcrumb');

    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const contextMenuRef = useRef<HTMLDivElement | null>(null);
    const segmentRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const handleSegmentClick = (index: number) => {
      setActiveIndex((prevIndex) => (prevIndex === index ? null : index));
    };

    useEffect(() => {
      const handleOutsideClick = (event: MouseEvent) => {
        if (
          activeIndex !== null &&
          !contextMenuRef.current?.contains(event.target as Node) &&
          !segmentRefs.current.some((ref) =>
            ref?.contains(event.target as Node),
          )
        ) {
          setActiveIndex(null);
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, [activeIndex]);

    if (files === undefined || pathSegments.length === 0) {
      return null;
    }

    return (
      <div className="flex">
        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;

          const path = pathSegments.slice(0, index).join('/');

          if (!WORK_DIR_REGEX.test(path)) {
            return null;
          }

          const isActive = activeIndex === index;

          return (
            <div key={index} className="relative flex items-center">
              <DropdownMenu.Root open={isActive} modal={false}>
                <DropdownMenu.Trigger asChild>
                  <span
                    ref={(ref) => {
                      segmentRefs.current[index] = ref;
                    }}
                    className={classNames(
                      'flex shrink-0 cursor-pointer items-center gap-1.5',
                      {
                        'text-text-secondary hover:text-text': !isActive,
                        'text-text underline': isActive,
                        'pr-4': isLast,
                      },
                    )}
                    onClick={() => handleSegmentClick(index)}
                  >
                    {isLast && <Icon icon="ph:file-duotone" />}
                    {segment}
                  </span>
                </DropdownMenu.Trigger>
                {index > 0 && !isLast && (
                  <Icon
                    icon="ph:caret-right"
                    className="text-text-secondary mx-1"
                  />
                )}
                <AnimatePresence>
                  {isActive && (
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        className="z-file-tree-breadcrumb"
                        asChild
                        align="start"
                        side="bottom"
                        avoidCollisions={false}
                      >
                        <motion.div
                          ref={contextMenuRef}
                          initial="close"
                          animate="open"
                          exit="close"
                          variants={contextMenuVariants}
                          className="overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10 shadow-2xl"
                        >
                          <div className="overflow-hidden rounded-lg border border-white/5">
                            <div className="bg-[#131314]/80 backdrop-blur-xl max-h-[50vh] min-w-[300px] overflow-scroll rounded-lg">
                              <FileTree
                                files={files}
                                hideRoot
                                rootFolder={path}
                                collapsed
                                allowFolderSelection
                                selectedFile={`${path}/${segment}`}
                                onFileSelect={(filePath) => {
                                  setActiveIndex(null);
                                  onFileSelect?.(filePath);
                                }}
                              />
                            </div>
                          </div>
                          <DropdownMenu.Arrow className="fill-[#131314]/90" />
                        </motion.div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  )}
                </AnimatePresence>
              </DropdownMenu.Root>
            </div>
          );
        })}
      </div>
    );
  },
);
