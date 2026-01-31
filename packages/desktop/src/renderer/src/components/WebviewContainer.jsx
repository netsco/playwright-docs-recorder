import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { useElectronAPI } from '@/hooks/useElectronAPI';

export const WebviewContainer = forwardRef(function WebviewContainer(props, ref) {
  const {
    viewport,
    isRecording,
    recordActions,
    customCSS,
    onUrlChange,
    onRecordAction,
    onScreenshotRequest,
    onHighlightChange,
    onLoadingChange,
  } = props;

  const containerRef = useRef(null);
  const webviewRef = useRef(null);
  const listenersRef = useRef([]);
  const api = useElectronAPI();
  const [isLoading, setIsLoading] = useState(false);

  // Stable callback refs to avoid re-creating webview on prop changes
  const callbacksRef = useRef({
    onUrlChange,
    onRecordAction,
    onScreenshotRequest,
    onHighlightChange,
    onLoadingChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onUrlChange,
      onRecordAction,
      onScreenshotRequest,
      onHighlightChange,
      onLoadingChange,
    };
  });

  const recordingStateRef = useRef({ isRecording, recordActions, customCSS });
  useEffect(() => {
    recordingStateRef.current = { isRecording, recordActions, customCSS };
  }, [isRecording, recordActions, customCSS]);

  // Create webview element on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container || webviewRef.current) return;

    const webview = document.createElement('webview');
    const preloadPath = api.getWebviewPreloadPath();
    webview.setAttribute('preload', preloadPath);
    webview.setAttribute('webpreferences', 'contextIsolation=no, nodeIntegration=no');
    webview.setAttribute('allowpopups', '');
    webview.style.background = 'white';
    webview.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    webview.style.borderRadius = '2px';
    webview.style.display = 'inline-flex';

    // Apply initial viewport size
    if (viewport) {
      webview.style.width = `${viewport.width}px`;
      webview.style.height = `${viewport.height}px`;
      webview.style.minWidth = `${viewport.width}px`;
      webview.style.minHeight = `${viewport.height}px`;
    }

    container.appendChild(webview);
    webviewRef.current = webview;

    // Helper to add event listeners and track them for cleanup
    const addListener = (event, handler) => {
      webview.addEventListener(event, handler);
      listenersRef.current.push({ event, handler });
    };

    // Loading state handlers
    addListener('did-start-loading', () => {
      setIsLoading(true);
      callbacksRef.current.onLoadingChange?.(true);
    });

    addListener('did-stop-loading', () => {
      setIsLoading(false);
      callbacksRef.current.onLoadingChange?.(false);
    });

    // Page finished loading - re-sync recording state
    addListener('did-finish-load', () => {
      setIsLoading(false);
      callbacksRef.current.onLoadingChange?.(false);

      const { isRecording: rec, recordActions: ra, customCSS: css } = recordingStateRef.current;
      if (rec) {
        webview.send('recording-started', { recordActions: ra });
        if (css) {
          webview.send('inject-custom-css', css);
        }
      }
    });

    // Navigation events
    addListener('did-navigate', (e) => {
      callbacksRef.current.onUrlChange?.(e.url);

      // Re-sync recording state after navigation
      const { isRecording: rec, recordActions: ra, customCSS: css } = recordingStateRef.current;
      if (rec) {
        // Small delay to let the page initialize
        setTimeout(() => {
          webview.send('recording-started', { recordActions: ra });
          if (css) {
            webview.send('inject-custom-css', css);
          }
        }, 500);
      }
    });

    addListener('did-navigate-in-page', (e) => {
      if (e.isMainFrame) {
        callbacksRef.current.onUrlChange?.(e.url);
      }
    });

    // Load failure
    addListener('did-fail-load', (e) => {
      setIsLoading(false);
      callbacksRef.current.onLoadingChange?.(false);
      // Only log non-aborted loads (errorCode -3 is ERR_ABORTED, which is normal for redirects)
      if (e.errorCode !== -3) {
        console.warn('Webview load failed:', e.errorDescription, e.validatedURL);
      }
    });

    // Page title updates
    addListener('page-title-updated', (e) => {
      // Could be used for status updates if needed
    });

    // IPC messages from webview preload
    addListener('ipc-message', (e) => {
      const { channel, args } = e;

      switch (channel) {
        case 'record-action':
          callbacksRef.current.onRecordAction?.(args[0]);
          break;

        case 'request-screenshot': {
          const data = args[0] || {};
          callbacksRef.current.onScreenshotRequest?.({
            selector: data.selector || null,
            note: data.note || null,
            withNote: data.withNote || false,
            fullPage: data.fullPage || false,
          });
          break;
        }

        case 'highlight-changed':
          callbacksRef.current.onHighlightChange?.(args[0]);
          break;

        default:
          break;
      }
    });

    // Focus webview on mouse enter to ensure keyboard events work
    addListener('mouseenter', () => {
      webview.focus();
    });

    return () => {
      // Clean up all event listeners
      for (const { event, handler } of listenersRef.current) {
        webview.removeEventListener(event, handler);
      }
      listenersRef.current = [];

      if (container.contains(webview)) {
        container.removeChild(webview);
      }
      webviewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update webview size when viewport changes
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !viewport) return;
    webview.style.width = `${viewport.width}px`;
    webview.style.height = `${viewport.height}px`;
    webview.style.minWidth = `${viewport.width}px`;
    webview.style.minHeight = `${viewport.height}px`;
  }, [viewport]);

  // Notify webview when recording state changes
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    if (isRecording) {
      webview.send('recording-started', { recordActions });
      if (customCSS) {
        webview.send('inject-custom-css', customCSS);
      }
    } else {
      webview.send('recording-stopped');
    }
  }, [isRecording, recordActions, customCSS]);

  useImperativeHandle(ref, () => ({
    navigate(url) {
      const webview = webviewRef.current;
      if (!webview) return;
      // Ensure URL has protocol
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      webview.src = fullUrl;
    },

    goBack() {
      webviewRef.current?.goBack();
    },

    goForward() {
      webviewRef.current?.goForward();
    },

    reload() {
      webviewRef.current?.reload();
    },

    send(channel, ...args) {
      webviewRef.current?.send(channel, ...args);
    },

    async capturePage() {
      const webview = webviewRef.current;
      if (!webview) return null;
      return webview.capturePage();
    },

    async executeJavaScript(code) {
      const webview = webviewRef.current;
      if (!webview) return null;
      return webview.executeJavaScript(code);
    },

    focus() {
      webviewRef.current?.focus();
    },

    get src() {
      return webviewRef.current?.src;
    },

    getWebContentsId() {
      return webviewRef.current?.getWebContentsId();
    },
  }));

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center min-h-0 overflow-auto p-4 relative"
      style={{
        background: '#1e1e1e',
        backgroundImage:
          'linear-gradient(45deg, #252525 25%, transparent 25%), ' +
          'linear-gradient(-45deg, #252525 25%, transparent 25%), ' +
          'linear-gradient(45deg, transparent 75%, #252525 75%), ' +
          'linear-gradient(-45deg, transparent 75%, #252525 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-mono">Loading...</p>
        </div>
      )}
    </div>
  );
});
