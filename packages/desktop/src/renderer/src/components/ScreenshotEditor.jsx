import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Square, Grid3X3, ArrowRight, Circle, RectangleHorizontal, Type, Hash, Undo, Eraser, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';

const BLUR_TOOLS = [
  { id: 'blur', label: 'Blur', icon: Eye, hint: 'Drag to select a region to blur' },
  { id: 'redact', label: 'Redact', icon: Square, hint: 'Drag to select a region to redact (solid fill)' },
  { id: 'pixelate', label: 'Pixelate', icon: Grid3X3, hint: 'Drag to select a region to pixelate' },
];

const ANNOTATE_TOOLS = [
  { id: 'arrow', label: 'Arrow', icon: ArrowRight, hint: 'Drag from start to end to draw an arrow' },
  { id: 'circle', label: 'Circle', icon: Circle, hint: 'Drag to draw a circle' },
  { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal, hint: 'Drag to draw a rectangle' },
  { id: 'text', label: 'Text', icon: Type, hint: 'Click to place text on the image' },
  { id: 'callout', label: 'Callout', icon: Hash, hint: 'Click to place a numbered callout badge' },
];

const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 3 },
  { label: 'Thick', value: 5 },
];

function isRegionTool(tool) {
  return tool === 'blur' || tool === 'redact' || tool === 'pixelate';
}

function isClickTool(tool) {
  return tool === 'text' || tool === 'callout';
}

