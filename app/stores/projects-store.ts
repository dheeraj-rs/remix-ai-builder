import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Page {
  id: string;
  name: string;
  path: string;
  html: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type?: string;
  html: string;
  pages: Page[];
  updatedAt: number;
  thumbnail?: string;
  category?: 'custom' | 'template';
  chatHistory?: { messages: any[]; description?: string };
}

interface ProjectsState {
  projects: Project[];
  currentProjectId: string | null;
  saveProject: (project: Omit<Project, 'updatedAt'>) => Promise<void>;
  updatePage: (
    projectId: string,
    pageId: string,
    updates: Partial<Page>,
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;
  getProject: (id: string) => Project | undefined;
  fetchProjects: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export const useProjectsStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        try {
          const sessionRes = await fetch('/api/auth/session');
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            if (!session || !session.user) {
              console.log(
                '[ProjectsStore] No active session. Skipping project fetch.',
              );
              set({ isLoading: false, isAuthenticated: false });
              return;
            }
          }

          const res = await fetch('/api/projects');
          if (res.ok) {
            const data = await res.json();
            const mappedProjects = data.projects.map((p: any) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              type: p.type,
              html: p.content?.html || '',
              pages: p.content?.pages || [],
              updatedAt: new Date(p.updatedAt).getTime(),
              thumbnail: p.thumbnail,
              category: p.category || 'custom',
            }));
            const localProjects = get().projects;
            const mappedIds = new Set(mappedProjects.map((p: any) => p.id));
            const guestProjectsToSync = localProjects.filter(p => !mappedIds.has(p.id));

            set({
              projects: mappedProjects,
              isLoading: false,
              isAuthenticated: true,
            });

            for (const guestProject of guestProjectsToSync) {
               console.log('[ProjectsStore] Syncing local guest project to DB:', guestProject.id);
               set(state => ({ projects: [guestProject, ...state.projects] }));
               get().saveProject(guestProject);
            }

          } else if (res.status === 401) {
            console.log('[ProjectsStore] User not logged in (Guest Mode).');
            if (get().isAuthenticated) {
                console.log('[ProjectsStore] User logged out, clearing stored DB projects.');
                set({ projects: [], currentProjectId: null });
            }
            set({ isLoading: false, isAuthenticated: false });
          } else {
            console.warn(
              '[ProjectsStore] Failed to fetch projects. Status:',
              res.status,
            );
            set({ error: 'Failed to fetch projects', isLoading: false });
          }
        } catch (error: any) {
          console.warn(
            '[ProjectsStore] Error fetching projects:',
            error?.message || 'Unknown error',
          );
          set({
            error: error?.message || 'Failed to fetch projects',
            isLoading: false,
          });
        }
      },


      saveProject: async (projectData) => {
        const now = Date.now();
        set((state) => {
          const existingIndex = state.projects.findIndex(
            (p) => p.id === projectData.id,
          );
          if (existingIndex >= 0) {
            const updatedProjects = [...state.projects];
            updatedProjects[existingIndex] = { ...projectData, updatedAt: now };
            return { projects: updatedProjects };
          } else {
            return {
              projects: [...state.projects, { ...projectData, updatedAt: now }],
            };
          }
        });
        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }

        try {
          const payload = {
            id: projectData.id,
            name: projectData.name,
            type: 'ai',
            content: {
              html: projectData.html,
              pages: projectData.pages,
            },
            thumbnail: projectData.thumbnail,
            isPublished: false,
            chatHistory: projectData.chatHistory,
          };

          const resInfo = await fetch(`/api/projects/${projectData.id}`);

          if (resInfo.ok) {
            await fetch(`/api/projects/${projectData.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } else if (resInfo.status === 404 || resInfo.status === 400) {
            const createRes = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (createRes.ok) {
              const data = await createRes.json();
              if (data.project && data.project.id !== projectData.id) {
                set((state) => ({
                  projects: state.projects.map((p) =>
                    p.id === projectData.id ? { ...p, id: data.project.id } : p,
                  ),
                  currentProjectId:
                    state.currentProjectId === projectData.id
                      ? data.project.id
                      : state.currentProjectId,
                }));
              }
            }
          }
        } catch (e) {
          console.log('Sync failed:', e);
        }
      },

      updatePage: async (
        projectId: string,
        pageId: string,
        updates: Partial<Page>,
      ) => {
        const { projects, saveProject } = get();
        const project = projects.find((p) => p.id === projectId);
        if (!project) return;

        const pageIndex = project.pages.findIndex((p) => p.id === pageId);
        if (pageIndex === -1) return;

        const updatedPages = [...project.pages];
        updatedPages[pageIndex] = { ...updatedPages[pageIndex], ...updates };

        const updatedProject = {
          ...project,
          pages: updatedPages,
        };

        const { updatedAt, ...projectToSave } = updatedProject;
        await saveProject(projectToSave);
      },

      deleteProject: async (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));

        try {
          await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        } catch (e) {
          console.error(e);
        }
      },

      setCurrentProject: (id) => set({ currentProjectId: id }),

      getProject: (id) => get().projects.find((p) => p.id === id),
    }),
    {
      name: 'd-admin-projects-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return persistedState as ProjectsState;
        }
        return persistedState as ProjectsState;
      },
    },
  ),
);
