import { useEffect, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useIsMobile } from '~/core/hooks/use-mobile';
import { Header } from '~/components/header/AiBuilderHeaderWrapper';
import { WorkbenchPanel } from '~/components/workbench/WorkbenchPanel';
import { useAiBuilderStore } from '~/stores/ai-builder-store';
import { ChatInterfacePanel } from '~/components/chat/ChatInterfacePanel.client';
import { HistorySidebar } from '~/components/history/HistorySidebar';
import { useChatStore, useWorkbenchStore } from '~/stores/zustand';
import { useWebContainerListener } from '~/hooks/useWebContainerListener';
import 'react-toastify/dist/ReactToastify.css';
import '~/styles/index.scss';

// Mock UnsavedChangesDialog and usePreventNavigation since they might be missing
const DefaultUnsavedChangesDialog = ({ isOpen, onClose, onConfirm }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-lg dark:bg-gray-800">
        <h2 className="text-lg font-semibold">Unsaved Changes</h2>
        <p className="mt-2 text-sm text-gray-500">You have unsaved changes. Are you sure you want to leave?</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md">Leave</button>
        </div>
      </div>
    </div>
  );
};

const defaultPreventNavigation = (prevent: boolean, onUnload: () => void) => {
  return { confirmExit: () => {} };
};

export default function AiWebsiteBuilderPage() {
  const {
    activeMobilePanel,
    showProjectsGallery,
    setShowProjectsGallery,
  } = useAiBuilderStore();
  const isMobile = useIsMobile();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { unsavedFiles, isHydrated } = useWorkbenchStore();
  useWebContainerListener();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use a mocked prevent default or the real one if you resolve the import
  const { confirmExit } = defaultPreventNavigation(unsavedFiles.size > 0, () =>
    setShowUnsavedDialog(true),
  );

  if (!isHydrated || !mounted) return null;

  const ActiveInterface = ChatInterfacePanel;
  const ActiveWorkbench = WorkbenchPanel;

  return (
    <div className="relative h-screen w-full bg-gradient-to-tl from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <HistorySidebar />
      <div className="relative z-10 flex h-full w-full flex-col">
        {!showProjectsGallery && <Header />}
        <div className="relative w-full flex-1 overflow-hidden">
          {showProjectsGallery ? (
            <div className="flex flex-col items-center justify-center size-full bg-black">
              <h1>Projects Gallery Mock</h1>
              <button onClick={() => setShowProjectsGallery(false)}>Close</button>
            </div>
          ) : (
            <div className="h-full w-full">
              <div className="flex size-full overscroll-contain">
                {isMobile ? (
                  <>
                    <div
                      className={`h-full w-full ${activeMobilePanel === 'chat' ? 'block' : 'hidden'}`}
                    >
                      <ActiveInterface />
                    </div>
                    <div
                      className={`h-full w-full ${activeMobilePanel === 'workbench' ? 'block' : 'hidden'}`}
                    >
                      <ActiveWorkbench />
                    </div>
                  </>
                ) : (
                  <PanelGroup direction="horizontal">
                    <Panel
                      id="interface-panel"
                      order={1}
                      defaultSize={30}
                      minSize={25}
                      className="h-full"
                    >
                      <ActiveInterface />
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-transparent transition-colors hover:bg-transparent" />

                    <Panel
                      id="workbench-panel"
                      order={2}
                      defaultSize={70}
                      minSize={50}
                      className="h-full"
                    >
                      <ActiveWorkbench />
                    </Panel>
                  </PanelGroup>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <DefaultUnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onConfirm={confirmExit}
      />
    </div>
  );
}
