import { Search } from 'lucide-react';

const ZOOM_OPTIONS = [
  { value: 'fit', label: 'Fit' },
  { value: '100', label: '100%' },
  { value: '75', label: '75%' },
  { value: '50', label: '50%' },
  { value: '25', label: '25%' },
];

/**
 * Compact zoom selector for the recording/steps toolbar.
 * Controls the visual scale of the recording webview (does not affect
 * the recorded resolution).
 */
export function ZoomSelect({ zoomMode = 'fit', onZoomChange }) {
  return (
    <div className="flex items-center gap-1" title="Zoom (display only — does not change recording resolution)">
      <Search className="h-3.5 w-3.5 text-muted-foreground" />
      <select
        value={zoomMode}
        onChange={(e) => onZoomChange?.(e.target.value)}
        className="h-8 rounded border border-border bg-muted px-1.5 pr-6 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        {ZOOM_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
