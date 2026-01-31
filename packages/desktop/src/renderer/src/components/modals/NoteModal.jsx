import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link,
  Undo,
  Redo,
} from 'lucide-react';

const TOOLBAR_GROUPS = [
  [
    { icon: Bold, label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
    { icon: Italic, label: 'Italic', prefix: '_', suffix: '_', placeholder: 'italic text' },
  ],
  [
    { icon: Heading1, label: 'H1', prefix: '# ', suffix: '', placeholder: 'Heading 1', line: true },
    { icon: Heading2, label: 'H2', prefix: '## ', suffix: '', placeholder: 'Heading 2', line: true },
  ],
  [
    { icon: List, label: 'Bullet list', prefix: '- ', suffix: '', placeholder: 'List item', line: true },
    { icon: ListOrdered, label: 'Numbered list', prefix: '1. ', suffix: '', placeholder: 'List item', line: true },
    { icon: Code, label: 'Code', prefix: '`', suffix: '`', placeholder: 'code' },
    { icon: Link, label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
  ],
];

export default function NoteModal({ open, onOpenChange, config, onSave }) {
  const { title = 'Add Note', withScreenshot = false } = config || {};

  const [note, setNote] = useState('');
  const textareaRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  useEffect(() => {
    if (open) {
      setNote('');
      undoStack.current = [];
      redoStack.current = [];
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const pushUndo = useCallback((value) => {
    undoStack.current.push(value);
    redoStack.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const previous = undoStack.current.pop();
    redoStack.current.push(note);
    setNote(previous);
  }, [note]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(note);
    setNote(next);
  }, [note]);

  const insertMarkdown = useCallback(
    (item) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = note.substring(start, end);

      pushUndo(note);

      let newText;
      let cursorPos;

      if (item.line) {
        // Line-level formatting: insert at beginning of line
        const lineStart = note.lastIndexOf('\n', start - 1) + 1;
        const before = note.substring(0, lineStart);
        const after = note.substring(lineStart);
        const insertion = selectedText || item.placeholder;
        newText = before + item.prefix + (selectedText ? after : insertion + after.substring(0));

        if (selectedText) {
          newText = note.substring(0, lineStart) + item.prefix + note.substring(lineStart);
          cursorPos = start + item.prefix.length + selectedText.length;
        } else {
          newText = before + item.prefix + insertion + note.substring(start);
          cursorPos = lineStart + item.prefix.length + insertion.length;
        }
      } else {
        // Inline formatting: wrap selection
        const insertion = selectedText || item.placeholder;
        newText =
          note.substring(0, start) +
          item.prefix +
          insertion +
          item.suffix +
          note.substring(end);

        if (selectedText) {
          cursorPos = start + item.prefix.length + selectedText.length + item.suffix.length;
        } else {
          cursorPos = start + item.prefix.length;
        }
      }

      setNote(newText);

      requestAnimationFrame(() => {
        textarea.focus();
        if (!selectedText && !item.line) {
          textarea.setSelectionRange(cursorPos, cursorPos + item.placeholder.length);
        } else {
          textarea.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [note, pushUndo]
  );

  const handleSave = () => {
    onSave(note);
    onOpenChange(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const saveLabel = withScreenshot ? 'Save Screenshot' : 'Add Note';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Markdown Toolbar */}
          <div className="flex items-center gap-0.5 flex-wrap rounded-md border border-slate-700 bg-slate-800/60 p-1">
            {TOOLBAR_GROUPS.map((group, gi) => (
              <React.Fragment key={gi}>
                {gi > 0 && (
                  <div className="w-px h-5 bg-slate-700 mx-1" />
                )}
                {group.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    className={cn(
                      'inline-flex items-center justify-center h-7 w-7 rounded text-slate-400',
                      'hover:bg-slate-700 hover:text-slate-200 transition-colors'
                    )}
                    onClick={() => insertMarkdown(item)}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </React.Fragment>
            ))}
            <div className="w-px h-5 bg-slate-700 mx-1" />
            <button
              type="button"
              title="Undo"
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded text-slate-400',
                'hover:bg-slate-700 hover:text-slate-200 transition-colors',
                undoStack.current.length === 0 && 'opacity-40 cursor-not-allowed'
              )}
              onClick={handleUndo}
              disabled={undoStack.current.length === 0}
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Redo"
              className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded text-slate-400',
                'hover:bg-slate-700 hover:text-slate-200 transition-colors',
                redoStack.current.length === 0 && 'opacity-40 cursor-not-allowed'
              )}
              onClick={handleRedo}
              disabled={redoStack.current.length === 0}
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Note Input */}
          <Textarea
            ref={textareaRef}
            placeholder="Enter your note (markdown supported)..."
            value={note}
            onChange={(e) => {
              pushUndo(note);
              setNote(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            rows={6}
            className="font-mono text-sm"
          />

          {/* Hint */}
          <p className="text-xs text-slate-500">
            Ctrl+Enter to save &middot; Escape to cancel
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
