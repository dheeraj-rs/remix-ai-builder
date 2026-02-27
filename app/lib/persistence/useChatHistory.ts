'use client';

import { useParams, useSearchParams } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import type { Message } from 'ai';
import { workbenchStore } from '../../stores/workbench';
import { useChatStore } from '../../stores/zustand';
import { useProjectsStore } from '../../stores/projects-store';
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
} from './db';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

const persistenceEnabled =
  typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_DISABLE_PERSISTENCE;

let dbPromise: Promise<IDBDatabase | undefined> | undefined;

export const getDb = async () => {
  if (!persistenceEnabled) {
    return undefined;
  }
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
};

export function useChatHistory() {
  const params = useParams();
  const mixedId = params?.id as string | undefined;
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { saveProject } = useProjectsStore();
  const localProjects = useProjectsStore((state) => state.projects);
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const dbInstance = await getDb();

      if (!dbInstance && persistenceEnabled) { }
      let effectiveId = mixedId;
      if (!effectiveId && typeof window !== 'undefined') {
        const match = window.location.pathname.match(
          /\/ai-website-builder\/([^\/]+)/,
        );
        if (match && match[1]) {
          effectiveId = match[1];
        }
      }

      if (effectiveId) {
        try {
          const sessionRes = await fetch('/api/auth/session').catch(() => null);
          let isLoggedIn = false;
          if (sessionRes?.ok) {
            const session = await sessionRes.json();
            if (session?.user) isLoggedIn = true;
          }

          let res: Response | null = null;
          if (isLoggedIn) {
            res = await fetch(`/api/projects/${effectiveId}`);
          }

          if (res?.ok) {
            const data = await res.json();

            if (data.project) {
              let finalMessages = data.project.chatHistory?.messages || [];
              let finalDesc = data.project.chatHistory?.description;
              if (finalMessages.length === 0 && dbInstance) {
                try {
                  const localData = await getMessages(dbInstance, effectiveId);
                  if (localData && localData.messages.length > 0) {
                    finalMessages = localData.messages;
                    finalDesc = localData.description || finalDesc;
                  }
                } catch (e) {
                  console.warn(
                    '[useChatHistory] Failed to check local DB fallback',
                    e,
                  );
                }
              }

              if (finalMessages.length === 0) {
                const localProject = useProjectsStore
                  .getState()
                  .projects.find((p) => p.id === effectiveId);
                if (
                  localProject?.chatHistory?.messages &&
                  localProject.chatHistory.messages.length > 0
                ) {
                  finalMessages = localProject.chatHistory.messages;
                  finalDesc = localProject.chatHistory.description || finalDesc;
                }
              }

              setInitialMessages(finalMessages);
              setUrlId(effectiveId);
              useChatStore.getState().setDescription(finalDesc);
              useChatStore.getState().setChatId(effectiveId);
              if (finalMessages.length > 0)
                useChatStore.getState().setStarted(true);
              const htmlContent =
                data.project.html ||
                data.project.content?.html ||
                useProjectsStore
                  .getState()
                  .projects.find((p) => p.id === effectiveId)?.html;
              const filesContent = data.project.content;

              if (htmlContent) {
                const files: any = {
                  '/index.html': {
                    type: 'file',
                    content: htmlContent,
                  },
                };
                workbenchStore.setDocuments(files);
              } else if (filesContent && typeof filesContent === 'object') {
                if (Object.keys(filesContent).some((k) => k.startsWith('/'))) {
                  workbenchStore.setDocuments(filesContent);
                }
              }

              loadedIdRef.current = effectiveId;
              setReady(true);
              return;
            }
          } else if (!isLoggedIn || res?.status === 401) {
            const localProject = useProjectsStore
              .getState()
              .projects.find((p) => p.id === effectiveId);
            if (localProject) {
              const messages = localProject.chatHistory?.messages || [];
              setInitialMessages(messages);
              setUrlId(effectiveId);
              useChatStore
                .getState()
                .setDescription(
                  localProject.chatHistory?.description ||
                    localProject.description,
                );
              useChatStore.getState().setChatId(effectiveId);
              if (messages.length > 0) useChatStore.getState().setStarted(true);
              if (localProject.html) {
                workbenchStore.setDocuments({
                  '/index.html': {
                    type: 'file',
                    content: localProject.html,
                    isBinary: false,
                  },
                });
              }
              loadedIdRef.current = effectiveId;
              setReady(true);
              return;
            }
            setInitialMessages([]);
            setUrlId(undefined);
            useChatStore.getState().setDescription(undefined);
            useChatStore.getState().setChatId(undefined);
            loadedIdRef.current = effectiveId;
            setReady(true);
            return;
          }
        } catch (error) {
          console.warn('Failed to fetch from server', error);
        }
        if (dbInstance) {
          const localProject = useProjectsStore
            .getState()
            .projects.find((p) => p.id === effectiveId);
          if (localProject && localProject.chatHistory) {
            setInitialMessages(localProject.chatHistory.messages || []);
            setUrlId(effectiveId);
            useChatStore
              .getState()
              .setDescription(localProject.chatHistory.description);
            useChatStore.getState().setChatId(effectiveId);
            if ((localProject.chatHistory.messages || []).length > 0)
              useChatStore.getState().setStarted(true);
            if (localProject.html) {
              const files: any = {
                '/index.html': { type: 'file', content: localProject.html },
              };

              workbenchStore.setDocuments(files);
            }
            loadedIdRef.current = effectiveId;
            setReady(true);
            return;
          }

          getMessages(dbInstance, effectiveId)
            .then((storedMessages) => {
              if (storedMessages && storedMessages.messages.length > 0) {
                setInitialMessages(storedMessages.messages);
                setUrlId(storedMessages.urlId);
                useChatStore
                  .getState()
                  .setDescription(storedMessages.description);
                useChatStore.getState().setChatId(storedMessages.id);
                useChatStore.getState().setStarted(true);
              } else {
                setInitialMessages([]);
                setUrlId(undefined);
                useChatStore.getState().setChatId(effectiveId);
              }
              loadedIdRef.current = effectiveId;
              setReady(true);
            })
            .catch((error) => {
              console.error('[useChatHistory] local DB error:', error);
              loadedIdRef.current = effectiveId;
              setReady(true);
            });
        } else {
          loadedIdRef.current = effectiveId;
          setReady(true);
        }
      } else {
        setInitialMessages([]);
        setUrlId(undefined);
        useChatStore.getState().setDescription(undefined);
        useChatStore.getState().setChatId(undefined);
        loadedIdRef.current = effectiveId || '';
        setReady(true);
      }
    };
    if (loadedIdRef.current !== (mixedId ?? '')) {
      setReady(false);
      init();
    }
  }, [mixedId, localProjects]);

  return {
    ready: !mixedId || ready,
    initialMessages,
    urlId,
    storeMessageHistory: async (messages: Message[]) => {
      const dbInstance = await getDb();

      const { firstArtifact } = workbenchStore;
      let description = useChatStore.getState().description;

      if (!description && firstArtifact?.title) {
        description = firstArtifact?.title;
        useChatStore.getState().setDescription(description);
      } else if (!description && messages.length > 0) {
        const firstUserMessage = messages.find((m) => m.role === 'user');
        if (firstUserMessage) {
          description = firstUserMessage.content.slice(0, 100);
          useChatStore.getState().setDescription(description);
        }
      }

      const currentChatId = useChatStore.getState().chatId;

      if (initialMessages.length === 0 && !currentChatId) {
        let nextId;
        if (dbInstance) {
          nextId = await getNextId(dbInstance);
          if (!urlId) {
            const newUrlId = await getUrlId(dbInstance, nextId);
            setUrlId(newUrlId);
          }
        } else {
          nextId = crypto.randomUUID();
        }
        useChatStore.getState().setChatId(nextId);
      }

      const activeId = useChatStore.getState().chatId as string;
      useChatStore.getState().triggerHistoryReload();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (activeId) {
          if (!window.location.pathname.includes(activeId)) {
            navigateChat(activeId);
          }

          const existingProject = useProjectsStore
            .getState()
            .projects.find((p) => p.id === activeId);

          await saveProject({
            id: activeId,
            name: existingProject?.name || description || 'New Chat',
            description: description,
            type: 'ai',
            html: existingProject?.html || '',
            pages: existingProject?.pages || [],
            thumbnail: existingProject?.thumbnail,
            chatHistory: {
              messages,
              description,
            },
          });
        }
      }, 2000);
    },
  };
}

function navigateChat(nextId: string) {
  const url = new URL(window.location.href);
  url.pathname = `/ai-website-builder/${nextId}`;

  window.history.replaceState({}, '', url);
}