export function ScreenshotEditor({ open, recordingId, filename, onClose, onSave, onOpenTextInput }) {
  const { state, dispatch } = useApp();
  const electronAPI = useElectronAPI();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [regions, setRegions] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [currentTool, setCurrentTool] = useState('blur');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#f87171');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [calloutCounter, setCalloutCounter] = useState(1);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [undoStack, setUndoStack] = useState([]);

  // Load the image when the editor opens
  useEffect(() => {
    if (!open || !electronAPI || !recordingId || !filename) return;

    setRegions([]);
    setAnnotations([]);
    setUndoStack([]);
    setCalloutCounter(1);
    setCurrentTool('blur');
    setImageLoaded(false);

    const loadImage = async () => {
      try {
        const imgPath = await electronAPI.getScreenshotPath(recordingId, filename);
        const img = new Image();
        img.onload = () => {
          imageRef.current = img;
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setImageLoaded(true);
        };
        img.onerror = () => {
          console.error('Failed to load screenshot image:', imgPath);
        };
        img.src = `file://${imgPath}?_cb=${Date.now()}`;
      } catch (err) {
        console.error('Failed to get screenshot path:', err);
      }
    };

    loadImage();
  }, [open, electronAPI, recordingId, filename]);

  // Calculate scale and resize canvas when image loads or container resizes
  useEffect(() => {
    if (!imageLoaded || !containerRef.current || !canvasRef.current) return;

    const fitCanvas = () => {
      const container = containerRef.current;
      if (!container) return;

      const { width: cw, height: ch } = container.getBoundingClientRect();
      const { width: iw, height: ih } = imageDimensions;

      if (iw === 0 || ih === 0) return;

      const scaleX = cw / iw;
      const scaleY = ch / ih;
      const newScale = Math.min(scaleX, scaleY, 1);

      setScale(newScale);

      const canvas = canvasRef.current;
      canvas.width = iw * newScale;
      canvas.height = ih * newScale;
    };

    fitCanvas();
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageLoaded, imageDimensions]);

  // Convert mouse coordinates to image coordinates
  const toImageCoords = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    },
    [scale]
  );

  // Save undo snapshot
  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [
      ...prev,
      {
        regions: [...regions],
        annotations: [...annotations],
        calloutCounter,
      },
    ]);
  }, [regions, annotations, calloutCounter]);

  // Drawing helpers

  const drawRegionPreview = useCallback(
    (ctx, type, x, y, w, h) => {
      ctx.save();
      if (type === 'blur') {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.fillRect(x, y, w, h);
        // Grid dots to indicate blur
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        const step = 6;
        for (let gx = x; gx < x + w; gx += step) {
          for (let gy = y; gy < y + h; gy += step) {
            ctx.fillRect(gx, gy, 2, 2);
          }
        }
      } else if (type === 'redact') {
        ctx.fillStyle = strokeColor;
        ctx.fillRect(x, y, w, h);
      } else if (type === 'pixelate') {
        ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
        ctx.fillRect(x, y, w, h);
        const step = 10;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 0.5;
        for (let gx = x; gx < x + w; gx += step) {
          ctx.beginPath();
          ctx.moveTo(gx, y);
          ctx.lineTo(gx, y + h);
          ctx.stroke();
        }
        for (let gy = y; gy < y + h; gy += step) {
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.lineTo(x + w, gy);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
    [strokeColor]
  );

  const drawArrowShape = useCallback(
    (ctx, x1, y1, x2, y2, color, width) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 12 + width * 2;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 7),
        y2 - headLen * Math.sin(angle - Math.PI / 7)
      );
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 7),
        y2 - headLen * Math.sin(angle + Math.PI / 7)
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    []
  );

  const drawCircleShape = useCallback(
    (ctx, x, y, w, h, color, width) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.abs(w) / 2;
      const ry = Math.abs(h) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const drawRectOutline = useCallback(
    (ctx, x, y, w, h, color, width) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    },
    []
  );

  const drawTextShape = useCallback(
    (ctx, x, y, text, color, size) => {
      ctx.save();
      const fontSize = Math.max(14, size * 6);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textBaseline = 'top';
      // White outline for readability
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    },
    []
  );

  const drawCalloutShape = useCallback(
    (ctx, x, y, number, color) => {
      ctx.save();
      const radius = 14;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      // Border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Number
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), x, y);
      ctx.restore();
    },
    []
  );

  const drawAnnotation = useCallback(
    (ctx, ann) => {
      switch (ann.type) {
        case 'arrow':
          drawArrowShape(ctx, ann.x1, ann.y1, ann.x2, ann.y2, ann.color, ann.width);
          break;
        case 'circle':
          drawCircleShape(ctx, ann.x, ann.y, ann.w, ann.h, ann.color, ann.width);
          break;
        case 'rectangle':
          drawRectOutline(ctx, ann.x, ann.y, ann.w, ann.h, ann.color, ann.width);
          break;
        case 'text':
          drawTextShape(ctx, ann.x, ann.y, ann.text, ann.color, ann.width);
          break;
        case 'callout':
          drawCalloutShape(ctx, ann.x, ann.y, ann.number, ann.color);
          break;
        default:
          break;
      }
    },
    [drawArrowShape, drawCircleShape, drawRectOutline, drawTextShape, drawCalloutShape]
  );

  // Main canvas redraw
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw original image scaled
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    // Draw committed regions
    for (const region of regions) {
      drawRegionPreview(ctx, region.type, region.x, region.y, region.w, region.h);
    }

    // Draw committed annotations
    for (const ann of annotations) {
      drawAnnotation(ctx, ann);
    }

    // Draw current selection preview
    if (isDrawing) {
      const w = currentX - startX;
      const h = currentY - startY;

      if (isRegionTool(currentTool)) {
        drawRegionPreview(ctx, currentTool, startX, startY, w, h);

        // Dashed selection outline
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#5eead4';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, startY, w, h);
        ctx.restore();
      } else if (currentTool === 'arrow') {
        drawArrowShape(ctx, startX, startY, currentX, currentY, strokeColor, strokeWidth);
      } else if (currentTool === 'circle') {
        drawCircleShape(ctx, startX, startY, w, h, strokeColor, strokeWidth);
      } else if (currentTool === 'rectangle') {
        drawRectOutline(ctx, startX, startY, w, h, strokeColor, strokeWidth);
      }
    }

    ctx.restore();
  }, [
    scale,
    regions,
    annotations,
    isDrawing,
    currentTool,
    startX,
    startY,
    currentX,
    currentY,
    strokeColor,
    strokeWidth,
    drawRegionPreview,
    drawAnnotation,
    drawArrowShape,
    drawCircleShape,
    drawRectOutline,
  ]);

  // Redraw whenever state changes
  useEffect(() => {
    if (imageLoaded) {
      redrawCanvas();
    }
  }, [imageLoaded, redrawCanvas]);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      const { x, y } = toImageCoords(e);

      if (isClickTool(currentTool)) {
        pushUndo();
        if (currentTool === 'text') {
          // Open text input via parent callback, then add annotation
          if (onOpenTextInput) {
            dispatch({ type: 'OPEN_TEXT_INPUT_MODAL' });
            // Store position for when text input completes
            textPosRef.current = { x, y };
          }
        } else if (currentTool === 'callout') {
          setAnnotations((prev) => [
            ...prev,
            { type: 'callout', x, y, number: calloutCounter, color: strokeColor },
          ]);
          setCalloutCounter((c) => c + 1);
        }
        return;
      }

      setIsDrawing(true);
      setStartX(x);
      setStartY(y);
      setCurrentX(x);
      setCurrentY(y);
    },
    [currentTool, toImageCoords, pushUndo, strokeColor, calloutCounter, onOpenTextInput, dispatch]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing) return;
      const { x, y } = toImageCoords(e);
      setCurrentX(x);
      setCurrentY(y);
    },
    [isDrawing, toImageCoords]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (!isDrawing) return;
      setIsDrawing(false);

      const { x, y } = toImageCoords(e);
      const w = x - startX;
      const h = y - startY;

      // Minimum size check for drag tools
      if (Math.abs(w) < 3 && Math.abs(h) < 3) return;

      pushUndo();

      if (isRegionTool(currentTool)) {
        // Normalize to positive width/height
        const nx = w < 0 ? startX + w : startX;
        const ny = h < 0 ? startY + h : startY;
        const nw = Math.abs(w);
        const nh = Math.abs(h);
        setRegions((prev) => [...prev, { type: currentTool, x: nx, y: ny, w: nw, h: nh }]);
      } else if (currentTool === 'arrow') {
        setAnnotations((prev) => [
          ...prev,
          { type: 'arrow', x1: startX, y1: startY, x2: x, y2: y, color: strokeColor, width: strokeWidth },
        ]);
      } else if (currentTool === 'circle') {
        setAnnotations((prev) => [
          ...prev,
          { type: 'circle', x: startX, y: startY, w, h, color: strokeColor, width: strokeWidth },
        ]);
      } else if (currentTool === 'rectangle') {
        setAnnotations((prev) => [
          ...prev,
          { type: 'rectangle', x: startX, y: startY, w, h, color: strokeColor, width: strokeWidth },
        ]);
      }
    },
    [isDrawing, toImageCoords, startX, startY, currentTool, strokeColor, strokeWidth, pushUndo]
  );

  // Text position ref for async text input
  const textPosRef = useRef({ x: 0, y: 0 });

  // Listen for text input modal result
  useEffect(() => {
    if (!electronAPI) return;
    const handler = (text) => {
      if (text && textPosRef.current) {
        setAnnotations((prev) => [
          ...prev,
          {
            type: 'text',
            x: textPosRef.current.x,
            y: textPosRef.current.y,
            text,
            color: strokeColor,
            width: strokeWidth,
          },
        ]);
      }
      dispatch({ type: 'CLOSE_TEXT_INPUT_MODAL' });
    };

    if (electronAPI.onTextInputResult) {
      electronAPI.onTextInputResult(handler);
    }

    return () => {
      if (electronAPI.offTextInputResult) {
        electronAPI.offTextInputResult(handler);
      }
    };
  }, [electronAPI, strokeColor, strokeWidth, dispatch]);

  // Add text annotation externally (called by parent when text modal submits)
  const addTextAnnotation = useCallback(
    (text) => {
      if (text && textPosRef.current) {
        pushUndo();
        setAnnotations((prev) => [
          ...prev,
          {
            type: 'text',
            x: textPosRef.current.x,
            y: textPosRef.current.y,
            text,
            color: strokeColor,
            width: strokeWidth,
          },
        ]);
      }
    },
    [pushUndo, strokeColor, strokeWidth]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRegions(prev.regions);
    setAnnotations(prev.annotations);
    setCalloutCounter(prev.calloutCounter);
  }, [undoStack]);

  // Clear all
  const handleClear = useCallback(() => {
    if (regions.length === 0 && annotations.length === 0) return;
    pushUndo();
    setRegions([]);
    setAnnotations([]);
    setCalloutCounter(1);
  }, [regions, annotations, pushUndo]);

  // Reset to original
  const handleReset = useCallback(async () => {
    if (!electronAPI || !recordingId || !filename) return;
    try {
      await electronAPI.resetScreenshotToOriginal(recordingId, filename);
      // Reload the image
      const imgPath = await electronAPI.getScreenshotPath(recordingId, filename);
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setRegions([]);
        setAnnotations([]);
        setUndoStack([]);
        setCalloutCounter(1);
        setImageLoaded(true);
      };
      img.src = `file://${imgPath}?_cb=${Date.now()}`;
    } catch (err) {
      console.error('Failed to reset screenshot:', err);
    }
  }, [electronAPI, recordingId, filename]);

  // Save edits
  const handleSave = useCallback(async () => {
    if (!electronAPI || !recordingId || !filename) return;
    try {
      await electronAPI.saveScreenshotEdits(recordingId, filename, {
        regions,
        annotations,
      });
      if (onSave) onSave();
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to save screenshot edits:', err);
    }
  }, [electronAPI, recordingId, filename, regions, annotations, onSave, onClose]);

  // Get current tool hint
  const currentToolConfig =
    BLUR_TOOLS.find((t) => t.id === currentTool) ||
    ANNOTATE_TOOLS.find((t) => t.id === currentTool);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-4">
          {/* Blur tools group */}
          <div className="flex items-center gap-1">
            <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Blur
            </span>
            {BLUR_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTool(tool.id)}
                className={cn(
                  'h-8 gap-1.5 px-2.5 text-xs',
                  currentTool === tool.id
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                title={tool.hint}
              >
                <tool.icon className="h-3.5 w-3.5" />
                {tool.label}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-700" />

          {/* Annotate tools group */}
          <div className="flex items-center gap-1">
            <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Annotate
            </span>
            {ANNOTATE_TOOLS.map((tool) => (
              <Button
                key={tool.id}
                variant={currentTool === tool.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentTool(tool.id)}
                className={cn(
                  'h-8 gap-1.5 px-2.5 text-xs',
                  currentTool === tool.id
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                title={tool.hint}
              >
                <tool.icon className="h-3.5 w-3.5" />
                {tool.label}
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-700" />

          {/* Color + stroke */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Color
              </span>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded border border-slate-600 bg-transparent p-0.5"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Stroke
              </span>
              <select
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="h-7 rounded border border-slate-600 bg-slate-800 px-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {STROKE_WIDTHS.map((sw) => (
                  <option key={sw.value} value={sw.value}>
                    {sw.label} ({sw.value})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="h-8 gap-1.5 px-2.5 text-xs text-slate-400 hover:text-slate-200"
            title="Undo last action"
          >
            <Undo className="h-3.5 w-3.5" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={regions.length === 0 && annotations.length === 0}
            className="h-8 gap-1.5 px-2.5 text-xs text-slate-400 hover:text-slate-200"
            title="Clear all edits"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 gap-1.5 px-2.5 text-xs text-amber-400 hover:text-amber-300"
            title="Reset to original screenshot"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Original
          </Button>

          <div className="mx-1 h-6 w-px bg-slate-700" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 bg-teal-600 px-3 text-xs text-white hover:bg-teal-700"
          >
            Save
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-900/50 p-4"
      >
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isDrawing) {
                setIsDrawing(false);
              }
            }}
            className={cn(
              'shadow-2xl',
              isClickTool(currentTool) ? 'cursor-crosshair' : 'cursor-crosshair'
            )}
            style={{
              imageRendering: 'auto',
            }}
          />
        ) : (
          <div className="text-sm text-slate-500">Loading screenshot...</div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-slate-800 px-4">
        <span className="text-[11px] text-slate-500">
          {currentToolConfig ? currentToolConfig.hint : 'Select a tool'}
        </span>
        <span className="text-[11px] text-slate-500">
          {imageDimensions.width > 0
            ? `${imageDimensions.width} x ${imageDimensions.height}px`
            : ''}
        </span>
      </div>
    </div>
  );
}
