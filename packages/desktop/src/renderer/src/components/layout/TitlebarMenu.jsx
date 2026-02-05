import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Menu,
  ChevronRight,
  FilePlus,
  FolderPlus,
  Import,
  Upload,
  LogOut,
  Undo2,
  Redo2,
  PanelLeft,
  List,
  Keyboard,
  Sun,
  Moon,
  Info,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';

export function TitlebarMenu({ onNewRecording, onImportProject, onExportProject }) {
  const { state, dispatch } = useApp();
  const api = useElectronAPI();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const hasProject = !!state.currentProjectId;
  const isRecording = state.isRecording;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setActiveCategory(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveCategory(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      setActiveCategory(null);
    } else {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPos({ top: rect.bottom, left: rect.left });
      }
      setIsOpen(true);
    }
  }, [isOpen]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setActiveCategory(null);
  }, []);

  // Theme toggle (mirrors ThemeToggle component logic)
  const toggleTheme = useCallback(async () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'SET_THEME', payload: newTheme });
    if (api) {
      await api.saveSettings({ theme: newTheme });
      if (api.updateTitleBarOverlay) {
        api.updateTitleBarOverlay({
          color: '#00000000',
          symbolColor: newTheme === 'dark' ? '#94a3b8' : '#556275',
          height: 38,
        });
      }
    }
  }, [state.theme, api, dispatch]);

  const toggleShowLog = useCallback(async () => {
    dispatch({ type: 'TOGGLE_LOG' });
    if (api) {
      await api.saveSettings({ showLog: !state.showLog });
    }
  }, [api, state.showLog, dispatch]);

  const toggleShowShortcuts = useCallback(async () => {
    dispatch({ type: 'TOGGLE_SHORTCUTS' });
    if (api) {
      await api.saveSettings({ showShortcuts: !state.showShortcuts });
    }
  }, [api, state.showShortcuts, dispatch]);

  // Menu definitions
  const categories = [
    {
      label: 'File',
      items: [
        {
          label: 'New Project...',
          icon: FolderPlus,
          onClick: () => dispatch({ type: 'OPEN_PROJECT_MODAL', payload: null }),
        },
        {
          label: 'New Recording',
          icon: FilePlus,
          onClick: onNewRecording,
          disabled: !hasProject || isRecording,
        },
        { separator: true },
        {
          label: 'Import Project...',
          icon: Import,
          onClick: onImportProject,
        },
        {
          label: 'Export Project...',
          icon: Upload,
          onClick: () => onExportProject?.(state.currentProjectId),
          disabled: !hasProject,
        },
        { separator: true },
        {
          label: 'Exit',
          icon: LogOut,
          onClick: () => api?.windowClose(),
        },
      ],
    },
    {
      label: 'Edit',
      items: [
        {
          label: 'Undo',
          icon: Undo2,
          shortcut: 'Ctrl+Z',
          onClick: () => document.execCommand('undo'),
        },
        {
          label: 'Redo',
          icon: Redo2,
          shortcut: 'Ctrl+Y',
          onClick: () => document.execCommand('redo'),
        },
      ],
    },
    {
      label: 'View',
      items: [
        {
          label: 'Toggle Sidebar',
          icon: PanelLeft,
          checked: !state.sidebarCollapsed,
          onClick: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
        },
        {
          label: 'Toggle Action Log',
          icon: List,
          checked: state.showLog,
          onClick: toggleShowLog,
        },
        {
          label: 'Toggle Shortcuts Panel',
          icon: Keyboard,
          checked: state.showShortcuts,
          onClick: toggleShowShortcuts,
        },
        { separator: true },
        {
          label: state.theme === 'dark' ? 'Light Mode' : 'Dark Mode',
          icon: state.theme === 'dark' ? Sun : Moon,
          onClick: toggleTheme,
        },
      ],
    },
    {
      label: 'Help',
      items: [
        {
          label: 'Keyboard Shortcuts',
          icon: Keyboard,
          onClick: () => {
            // Toggle shortcuts panel visibility as a quick reference
            dispatch({ type: 'TOGGLE_SHORTCUTS' });
          },
        },
        {
          label: 'About',
          icon: Info,
          onClick: () => {
            // Simple about — just show version in status
            dispatch({ type: 'SET_STATUS', payload: 'Documentation Recorder v0.9.4' });
          },
        },
      ],
    },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        className="flex h-[38px] w-[38px] items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors"
        onClick={toggleMenu}
        title="Menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999]"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {/* Top-level category list */}
            <div className="w-44 rounded-md border border-border bg-background py-1 shadow-lg">
              {categories.map((cat, ci) => (
                <div
                  key={cat.label}
                  className="relative"
                  onMouseEnter={() => setActiveCategory(ci)}
                >
                  <button
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                      activeCategory === ci
                        ? 'bg-muted text-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </button>

                  {/* Submenu flyout */}
                  {activeCategory === ci && (
                    <div
                      className="absolute left-full top-0 ml-0.5 w-52 rounded-md border border-border bg-background py-1 shadow-lg"
                    >
                      {cat.items.map((item, ii) =>
                        item.separator ? (
                          <div
                            key={`sep-${ii}`}
                            className="my-1 border-t border-border"
                          />
                        ) : (
                          <button
                            key={item.label}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                              item.disabled
                                ? 'text-muted-foreground/50 cursor-not-allowed'
                                : 'text-foreground hover:bg-muted'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.disabled) return;
                              item.onClick?.();
                              closeMenu();
                            }}
                            disabled={item.disabled}
                          >
                            {/* Checkmark or icon */}
                            {item.checked !== undefined ? (
                              <span className="w-3.5 flex items-center justify-center">
                                {item.checked && (
                                  <Check className="h-3 w-3 text-teal-500" />
                                )}
                              </span>
                            ) : (
                              <item.icon className="h-3 w-3 shrink-0" />
                            )}
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.shortcut && (
                              <span className="text-[10px] text-muted-foreground">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
