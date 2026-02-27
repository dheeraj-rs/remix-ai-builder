import { memo, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
} from '../editor/CodeMirrorEditor';
import { workbenchStore } from '../../stores/workbench';
import {
  useFilesStore,
  useEditorStore,
  useWorkbenchStore,
} from '../../stores/zustand';
import { renderLogger } from '../../utils/logger';
import { EditorPanel } from './WorkbenchEditorPanel';
import { Preview } from './WorkbenchPreview';

interface WorkspaceProps {
  isStreaming?: boolean;
}

export const Workbench = memo(({ isStreaming }: WorkspaceProps) => {
  renderLogger.trace('Workbench');
  const selectedView = useWorkbenchStore((state) => state.currentView);
  const currentDocument = useEditorStore((state) => state.getCurrentDocument());
  const unsavedFiles = useWorkbenchStore((state) => state.unsavedFiles);
  const files = useFilesStore((state) => state.files);
  const selectedFile = useEditorStore((state) => state.selectedFile);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);

  const onEditorChange = useCallback<OnEditorChange>((update) => {
    workbenchStore.setCurrentDocumentContent(update.content);
  }, []);

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.setSelectedFile(filePath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch(() => {
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  return (
    <div className="bg-surface-0 flex h-full w-full flex-col overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        <View animate={{ x: selectedView === 'code' ? 0 : '-100%' }}>
          <EditorPanel
            editorDocument={currentDocument}
            isStreaming={isStreaming}
            selectedFile={selectedFile}
            files={files}
            unsavedFiles={unsavedFiles}
            onFileSelect={onFileSelect}
            onEditorScroll={onEditorScroll}
            onEditorChange={onEditorChange}
            onFileSave={onFileSave}
            onFileReset={onFileReset}
          />
        </View>
        <View animate={{ x: selectedView === 'preview' ? 0 : '100%' }}>
          <Preview />
        </View>
      </div>
    </div>
  );
});

Workbench.displayName = 'Workbench';

interface ViewProps {
  children: React.ReactNode;
  animate?: { x: number | string };
}

const View = memo(({ children, animate }: ViewProps) => {
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translateX(${typeof animate?.x === 'number' ? animate.x + 'px' : animate?.x || 0})`,
      }}
    >
      {children}
    </div>
  );
});

View.displayName = 'View';
