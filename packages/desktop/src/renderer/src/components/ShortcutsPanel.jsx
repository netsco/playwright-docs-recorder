import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Maximize,
  StickyNote,
  XCircle,
  GripHorizontal,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

const SHORTCUTS = [
  { keys: 'Ctrl+Shift+S', action: 'Screenshot' },
  { keys: 'Ctrl+Shift+K', action: 'Screenshot + Note' },
  { keys: 'Ctrl+Shift+F', action: 'Full Page Screenshot' },
  { keys: 'Ctrl+Shift+H', action: 'Record Hover' },
  { keys: 'Ctrl+Shift+X', action: 'Clear Highlight' },
  { keys: 'Ctrl+Click', action: 'Highlight Element' },
  { keys: 'Ctrl+Hover', action: 'Preview Highlight' },
  { keys: 'Ctrl+C', action: 'Stop & Save' },
];

export function ShortcutsPanel({
  onStopRecording,
  onScreenshot,
  onFullPageScreenshot,
  onNoteScreenshot,
  onClearHighlight,
}) {
  const { state } = useApp();
  const { showShortcuts, isRecording } = state;

  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);

  // Initialize position to bottom-right on mount
  useEffect(() => {
    if (position.x === -1 && position.y === -1 && panelRef.current) {
      const parent = panelRef.current.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const panelRect = panelRef.current.getBoundingClientRect();
        setPosition({
          x: parentRect.width - panelRect.width - 16,
          y: parentRect.height - panelRect.height - 16,
        });
      }
    }
  }, [position.x, position.y, showShortcuts]);

  const handleMouseDown = useCallback((e) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !panelRef.current) return;

      const parent = panelRef.current.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();

      let newX = e.clientX - parentRect.left - dragOffset.current.x;
      let newY = e.clientY - parentRect.top - dragOffset.current.y;

      // Constrain to parent bounds
      newX = Math.max(0, Math.min(newX, parentRect.width - panelRect.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - panelRect.height));

      setPosition({ x: newX, y: newY });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!showShortcuts || !isRecording) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'absolute z-40 w-64 rounded-lg border border-slate-700 bg-slate-900/95 shadow-xl backdrop-blur-sm',
        isDragging && 'cursor-grabbing select-none'
      )}
      style={{
        left: position.x >= 0 ? position.x : undefined,
        top: position.y >= 0 ? position.y : undefined,
        right: position.x < 0 ? 16 : undefined,
        bottom: position.y < 0 ? 16 : undefined,
      }}
    >
      {/* Drag handle header */}
      <div
        className="flex cursor-grab items-center justify-center border-b border-slate-800 py-1.5 active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="h-4 w-4 text-slate-600" />
      </div>

      <div className="p-3">
        {/* Stop Recording button */}
        <Button
          onClick={onStopRecording}
          className="mb-3 h-8 w-full gap-2 bg-coral-600 text-xs font-semibold text-white hover:bg-coral-700"
        >
          <Square className="h-3 w-3 fill-current" />
          Stop Recording
        </Button>

        {/* Action buttons row */}
        <div className="mb-3 flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px]"
            onClick={onScreenshot}
            title="Take screenshot (Ctrl+Shift+S)"
          >
            <Camera className="h-3 w-3" />
            Shot
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px]"
            onClick={onFullPageScreenshot}
            title="Full page screenshot (Ctrl+Shift+F)"
          >
            <Maximize className="h-3 w-3" />
            Full
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px]"
            onClick={onNoteScreenshot}
            title="Screenshot with note (Ctrl+Shift+K)"
          >
            <StickyNote className="h-3 w-3" />
            Note
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 flex-1 gap-1 text-[10px]"
            onClick={onClearHighlight}
            title="Clear highlight (Ctrl+Shift+X)"
          >
            <XCircle className="h-3 w-3" />
            Clear
          </Button>
        </div>

        {/* Keyboard shortcuts */}
        <div className="space-y-1">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Keyboard Shortcuts
          </div>
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-slate-400">{shortcut.action}</span>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
