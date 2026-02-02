import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Bold, Italic, Heading1, Heading2, List, ListOrdered, Code, Link, Undo, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { useUndoManager } from '@/hooks/useUndoManager';
import { Marked } from 'marked';

const TOOLBAR_GROUPS = [
  [
    { icon: Bold, label: 'Bold', prefix: '**', suffix: '**', placeholder: 'bold text' },
    { icon: Italic, label: 'Italic', prefix: '_', suffix: '_', placeholder: 'italic text' },
  ],
  [
    { icon: Heading1, label: 'Heading 1', prefix: '# ', suffix: '', placeholder: 'Heading', lineStart: true },
    { icon: Heading2, label: 'Heading 2', prefix: '## ', suffix: '', placeholder: 'Heading', lineStart: true },
  ],
  [
    { icon: List, label: 'Bullet List', prefix: '- ', suffix: '', placeholder: 'List item', lineStart: true },
    { icon: ListOrdered, label: 'Numbered List', prefix: '1. ', suffix: '', placeholder: 'List item', lineStart: true },
    { icon: Code, label: 'Code', prefix: '`', suffix: '`', placeholder: 'code' },
    { icon: Link, label: 'Link', prefix: '[', suffix: '](url)', placeholder: 'link text' },
  ],
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: content };
  const raw = match[1];
  const body = match[2];
  const fields = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      fields[key] = value;
    }
  }
  return { frontmatter: fields, body };
}

