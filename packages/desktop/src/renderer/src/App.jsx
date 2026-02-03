import { useEffect, useRef, useCallback, useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toolbar } from '@/components/layout/Toolbar';
import { StatusBar } from '@/components/layout/StatusBar';
import { ProjectList } from '@/components/ProjectList';
import { WelcomePanel } from '@/components/WelcomePanel';
import { WebviewContainer } from '@/components/WebviewContainer';
import { EditorPanel } from '@/components/EditorPanel';
import { ActionLog } from '@/components/ActionLog';
import ProjectModal from '@/components/modals/ProjectModal';
import MoveRecordingModal from '@/components/modals/MoveRecordingModal';
import RefetchModal from '@/components/modals/RefetchModal';
import NoteModal from '@/components/modals/NoteModal';
import TextInputModal from '@/components/modals/TextInputModal';

import { ShortcutsPanel } from '@/components/ShortcutsPanel';
import { ScreenshotEditor } from '@/components/ScreenshotEditor';

function formatActionMessage(action) {
  switch (action.type) {
    case 'click':
      return action.selector ? `click \u2192 ${action.selector}` : 'click';
    case 'fill':
      return action.selector
        ? `fill \u2192 ${action.selector} \u2192 "${action.value?.substring(0, 20)}"`
        : 'fill';
    case 'goto':
      return action.url ? `goto \u2192 ${action.url}` : 'goto';
    case 'screenshot':
      return `screenshot \u2192 ${action.filename || 'captured'}`;
    case 'hover':
      return action.selector ? `hover \u2192 ${action.selector}` : 'hover';
    case 'note':
      return `note \u2192 "${action.note?.substring(0, 30)}"`;
    default:
      return action.type;
  }
}

