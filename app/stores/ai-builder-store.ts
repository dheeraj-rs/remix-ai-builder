import { create } from 'zustand';

interface AiBuilderStore {
  activeMobilePanel: 'chat' | 'workbench';
  setActiveMobilePanel: (panel: 'chat' | 'workbench') => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (isOpen: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (isOpen: boolean) => void;
  isSelectionMode: boolean;
  setSelectionMode: (isSelectionMode: boolean) => void;
  selectedElement: {
    tagName: string;
    id?: string;
    class?: string;
    text?: string;
    xpath?: string;
  } | null;
  setSelectedElement: (element: any | null) => void;
  showProjectsGallery: boolean;
  setShowProjectsGallery: (isOpen: boolean) => void;
}

export const useAiBuilderStore = create<AiBuilderStore>((set) => ({
  activeMobilePanel: 'chat',
  setActiveMobilePanel: (panel) => set({ activeMobilePanel: panel }),
  isHistoryOpen: false,
  setIsHistoryOpen: (isOpen) => set({ isHistoryOpen: isOpen }),
  isSettingsModalOpen: false,
  setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
  isSelectionMode: false,
  setSelectionMode: (isSelectionMode) => set({ isSelectionMode }),
  selectedElement: null,
  setSelectedElement: (element) => set({ selectedElement: element }),
  showProjectsGallery: false,
  setShowProjectsGallery: (isOpen) => set({ showProjectsGallery: isOpen }),
}));
