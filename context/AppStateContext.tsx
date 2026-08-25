import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { SceneState, UITheme, UIVisibility } from '../types';

export type ModalType =
  | 'splash'
  | 'presetLoad'
  | 'customGrid'
  | 'colorCustomizer'
  | 'help'
  | 'uiSettings'
  | 'shareLink'
  | 'renderModal'
  | 'mediaImport'
  | 'webcamImport'
  | 'globalSettings'
  | 'stabilizeConfig';

export interface UIState {
  // Modal visibility
  openModals: Record<ModalType, boolean>;
  pendingPresetData: SceneState | null;
  pendingMediaSrc: string | null;
  pendingMediaType: 'image' | 'video';
  generatedShareLink: string;

  // Sidebar & Layout State
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  isSidebarMinimized: boolean;
  isFirstLaunchOpen: boolean;
  isRightSidebarOpen: boolean;
  activeMenu: null | 'file-top' | 'view' | 'modes';
  targetSidebarSection: string | null;
  activeFloatingPanel: string | null;

  // UI Viewport Flags & Preferences
  hideUI: boolean;
  showHideHint: boolean;
  showFps: boolean;
  uiVisibility: UIVisibility;
  uiTheme: UITheme;
}

export type UIAction =
  | { type: 'OPEN_MODAL'; modal: ModalType }
  | { type: 'CLOSE_MODAL'; modal: ModalType }
  | { type: 'TOGGLE_MODAL'; modal: ModalType }
  | { type: 'SET_PENDING_PRESET'; data: SceneState | null }
  | { type: 'SET_PENDING_MEDIA'; src: string | null; mediaType?: 'image' | 'video' }
  | { type: 'SET_SHARE_LINK'; url: string }
  | { type: 'SET_SIDEBAR_MINIMIZED'; minimized: boolean }
  | { type: 'SET_FIRST_LAUNCH_OPEN'; open: boolean }
  | { type: 'SET_RIGHT_SIDEBAR_OPEN'; open: boolean }
  | { type: 'SET_LEFT_SIDEBAR_WIDTH'; width: number }
  | { type: 'SET_RIGHT_SIDEBAR_WIDTH'; width: number }
  | { type: 'SET_ACTIVE_MENU'; menu: null | 'file-top' | 'view' | 'modes' }
  | { type: 'SET_TARGET_SECTION'; sectionId: string | null }
  | { type: 'SET_FLOATING_PANEL'; panelId: string | null }
  | { type: 'SET_HIDE_UI'; hide: boolean | ((prev: boolean) => boolean) }
  | { type: 'SET_SHOW_HIDE_HINT'; show: boolean }
  | { type: 'SET_SHOW_FPS'; show: boolean }
  | { type: 'SET_UI_VISIBILITY'; visibility: Partial<UIVisibility> | ((prev: UIVisibility) => UIVisibility) }
  | { type: 'SET_UI_THEME'; theme: UITheme };

export const initialUIState: UIState = {
  openModals: {
    splash: true,
    presetLoad: false,
    customGrid: false,
    colorCustomizer: false,
    help: false,
    uiSettings: false,
    shareLink: false,
    renderModal: false,
    mediaImport: false,
    webcamImport: false,
    globalSettings: false,
    stabilizeConfig: false,
  },
  pendingPresetData: null,
  pendingMediaSrc: null,
  pendingMediaType: 'image',
  generatedShareLink: '',

  leftSidebarWidth: 320,
  rightSidebarWidth: 280,
  isSidebarMinimized: true,
  isFirstLaunchOpen: true,
  isRightSidebarOpen: false,
  activeMenu: null,
  targetSidebarSection: null,
  activeFloatingPanel: null,

  hideUI: false,
  showHideHint: false,
  showFps: false,
  uiVisibility: {
    quickAccess: false,
    brushes: true,
    zoomControls: false,
    quickTheme: false,
    autoCloseAccordions: true,
  },
  uiTheme: { accentColor: '#6366f1', primaryColor: '#18181b' },
};

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        ...state,
        openModals: { ...state.openModals, [action.modal]: true },
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        openModals: { ...state.openModals, [action.modal]: false },
      };
    case 'TOGGLE_MODAL':
      return {
        ...state,
        openModals: { ...state.openModals, [action.modal]: !state.openModals[action.modal] },
      };
    case 'SET_PENDING_PRESET':
      return {
        ...state,
        pendingPresetData: action.data,
      };
    case 'SET_PENDING_MEDIA':
      return {
        ...state,
        pendingMediaSrc: action.src,
        pendingMediaType: action.mediaType || state.pendingMediaType,
      };
    case 'SET_SHARE_LINK':
      return {
        ...state,
        generatedShareLink: action.url,
      };
    case 'SET_SIDEBAR_MINIMIZED':
      return {
        ...state,
        isSidebarMinimized: action.minimized,
      };
    case 'SET_FIRST_LAUNCH_OPEN':
      return {
        ...state,
        isFirstLaunchOpen: action.open,
      };
    case 'SET_RIGHT_SIDEBAR_OPEN':
      return {
        ...state,
        isRightSidebarOpen: action.open,
      };
    case 'SET_LEFT_SIDEBAR_WIDTH':
      return {
        ...state,
        leftSidebarWidth: action.width,
      };
    case 'SET_RIGHT_SIDEBAR_WIDTH':
      return {
        ...state,
        rightSidebarWidth: action.width,
      };
    case 'SET_ACTIVE_MENU':
      return {
        ...state,
        activeMenu: action.menu,
      };
    case 'SET_TARGET_SECTION':
      return {
        ...state,
        targetSidebarSection: action.sectionId,
      };
    case 'SET_FLOATING_PANEL':
      return {
        ...state,
        activeFloatingPanel: action.panelId,
      };
    case 'SET_HIDE_UI':
      return {
        ...state,
        hideUI: typeof action.hide === 'function' ? action.hide(state.hideUI) : action.hide,
      };
    case 'SET_SHOW_HIDE_HINT':
      return {
        ...state,
        showHideHint: action.show,
      };
    case 'SET_SHOW_FPS':
      return {
        ...state,
        showFps: action.show,
      };
    case 'SET_UI_VISIBILITY': {
      const next = typeof action.visibility === 'function'
        ? action.visibility(state.uiVisibility)
        : { ...state.uiVisibility, ...action.visibility };
      return {
        ...state,
        uiVisibility: next,
      };
    }
    case 'SET_UI_THEME':
      return {
        ...state,
        uiTheme: action.theme,
      };
    default:
      return state;
  }
}

interface UIContextValue {
  state: UIState;
  dispatch: React.Dispatch<UIAction>;
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  toggleModal: (modal: ModalType) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  const openModal = (modal: ModalType) => dispatch({ type: 'OPEN_MODAL', modal });
  const closeModal = (modal: ModalType) => dispatch({ type: 'CLOSE_MODAL', modal });
  const toggleModal = (modal: ModalType) => dispatch({ type: 'TOGGLE_MODAL', modal });

  return (
    <UIContext.Provider value={{ state, dispatch, openModal, closeModal, toggleModal }}>
      {children}
    </UIContext.Provider>
  );
};

export function useUIState(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIProvider');
  }
  return context;
}
