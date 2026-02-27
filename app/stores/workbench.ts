import type {
  EditorDocument,
  ScrollPosition,
} from '../components/editor/CodeMirrorEditor';
import { ActionRunner } from '../lib/runtime/action-runner';
import type {
  ActionCallbackData,
  ArtifactCallbackData,
} from '../lib/runtime/message-parser';
import { webcontainer } from '../lib/webcontainer';
import type { ITerminal } from '../types/terminal';
import { unreachable } from '../utils/unreachable';
import { EditorStore } from './editor';
import { FilesStore, type FileMap } from './files';
import { PreviewsStore } from './previews';
import { TerminalStore } from './terminal';
import { useWorkbenchStore } from './zustand';

export interface ArtifactState {
  id: string;
  title: string;
  closed: boolean;
  runner: ActionRunner;
}

export type ArtifactUpdateState = Pick<ArtifactState, 'title' | 'closed'>;

export type WorkbenchViewType = 'code' | 'preview';

export class WorkbenchStore {
  #previewsStore = new PreviewsStore(webcontainer);
  #filesStore = new FilesStore(webcontainer);
  #editorStore = new EditorStore(this.#filesStore);
  #terminalStore = new TerminalStore(webcontainer);

  get showWorkbench() {
    return useWorkbenchStore.getState().showWorkbench;
  }

  get userHidWorkbench() {
    return useWorkbenchStore.getState().userHidWorkbench;
  }

  get currentView() {
    return useWorkbenchStore.getState().currentView;
  }

  get unsavedFiles() {
    return useWorkbenchStore.getState().unsavedFiles;
  }

  get artifacts() {
    return useWorkbenchStore.getState().artifacts;
  }

  get artifactIdList() {
    return useWorkbenchStore.getState().artifactIdList;
  }

  constructor() {}

  get previewsStore() {
    return this.#previewsStore;
  }

  get filesStore() {
    return this.#filesStore;
  }

  get editorStore() {
    return this.#editorStore;
  }

  get terminalStore() {
    return this.#terminalStore;
  }

  get previews() {
    return this.#previewsStore.previews;
  }

  get files() {
    return this.#filesStore.files;
  }

  get currentDocument(): EditorDocument | undefined {
    return this.#editorStore.currentDocument;
  }

  get selectedFile(): string | undefined {
    return this.#editorStore.selectedFile;
  }

  get firstArtifact(): ArtifactState | undefined {
    return this.#getArtifact(this.artifactIdList[0]);
  }

  get filesCount(): number {
    return this.#filesStore.filesCount;
  }

  get showTerminal() {
    return this.#terminalStore.showTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.#terminalStore.toggleTerminal(value);
  }

  attachTerminal(terminal: ITerminal) {
    this.#terminalStore.attachTerminal(terminal);
  }

  onTerminalResize(cols: number, rows: number) {
    this.#terminalStore.onTerminalResize(cols, rows);
  }

  setDocuments(files: FileMap) {
    this.#editorStore.setDocuments(files);

    if (this.#filesStore.filesCount > 0 && this.currentDocument === undefined) {
      // we find the first file and select it
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file') {
          this.setSelectedFile(filePath);
          break;
        }
      }
    }
  }

  setShowWorkbench(show: boolean) {
    useWorkbenchStore.getState().setShowWorkbench(show);
  }

  setCurrentDocumentContent(newContent: string) {
    const filePath = this.currentDocument?.filePath;

    if (!filePath) {
      return;
    }

    const originalContent = this.#filesStore.getFile(filePath)?.content;
    const unsavedChanges =
      originalContent !== undefined && originalContent !== newContent;

    this.#editorStore.updateFile(filePath, newContent);

    const currentDocument = this.currentDocument;

    if (currentDocument) {
      const previousUnsavedFiles = this.unsavedFiles;

      if (
        unsavedChanges &&
        previousUnsavedFiles.has(currentDocument.filePath)
      ) {
        return;
      }

      const newUnsavedFiles = new Set(previousUnsavedFiles);

      if (unsavedChanges) {
        newUnsavedFiles.add(currentDocument.filePath);
      } else {
        newUnsavedFiles.delete(currentDocument.filePath);
      }

      useWorkbenchStore.getState().setUnsavedFiles(newUnsavedFiles);
    }
  }

  setCurrentDocumentScrollPosition(position: ScrollPosition) {
    const editorDocument = this.currentDocument;

    if (!editorDocument) {
      return;
    }

    const { filePath } = editorDocument;

    this.#editorStore.updateScrollPosition(filePath, position);
  }

  setSelectedFile(filePath: string | undefined) {
    this.#editorStore.setSelectedFile(filePath);
  }

  async saveFile(filePath: string) {
    const documents = this.#editorStore.documents;
    const document = documents[filePath];

    if (document === undefined) {
      return;
    }

    await this.#filesStore.saveFile(filePath, document.value);

    const newUnsavedFiles = new Set(this.unsavedFiles);
    newUnsavedFiles.delete(filePath);

    useWorkbenchStore.getState().setUnsavedFiles(newUnsavedFiles);
  }

  async saveCurrentDocument() {
    const currentDocument = this.currentDocument;

    if (currentDocument === undefined) {
      return;
    }

    await this.saveFile(currentDocument.filePath);
  }

  resetCurrentDocument() {
    const currentDocument = this.currentDocument;

    if (currentDocument === undefined) {
      return;
    }

    const { filePath } = currentDocument;
    const file = this.#filesStore.getFile(filePath);

    if (!file) {
      return;
    }

    this.setCurrentDocumentContent(file.content);
  }

  async saveAllFiles() {
    for (const filePath of this.unsavedFiles) {
      await this.saveFile(filePath);
    }
  }

  getFileModifcations() {
    return this.#filesStore.getFileModifications();
  }

  resetAllFileModifications() {
    this.#filesStore.resetFileModifications();
  }

  abortAllActions() {
    // TODO: what do we wanna do and how do we wanna recover from this?
  }

  addArtifact({ messageId, title, id }: ArtifactCallbackData) {
    const artifact = this.#getArtifact(messageId);

    if (artifact) {
      return;
    }

    if (!this.artifactIdList.includes(messageId)) {
      useWorkbenchStore
        .getState()
        .setArtifactIdList([...this.artifactIdList, messageId]);
    }

    useWorkbenchStore.getState().setArtifact(messageId, {
      id,
      title,
      closed: false,
      runner: new ActionRunner(webcontainer, messageId),
    });
  }

  updateArtifact(
    { messageId }: ArtifactCallbackData,
    state: Partial<ArtifactUpdateState>,
  ) {
    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      return;
    }

    useWorkbenchStore
      .getState()
      .setArtifact(messageId, { ...artifact, ...state });
  }

  async addAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    artifact.runner.addAction(data);
  }

  async runAction(data: ActionCallbackData) {
    const { messageId } = data;

    const artifact = this.#getArtifact(messageId);

    if (!artifact) {
      unreachable('Artifact not found');
    }

    artifact.runner.runAction(data);
  }

  reset() {
    this.#filesStore.reset();
    this.#editorStore.reset();
    this.#terminalStore.reset();
    this.#previewsStore.reset(); 
    useWorkbenchStore.getState().reset();
  }

  #getArtifact(id: string) {
    const artifacts = this.artifacts;
    return artifacts[id];
  }
}

export const workbenchStore = new WorkbenchStore();
