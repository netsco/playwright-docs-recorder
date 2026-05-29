import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, PanelLeft } from 'lucide-react';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { useAppState, useAppDispatch } from '@/context/AppContext';
import { TitlebarMenu } from './TitlebarMenu';

export function Titlebar({ onNewRecording, onImportProject, onExportProject }) {
  const api = useElectronAPI();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [isMaximized, setIsMaximized] = useState(false);
  const platform = api?.platform || 'win32';

  useEffect(() => {
    if (!api) return;
    api.windowIsMaximized().then(setIsMaximized);
    api.onWindowMaximizedChange(setIsMaximized);
  }, [api]);

  const handleMinimize = () => api?.windowMinimize();
  const handleMaximize = () => api?.windowMaximize();
  const handleClose = () => api?.windowClose();

  return (
    <div
      className="titlebar-drag flex h-[38px] shrink-0 items-center border-b border-border bg-card select-none relative z-[60]"
      onDoubleClick={handleMaximize}
    >
      {/* macOS: leave space for native traffic lights */}
      {platform === 'darwin' && <div className="w-[75px] shrink-0" />}

      {/* Hamburger menu + sidebar toggle */}
      <div className="titlebar-no-drag flex items-center">
        <TitlebarMenu
          onNewRecording={onNewRecording}
          onImportProject={onImportProject}
          onExportProject={onExportProject}
        />
        {state.sidebarVisible && (
          <button
            className="flex h-[38px] w-[34px] items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            title={state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* App title */}
      <div className="flex-1 min-w-0 px-3">
        <span className="text-xs font-medium text-muted-foreground">
          Documentation Recorder
        </span>
      </div>

      {/* Linux: custom window control buttons */}
      {platform === 'linux' && (
        <div className="titlebar-no-drag flex items-center">
          <button
            onClick={handleMinimize}
            className="flex h-[38px] w-[46px] items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-[38px] w-[46px] items-center justify-center text-muted-foreground hover:bg-secondary/80 transition-colors"
          >
            {isMaximized ? (
              <Copy className="h-3.5 w-3.5" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="flex h-[38px] w-[46px] items-center justify-center text-muted-foreground hover:bg-red-500/90 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
