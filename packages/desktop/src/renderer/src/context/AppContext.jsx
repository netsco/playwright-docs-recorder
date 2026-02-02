import { createContext, useContext, useReducer, useMemo } from 'react';

const initialState = {
  // View state
  currentView: 'projectList', // 'projectList' | 'welcome' | 'recording' | 'editor'

  // Projects
  projects: [],
  currentProjectId: null,
  currentProject: null,

  // Recording
  isRecording: false,
  actionCount: 0,
  screenshotCount: 0,
  currentRecordActions: true,
  currentCustomCSS: '',

  // Settings
  settings: null,

  // Editor
  activeHistoryId: null,
  editorContent: '',
  editorOriginalContent: '',
  editorRecordingDir: '',
  editorImageRevision: 0,

  // Recordings list (for sidebar)
  recordings: [],

  // Screenshots (during recording)
  screenshotPreviews: [],

  // Action log
  logEntries: [],

  // Status
  statusText: 'Ready',

  // UI state
  sidebarCollapsed: false,
  sidebarVisible: false,
  showShortcuts: true,
  showLog: false,

  // Modals
  projectModalOpen: false,
  editingProjectId: null,
  moveModalOpen: false,
  pendingMoveRecordingId: null,
  refetchModalOpen: false,
  refetchState: {
    progress: 0,
    total: 0,
    text: '',
    currentItem: '',
    view: 'progress',
    summary: null,
  },
  noteModalOpen: false,
  noteModalConfig: { title: 'Add Note', withScreenshot: false },
};

function appReducer(state, action) {
  switch (action.type) {
    // View
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    // Projects
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };

    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProjectId: action.payload ? action.payload.id : null,
        currentProject: action.payload,
      };

    // Settings
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    // Recording
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload.isRecording ?? state.isRecording,
        currentRecordActions: action.payload.recordActions ?? state.currentRecordActions,
        currentCustomCSS: action.payload.customCSS ?? state.currentCustomCSS,
      };

    case 'INCREMENT_ACTION':
      return { ...state, actionCount: state.actionCount + 1 };

    case 'INCREMENT_SCREENSHOT':
      return { ...state, screenshotCount: state.screenshotCount + 1 };

    // Recordings
    case 'SET_RECORDINGS':
      return { ...state, recordings: action.payload };

    case 'SET_ACTIVE_HISTORY':
      return { ...state, activeHistoryId: action.payload };

    // Editor
    case 'SET_EDITOR_CONTENT':
      if (typeof action.payload === 'string') {
        return { ...state, editorContent: action.payload };
      }
      return {
        ...state,
        editorContent: action.payload.content,
        editorOriginalContent: action.payload.originalContent ?? action.payload.content,
        editorRecordingDir: action.payload.recordingDir ?? state.editorRecordingDir,
      };

    case 'SET_EDITOR_ORIGINAL':
      return {
        ...state,
        editorOriginalContent: action.payload.content,
        editorRecordingDir: action.payload.dir,
      };

    case 'BUMP_EDITOR_IMAGE_REVISION':
      return { ...state, editorImageRevision: state.editorImageRevision + 1 };

    // Log and screenshots
    case 'ADD_LOG_ENTRY':
      return { ...state, logEntries: [...state.logEntries, action.payload] };

    case 'ADD_SCREENSHOT_PREVIEW':
      return {
        ...state,
        screenshotPreviews: [...state.screenshotPreviews, action.payload],
      };

    case 'CLEAR_SCREENSHOTS':
      return { ...state, screenshotPreviews: [] };

    // Status
    case 'SET_STATUS':
      return { ...state, statusText: action.payload };

    // UI state
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'SET_SIDEBAR_VISIBLE':
      return { ...state, sidebarVisible: action.payload };

    case 'TOGGLE_SHORTCUTS':
      return { ...state, showShortcuts: !state.showShortcuts };

    case 'TOGGLE_LOG':
      return { ...state, showLog: !state.showLog };

    // Project modal
    case 'OPEN_PROJECT_MODAL':
      return {
        ...state,
        projectModalOpen: true,
        editingProjectId: action.payload || null,
      };

    case 'CLOSE_PROJECT_MODAL':
      return {
        ...state,
        projectModalOpen: false,
        editingProjectId: null,
      };

    // Move modal
    case 'OPEN_MOVE_MODAL':
      return {
        ...state,
        moveModalOpen: true,
        pendingMoveRecordingId: action.payload,
      };

    case 'CLOSE_MOVE_MODAL':
      return {
        ...state,
        moveModalOpen: false,
        pendingMoveRecordingId: null,
      };

    // Refetch modal
    case 'SET_REFETCH_STATE':
      return {
        ...state,
        refetchState: { ...state.refetchState, ...action.payload },
      };

    case 'OPEN_REFETCH_MODAL':
      return {
        ...state,
        refetchModalOpen: true,
        refetchState: {
          progress: 0,
          total: 0,
          text: '',
          currentItem: '',
          view: 'progress',
          summary: null,
        },
      };

    case 'CLOSE_REFETCH_MODAL':
      return { ...state, refetchModalOpen: false };

    // Note modal
    case 'OPEN_NOTE_MODAL':
      return {
        ...state,
        noteModalOpen: true,
        noteModalConfig: action.payload || {
          title: 'Add Note',
          withScreenshot: false,
        },
      };

    case 'CLOSE_NOTE_MODAL':
      return { ...state, noteModalOpen: false };

    // Reset recording state
    case 'RESET_RECORDING_STATE':
      return {
        ...state,
        isRecording: false,
        actionCount: 0,
        screenshotCount: 0,
        currentRecordActions: true,
        currentCustomCSS: '',
        screenshotPreviews: [],
        logEntries: [],
        statusText: 'Ready',
      };

    default:
      return state;
  }
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
