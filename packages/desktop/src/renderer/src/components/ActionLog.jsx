import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAppState } from '@/context/AppContext';

export function ActionLog() {
  const state = useAppState();
  const scrollRef = useRef(null);

  const { logEntries, showLog, isRecording } = state;

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logEntries]);

  if (!showLog || !isRecording) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Action Log
        </span>
        <span className="text-[10px] text-muted-foreground">
          {logEntries.length} entries
        </span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-40 overflow-y-auto p-2 font-mono text-xs"
      >
        {logEntries.length === 0 ? (
          <div className="py-2 text-center text-muted-foreground">
            Waiting for actions...
          </div>
        ) : (
          logEntries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex gap-2 border-b border-border/50 py-1 last:border-0',
                entry.type === 'error' && 'text-red-400',
                entry.type === 'screenshot' && 'text-teal-400',
                entry.type === 'navigation' && 'text-amber-400',
                (!entry.type || entry.type === 'action') && 'text-muted-foreground'
              )}
            >
              <span className="shrink-0 text-muted-foreground">
                {entry.timestamp || '--:--:--'}
              </span>
              <span
                className={cn(
                  'shrink-0 w-16 text-right uppercase',
                  entry.type === 'error' && 'text-red-500',
                  entry.type === 'screenshot' && 'text-teal-500',
                  entry.type === 'navigation' && 'text-amber-500',
                  (!entry.type || entry.type === 'action') && 'text-muted-foreground'
                )}
              >
                {entry.type || 'action'}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {entry.message || entry.text || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
