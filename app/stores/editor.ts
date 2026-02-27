import type {
  EditorDocument,
  ScrollPosition,
} from '../components/editor/CodeMirrorEditor';
import { useEditorStore } from './zustand';
import type { FilesStore, FileMap } from './files';

export class EditorStore {
  #filesStore: FilesStore;

  get selectedFile() {
    return useEditorStore.getState().selectedFile;
  }

  get documents() {
    return useEditorStore.getState().documents;
  }

  get currentDocument() {
    return useEditorStore.getState().getCurrentDocument();
  }

  constructor(filesStore: FilesStore) {
    this.#filesStore = filesStore;
  }

  setDocuments(files: FileMap) {
    const previousDocuments = useEditorStore.getState().documents;

    useEditorStore.getState().setDocuments(
      Object.fromEntries(
        Object.entries(files)
          .map(([filePath, dirent]) => {
            if (dirent?.type !== 'file') {
              return undefined;
            }

            const previousDocument = previousDocuments?.[filePath];

            return [
              filePath,
              {
                value: dirent.content,
                filePath,
                scroll: previousDocument?.scroll,
                isBinary: dirent.isBinary,
              },
            ] as [string, EditorDocument];
          })
          .filter(Boolean) as Array<[string, EditorDocument]>,
      ),
    );
  }

  setSelectedFile(filePath: string | undefined) {
    useEditorStore.getState().setSelectedFile(filePath);
  }

  updateScrollPosition(filePath: string, position: ScrollPosition) {
    useEditorStore.getState().updateScrollPosition(filePath, position);
  }

  updateFile(filePath: string, newContent: string) {
    useEditorStore.getState().updateFile(filePath, newContent);
  }

  reset() {
    useEditorStore.getState().reset();
  }
}
