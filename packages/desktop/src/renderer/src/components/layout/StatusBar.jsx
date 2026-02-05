import { useState, useEffect } from 'react';
import { Monitor, List, Keyboard, Download, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { ThemeToggle } from '@/components/ThemeToggle';

export function StatusBar() {
  const { state, dispatch } = useApp();
  const {
    statusText,
    isRecording,
    actionCount,
    screenshotCount,
    showLog,
    showShortcuts,
    settings,
  } = state;

  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState(null); // 'available' | 'downloading' | 'downloaded'
  const [updateVersion, setUpdateVersion] = useState('');
  const [downloadPercent, setDownloadPercent] = useState(0);

  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.getAppVersion().then(setAppVersion);

    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateStatus('available');
      setUpdateVersion(info.version);
    });

    window.electronAPI.onDownloadProgress((progress) => {
      setUpdateStatus('downloading');
      setDownloadPercent(progress.percent);
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setUpdateStatus('downloaded');
    });

    window.electronAPI.onUpdateError(() => {
      setUpdateStatus(null);
    });
  }, []);

  const rawViewport = settings?.viewport || '1280x720';
  const viewport =
    typeof rawViewport === 'object'
      ? `${rawViewport.width}x${rawViewport.height}`
      : rawViewport;

  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-card px-3 text-xs text-muted-foreground">
      {/* Left: Status text + update banner */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{statusText}</span>
        {updateStatus === 'available' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 gap-1 rounded px-2 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            onClick={() => window.electronAPI.downloadUpdate()}
          >
            <Download className="h-3 w-3" />
            Update v{updateVersion}
          </Button>
        )}
        {updateStatus === 'downloading' && (
          <span className="text-xs text-teal-600 dark:text-teal-400">
            Downloading... {downloadPercent}%
          </span>
        )}
        {updateStatus === 'downloaded' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 gap-1 rounded px-2 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            onClick={() => window.electronAPI.installUpdate()}
          >
            <RotateCw className="h-3 w-3" />
            Restart to update
          </Button>
        )}
      </div>

      {/* Center: Recording indicator */}
      <div className="flex items-center gap-3">
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral-500" />
            </span>
            <span className="font-semibold text-coral-400">REC</span>
            <span className="text-muted-foreground">|</span>
            <span>
              {actionCount} action{actionCount !== 1 ? 's' : ''}
            </span>
            <span className="text-muted-foreground">|</span>
            <span>
              {screenshotCount} screenshot{screenshotCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Right: Toggle buttons + viewport (recording only) + theme toggle */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {isRecording && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-5 w-5 rounded',
                showLog
                  ? 'bg-teal-600/20 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => dispatch({ type: 'TOGGLE_LOG' })}
              title="Toggle action log"
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-5 w-5 rounded',
                showShortcuts
                  ? 'bg-teal-600/20 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
              title="Toggle shortcuts panel"
            >
              <Keyboard className="h-3 w-3" />
            </Button>
            <span className="ml-2 flex items-center gap-1 text-muted-foreground">
              <Monitor className="h-3 w-3" />
              {viewport}
            </span>
          </>
        )}
        <ThemeToggle />
        {appVersion && (
          <span className="ml-1 text-muted-foreground/50">v{appVersion}</span>
        )}
      </div>
    </div>
  );
}
