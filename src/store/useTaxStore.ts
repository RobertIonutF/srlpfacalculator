import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============ TYPES ============

export interface Income {
  id: number;
  name: string;
  amount: number;
  isRecurring: boolean;
  months: number;
}

export interface SRLOptions {
  isMicro: boolean;
  dividendPercent: number;
  paySalary: boolean;
  monthlySalary: number;
}

export interface ProjectData {
  mode: 'pfa' | 'srl';
  incomes: Income[];
  monthlyExpenses: number;
  displayCurrency: 'RON' | 'EUR' | 'USD';
  srlOptions: SRLOptions;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: ProjectData;
}

interface TaxStore {
  // State
  currentProject: ProjectData;
  projects: Project[];
  activeProjectId: string | null;
  
  // Actions
  saveProject: (name: string) => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  clearAllProjects: () => void;
  exportProjects: () => string;
  importProjects: (json: string) => boolean;
  updateCurrentProject: (updates: Partial<ProjectData>) => void;
  
  // Individual field updates (for convenience)
  setMode: (mode: 'pfa' | 'srl') => void;
  setIncomes: (incomes: Income[]) => void;
  setMonthlyExpenses: (expenses: number) => void;
  setDisplayCurrency: (currency: 'RON' | 'EUR' | 'USD') => void;
  setSrlOptions: (options: SRLOptions) => void;
}

// ============ DEFAULT STATE ============

const defaultProjectData: ProjectData = {
  mode: 'pfa',
  incomes: [
    { id: 1, name: 'Web Project', amount: 4000, isRecurring: false, months: 1 }
  ],
  monthlyExpenses: 0,
  displayCurrency: 'RON',
  srlOptions: {
    isMicro: true,
    dividendPercent: 50,
    paySalary: false,
    monthlySalary: 4050,
  },
};

// ============ STORE ============

export const useTaxStore = create<TaxStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: defaultProjectData,
      projects: [],
      activeProjectId: null,

      // Save current project (create new or update existing)
      saveProject: (name: string) => {
        const state = get();
        const now = new Date().toISOString();
        const existingProject = state.projects.find(p => p.id === state.activeProjectId);

        if (existingProject) {
          // Update existing project
          set({
            projects: state.projects.map(p =>
              p.id === state.activeProjectId
                ? { ...p, name, updatedAt: now, data: state.currentProject }
                : p
            ),
          });
        } else {
          // Create new project
          const newProject: Project = {
            id: Date.now().toString(),
            name,
            createdAt: now,
            updatedAt: now,
            data: { ...state.currentProject },
          };
          set({
            projects: [...state.projects, newProject],
            activeProjectId: newProject.id,
          });
        }
      },

      // Load a project by ID
      loadProject: (id: string) => {
        const state = get();
        const project = state.projects.find(p => p.id === id);
        if (project) {
          set({
            currentProject: { ...project.data },
            activeProjectId: id,
          });
        }
      },

      // Delete a project
      deleteProject: (id: string) => {
        const state = get();
        set({
          projects: state.projects.filter(p => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        });
        
        // If we deleted the active project, reset to default
        if (state.activeProjectId === id) {
          set({ currentProject: defaultProjectData });
        }
      },

      // Clear all projects
      clearAllProjects: () => {
        set({
          projects: [],
          activeProjectId: null,
          currentProject: defaultProjectData,
        });
      },

      // Export projects as JSON string
      exportProjects: () => {
        const state = get();
        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          projects: state.projects,
        };
        return JSON.stringify(exportData, null, 2);
      },

      // Import projects from JSON string
      importProjects: (json: string): boolean => {
        try {
          const data = JSON.parse(json);
          
          // Validate structure
          if (!data.projects || !Array.isArray(data.projects)) {
            throw new Error('Invalid JSON structure');
          }

          // Validate each project has required fields
          for (const project of data.projects) {
            if (!project.id || !project.name || !project.data) {
              throw new Error('Invalid project structure');
            }
          }

          // Import projects (merge with existing)
          const state = get();
          const existingIds = new Set(state.projects.map(p => p.id));
          const newProjects = data.projects.filter((p: Project) => !existingIds.has(p.id));

          set({
            projects: [...state.projects, ...newProjects],
          });

          return true;
        } catch (error) {
          console.error('Import failed:', error);
          return false;
        }
      },

      // Update current project data
      updateCurrentProject: (updates: Partial<ProjectData>) => {
        set(state => ({
          currentProject: { ...state.currentProject, ...updates },
        }));
      },

      // Convenience setters
      setMode: (mode: 'pfa' | 'srl') => {
        set(state => ({
          currentProject: { ...state.currentProject, mode },
        }));
      },

      setIncomes: (incomes: Income[]) => {
        set(state => ({
          currentProject: { ...state.currentProject, incomes },
        }));
      },

      setMonthlyExpenses: (monthlyExpenses: number) => {
        set(state => ({
          currentProject: { ...state.currentProject, monthlyExpenses },
        }));
      },

      setDisplayCurrency: (displayCurrency: 'RON' | 'EUR' | 'USD') => {
        set(state => ({
          currentProject: { ...state.currentProject, displayCurrency },
        }));
      },

      setSrlOptions: (srlOptions: SRLOptions) => {
        set(state => ({
          currentProject: { ...state.currentProject, srlOptions },
        }));
      },
    }),
    {
      name: 'tax-calculator-projects',
    }
  )
);

