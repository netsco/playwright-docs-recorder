import { useState, useEffect, useRef } from 'react';
import { Video, ChevronDown, ChevronRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';

const VIEWPORT_PRESETS = {
  'WSXGA+': { width: 1680, height: 1050 },
  'Full HD': { width: 1920, height: 1080 },
  HD: { width: 1280, height: 720 },
  Mobile: { width: 375, height: 812 },
  'Mobile Landscape': { width: 812, height: 375 },
  Tablet: { width: 768, height: 1024 },
  'Tablet Landscape': { width: 1024, height: 768 },
  Custom: null,
};

const PRESET_NAMES = Object.keys(VIEWPORT_PRESETS);

function getPresetName(width, height) {
  for (const [name, dims] of Object.entries(VIEWPORT_PRESETS)) {
    if (dims && dims.width === width && dims.height === height) {
      return name;
    }
  }
  return 'Custom';
}

export function WelcomePanel({ onStartRecording }) {
  const { state } = useApp();
  const api = useElectronAPI();

  const project = state.currentProject;
  const settings = state.settings;

  // Form fields
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [recordActions, setRecordActions] = useState(true);
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);

  // Custom settings
  const defaultViewport = project?.viewport || settings?.viewport || '1280x720';
  const [vWidth, vHeight] = defaultViewport.split('x').map(Number);

  const [viewportPreset, setViewportPreset] = useState(() =>
    getPresetName(vWidth, vHeight)
  );
  const [customWidth, setCustomWidth] = useState(vWidth || 1280);
  const [customHeight, setCustomHeight] = useState(vHeight || 720);
  const [separator, setSeparator] = useState(
    project?.separator ?? settings?.separator ?? '---'
  );
  const [useCSS, setUseCSS] = useState(false);
  const [customCSS, setCustomCSS] = useState(project?.css || '');

  // Validation
  const [errors, setErrors] = useState({});

  const urlInputRef = useRef(null);

  // Focus URL input on mount
  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  // Sync custom width/height when preset changes
  useEffect(() => {
    const dims = VIEWPORT_PRESETS[viewportPreset];
    if (dims) {
      setCustomWidth(dims.width);
      setCustomHeight(dims.height);
    }
  }, [viewportPreset]);

  const recentUrls = settings?.recentUrls || [];

  const validate = () => {
    const newErrors = {};
    if (!url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(url.trim());
      } catch {
        newErrors.url = 'Please enter a valid URL';
      }
    }
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const viewport = `${customWidth}x${customHeight}`;

    onStartRecording({
      url: url.trim(),
      title: title.trim(),
      viewport,
      separator,
      recordActions,
      customCSS: useCSS ? customCSS : '',
      useCustomSettings,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLoadCSSFile = async () => {
    if (api?.selectCSSFile) {
      const cssContent = await api.selectCSSFile();
      if (cssContent) {
        setCustomCSS(cssContent);
      }
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="w-full max-w-lg">
        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-8 shadow-2xl backdrop-blur"
        >
          {/* Header icon */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 shadow-lg shadow-coral-500/20"
              style={{
                background: 'linear-gradient(135deg, #f87171, #ef4444)',
              }}
            >
              <Video className="h-7 w-7 text-white" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-100">
              New Recording
            </h2>
            {project && (
              <p className="mt-1 text-sm text-slate-400">
                in {project.name}
              </p>
            )}
          </div>

          {/* URL Field */}
          <div className="mb-4">
            <Label htmlFor="rec-url" className="mb-1.5 block">
              Starting URL
            </Label>
            <Input
              ref={urlInputRef}
              id="rec-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (errors.url) setErrors((prev) => ({ ...prev, url: undefined }));
              }}
              list="recent-urls"
              className={errors.url ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {recentUrls.length > 0 && (
              <datalist id="recent-urls">
                {recentUrls.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            )}
            {errors.url && (
              <p className="mt-1 text-xs text-red-400">{errors.url}</p>
            )}
          </div>

          {/* Title Field */}
          <div className="mb-4">
            <Label htmlFor="rec-title" className="mb-1.5 block">
              Recording Title
            </Label>
            <Input
              id="rec-title"
              type="text"
              placeholder="Getting Started Guide"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className={errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Record Actions Checkbox */}
          <div className="mb-5">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="rec-actions"
                checked={recordActions}
                onCheckedChange={(checked) => setRecordActions(checked === true)}
              />
              <Label htmlFor="rec-actions" className="cursor-pointer">
                Record clicks and form inputs
              </Label>
            </div>
            {recordActions && (
              <p className="mt-1.5 ml-6.5 text-xs text-amber-400/80">
                Avoid entering credentials while recording actions.
              </p>
            )}
          </div>

          {/* Project Defaults Info */}
          {project && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowDefaults(!showDefaults)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showDefaults ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Project defaults
              </button>
              {showDefaults && (
                <div className="mt-2 rounded-md border border-slate-700/50 bg-slate-900/50 p-3 text-xs text-slate-400">
                  <div className="flex justify-between py-0.5">
                    <span>Viewport</span>
                    <span className="text-slate-300">{defaultViewport}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Separator</span>
                    <span className="text-slate-300">
                      {project.separator ?? settings?.separator ?? '---'}
                    </span>
                  </div>
                  {project.css && (
                    <div className="flex justify-between py-0.5">
                      <span>Custom CSS</span>
                      <span className="text-slate-300">Configured</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customize Settings Toggle */}
          <div className="mb-4">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="rec-custom-settings"
                checked={useCustomSettings}
                onCheckedChange={(checked) => setUseCustomSettings(checked === true)}
              />
              <Label htmlFor="rec-custom-settings" className="cursor-pointer text-slate-400">
                Customize settings
              </Label>
            </div>
          </div>

          {/* Custom Settings Panel */}
          {useCustomSettings && (
            <div className="mb-5 space-y-4 rounded-md border border-slate-700/50 bg-slate-900/30 p-4">
              {/* Viewport Preset */}
              <div>
                <Label className="mb-1.5 block">Viewport</Label>
                <Select value={viewportPreset} onValueChange={setViewportPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select viewport" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                        {VIEWPORT_PRESETS[name]
                          ? ` (${VIEWPORT_PRESETS[name].width}x${VIEWPORT_PRESETS[name].height})`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Dimensions */}
              {viewportPreset === 'Custom' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="vp-width" className="mb-1.5 block text-xs">
                      Width
                    </Label>
                    <Input
                      id="vp-width"
                      type="number"
                      min={320}
                      max={3840}
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="vp-height" className="mb-1.5 block text-xs">
                      Height
                    </Label>
                    <Input
                      id="vp-height"
                      type="number"
                      min={240}
                      max={2160}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              {/* Screenshot Separator */}
              <div>
                <Label htmlFor="rec-separator" className="mb-1.5 block">
                  Screenshot separator
                </Label>
                <Input
                  id="rec-separator"
                  type="text"
                  placeholder="---"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value)}
                />
              </div>

              {/* CSS Injection */}
              <div>
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="rec-css"
                    checked={useCSS}
                    onCheckedChange={(checked) => setUseCSS(checked === true)}
                  />
                  <Label htmlFor="rec-css" className="cursor-pointer">
                    Inject custom CSS
                  </Label>
                </div>
                {useCSS && (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      placeholder="/* Hide cookie banners, popups, etc. */&#10;.cookie-banner { display: none !important; }"
                      value={customCSS}
                      onChange={(e) => setCustomCSS(e.target.value)}
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadCSSFile}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Load from file
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Start Recording Button */}
          <Button
            type="submit"
            className="w-full text-white font-semibold shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #f87171, #ef4444)',
            }}
          >
            <span className="relative mr-2 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Start Recording
          </Button>

          {/* Hint */}
          <p className="mt-3 text-center text-xs text-slate-500">
            Press Enter to start
          </p>
        </form>
      </div>
    </div>
  );
}
