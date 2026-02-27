import { memo } from 'react';
import { Markdown } from './ChatMarkdown';

interface AssistantMessageProps {
  content: string;
}

export const AssistantMessage = memo(({ content }: AssistantMessageProps) => {
  return (
    <div className="w-full overflow-hidden">
      <Markdown html>{content}</Markdown>
    </div>
  );
});