function AppContent() {
  const { state, dispatch } = useApp();
  const api = useElectronAPI();
  const webviewRef = useRef(null);
  const [pendingScreenshot, setPendingScreenshot] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [screenshotEditorConfig, setScreenshotEditorConfig] = useState(null);
  const [textInputConfig, setTextInputConfig] = useState(null);

  const hasUnsavedEditorChanges =
    state.currentView === 'editor' &&
    state.editorContent !== state.editorOriginalContent;

  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedEditorChanges) return true;
    return confirm('You have unsaved changes. Discard and leave?');
  }, [hasUnsavedEditorChanges]);

  // ===== Theme =====
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // ===== Initialization =====
  useEffect(() => {
    async function init() {
      if (!api) return;

      try {
        const settings = await api.getSettings();
        dispatch({ type: 'SET_SETTINGS', payload: settings });

        // Apply persisted theme
        if (settings.theme) {
          dispatch({ type: 'SET_THEME', payload: settings.theme });
        }

        const data = await api.getProjects();
        dispatch({ type: 'SET_PROJECTS', payload: data.projects || [] });

        // Auto-open last project
        if (data.lastOpenedProjectId) {
          const project = (data.projects || []).find(
            (p) => p.id === data.lastOpenedProjectId
          );
          if (project) {
            await selectProject(project);
            return;
          }
        }
        dispatch({ type: 'SET_VIEW', payload: 'projectList' });
      } catch (err) {
        console.error('Initialization error:', err);
        dispatch({ type: 'SET_VIEW', payload: 'projectList' });
      }
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== IPC Event Listeners =====
  useEffect(() => {
    if (!api) return;

    api.onActionRecorded((action) => {
      if (action.type !== 'screenshot') {
        dispatch({ type: 'INCREMENT_ACTION' });
      }

      dispatch({
        type: 'ADD_LOG_ENTRY',
        payload: { message: formatActionMessage(action), type: 'action' },
      });
    });

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Project Management =====
  const selectProject = useCallback(
    async (project) => {
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
      dispatch({ type: 'SET_SIDEBAR_VISIBLE', payload: true });
      await api.setLastOpenedProject(project.id);

      const recordings = await api.getProjectRecordings(project.id);
      dispatch({ type: 'SET_RECORDINGS', payload: recordings || [] });
      dispatch({ type: 'SET_VIEW', payload: 'welcome' });

      document.title = `${project.name} - Documentation Recorder`;
    },
    [api, dispatch]
  );

  const handleBackToProjects = useCallback(async () => {
    if (!confirmDiscardChanges()) return;
    await api.setLastOpenedProject(null);
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
    dispatch({ type: 'SET_SIDEBAR_VISIBLE', payload: false });
    dispatch({ type: 'SET_VIEW', payload: 'projectList' });
    document.title = 'Documentation Recorder';
  }, [api, dispatch, confirmDiscardChanges]);

  // ===== Project Import/Export =====
  const handleExportProject = useCallback(
    async (projectId) => {
      try {
        const result = await api.exportProject(projectId);
        if (result.success) {
          dispatch({ type: 'SET_STATUS', payload: 'Project exported' });
        } else if (!result.canceled) {
          dispatch({ type: 'SET_STATUS', payload: `Export error: ${result.error}` });
        }
      } catch (err) {
        dispatch({ type: 'SET_STATUS', payload: `Export error: ${err.message}` });
      }
    },
    [api, dispatch]
  );

  const handleImportProject = useCallback(async () => {
    try {
      const result = await api.importProject();
      if (result.success) {
        const data = await api.getProjects();
        dispatch({ type: 'SET_PROJECTS', payload: data.projects || [] });
        dispatch({ type: 'SET_STATUS', payload: 'Project imported' });
      } else if (!result.canceled) {
        dispatch({ type: 'SET_STATUS', payload: `Import error: ${result.error}` });
      }
    } catch (err) {
      dispatch({ type: 'SET_STATUS', payload: `Import error: ${err.message}` });
    }
  }, [api, dispatch]);

  // ===== Recording =====
  const handleStartRecording = useCallback(
    async (config) => {
      const {
        url,
        title,
        viewport,
        separator,
        recordActions,
        customCSS,
        settingsOverride,
      } = config;

      dispatch({ type: 'SET_VIEW', payload: 'recording' });

      // Navigate webview
      const fullUrl = url.startsWith('http') ? url : 'https://' + url;
      setCurrentUrl(fullUrl);

      // Wait for webview to be ready, then navigate
      setTimeout(async () => {
        if (webviewRef.current) {
          webviewRef.current.navigate(fullUrl);
        }
      }, 100);

      // Wait for page load then start recording via IPC
      const startAfterLoad = async () => {
        try {
          const result = await api.startRecording(fullUrl, {
            projectId: state.currentProjectId,
            title,
            viewport,
            separator,
            recordActions,
            customCSS: customCSS || '',
            injectCSS: !!customCSS,
            settingsOverride: settingsOverride || {},
          });

          if (result.success) {
            dispatch({
              type: 'SET_RECORDING',
              payload: {
                isRecording: true,
                recordActions,
                customCSS: customCSS || '',
              },
            });
            dispatch({
              type: 'SET_STATUS',
              payload: recordActions
                ? 'Recording...'
                : 'Screenshots-only mode...',
            });
            dispatch({
              type: 'ADD_LOG_ENTRY',
              payload: {
                message: recordActions
                  ? 'Recording started'
                  : 'Screenshots-only mode started',
                type: 'info',
              },
            });

            if (webviewRef.current) {
              webviewRef.current.send('recording-started', { recordActions });
              if (customCSS) {
                webviewRef.current.send('inject-custom-css', customCSS);
              }
            }
          } else {
            dispatch({
              type: 'SET_STATUS',
              payload: `Error starting recording: ${result.error || 'Unknown error'}`,
            });
            dispatch({ type: 'SET_VIEW', payload: 'welcome' });
          }
        } catch (err) {
          dispatch({
            type: 'SET_STATUS',
            payload: `Error starting recording: ${err.message}`,
          });
          dispatch({ type: 'SET_VIEW', payload: 'welcome' });
        }
      };

      // Give webview time to load
      setTimeout(startAfterLoad, 2000);
    },
    [api, state.currentProjectId, dispatch]
  );

  const handleStopRecording = useCallback(async () => {
    try {
      const result = await api.stopRecording();
      dispatch({ type: 'RESET_RECORDING_STATE' });

      if (webviewRef.current) {
        webviewRef.current.send('recording-stopped');
      }

      if (result.success) {
        dispatch({
          type: 'SET_STATUS',
          payload: `Saved: ${result.recording.actionCount} actions, ${result.recording.screenshotCount} screenshots`,
        });

        const recordings = await api.getProjectRecordings(
          state.currentProjectId
        );
        dispatch({ type: 'SET_RECORDINGS', payload: recordings || [] });
        dispatch({ type: 'SET_ACTIVE_HISTORY', payload: result.recording.id });
        await openEditor(result.recording.id);
      } else {
        dispatch({
          type: 'SET_STATUS',
          payload: `Error: ${result.error}`,
        });
        dispatch({ type: 'SET_VIEW', payload: 'welcome' });
      }
    } catch (err) {
      dispatch({ type: 'RESET_RECORDING_STATE' });
      dispatch({
        type: 'SET_STATUS',
        payload: `Error stopping recording: ${err.message}`,
      });
      dispatch({ type: 'SET_VIEW', payload: 'welcome' });
    }
  }, [api, state.currentProjectId, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Screenshots =====
  const captureScreenshot = useCallback(
    async (selector, note, fullPage = false) => {
      try {
        const wv = webviewRef.current;
        if (!wv) return;

        // Capture highlight overlay rect before hiding it
        let highlightOverlay = null;
        if (selector) {
          try {
            highlightOverlay = await wv.executeJavaScript(
              `(function(){const o=document.getElementById('__highlight-overlay');if(!o||o.style.display==='none')return null;const r=o.getBoundingClientRect();if(r.width===0||r.height===0)return null;return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),borderRadius:4};})()`
            );
          } catch {
            // Ignore errors reading overlay rect
          }
        }

        // Hide scrollbars and highlight overlay during capture
        await wv.executeJavaScript(
          `(function(){const s=document.createElement('style');s.id='__doc-recorder-hide-scrollbars';s.textContent='*::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important;-ms-overflow-style:none!important}';document.head.appendChild(s);const o=document.getElementById('__highlight-overlay');if(o)o.style.display='none';})()`
        );

        let dataUrl;
        if (fullPage) {
          dataUrl = await captureFullPage(wv);
        } else {
          const image = await wv.capturePage();
          dataUrl = image.toDataURL();
        }

        // Restore scrollbars and highlight overlay
        await wv
          .executeJavaScript(
            `(function(){const s=document.getElementById('__doc-recorder-hide-scrollbars');if(s)s.remove();const o=document.getElementById('__highlight-overlay');if(o)o.style.display='block';})()`
          )
          .catch(() => {});

        const pageTitle = await wv.executeJavaScript('document.title').catch(() => '');

        const result = await api.captureScreenshot({
          selector,
          note,
          fullPage,
          imageDataUrl: dataUrl,
          highlightOverlay: highlightOverlay ? { ...highlightOverlay, selector } : undefined,
          pageTitle,
        });

        if (result.success) {
          dispatch({ type: 'INCREMENT_SCREENSHOT' });
          dispatch({
            type: 'SET_STATUS',
            payload: `Screenshot saved: ${result.filename}${fullPage ? ' (full page)' : ''}`,
          });
          dispatch({
            type: 'ADD_SCREENSHOT_PREVIEW',
            payload: { filename: result.filename, dataUrl, note },
          });
        }
      } catch (error) {
        // Restore scrollbars and highlight overlay on error
        webviewRef.current
          ?.executeJavaScript(
            `(function(){const s=document.getElementById('__doc-recorder-hide-scrollbars');if(s)s.remove();const o=document.getElementById('__highlight-overlay');if(o)o.style.display='block';})()`
          )
          .catch(() => {});
        dispatch({
          type: 'SET_STATUS',
          payload: `Screenshot error: ${error.message}`,
        });
      }
    },
    [api, dispatch] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const captureFullPage = useCallback(async (wv) => {
    const dims = await wv.executeJavaScript(
      `(function(){return{scrollHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),viewportHeight:window.innerHeight,viewportWidth:window.innerWidth,scrollX:window.scrollX,scrollY:window.scrollY};})()`
    );

    // If the page fits in the viewport, just capture it directly
    if (dims.scrollHeight <= dims.viewportHeight) {
      const image = await wv.capturePage();
      return image.toDataURL();
    }

    const numCaptures = Math.ceil(dims.scrollHeight / dims.viewportHeight);
    const captures = [];

    for (let i = 0; i < numCaptures; i++) {
      const scrollTo = i * dims.viewportHeight;
      await wv.executeJavaScript(
        `window.scrollTo(${dims.scrollX}, ${scrollTo})`
      );
      // Wait for rendering after scroll
      await new Promise((r) => setTimeout(r, 100));
      const image = await wv.capturePage();
      const isLast = i === numCaptures - 1;
      captures.push({
        dataUrl: image.toDataURL(),
        y: scrollTo,
        height: isLast
          ? dims.scrollHeight - i * dims.viewportHeight
          : dims.viewportHeight,
        isLast,
      });
    }

    // Restore original scroll position
    await wv.executeJavaScript(
      `window.scrollTo(${dims.scrollX}, ${dims.scrollY})`
    );

    // Stitch captures together on a canvas
    const canvas = document.createElement('canvas');
    canvas.width = dims.viewportWidth;
    canvas.height = dims.scrollHeight;
    const ctx = canvas.getContext('2d');

    for (const cap of captures) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = cap.dataUrl;
      });
      if (cap.isLast && cap.height < dims.viewportHeight) {
        // For the last capture, only draw the portion that extends past previous captures
        const sourceY = dims.viewportHeight - cap.height;
        ctx.drawImage(
          img,
          0,
          sourceY,
          dims.viewportWidth,
          cap.height,
          0,
          cap.y,
          dims.viewportWidth,
          cap.height
        );
      } else {
        ctx.drawImage(img, 0, cap.y);
      }
    }

    return canvas.toDataURL('image/png');
  }, []);

  // ===== Screenshot request from webview =====
  const handleScreenshotRequest = useCallback(
    ({ selector, note, withNote, fullPage = false }) => {
      if (withNote) {
        setPendingScreenshot({ selector, fullPage });
        dispatch({
          type: 'OPEN_NOTE_MODAL',
          payload: { title: 'Screenshot with Note', withScreenshot: true },
        });
      } else {
        captureScreenshot(selector, note, fullPage);
      }
    },
    [captureScreenshot, dispatch]
  );

  // ===== Editor =====
  const openEditor = useCallback(
    async (recordingId) => {
      try {
        const result = await api.getRecordingMarkdown(
          recordingId,
          state.currentProjectId
        );
        if (!result.success) {
          dispatch({
            type: 'SET_STATUS',
            payload: result.error || 'Failed to load markdown',
          });
          dispatch({ type: 'SET_VIEW', payload: 'welcome' });
          return;
        }
        dispatch({ type: 'SET_ACTIVE_HISTORY', payload: recordingId });
        dispatch({
          type: 'SET_EDITOR_CONTENT',
          payload: {
            content: result.content,
            originalContent: result.content,
            recordingDir: result.recordingDir,
            title: result.title,
          },
        });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
        dispatch({ type: 'SET_STATUS', payload: 'Editing markdown' });
      } catch (err) {
        dispatch({
          type: 'SET_STATUS',
          payload: `Error loading editor: ${err.message}`,
        });
        dispatch({ type: 'SET_VIEW', payload: 'welcome' });
      }
    },
    [api, state.currentProjectId, dispatch]
  );

  // ===== Recording actions (sidebar context menu) =====
  const handleRecordingAction = useCallback(
    async (action, recordingId) => {
      switch (action) {
        case 'open':
          await api.openRecordingFolder(recordingId, state.currentProjectId);
          break;

        case 'refetch':
          try {
            await refetchRecordingScreenshots(recordingId);
          } catch (err) {
            dispatch({
              type: 'SET_STATUS',
              payload: `Refetch error: ${err.message}`,
            });
          }
          break;

        case 'move':
          dispatch({ type: 'OPEN_MOVE_MODAL', payload: recordingId });
          break;

        case 'delete':
          if (confirm('Delete this recording?')) {
            await api.deleteRecording(recordingId, state.currentProjectId);
            const recordings = await api.getProjectRecordings(
              state.currentProjectId
            );
            dispatch({ type: 'SET_RECORDINGS', payload: recordings || [] });
            if (state.activeHistoryId === recordingId) {
              dispatch({ type: 'SET_VIEW', payload: 'welcome' });
            }
          }
          break;
      }
    },
    [api, state.currentProjectId, state.activeHistoryId, dispatch] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ===== Refetch =====
  const refetchRecordingScreenshots = useCallback(
    async (recordingId, isBulk = false) => {
      if (state.isRecording) return;

      const recording = await api.loadRecording(
        recordingId,
        state.currentProjectId
      );
      if (!recording?.actions) throw new Error('Invalid recording data');

      const { viewport: recViewport = { width: 1680, height: 950 }, actions = [] } =
        recording;
      const relevantActions = actions.filter((a) =>
        ['goto', 'screenshot'].includes(a.type)
      );
      if (relevantActions.length === 0) return;

      const totalScreenshots = relevantActions.filter(
        (a) => a.type === 'screenshot'
      ).length;

      if (!isBulk) {
        dispatch({ type: 'OPEN_REFETCH_MODAL' });
        dispatch({
          type: 'SET_REFETCH_STATE',
          payload: {
            progress: 0,
            total: totalScreenshots,
            text: 'Initializing...',
            currentItem: recording.title || 'Untitled',
            view: 'progress',
          },
        });
      }

      // Show webview for refetch
      dispatch({ type: 'SET_VIEW', payload: 'recording' });

      const wv = webviewRef.current;
      if (!wv) return;

      // Navigate to first goto
      const firstGoto = relevantActions.find((a) => a.type === 'goto');
      if (firstGoto) {
        wv.navigate(firstGoto.url);
        await new Promise((r) => setTimeout(r, 2000));
      }

      let ssCount = 0;
      const actionsToProcess = firstGoto
        ? relevantActions.filter((a) => a !== firstGoto)
        : relevantActions;

      for (const action of actionsToProcess) {
        if (action.type === 'goto') {
          wv.navigate(action.url);
          await new Promise((r) => setTimeout(r, 1500));
        } else if (action.type === 'screenshot') {
          // Resolve highlight element rect if present (for non-destructive overlay)
          let highlightOverlay = action.highlightOverlay || null;
          if (action.highlight && !highlightOverlay) {
            try {
              highlightOverlay = await wv.executeJavaScript(
                `(function(){const sel=${JSON.stringify(action.highlight)};let el;if(sel.includes(':text(')){const m=sel.match(/:text\\("([^"]+)"\\)/);if(m){const t=m[1];const tm=sel.match(/^(\\w+):/);const tag=tm?tm[1]:'*';el=Array.from(document.querySelectorAll(tag)).find(e=>e.textContent&&e.textContent.trim().includes(t));}}else{el=document.querySelector(sel);}if(!el)return null;const r=el.getBoundingClientRect();if(r.width===0||r.height===0)return null;const cs=window.getComputedStyle(el);return{x:Math.round(r.x-3),y:Math.round(r.y-3),width:Math.round(r.width+6),height:Math.round(r.height+6),borderRadius:Math.round(parseFloat(cs.borderRadius)||4)};})()`
              );
            } catch {
              // Ignore errors resolving highlight rect
            }
          }

          // Capture clean screenshot (no highlight overlay in page)
          const image = await wv.capturePage();
          await api.saveRefetchedScreenshot({
            recordingId,
            filename: action.filename,
            imageDataUrl: image.toDataURL(),
            highlightOverlay: highlightOverlay ? { ...highlightOverlay, selector: action.highlight } : undefined,
            projectId: state.currentProjectId,
          });

          ssCount++;

          if (!isBulk) {
            dispatch({
              type: 'SET_REFETCH_STATE',
              payload: {
                progress: ssCount,
                total: totalScreenshots,
                text: `Processing screenshot ${ssCount} of ${totalScreenshots}...`,
                currentItem: action.filename,
                view: 'progress',
              },
            });
          }
        }
      }

      // Regenerate the markdown with new screenshots
      await api.regenerateMarkdown(recordingId, state.currentProjectId);

      if (!isBulk) {
        dispatch({
          type: 'SET_REFETCH_STATE',
          payload: {
            progress: totalScreenshots,
            total: totalScreenshots,
            text: 'Complete',
            view: 'summary',
            summary: { success: true, screenshotCount: ssCount },
          },
        });
      }
    },
    [api, state.currentProjectId, state.isRecording, dispatch]
  );

  const handleRefetchAll = useCallback(async () => {
    if (!state.currentProjectId || state.isRecording) return;
    const recordings = state.recordings;
    if (!recordings?.length) return;

    dispatch({ type: 'OPEN_REFETCH_MODAL' });

    let completed = 0;
    const total = recordings.length;
    const errors = [];

    for (const rec of recordings) {
      dispatch({
        type: 'SET_REFETCH_STATE',
        payload: {
          progress: completed,
          total,
          text: `Refetching "${rec.title || 'Untitled'}"...`,
          currentItem: rec.title || rec.id,
          view: 'progress',
        },
      });

      try {
        await refetchRecordingScreenshots(rec.id, true);
        completed++;
      } catch (err) {
        errors.push(`${rec.title || rec.id}: ${err.message}`);
        completed++;
      }
    }

    dispatch({
      type: 'SET_REFETCH_STATE',
      payload: {
        progress: total,
        total,
        text: 'Complete',
        view: 'summary',
        summary: {
          success: errors.length === 0,
          total,
          failed: errors.length,
          errors,
          isBulk: true,
        },
      },
    });
  }, [
    state.currentProjectId,
    state.isRecording,
    state.recordings,
    refetchRecordingScreenshots,
    dispatch,
  ]);

  // ===== Move Recording =====
  const handleMoveRecording = useCallback(
    async (toProjectId) => {
      try {
        const result = await api.moveRecording(
          state.pendingMoveRecordingId,
          state.currentProjectId,
          toProjectId
        );
        if (result.success) {
          const recordings = await api.getProjectRecordings(
            state.currentProjectId
          );
          dispatch({ type: 'SET_RECORDINGS', payload: recordings || [] });
          dispatch({ type: 'CLOSE_MOVE_MODAL' });
          dispatch({ type: 'SET_STATUS', payload: 'Recording moved' });
        }
      } catch (err) {
        dispatch({
          type: 'SET_STATUS',
          payload: `Move error: ${err.message}`,
        });
      }
    },
    [api, state.pendingMoveRecordingId, state.currentProjectId, dispatch]
  );

  // ===== Project Modal Save =====
  const handleSaveProject = useCallback(
    async (projectData) => {
      try {
        if (state.editingProjectId) {
          const result = await api.updateProject(
            state.editingProjectId,
            projectData
          );
          if (result.success) {
            const data = await api.getProjects();
            dispatch({ type: 'SET_PROJECTS', payload: data.projects || [] });
            if (state.currentProjectId === state.editingProjectId) {
              dispatch({
                type: 'SET_CURRENT_PROJECT',
                payload: result.project,
              });
            }
            dispatch({ type: 'SET_STATUS', payload: 'Project updated' });
          }
        } else {
          const result = await api.createProject(projectData);
          if (result.success) {
            const data = await api.getProjects();
            dispatch({ type: 'SET_PROJECTS', payload: data.projects || [] });
            await selectProject(result.project);
            dispatch({ type: 'SET_STATUS', payload: 'Project created' });
          }
        }
        dispatch({ type: 'CLOSE_PROJECT_MODAL' });
      } catch (err) {
        dispatch({
          type: 'SET_STATUS',
          payload: `Project save error: ${err.message}`,
        });
      }
    },
    [api, state.editingProjectId, state.currentProjectId, selectProject, dispatch]
  );

  const handleDeleteProject = useCallback(
    async (projectId) => {
      if (
        !confirm(
          'Delete this project? All recordings will be permanently deleted.'
        )
      ) {
        return;
      }

      try {
        const result = await api.deleteProject(projectId);
        if (result.success) {
          const data = await api.getProjects();
          dispatch({ type: 'SET_PROJECTS', payload: data.projects || [] });
          dispatch({ type: 'CLOSE_PROJECT_MODAL' });
          if (state.currentProjectId === projectId) {
            dispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
            dispatch({ type: 'SET_SIDEBAR_VISIBLE', payload: false });
            dispatch({ type: 'SET_VIEW', payload: 'projectList' });
          }
          dispatch({ type: 'SET_STATUS', payload: 'Project deleted' });
        }
      } catch (err) {
        dispatch({
          type: 'SET_STATUS',
          payload: `Delete error: ${err.message}`,
        });
      }
    },
    [api, state.currentProjectId, dispatch]
  );

  // ===== Note Modal Save =====
  const handleNoteSave = useCallback(
    async (noteText) => {
      dispatch({ type: 'CLOSE_NOTE_MODAL' });

      if (state.noteModalConfig?.withScreenshot) {
        // Screenshot with note
        await captureScreenshot(
          pendingScreenshot?.selector || null,
          noteText || null,
          pendingScreenshot?.fullPage || false
        );
      } else if (noteText) {
        // Standalone note
        await api.recordAction({ type: 'note', note: noteText });
        dispatch({ type: 'SET_STATUS', payload: 'Note added' });
      }

      setPendingScreenshot(null);
    },
    [api, state.noteModalConfig, pendingScreenshot, captureScreenshot, dispatch]
  );

  // ===== Keyboard shortcuts =====
  useEffect(() => {
    const handler = async (e) => {
      if (!state.isRecording) return;

      // Escape stops recording
      if (e.code === 'Escape') {
        e.preventDefault();
        await handleStopRecording();
        return;
      }

      // All other shortcuts require Ctrl+Shift
      if (!e.ctrlKey || !e.shiftKey) return;

      switch (e.code) {
        case 'KeyK':
          // Screenshot with note
          e.preventDefault();
          setPendingScreenshot({ selector: null });
          dispatch({
            type: 'OPEN_NOTE_MODAL',
            payload: {
              title: 'Screenshot with Note',
              withScreenshot: true,
            },
          });
          break;

        case 'KeyS':
          // Screenshot
          e.preventDefault();
          await captureScreenshot(null, null, false);
          break;

        case 'KeyF':
          // Full page screenshot
          e.preventDefault();
          await captureScreenshot(null, null, true);
          break;

        case 'KeyN':
          // Add note (no screenshot)
          e.preventDefault();
          setPendingScreenshot(null);
          dispatch({
            type: 'OPEN_NOTE_MODAL',
            payload: {
              title: 'Add Note',
              withScreenshot: false,
            },
          });
          break;

        default:
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.isRecording, handleStopRecording, captureScreenshot, dispatch]);

  // ===== Render =====
  const currentViewport = state.settings?.viewport || {
    width: 1680,
    height: 950,
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {state.sidebarVisible && (
        <Sidebar
          onBackToProjects={handleBackToProjects}
          onEditProject={() =>
            dispatch({
              type: 'OPEN_PROJECT_MODAL',
              payload: state.currentProjectId,
            })
          }
          onNewRecording={() => {
            if (!confirmDiscardChanges()) return;
            dispatch({ type: 'SET_VIEW', payload: 'welcome' });
          }}
          onRefetchAll={handleRefetchAll}
          onSelectRecording={(id) => {
            if (!confirmDiscardChanges()) return;
            openEditor(id);
          }}
          onRecordingAction={handleRecordingAction}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar (during recording) */}
        {state.currentView === 'recording' && state.isRecording && (
          <Toolbar
            webviewRef={webviewRef}
            onStopRecording={handleStopRecording}
            currentUrl={currentUrl}
          />
        )}

        {/* Content Area */}
        <div className="flex-1 relative flex bg-background overflow-hidden min-h-0">
          {state.currentView === 'projectList' && (
            <ProjectList
              onSelectProject={selectProject}
              onNewProject={() =>
                dispatch({ type: 'OPEN_PROJECT_MODAL', payload: null })
              }
              onEditProject={(id) =>
                dispatch({ type: 'OPEN_PROJECT_MODAL', payload: id })
              }
              onOpenFolder={(id) => api.openProjectFolder(id)}
              onExportProject={handleExportProject}
              onImportProject={handleImportProject}
            />
          )}

          {state.currentView === 'welcome' && (
            <WelcomePanel onStartRecording={handleStartRecording} />
          )}

          {state.currentView === 'recording' && (
            <WebviewContainer
              ref={webviewRef}
              viewport={currentViewport}
              isRecording={state.isRecording}
              recordActions={state.currentRecordActions}
              customCSS={state.currentCustomCSS}
              onUrlChange={setCurrentUrl}
              onRecordAction={(action) => api.recordAction(action)}
              onScreenshotRequest={handleScreenshotRequest}
              onHighlightChange={(sel) =>
                dispatch({
                  type: 'SET_STATUS',
                  payload: sel ? `Highlighted: ${sel}` : 'Ready',
                })
              }
            />
          )}

          {state.currentView === 'editor' && (
            <EditorPanel
              onBack={() => {
                if (!confirmDiscardChanges()) return;
                dispatch({ type: 'SET_VIEW', payload: 'welcome' });
              }}
              onOpenScreenshotEditor={(recordingId, filename) =>
                setScreenshotEditorConfig({
                  recordingId,
                  filename,
                  recordingDir: state.editorRecordingDir,
                })
              }
            />
          )}

          {/* Shortcuts Panel (during recording) */}
          {state.isRecording && state.showShortcuts && (
            <ShortcutsPanel
              onStopRecording={handleStopRecording}
              onScreenshot={() => captureScreenshot(null, null, false)}
              onFullPageScreenshot={() => captureScreenshot(null, null, true)}
              onNoteScreenshot={() => {
                setPendingScreenshot({ selector: null });
                dispatch({
                  type: 'OPEN_NOTE_MODAL',
                  payload: {
                    title: 'Screenshot with Note',
                    withScreenshot: true,
                  },
                });
              }}
              onClearHighlight={() =>
                webviewRef.current?.send('clear-highlight')
              }
            />
          )}

          {/* Action Log */}
          {state.isRecording && state.showLog && <ActionLog />}
        </div>

        {/* Status Bar */}
        <StatusBar />
      </main>

      {/* Modals */}
      <ProjectModal
        open={state.projectModalOpen}
        onOpenChange={(open) =>
          !open && dispatch({ type: 'CLOSE_PROJECT_MODAL' })
        }
        editingProjectId={state.editingProjectId}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
      />

      <MoveRecordingModal
        open={state.moveModalOpen}
        onOpenChange={(open) =>
          !open && dispatch({ type: 'CLOSE_MOVE_MODAL' })
        }
        onMove={handleMoveRecording}
      />

      <RefetchModal
        open={state.refetchModalOpen}
        onOpenChange={(open) =>
          !open && dispatch({ type: 'CLOSE_REFETCH_MODAL' })
        }
        refetchState={state.refetchState}
        onCancel={() => dispatch({ type: 'CLOSE_REFETCH_MODAL' })}
        onDone={() => {
          dispatch({ type: 'CLOSE_REFETCH_MODAL' });
          dispatch({ type: 'SET_VIEW', payload: 'welcome' });
        }}
      />

      <NoteModal
        open={state.noteModalOpen}
        onOpenChange={(open) =>
          !open && dispatch({ type: 'CLOSE_NOTE_MODAL' })
        }
        config={state.noteModalConfig}
        onSave={handleNoteSave}
      />

      {screenshotEditorConfig && (
        <ScreenshotEditor
          open={!!screenshotEditorConfig}
          recordingId={screenshotEditorConfig.recordingId}
          filename={screenshotEditorConfig.filename}
          recordingDir={screenshotEditorConfig.recordingDir}
          onClose={() => setScreenshotEditorConfig(null)}
          onSave={async () => {
            setScreenshotEditorConfig(null);
            dispatch({ type: 'BUMP_EDITOR_IMAGE_REVISION' });
          }}
          onOpenTextInput={(config) => setTextInputConfig(config)}
        />
      )}

      {textInputConfig && (
        <TextInputModal
          open={!!textInputConfig}
          onOpenChange={(open) => !open && setTextInputConfig(null)}
          onSave={(result) => {
            textInputConfig?.onSave(result);
            setTextInputConfig(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
