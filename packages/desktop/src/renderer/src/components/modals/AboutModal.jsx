import { ExternalLink, Download, RotateCw, RefreshCw, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';

export default function AboutModal({ open, onOpenChange }) {
  const { state, dispatch } = useApp();
  const api = useElectronAPI();

  const {
    appVersion,
    updateStatus,
    updateVersion,
    updateDownloadPercent,
    updateReleaseNotes,
    updateError,
    updateManual,
    updateDownloadUrl,
  } = state;

  const handleCheckForUpdates = async () => {
    dispatch({ type: 'SET_UPDATE_STATUS', payload: { status: 'checking' } });
    try {
      await api.checkForUpdates();
    } catch {
      // Error will come through onUpdateError listener
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>About</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* App info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Documentation Recorder</h3>
            {appVersion && (
              <p className="text-xs text-muted-foreground mt-0.5">Version {appVersion}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Record browser interactions with screenshots and generate Playwright scripts with markdown documentation.
            </p>
          </div>

          {/* GitHub link */}
          <button
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
            onClick={() => api?.openExternal('https://github.com/netsco/playwright-docs-recorder')}
          >
            <ExternalLink className="h-3 w-3" />
            View on GitHub
          </button>

          <div className="border-t border-border" />

          {/* Updates section */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Updates
            </h4>

            {/* Default / not-available state */}
            {(updateStatus === null || updateStatus === 'not-available') && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleCheckForUpdates}
                >
                  <RefreshCw className="h-3 w-3" />
                  Check for Updates
                </Button>
                {updateStatus === 'not-available' && (
                  <span className="text-xs text-muted-foreground">You're up to date</span>
                )}
              </div>
            )}

            {/* Checking */}
            {updateStatus === 'checking' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking for updates...
              </div>
            )}

            {/* Available */}
            {updateStatus === 'available' && (
              <div className="space-y-2">
                <p className="text-xs text-foreground">
                  Version <span className="font-semibold">{updateVersion}</span> is available
                </p>
                {updateReleaseNotes && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {typeof updateReleaseNotes === 'string'
                      ? updateReleaseNotes
                      : updateReleaseNotes.toString()}
                  </p>
                )}
                {updateManual ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-teal-600 border-teal-600/30 hover:bg-teal-600/10 dark:text-teal-400 dark:border-teal-400/30 dark:hover:bg-teal-400/10"
                    onClick={() =>
                      api?.openExternal(
                        updateDownloadUrl ||
                          'https://github.com/netsco/playwright-docs-recorder/releases/latest'
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    Download from GitHub
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-teal-600 border-teal-600/30 hover:bg-teal-600/10 dark:text-teal-400 dark:border-teal-400/30 dark:hover:bg-teal-400/10"
                    onClick={() => api?.downloadUpdate()}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                )}
              </div>
            )}

            {/* Downloading */}
            {updateStatus === 'downloading' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Downloading...</span>
                  <span>{updateDownloadPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${updateDownloadPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Downloaded */}
            {updateStatus === 'downloaded' && (
              <div className="space-y-1.5">
                <p className="text-xs text-foreground">Update ready to install</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-teal-600 border-teal-600/30 hover:bg-teal-600/10 dark:text-teal-400 dark:border-teal-400/30 dark:hover:bg-teal-400/10"
                  onClick={() => api?.installUpdate()}
                >
                  <RotateCw className="h-3 w-3" />
                  Install and Restart
                </Button>
              </div>
            )}

            {/* Error */}
            {updateStatus === 'error' && (
              <div className="space-y-1.5">
                <p className="text-xs text-red-500 dark:text-red-400">
                  {updateError || 'Failed to check for updates'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleCheckForUpdates}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
