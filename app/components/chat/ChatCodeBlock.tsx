import { memo, useEffect, useState } from 'react';
import {
  bundledLanguages,
  codeToHtml,
  isSpecialLang,
  type BundledLanguage,
  type SpecialLanguage,
} from 'shiki';
import { classNames } from '../../utils/classNames';
import { createScopedLogger } from '../../utils/logger';

const logger = createScopedLogger('CodeBlock');

interface CodeBlockProps {
  className?: string;
  code: string;
  language?: BundledLanguage | SpecialLanguage;
  theme?: 'light-plus' | 'dark-plus';
  disableCopy?: boolean;
}

export const CodeBlock = memo(
  ({
    className,
    code,
    language = 'plaintext',
    theme = 'dark-plus',
    disableCopy = false,
  }: CodeBlockProps) => {
    const [html, setHTML] = useState<string | undefined>(undefined);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      if (copied) {
        return;
      }

      navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    useEffect(() => {
      if (
        language &&
        !isSpecialLang(language) &&
        !(language in bundledLanguages)
      ) {
        logger.warn(`Unsupported language '${language}'`);
      }

      logger.trace(`Language = ${language}`);

      const processCode = async () => {
        setHTML(await codeToHtml(code, { lang: language, theme }));
      };

      processCode();
    }, [code]);

    return (
      <div className={classNames('group relative text-left', className)}>
        <div
          className={classNames(
            'absolute top-[10px] right-[10px] z-10 flex items-center justify-center rounded-md text-lg opacity-0 group-hover:opacity-100',
            {
              'rounded-l-0 opacity-100': copied,
            },
          )}
        >
          {!disableCopy && (
            <button
              className={classNames(
                'flex items-center justify-center bg-transparent p-[6px]',
                'before:absolute before:-left-[53px] before:h-[30px] before:px-1.5 before:py-0.5 before:text-xs before:content-["Copied"]',
                'before:rounded-l-md before:border-r before:border-gray-300 before:text-gray-500',
                {
                  'before:opacity-0': !copied,
                  'before:opacity-100': copied,
                },
              )}
              title="Copy Code"
              onClick={() => copyToClipboard()}
            >
              <div className="i-ph:clipboard-text-duotone"></div>
            </button>
          )}
        </div>
        <div
          className="[&>pre]:overflow-x-auto [&>pre]:rounded-md [&>pre]:p-4 [&>pre]:text-sm"
          dangerouslySetInnerHTML={{ __html: html ?? '' }}
        ></div>
      </div>
    );
  },
);
