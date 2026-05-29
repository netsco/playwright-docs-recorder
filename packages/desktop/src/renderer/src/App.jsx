import { useEffect, useRef, useCallback, useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { Titlebar } from '@/components/layout/Titlebar';
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
import KeyboardShortcutsModal from '@/components/modals/KeyboardShortcutsModal';
import AboutModal from '@/components/modals/AboutModal';
import TextInputModal from '@/components/modals/TextInputModal';

import { ShortcutsPanel } from '@/components/ShortcutsPanel';
import { StepsEditor } from '@/components/StepsEditor';
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
  const loginRequiredRef = useRef(false);
  const [pendingScreenshot, setPendingScreenshot] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [screenshotEditorConfig, setScreenshotEditorConfig] = useState(null);
  const [textInputConfig, setTextInputConfig] = useState(null);
  const [selectedStepRealIndex, setSelectedStepRealIndex] = useState(-1);
  const [stepsHighlight, setStepsHighlight] = useState(null);
  const currentHighlightRef = useRef(null);
  const pendingStepNoteIndexRef = useRef(-1);

  const hasUnsavedEditorChanges =
    state.currentView === 'editor' &&
    state.editorContent !== state.editorOriginalContent;

  const hasUnsavedStepsChanges =
    state.isEditingSteps &&
    JSON.stringify(state.stepsActions) !== JSON.stringify(state.stepsOriginalActions);

  const confirmDiscardChanges = useCallback(() => {
    if (hasUnsavedStepsChanges) {
      return confirm('You have unsaved step changes. Discard and leave?');
    }
    if (!hasUnsavedEditorChanges) return true;
    return confirm('You have unsaved changes. Discard and leave?');
  }, [hasUnsavedEditorChanges, hasUnsavedStepsChanges]);

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

        // Apply persisted zoom mode
        dispatch({ type: 'SET_ZOOM_MODE', payload: settings.zoomMode ?? 'fit' });

        // Sync title bar overlay colors with theme
        if (api.updateTitleBarOverlay) {
          const isDark = (settings.theme || 'dark') === 'dark';
          api.updateTitleBarOverlay({
            color: '#00000000',
            symbolColor: isDark ? '#94a3b8' : '#556275',
            height: 38
          });
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

  // ===== Auto-updater listeners =====
  useEffect(() => {
    if (!api) return;

    api.getAppVersion().then((v) =>
      dispatch({ type: 'SET_APP_VERSION', payload: v })
    );

    api.onUpdateAvailable((info) => {
      dispatch({
        type: 'SET_UPDATE_STATUS',
        payload: { status: 'available', version: info.version, releaseNotes: info.releaseNotes },
      });
    });

    api.onDownloadProgress((progress) => {
      dispatch({
        type: 'SET_UPDATE_STATUS',
        payload: { status: 'downloading', percent: progress.percent },
      });
    });

    api.onUpdateDownloaded(() => {
      dispatch({ type: 'SET_UPDATE_STATUS', payload: { status: 'downloaded' } });
    });

    api.onUpdateError((message) => {
      dispatch({
        type: 'SET_UPDATE_STATUS',
        payload: { status: 'error', error: message },
      });
    });

    api.onUpdateNotAvailable(() => {
      dispatch({ type: 'SET_UPDATE_STATUS', payload: { status: 'not-available' } });
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
    dispatch({ type: 'RESET_RECORDING_STATE' });
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
        loginRequired,
        customCSS,
        settingsOverride,
      } = config;

      loginRequiredRef.current = loginRequired;

      dispatch({ type: 'SET_EDITING_STEPS', payload: false });
      dispatch({ type: 'SET_VIEW', payload: 'recording' });

      // Navigate webview
      const fullUrl = url.startsWith('http') ? url : 'https://' + url;
      setCurrentUrl(fullUrl);

      // Load saved auth state before navigation
      if (loginRequired && state.currentProjectId) {
        try {
          const authResult = await api.loadAuthState(state.currentProjectId);
          if (authResult.success) {
            dispatch({ type: 'SET_STATUS', payload: `Loaded saved session (${authResult.cookieCount} cookies)` });
          }
        } catch {
          // No auth state yet — will auto-save on stop
        }
      }

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
            loginRequired,
            customCSS: customCSS || '',
            injectCSS: !!customCSS,
            settingsOverride: settingsOverride || {},
          });

          if (result.success) {
            // Parse viewport string (e.g. "1680x950") to object
            const [vw, vh] = viewport.split('x').map(Number);
            dispatch({
              type: 'SET_RECORDING',
              payload: {
                isRecording: true,
                recordActions,
                customCSS: customCSS || '',
                viewport: { width: vw, height: vh },
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

  const handleZoomChange = useCallback(
    (mode) => {
      dispatch({ type: 'SET_ZOOM_MODE', payload: mode });
      api.saveSettings({ zoomMode: mode });
    },
    [api, dispatch]
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

        // Auto-save auth state if login was required
        if (loginRequiredRef.current && state.currentProjectId) {
          try {
            const saveResult = await api.saveAuthState(state.currentProjectId, currentUrl);
            if (saveResult.success) {
              dispatch({ type: 'ADD_LOG_ENTRY', payload: { message: `Session saved (${saveResult.cookieCount} cookies)`, type: 'info' } });
            }
          } catch {
            // Non-critical — auth save failure shouldn't block recording save
          }
        }

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
  }, [api, state.currentProjectId, currentUrl, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Screenshots =====
  const captureScreenshot = useCallback(
    async (selector, note, fullPage = false) => {
      try {
        const wv = webviewRef.current;
        if (!wv) return;

        // Use the tracked highlight as fallback when no explicit selector is passed
        const effectiveSelector = selector || currentHighlightRef.current || null;

        // Capture highlight overlay rect before hiding it
        let highlightOverlay = null;
        if (effectiveSelector) {
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
          selector: effectiveSelector,
          note,
          fullPage,
          imageDataUrl: dataUrl,
          highlightOverlay: highlightOverlay ? { ...highlightOverlay, selector: effectiveSelector } : undefined,
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
            payload: { filename: result.filename, dataUrl, note, pageTitle },
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

        case 'editSteps':
          await openStepsEditor(recordingId);
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

  // ===== Steps Editor =====
  // Selector resolver + fill helper injected into webview JS.
  // Handles Playwright text selectors, IDs with dots, and standard CSS selectors.
  // All code wrapped in try/catch to avoid GUEST_VIEW_MANAGER_CALL errors when
  // a click triggers page navigation and the execution context is destroyed.
  const resolverJS = [
    'function __resolve(s){',
    'try{',
    'if(s.indexOf(":text(")!==-1){',
    'var m=s.match(/:text\\("([^"]+)"\\)/);',
    'if(!m)return null;',
    'var t=m[1],tm=s.match(/^(\\w+):/),tag=tm?tm[1]:"*",els=document.querySelectorAll(tag);',
    'for(var i=0;i<els.length;i++)if(els[i].textContent&&els[i].textContent.trim().indexOf(t)!==-1)return els[i];',
    'return null;}',
    'var el;try{el=document.querySelector(s)}catch(x){}',
    'if(el)return el;',
    'if(s.charAt(0)==="#")return document.getElementById(s.substring(1));',
    'return null;',
    '}catch(e){return null;}}',
  ].join('');

  const fillJS = [
    'function __fill(el,v){',
    'try{el.focus();}catch(e){}',
    'try{',
    'var p=Object.getOwnPropertyDescriptor(',
    'el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,"value");',
    'if(p&&p.set){p.set.call(el,v);}else{el.value=v;}',
    '}catch(e){el.value=v;}',
    'try{el.dispatchEvent(new Event("input",{bubbles:true}));',
    'el.dispatchEvent(new Event("change",{bubbles:true}));}catch(e){}}',
  ].join('');

  const replayToAction = useCallback(
    async (actions, targetRealIndex) => {
      const wv = webviewRef.current;
      if (!wv?.isReady?.()) return;

      // Hide any existing highlight overlay before replaying
      if (wv.isDomReady?.()) {
        try {
          await wv.executeJavaScript(
            `(function(){var o=document.getElementById('__highlight-overlay');if(o)o.style.display='none';})()`
          );
        } catch {}
      }

      // Check if any goto action exists before the target
      const hasGoto = actions.slice(0, targetRealIndex + 1).some((a) => a.type === 'goto');

      // Get the current webview URL to avoid redundant navigation (which causes ERR_ABORTED)
      const currentSrc = wv.src || '';

      // If no goto actions, navigate to the recording URL to reset page state
      if (!hasGoto && state.stepsRecordingUrl) {
        const targetUrl = state.stepsRecordingUrl.startsWith('http')
          ? state.stepsRecordingUrl
          : `https://${state.stepsRecordingUrl}`;
        // Skip if already on this page (e.g. WebviewContainer loaded it via initialUrl)
        if (!currentSrc.startsWith(targetUrl)) {
          await wv.navigateAndWait(state.stepsRecordingUrl);
        }
      }

      // Replay all actions up to and including the target
      for (let i = 0; i <= targetRealIndex && i < actions.length; i++) {
        const action = actions[i];
        if (action.type === 'goto') {
          const gotoUrl = action.url.startsWith('http') ? action.url : `https://${action.url}`;
          // Skip navigation if the webview is already at this URL
          if (currentSrc.startsWith(gotoUrl)) continue;
          await wv.navigateAndWait(action.url);
        } else if (action.type === 'click' && action.selector) {
          if (!wv.isDomReady()) continue;
          try {
            await wv.executeJavaScript(
              `(function(){try{${resolverJS}var el=__resolve(${JSON.stringify(action.selector)});if(el){el.click();}}catch(e){}})()`
            );
          } catch {
            // Click may have triggered navigation (context destroyed)
          }
          // Wait for any navigation the click may have triggered
          await new Promise((r) => setTimeout(r, 300));
          await wv.waitForIdle();
          // Small extra delay for JS frameworks to render after load
          await new Promise((r) => setTimeout(r, 300));
        } else if (action.type === 'fill' && action.selector) {
          if (!wv.isDomReady()) continue;
          try {
            await wv.executeJavaScript(
              `(function(){try{${resolverJS}${fillJS}var el=__resolve(${JSON.stringify(action.selector)});if(el)__fill(el,${JSON.stringify(action.value || '')});}catch(e){}})()`
            );
          } catch {
            // Ignore fill errors
          }
          await new Promise((r) => setTimeout(r, 200));
        } else if (action.type === 'scroll') {
          if (!wv.isDomReady()) continue;
          try {
            await wv.executeJavaScript(
              `try{window.scrollTo(${action.scrollX || 0}, ${action.scrollY || 0})}catch(e){}`
            );
          } catch {
            // Ignore scroll errors
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    },
    [state.stepsRecordingUrl, resolverJS, fillJS]
  );

  // Poll until the webview DOM element exists AND dom-ready has fired (page loaded)
  const waitForWebviewLoaded = useCallback(() => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (webviewRef.current?.isDomReady?.()) {
          resolve(webviewRef.current);
        } else if (attempts < 150) { // 150 * 200ms = 30s max
          setTimeout(check, 200);
        } else {
          resolve(webviewRef.current || null);
        }
      };
      check();
    });
  }, []);

  // Poll until the webview element exists (no page load required)
  const waitForWebviewReady = useCallback(() => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (webviewRef.current?.isReady?.()) {
          resolve(webviewRef.current);
        } else if (attempts < 100) { // 100 * 100ms = 10s max
          setTimeout(check, 100);
        } else {
          resolve(null);
        }
      };
      check();
    });
  }, []);

  const showStepHighlight = useCallback(
    async (action) => {
      const wv = webviewRef.current;
      if (!wv?.isDomReady?.()) return;
      const selector = action?.highlight || null;
      if (!selector) {
        // Clear any existing highlight
        try {
          await wv.executeJavaScript(
            `(function(){var o=document.getElementById('__highlight-overlay');if(o)o.style.display='none';})()`
          );
        } catch {}
        return;
      }

      // Retry loop: wait for page layout to settle and overlay element to exist
      const highlightJS = `(function(){try{${resolverJS}var el=__resolve(${JSON.stringify(selector)});if(!el)return 'no-element';var o=document.getElementById('__highlight-overlay');if(!o)return 'no-overlay';var r=el.getBoundingClientRect();if(r.width===0&&r.height===0)return 'no-rect';o.style.display='block';o.style.top=(r.top-3)+'px';o.style.left=(r.left-3)+'px';o.style.width=(r.width+6)+'px';o.style.height=(r.height+6)+'px';return 'ok';}catch(e){return 'error';}})()`;

      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, attempt === 0 ? 800 : 500));
        try {
          const result = await wv.executeJavaScript(highlightJS);
          if (result === 'ok') return;
          // Element or overlay not ready yet, retry
        } catch {
          // Page context may have been destroyed, retry
        }
      }
    },
    [resolverJS]
  );

  const openStepsEditor = useCallback(
    async (recordingId) => {
      if (!confirmDiscardChanges()) return;

      try {
        const recording = await api.loadRecording(recordingId, state.currentProjectId);
        if (!recording?.actions) {
          dispatch({ type: 'SET_STATUS', payload: 'Invalid recording data' });
          return;
        }

        const mdResult = await api.getRecordingMarkdown(recordingId, state.currentProjectId);
        const recordingDir = mdResult?.recordingDir || '';

        // Set viewport from recording before switching view so WebviewContainer gets correct size
        if (recording.viewport) {
          const vp = typeof recording.viewport === 'string'
            ? (() => { const [w, h] = recording.viewport.split('x').map(Number); return { width: w, height: h }; })()
            : recording.viewport;
          dispatch({
            type: 'SET_RECORDING',
            payload: { viewport: vp },
          });
        }

        // Get URL from sidebar recordings list (project metadata stores it)
        const recMeta = state.recordings.find((r) => r.id === recordingId);
        const recordingUrl = recMeta?.url || '';

        // Load auth state BEFORE switching view so cookies are available when webview navigates
        if (recording.loginRequired && state.currentProjectId) {
          try {
            await api.loadAuthState(state.currentProjectId);
          } catch {
            // No auth state
          }
        }

        dispatch({
          type: 'SET_STEPS_DATA',
          payload: {
            actions: recording.actions,
            recordingId,
            recordingDir,
            recordingUrl,
          },
        });
        dispatch({ type: 'SET_ACTIVE_HISTORY', payload: recordingId });
        dispatch({ type: 'SET_VIEW', payload: 'recording' });
        dispatch({ type: 'SET_EDITING_STEPS', payload: true });
        dispatch({ type: 'SET_STEPS_REPLAYING', payload: true });
        dispatch({ type: 'SET_STATUS', payload: 'Loading page...' });

        // WebviewContainer will mount with initialUrl={stepsRecordingUrl} and start loading
        // automatically. Wait for the page to finish loading (dom-ready).
        const wv = await waitForWebviewLoaded();
        if (wv) {
          // Find first screenshot step and replay to it
          const firstScreenshotIdx = recording.actions.findIndex(
            (a) => a.type === 'screenshot' || a.type === 'note'
          );
          if (firstScreenshotIdx >= 0) {
            setSelectedStepRealIndex(firstScreenshotIdx);
            dispatch({ type: 'SET_STATUS', payload: 'Replaying actions...' });
            await replayToAction(recording.actions, firstScreenshotIdx);
            await showStepHighlight(recording.actions[firstScreenshotIdx]);
          }
          dispatch({ type: 'SET_STATUS', payload: 'Editing steps' });
        }
        dispatch({ type: 'SET_STEPS_REPLAYING', payload: false });
      } catch (err) {
        dispatch({
          type: 'SET_STATUS',
          payload: `Error opening steps editor: ${err.message}`,
        });
      }
    },
    [api, state.currentProjectId, state.recordings, confirmDiscardChanges, dispatch, replayToAction, showStepHighlight, waitForWebviewLoaded]
  );

  const handleSelectStep = useCallback(
    async (realIndex) => {
      setSelectedStepRealIndex(realIndex);
      // Clear any user-applied highlight (Ctrl+Click) from previous step
      setStepsHighlight(null);
      dispatch({ type: 'SET_STEPS_REPLAYING', payload: true });
      try {
        await replayToAction(state.stepsActions, realIndex);
        // Show saved highlight overlay if the step has one
        await showStepHighlight(state.stepsActions[realIndex]);
      } finally {
        dispatch({ type: 'SET_STEPS_REPLAYING', payload: false });
      }
    },
    [state.stepsActions, replayToAction, showStepHighlight, dispatch]
  );

  const handleSaveSteps = useCallback(async () => {
    try {
      const result = await api.updateRecordingActions(
        state.stepsRecordingId,
        state.stepsActions,
        state.currentProjectId
      );
      if (result.success) {
        dispatch({ type: 'SET_EDITING_STEPS', payload: false });
        dispatch({ type: 'SET_STATUS', payload: 'Steps saved' });

        // Refresh recordings list
        const recordings = await api.getProjectRecordings(state.currentProjectId);
        dispatch({ type: 'SET_RECORDINGS', payload: recordings || [] });

        // Open the editor for this recording
        await openEditor(state.stepsRecordingId);
      } else {
        dispatch({ type: 'SET_STATUS', payload: `Save error: ${result.error}` });
      }
    } catch (err) {
      dispatch({ type: 'SET_STATUS', payload: `Save error: ${err.message}` });
    }
  }, [api, state.stepsRecordingId, state.stepsActions, state.currentProjectId, dispatch, openEditor]);

  const handleCancelStepsEditor = useCallback(() => {
    dispatch({ type: 'SET_EDITING_STEPS', payload: false });
    dispatch({ type: 'SET_VIEW', payload: 'welcome' });
    dispatch({ type: 'SET_STATUS', payload: 'Ready' });
  }, [dispatch]);

  const handleEditStepNote = useCallback(
    (realIndex, currentNote) => {
      pendingStepNoteIndexRef.current = realIndex;
      dispatch({
        type: 'OPEN_NOTE_MODAL',
        payload: {
          title: 'Edit Step Note',
          withScreenshot: false,
          initialNote: currentNote,
        },
      });
    },
    [dispatch]
  );

  const handleCaptureStepScreenshot = useCallback(
    async (insertAfterRealIndex) => {
      const wv = webviewRef.current;
      if (!wv?.isDomReady?.()) {
        dispatch({ type: 'SET_STATUS', payload: 'Page not loaded yet' });
        return;
      }

      try {
        // Capture highlight overlay rect before hiding it
        let highlightOverlay = null;
        if (stepsHighlight) {
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

        const image = await wv.capturePage();
        const dataUrl = image.toDataURL();

        // Restore scrollbars and highlight overlay
        await wv.executeJavaScript(
          `(function(){const s=document.getElementById('__doc-recorder-hide-scrollbars');if(s)s.remove();const o=document.getElementById('__highlight-overlay');if(o)o.style.display='block';})()`
        ).catch(() => {});

        const pageTitle = await wv.executeJavaScript('document.title').catch(() => '');

        const result = await api.captureStepScreenshot({
          recordingId: state.stepsRecordingId,
          imageDataUrl: dataUrl,
          projectId: state.currentProjectId,
        });

        if (result.success) {
          // Bake highlight overlay onto saved screenshot
          if (highlightOverlay) {
            await api.saveRefetchedScreenshot({
              recordingId: state.stepsRecordingId,
              filename: result.filename,
              imageDataUrl: dataUrl,
              highlightOverlay: { ...highlightOverlay, selector: stepsHighlight },
              projectId: state.currentProjectId,
            });
          }

          // Insert new screenshot action after the target index
          const newAction = {
            type: 'screenshot',
            filename: result.filename,
            highlight: stepsHighlight || null,
            highlightOverlay: highlightOverlay ? { ...highlightOverlay, selector: stepsHighlight } : undefined,
            note: null,
            fullPage: false,
            pageTitle,
          };
          const updated = [...state.stepsActions];
          updated.splice(insertAfterRealIndex + 1, 0, newAction);
          dispatch({ type: 'SET_STEPS_ACTIONS', payload: updated });
          // Select the new step
          setSelectedStepRealIndex(insertAfterRealIndex + 1);
          dispatch({ type: 'SET_STATUS', payload: `Inserted: ${result.filename}` });
        }
      } catch (err) {
        // Restore scrollbars and highlight overlay on error
        webviewRef.current?.executeJavaScript(
          `(function(){const s=document.getElementById('__doc-recorder-hide-scrollbars');if(s)s.remove();const o=document.getElementById('__highlight-overlay');if(o)o.style.display='block';})()`
        ).catch(() => {});
        dispatch({ type: 'SET_STATUS', payload: `Screenshot error: ${err.message}` });
      }
    },
    [api, state.stepsRecordingId, state.stepsActions, state.currentProjectId, stepsHighlight, dispatch]
  );

  const handleRetakeStepScreenshot = useCallback(
    async (realIndex) => {
      const wv = webviewRef.current;
      if (!wv?.isDomReady?.()) {
        dispatch({ type: 'SET_STATUS', payload: 'Page not loaded yet' });
        return;
      }

      const action = state.stepsActions[realIndex];
      if (!action || action.type !== 'screenshot') return;

      try {
        // Capture highlight overlay rect before hiding it
        let highlightOverlay = null;
        const selector = stepsHighlight || action.highlight || null;
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

        const image = await wv.capturePage();
        const dataUrl = image.toDataURL();

        // Restore scrollbars and highlight overlay
        await wv.executeJavaScript(
          `(function(){const s=document.getElementById('__doc-recorder-hide-scrollbars');if(s)s.remove();const o=document.getElementById('__highlight-overlay');if(o)o.style.display='block';})()`
        ).catch(() => {});

        // Save over the existing filename (with highlight overlay if present)
        await api.saveRefetchedScreenshot({
          recordingId: state.stepsRecordingId,
          filename: action.filename,
          imageDataUrl: dataUrl,
          highlightOverlay: highlightOverlay ? { ...highlightOverlay, selector } : undefined,
          projectId: state.currentProjectId,
        });

        // Update the action's highlight data in stepsActions
        if (highlightOverlay || selector) {
          const updated = state.stepsActions.map((a, i) => {
            if (i !== realIndex) return a;
            return {
              ...a,
              highlight: selector,
              highlightOverlay: highlightOverlay ? { ...highlightOverlay, selector } : undefined,
            };
          });
          dispatch({ type: 'SET_STEPS_ACTIONS', payload: updated });
        }

        dispatch({ type: 'SET_STATUS', payload: `Retaken: ${action.filename}` });
      } catch (err) {
        webviewRef.current?.executeJavaScript(
          `(function(){const s=document.getElementById('__doc-recorder-hide-scrollbars');if(s)s.remove();const o=document.getElementById('__highlight-overlay');if(o)o.style.display='block';})()`
        ).catch(() => {});
        dispatch({ type: 'SET_STATUS', payload: `Retake error: ${err.message}` });
      }
    },
    [api, state.stepsRecordingId, state.stepsActions, state.currentProjectId, stepsHighlight, dispatch]
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

      try {
        // Set recording viewport so the webview renders at the correct size
        const vp = typeof recViewport === 'string'
          ? (() => { const [w, h] = recViewport.split('x').map(Number); return { width: w, height: h }; })()
          : recViewport;
        dispatch({ type: 'SET_RECORDING', payload: { viewport: vp } });

        // Show webview for refetch
        dispatch({ type: 'SET_VIEW', payload: 'recording' });

        // Wait for webview element to exist (it mounts asynchronously after view change)
        const wv = await waitForWebviewReady();
        if (!wv) throw new Error('Webview failed to initialize');

        // Load auth state if the recording requires login
        if (recording.loginRequired && state.currentProjectId) {
          try {
            const authResult = await api.loadAuthState(state.currentProjectId);
            if (authResult.success) {
              dispatch({ type: 'SET_STATUS', payload: 'Loaded saved session for refetch' });
            }
          } catch {
            // No auth state — continue without it
          }
        }

        // Navigate to first goto
        const firstGoto = relevantActions.find((a) => a.type === 'goto');
        if (firstGoto) {
          await wv.navigateAndWait(firstGoto.url);
        }

        let ssCount = 0;
        const actionsToProcess = firstGoto
          ? relevantActions.filter((a) => a !== firstGoto)
          : relevantActions;

        for (const action of actionsToProcess) {
          if (action.type === 'goto') {
            await wv.navigateAndWait(action.url);
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
            if (!image) continue; // Skip if capture failed
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
      } catch (err) {
        if (!isBulk) {
          dispatch({
            type: 'SET_REFETCH_STATE',
            payload: {
              progress: 0,
              total: totalScreenshots,
              text: 'Complete',
              view: 'summary',
              summary: {
                success: false,
                text: `Error: ${err.message}`,
                screenshotCount: 0,
                errors: [err.message],
              },
            },
          });
        } else {
          throw err;
        }
      }
    },
    [api, state.currentProjectId, state.isRecording, dispatch, waitForWebviewReady]
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

      // Step note editing
      if (pendingStepNoteIndexRef.current >= 0) {
        const idx = pendingStepNoteIndexRef.current;
        pendingStepNoteIndexRef.current = -1;
        const updated = state.stepsActions.map((a, i) => {
          if (i !== idx) return a;
          if (a.type === 'screenshot') {
            return { ...a, note: noteText || undefined };
          }
          return { ...a, note: noteText };
        });
        dispatch({ type: 'SET_STEPS_ACTIONS', payload: updated });
        return;
      }

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
    [api, state.noteModalConfig, state.stepsActions, pendingScreenshot, captureScreenshot, dispatch]
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
  const currentViewport = state.currentViewport || state.settings?.viewport || {
    width: 1680,
    height: 950,
  };

  return (
    <div className="flex flex-col h-full">
      <Titlebar
        onNewRecording={() => {
          if (!confirmDiscardChanges()) return;
          dispatch({ type: 'SET_VIEW', payload: 'welcome' });
        }}
        onImportProject={handleImportProject}
        onExportProject={handleExportProject}
      />
      <div className="flex flex-1 min-h-0">
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
            zoomMode={state.zoomMode}
            onZoomChange={handleZoomChange}
          />
        )}

        {/* Steps Editor toolbar (during steps editing) */}
        {state.currentView === 'recording' && state.isEditingSteps && (
          <StepsEditor
            onSave={handleSaveSteps}
            onCancel={handleCancelStepsEditor}
            onCaptureScreenshot={handleCaptureStepScreenshot}
            onRetakeScreenshot={handleRetakeStepScreenshot}
            onSelectStep={handleSelectStep}
            onEditNote={handleEditStepNote}
            selectedRealIndex={selectedStepRealIndex}
            zoomMode={state.zoomMode}
            onZoomChange={handleZoomChange}
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
            <>
              <WebviewContainer
                ref={webviewRef}
                viewport={currentViewport}
                zoomMode={state.zoomMode}
                isRecording={state.isRecording || state.isEditingSteps}
                recordActions={state.isEditingSteps ? false : state.currentRecordActions}
                customCSS={state.isEditingSteps ? '' : state.currentCustomCSS}
                initialUrl={state.isEditingSteps ? state.stepsRecordingUrl : undefined}
                onUrlChange={setCurrentUrl}
                onRecordAction={state.isEditingSteps ? () => {} : (action) => api.recordAction(action)}
                onScreenshotRequest={state.isEditingSteps ? () => {} : handleScreenshotRequest}
                onHighlightChange={(sel) => {
                  if (state.isEditingSteps) {
                    setStepsHighlight(sel);
                    dispatch({
                      type: 'SET_STATUS',
                      payload: sel ? `Highlighted: ${sel}` : 'Editing steps',
                    });
                  } else {
                    currentHighlightRef.current = sel;
                    dispatch({
                      type: 'SET_STATUS',
                      payload: sel ? `Highlighted: ${sel}` : 'Ready',
                    });
                  }
                }}
              />
              {state.isEditingSteps && state.stepsReplaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30 pointer-events-auto">
                  <div className="flex items-center gap-3 bg-card px-5 py-3 rounded-lg shadow-xl border border-border">
                    <div className="w-4 h-4 border-2 border-border border-t-teal-500 rounded-full animate-spin" />
                    <span className="text-sm font-medium text-foreground">Replaying to step...</span>
                  </div>
                </div>
              )}
            </>
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

      </div>{/* end flex row */}

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

      <KeyboardShortcutsModal
        open={state.shortcutsModalOpen}
        onOpenChange={(open) =>
          !open && dispatch({ type: 'CLOSE_SHORTCUTS_MODAL' })
        }
      />

      <AboutModal
        open={state.aboutModalOpen}
        onOpenChange={(open) =>
          !open && dispatch({ type: 'CLOSE_ABOUT_MODAL' })
        }
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
