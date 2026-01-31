import React from 'react';
import { Monitor, List, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

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

  const viewport = settings?.viewport || '1280x720';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-7 items-center justify-between border-t border-slate-700 bg-slate-900 px-3 text-xs text-slate-400">
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
            <span className="text-slate-500">|</span>
            <span>
              {actionCount} action{actionCount !== 1 ? 's' : ''}
            </span>
            <span className="text-slate-500">|</span>
            <span>
              {screenshotCount} screenshot{screenshotCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Right: Toggle buttons + viewport */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-5 w-5 rounded',
            showLog
              ? 'bg-teal-900/50 text-teal-400'
              : 'text-slate-500 hover:text-slate-300'
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
              : 'text-slate-500 hover:text-slate-300'
          )}
          onClick={() => dispatch({ type: 'TOGGLE_SHORTCUTS' })}
          title="Toggle shortcuts panel"
        >
          <Keyboard className="h-3 w-3" />
        </Button>
        <span className="ml-2 flex items-center gap-1 text-slate-500">
          <Monitor className="h-3 w-3" />
          {viewport}
        </span>
      </div>
    </div>
  );
}
