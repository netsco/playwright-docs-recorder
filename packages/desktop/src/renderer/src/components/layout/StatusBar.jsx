import { Monitor, List, Keyboard } from 'lucide-react';
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

  const rawViewport = settings?.viewport || '1280x720';
  const viewport =
    typeof rawViewport === 'object'
      ? `${rawViewport.width}x${rawViewport.height}`
      : rawViewport;

  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-card px-3 text-xs text-muted-foreground">
      {/* Left: Status text */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate">{statusText}</span>
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
                  ? 'bg-teal-900/50 text-teal-400'
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
                  ? 'bg-teal-900/50 text-teal-400'
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
      </div>
    </div>
  );
}
