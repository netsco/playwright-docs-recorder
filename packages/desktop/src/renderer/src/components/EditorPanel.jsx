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
        `<tr><td style="padding:2px 12px 2px 0;font-weight:600;color:#94a3b8;white-space:nowrap;vertical-align:top">${escapeForHtml(k)}</td><td style="padding:2px 0;color:#cbd5e1">${escapeForHtml(v)}</td></tr>`
    )
    .join('');
  return `<div style="margin-bottom:20px;padding:12px 16px;background:#1e293b;border:1px solid #334155;border-radius:8px;font-size:13px"><table style="border-collapse:collapse">${rows}</table></div>`;
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

      return `<div class="editor-image-container" style="position:relative;margin:16px 0;text-align:center">
        <img src="${src}" alt="${altText}"${titleAttr} style="max-width:100%;border-radius:6px;border:1px solid #334155" loading="lazy" />
        <button data-edit-screenshot="${escapeForHtml(filename)}" style="position:absolute;top:8px;right:8px;padding:4px 10px;background:rgba(15,23,42,0.85);color:#5eead4;border:1px solid #334155;border-radius:4px;font-size:12px;cursor:pointer;opacity:0;transition:opacity 0.15s" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">Edit</button>
        <style>.editor-image-container:hover button{opacity:1 !important}</style>
      </div>`;
    },

    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const sizes = {
        1: 'font-size:24px;font-weight:700;margin:24px 0 12px',
        2: 'font-size:20px;font-weight:600;margin:20px 0 10px',
        3: 'font-size:17px;font-weight:600;margin:16px 0 8px',
        4: 'font-size:15px;font-weight:600;margin:14px 0 6px',
        5: 'font-size:14px;font-weight:600;margin:12px 0 6px',
        6: 'font-size:13px;font-weight:600;margin:10px 0 4px',
      };
      return `<h${depth} style="${sizes[depth] || ''};color:#e2e8f0;line-height:1.3">${text}</h${depth}>`;
    },

    code({ text, lang }) {
      return `<pre style="background:#0f172a;border:1px solid #334155;border-radius:6px;padding:12px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:'Fira Code','Cascadia Code',Consolas,monospace;font-size:13px;color:#a5f3fc;line-height:1.5">${escapeForHtml(text)}</code></pre>`;
    },

    codespan({ text }) {
      return `<code style="background:#1e293b;padding:2px 6px;border-radius:3px;font-family:'Fira Code','Cascadia Code',Consolas,monospace;font-size:0.9em;color:#a5f3fc">${escapeForHtml(text)}</code>`;
    },

    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${escapeForHtml(title)}"` : '';
      return `<a href="${escapeForHtml(href || '')}"${titleAttr} style="color:#5eead4;text-decoration:underline;text-decoration-color:#5eead480">${text}</a>`;
    },

    list({ ordered, items }) {
      const tag = ordered ? 'ol' : 'ul';
      const style = ordered
        ? 'list-style:decimal;padding-left:24px;margin:8px 0;color:#cbd5e1'
        : 'list-style:disc;padding-left:24px;margin:8px 0;color:#cbd5e1';
      const body = items
        .map((item) => this.listitem(item))
        .join('');
      return `<${tag} style="${style}">${body}</${tag}>`;
    },

    listitem({ tokens }) {
      const text = this.parser.parse(tokens);
      return `<li style="margin:4px 0;line-height:1.6">${text}</li>`;
    },

    paragraph({ tokens }) {
      const text = this.parser.parseInline(tokens);
      return `<p style="margin:10px 0;line-height:1.7;color:#cbd5e1">${text}</p>`;
    },

    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      return `<blockquote style="border-left:3px solid #5eead4;padding:4px 16px;margin:12px 0;color:#94a3b8;background:#0f172a80;border-radius:0 4px 4px 0">${body}</blockquote>`;
    },

    hr() {
      return '<hr style="border:none;border-top:1px solid #334155;margin:20px 0" />';
    },

    table({ header, rows }) {
      const headerHtml = header
        .map((cell) => {
          const content = this.parser.parseInline(cell.tokens);
          return `<th style="padding:8px 12px;border:1px solid #334155;color:#e2e8f0;font-weight:600;text-align:left">${content}</th>`;
        })
        .join('');
      const rowsHtml = rows
        .map(
          (row) =>
            `<tr style="border-bottom:1px solid #334155">${row
              .map((cell) => {
                const content = this.parser.parseInline(cell.tokens);
                return `<td style="padding:8px 12px;border:1px solid #334155;color:#cbd5e1">${content}</td>`;
              })
              .join('')}</tr>`
        )
        .join('');
      return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px"><thead style="background:#1e293b"><tr style="border-bottom:1px solid #334155">${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
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
  const [selectionStart, setSelectionStart] = useState(0);

  const { editorContent, editorOriginalContent, editorRecordingDir, activeHistoryId, editorImageRevision } = state;

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
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      setContent(newValue);
      setSelectionStart(start);
      dispatch({ type: 'SET_EDITOR_CONTENT', payload: newValue });
      push(newValue, start, end);
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

  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      setContent(entry.value);
      dispatch({ type: 'SET_EDITOR_CONTENT', payload: entry.value });
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(entry.selectionStart, entry.selectionEnd);
        }
      });
    }
  }, [undo, dispatch]);

  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      setContent(entry.value);
      dispatch({ type: 'SET_EDITOR_CONTENT', payload: entry.value });
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(entry.selectionStart, entry.selectionEnd);
        }
      });
    }
  }, [redo, dispatch]);

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
      await electronAPI.saveMarkdown(activeHistoryId, content);
      dispatch({
        type: 'SET_EDITOR_ORIGINAL',
        payload: { content, dir: editorRecordingDir },
      });
    } catch (err) {
      console.error('Failed to save markdown:', err);
    }
  }, [electronAPI, activeHistoryId, content, editorRecordingDir, dispatch]);

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
    <div className="flex h-full flex-col bg-slate-950">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center border-b border-slate-800 px-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-7 gap-1 px-2 text-slate-400 hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="mx-2 h-4 w-px bg-slate-700/50" />
        <span className="text-sm font-medium text-slate-300">Markdown Editor</span>
      </div>

      {/* Split pane */}
      <div className="flex min-h-0 flex-1">
        {/* Editor side */}
        <div className="flex flex-1 flex-col border-r border-slate-800">
          {/* Toolbar */}
          <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-slate-800/50 px-2">
            {TOOLBAR_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center">
                {gi > 0 && (
                  <div className="mx-1.5 h-5 w-px bg-slate-700/50" />
                )}
                {group.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    onClick={() => insertMarkdown(item)}
                    className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  >
                    <item.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            ))}
            <div className="mx-1.5 h-5 w-px bg-slate-700/50" />
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              onClick={handleUndo}
              disabled={!canUndo}
              className={cn(
                'rounded p-1.5 transition-colors',
                canUndo
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'cursor-not-allowed text-slate-600'
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
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  : 'cursor-not-allowed text-slate-600'
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
            className="min-h-0 flex-1 resize-none bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-300 placeholder:text-slate-600 focus:outline-none"
            placeholder="Start writing markdown..."
          />

          {/* Save/Discard footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-slate-800/50 px-3 py-2">
            <span
              className={cn(
                'text-xs',
                hasUnsavedChanges ? 'text-amber-400' : 'text-slate-500'
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
                className="h-7 text-xs text-slate-400 hover:text-slate-200"
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
          <div className="flex h-10 shrink-0 items-center border-b border-slate-800/50 px-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Preview
            </span>
          </div>

          {/* Preview content */}
          <div
            ref={previewRef}
            className="min-h-0 flex-1 overflow-auto p-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