function renderFrontmatterBox(fields) {
  const rows = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<div class="fm-row"><span class="fm-key">${escapeForHtml(k)}</span><span class="fm-value">${escapeForHtml(v)}</span></div>`
    )
    .join('');
  return `<div class="md-frontmatter"><div class="fm-header"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Front Matter</div><div class="fm-body">${rows}</div></div>`;
}

function escapeForHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createMarkedInstance(recordingDir, cacheBuster) {
  const instance = new Marked({ breaks: true });

  const renderer = {
    image({ href, title, text }) {
      let src = href || '';

      // Resolve relative paths
      if (src && !src.startsWith('http') && !src.startsWith('file://') && !src.startsWith('data:')) {
        if (recordingDir) {
          src = `file://${recordingDir.replace(/\\/g, '/')}/${src}`;
        }
      }

      // Add cache buster
      if (src.startsWith('file://')) {
        src += (src.includes('?') ? '&' : '?') + `_cb=${cacheBuster}`;
      }

      const altText = escapeForHtml(text || '');
      const titleAttr = title ? ` title="${escapeForHtml(title)}"` : '';
      const filename = (href || '').split('/').pop() || '';

      return `<div class="editor-image-container">
        <img src="${src}" alt="${altText}"${titleAttr} loading="lazy" />
        <button data-edit-screenshot="${escapeForHtml(filename)}">Edit</button>
      </div>`;
    },

    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth}>${text}</h${depth}>`;
    },

    code({ text }) {
      return `<pre><code>${escapeForHtml(text)}</code></pre>`;
    },

    codespan({ text }) {
      return `<code>${escapeForHtml(text)}</code>`;
    },

    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${escapeForHtml(title)}"` : '';
      return `<a href="${escapeForHtml(href || '')}"${titleAttr}>${text}</a>`;
    },

    list({ ordered, items }) {
      const tag = ordered ? 'ol' : 'ul';
      const body = items
        .map((item) => this.listitem(item))
        .join('');
      return `<${tag}>${body}</${tag}>`;
    },

    listitem({ tokens }) {
      const text = this.parser.parse(tokens);
      return `<li>${text}</li>`;
    },

    paragraph({ tokens }) {
      const text = this.parser.parseInline(tokens);
      return `<p>${text}</p>`;
    },

    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      return `<blockquote>${body}</blockquote>`;
    },

    hr() {
      return '<hr />';
    },

    table({ header, rows }) {
      const headerHtml = header
        .map((cell) => {
          const content = this.parser.parseInline(cell.tokens);
          return `<th>${content}</th>`;
        })
        .join('');
      const rowsHtml = rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => {
                const content = this.parser.parseInline(cell.tokens);
                return `<td>${content}</td>`;
              })
              .join('')}</tr>`
        )
        .join('');
      return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
    },
  };

  instance.use({ renderer });
  return instance;
}

export function EditorPanel({ onBack, onOpenScreenshotEditor }) {
  const { state, dispatch } = useApp();
  const electronAPI = useElectronAPI();
  const { push, undo, redo, clear, canUndo, canRedo } = useUndoManager();

  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const initializedRef = useRef(false);

  const [content, setContent] = useState('');
  const [debouncedContent, setDebouncedContent] = useState('');

  const { editorContent, editorOriginalContent, editorRecordingDir, activeHistoryId, editorImageRevision, currentProjectId } = state;

  // Initialize content from context
  useEffect(() => {
    if (editorContent !== undefined) {
      setContent(editorContent);
      setDebouncedContent(editorContent);
      if (!initializedRef.current) {
        clear();
        push(editorContent, 0, 0);
        initializedRef.current = true;
      }
    }
  }, [editorContent, clear, push]);

  // Reset initialization flag when switching recordings
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, [activeHistoryId]);

  // Debounce preview updates to avoid flicker on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedContent(content), 150);
    return () => clearTimeout(timer);
  }, [content]);

  const hasUnsavedChanges = content !== editorOriginalContent;

  const handleContentChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      setContent(newValue);
      dispatch({ type: 'SET_EDITOR_CONTENT', payload: newValue });
      push(newValue, e.target.selectionStart, e.target.selectionEnd);
    },
    [dispatch, push]
  );

  const insertMarkdown = useCallback(
    (item) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = content;
      const selectedText = text.slice(start, end);

      let newText;
      let newCursorStart;
      let newCursorEnd;

      if (item.lineStart) {
        // Find start of current line
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const before = text.slice(0, lineStart);
        const after = text.slice(lineStart);

        if (selectedText) {
          newText = before + item.prefix + selectedText + item.suffix + after.slice(end - lineStart);
          newCursorStart = lineStart + item.prefix.length;
          newCursorEnd = newCursorStart + selectedText.length;
        } else {
          newText = before + item.prefix + item.placeholder + item.suffix + after.slice(start - lineStart);
          newCursorStart = lineStart + item.prefix.length;
          newCursorEnd = newCursorStart + item.placeholder.length;
        }
      } else {
        if (selectedText) {
          newText =
            text.slice(0, start) +
            item.prefix +
            selectedText +
            item.suffix +
            text.slice(end);
          newCursorStart = start + item.prefix.length;
          newCursorEnd = newCursorStart + selectedText.length;
        } else {
          newText =
            text.slice(0, start) +
            item.prefix +
            item.placeholder +
            item.suffix +
            text.slice(end);
          newCursorStart = start + item.prefix.length;
          newCursorEnd = newCursorStart + item.placeholder.length;
        }
      }

      setContent(newText);
      dispatch({ type: 'SET_EDITOR_CONTENT', payload: newText });
      push(newText, newCursorStart, newCursorEnd);

      // Restore focus and selection
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
      });
    },
    [content, dispatch, push]
  );

  const applyHistoryEntry = useCallback(
    (entry) => {
      if (!entry) return;
      setContent(entry.value);
      dispatch({ type: 'SET_EDITOR_CONTENT', payload: entry.value });
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(entry.selectionStart, entry.selectionEnd);
        }
      });
    },
    [dispatch]
  );

  const handleUndo = useCallback(() => applyHistoryEntry(undo()), [undo, applyHistoryEntry]);
  const handleRedo = useCallback(() => applyHistoryEntry(redo()), [redo, applyHistoryEntry]);

  const handleDiscard = useCallback(() => {
    setContent(editorOriginalContent);
    dispatch({ type: 'SET_EDITOR_CONTENT', payload: editorOriginalContent });
    clear();
    push(editorOriginalContent, 0, 0);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editorOriginalContent, dispatch, clear, push]);

  const handleSave = useCallback(async () => {
    if (!electronAPI || !activeHistoryId) return;
    try {
      await electronAPI.saveRecordingMarkdown(activeHistoryId, content, currentProjectId);
      dispatch({
        type: 'SET_EDITOR_ORIGINAL',
        payload: { content, dir: editorRecordingDir },
      });
    } catch (err) {
      console.error('Failed to save markdown:', err);
    }
  }, [electronAPI, activeHistoryId, content, currentProjectId, editorRecordingDir, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, handleSave, handleUndo, handleRedo]);

  // Memoize marked instance — recreate when recordingDir or image revision changes
  const markedInstance = useMemo(
    () => createMarkedInstance(editorRecordingDir, Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorRecordingDir, editorImageRevision]
  );

  // Rendered preview HTML (uses debounced content to avoid flicker)
  const previewHtml = useMemo(() => {
    const { frontmatter, body } = parseFrontmatter(debouncedContent);

    let html = '';
    if (frontmatter) {
      html += renderFrontmatterBox(frontmatter);
    }

    try {
      html += markedInstance.parse(body);
    } catch (err) {
      html += `<p style="color:#f87171">Error rendering markdown: ${escapeForHtml(String(err))}</p>`;
    }

    return html;
  }, [debouncedContent, markedInstance]);

  // Handle clicks on edit-screenshot buttons in preview
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    const handleClick = (e) => {
      const editBtn = e.target.closest('[data-edit-screenshot]');
      if (editBtn && onOpenScreenshotEditor) {
        e.preventDefault();
        const filename = editBtn.getAttribute('data-edit-screenshot');
        onOpenScreenshotEditor(activeHistoryId, filename);
      }
    };

    preview.addEventListener('click', handleClick);
    return () => preview.removeEventListener('click', handleClick);
  }, [activeHistoryId, onOpenScreenshotEditor]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="mx-2 h-4 w-px bg-secondary/50" />
        <span className="text-sm font-medium text-foreground">Markdown Editor</span>
      </div>

      {/* Split pane */}
      <div className="flex min-h-0 flex-1">
        {/* Editor side */}
        <div className="flex flex-1 flex-col border-r border-border">
          {/* Toolbar */}
          <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-border/50 px-2">
            {TOOLBAR_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center">
                {gi > 0 && (
                  <div className="mx-1.5 h-5 w-px bg-secondary/50" />
                )}
                {group.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    onClick={() => insertMarkdown(item)}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            ))}
            <div className="mx-1.5 h-5 w-px bg-secondary/50" />
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              onClick={handleUndo}
              disabled={!canUndo}
              className={cn(
                'rounded p-1.5 transition-colors',
                canUndo
                  ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  : 'cursor-not-allowed text-muted-foreground'
              )}
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Redo (Ctrl+Shift+Z)"
              onClick={handleRedo}
              disabled={!canRedo}
              className={cn(
                'rounded p-1.5 transition-colors',
                canRedo
                  ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  : 'cursor-not-allowed text-muted-foreground'
              )}
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Start writing markdown..."
          />

          {/* Save/Discard footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-border/50 px-3 py-2">
            <span
              className={cn(
                'text-xs',
                hasUnsavedChanges ? 'text-amber-400' : 'text-muted-foreground'
              )}
            >
              {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                disabled={!hasUnsavedChanges}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="h-7 bg-teal-600 text-xs text-white hover:bg-teal-700"
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Preview side */}
        <div className="flex flex-1 flex-col">
          {/* Preview header */}
          <div className="flex h-10 shrink-0 items-center border-b border-border/50 px-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </span>
          </div>

          {/* Preview content */}
          <div
            ref={previewRef}
            className="md-preview min-h-0 flex-1 overflow-auto p-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
