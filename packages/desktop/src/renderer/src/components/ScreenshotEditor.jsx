import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, Square, Grid3X3, ArrowRight, Circle, RectangleHorizontal, Type, Hash, Undo, Eraser, RotateCcw, MousePointer2 } from 'lucide-react';
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

const STROKE_WIDTHS = [1, 2, 3, 4, 6];

function isRegionTool(tool) {
  return tool === 'blur' || tool === 'redact' || tool === 'pixelate';
}

function isClickTool(tool) {
  return tool === 'text' || tool === 'callout';
}

// Hit-testing helpers for the select tool

function pointInRect(px, py, x, y, w, h) {
  const minX = Math.min(x, x + w);
  const maxX = Math.max(x, x + w);
  const minY = Math.min(y, y + h);
  const maxY = Math.max(y, y + h);
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function pointNearEllipsePerimeter(px, py, cx, cy, rx, ry, threshold) {
  if (rx === 0 || ry === 0) return false;
  const nx = (px - cx) / rx;
  const ny = (py - cy) / ry;
  const d = Math.sqrt(nx * nx + ny * ny);
  // Normalized distance from perimeter; scale threshold by average radius
  return Math.abs(d - 1) * ((rx + ry) / 2) < threshold;
}

function pointNearRectPerimeter(px, py, x, y, w, h, threshold) {
  const minX = Math.min(x, x + w);
  const maxX = Math.max(x, x + w);
  const minY = Math.min(y, y + h);
  const maxY = Math.max(y, y + h);
  const inside = px >= minX - threshold && px <= maxX + threshold &&
                 py >= minY - threshold && py <= maxY + threshold;
  if (!inside) return false;
  const deepInside = px >= minX + threshold && px <= maxX - threshold &&
                     py >= minY + threshold && py <= maxY - threshold;
  return !deepInside;
}

function hitTestItem(px, py, item, collection) {
  const threshold = 8;
  if (collection === 'regions') {
    return pointInRect(px, py, item.x, item.y, item.w, item.h);
  }
  switch (item.type) {
    case 'arrow':
      return distanceToLineSegment(px, py, item.x1, item.y1, item.x2, item.y2) < threshold;
    case 'circle': {
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      const rx = Math.abs(item.w) / 2;
      const ry = Math.abs(item.h) / 2;
      return pointNearEllipsePerimeter(px, py, cx, cy, rx, ry, threshold);
    }
    case 'rectangle':
      return pointNearRectPerimeter(px, py, item.x, item.y, item.w, item.h, threshold);
    case 'text': {
      const fontSize = item.fontSize || Math.max(14, (item.width || 3) * 6);
      const estW = fontSize * (item.text?.length || 1) * 0.6;
      const estH = fontSize * 1.2;
      return pointInRect(px, py, item.x, item.y, estW, estH);
    }
    case 'callout':
      return Math.hypot(px - item.x, py - item.y) < 14;
    default:
      return false;
  }
}

function findItemAtPoint(px, py, regions, annotations) {
  // Check annotations in reverse draw order (top-most first)
  for (let i = annotations.length - 1; i >= 0; i--) {
    if (hitTestItem(px, py, annotations[i], 'annotations')) {
      return { collection: 'annotations', index: i };
    }
  }
  // Then regions in reverse draw order
  for (let i = regions.length - 1; i >= 0; i--) {
    if (hitTestItem(px, py, regions[i], 'regions')) {
      return { collection: 'regions', index: i };
    }
  }
  return null;
}

export function ScreenshotEditor({ open, recordingId, filename, recordingDir, onClose, onSave, onOpenTextInput }) {
  const { state } = useApp();
  const electronAPI = useElectronAPI();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const [regions, setRegions] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [highlightOverlay, setHighlightOverlay] = useState(null);
  const [currentTool, setCurrentTool] = useState('blur');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const ctrlHeldRef = useRef(false);
  const [strokeColor, setStrokeColor] = useState('#f87171');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [calloutCounter, setCalloutCounter] = useState(1);
  const [scale, setScale] = useState(1);
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | '100' | '50' | '150' | '200'
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [undoStack, setUndoStack] = useState([]);
  const [selection, setSelection] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Track Ctrl key for aspect-ratio lock (circle → perfect circle, rectangle → square)
  // Using a counter bump to trigger canvas redraw when Ctrl state changes during a drag
  const [ctrlRedraw, setCtrlRedraw] = useState(0);
  useEffect(() => {
    if (!open) return;
    const down = (e) => {
      if (e.key === 'Control') {
        ctrlHeldRef.current = true;
        setCtrlRedraw((n) => n + 1);
      }
    };
    const up = (e) => {
      if (e.key === 'Control') {
        ctrlHeldRef.current = false;
        setCtrlRedraw((n) => n + 1);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      ctrlHeldRef.current = false;
    };
  }, [open]);

  // Constrain w/h to 1:1 aspect ratio (used when Ctrl is held for circle/rectangle)
  const constrainAspect = useCallback((w, h) => {
    const size = Math.max(Math.abs(w), Math.abs(h));
    return {
      w: Math.sign(w) * size || size,
      h: Math.sign(h) * size || size,
    };
  }, []);

  // Load the image when the editor opens
  useEffect(() => {
    if (!open || !recordingDir || !filename) return;

    setRegions([]);
    setAnnotations([]);
    setHighlightOverlay(null);
    setUndoStack([]);
    setCalloutCounter(1);
    setCurrentTool('blur');
    setSelection(null);
    setImageLoaded(false);

    const originalPath = `${recordingDir}/screenshots-original/${filename}`.replace(/\\/g, '/');
    const editedPath = `${recordingDir}/screenshots/${filename}`.replace(/\\/g, '/');
    const handleImageLoaded = (loadedImg) => {
      imageRef.current = loadedImg;
      setImageDimensions({ width: loadedImg.naturalWidth, height: loadedImg.naturalHeight });
      setImageLoaded(true);
    };
    const img = new Image();
    img.onload = () => handleImageLoaded(img);
    img.onerror = () => {
      // Original doesn't exist — fall back to the edited/main copy
      const fallback = new Image();
      fallback.onload = () => handleImageLoaded(fallback);
      fallback.onerror = () => console.error('Failed to load screenshot image:', editedPath);
      fallback.src = `file://${editedPath}?_cb=${Date.now()}`;
    };
    img.src = `file://${originalPath}?_cb=${Date.now()}`;

    // Load existing edits from IPC if available
    if (electronAPI && recordingId) {
      electronAPI.getScreenshotPath(recordingId, filename, state.currentProjectId).then((result) => {
        if (result?.success) {
          if (result.blurRegions?.length) setRegions(result.blurRegions);
          if (result.annotations?.length) setAnnotations(result.annotations);
          if (result.highlightOverlay) setHighlightOverlay(result.highlightOverlay);
        }
      }).catch(() => {});
    }
  }, [open, recordingDir, filename, recordingId, electronAPI, state.currentProjectId]);

  // Calculate scale and resize canvas when image loads, container resizes, or zoom changes
  useEffect(() => {
    if (!imageLoaded || !containerRef.current || !canvasRef.current) return;

    const fitCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const { width: cw, height: ch } = container.getBoundingClientRect();
      const { width: iw, height: ih } = imageDimensions;

      if (iw === 0 || ih === 0 || cw === 0 || ch === 0) return;

      let newScale;
      if (zoomMode === 'fit') {
        const scaleX = cw / iw;
        const scaleY = ch / ih;
        newScale = Math.min(scaleX, scaleY, 1);
      } else {
        newScale = Number(zoomMode) / 100;
      }

      const newW = Math.round(iw * newScale);
      const newH = Math.round(ih * newScale);

      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
      }

      setScale(newScale);
    };

    fitCanvas();
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageLoaded, imageDimensions, zoomMode]);

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
        highlightOverlay,
        calloutCounter,
      },
    ]);
  }, [regions, annotations, highlightOverlay, calloutCounter]);

  // Delete/Backspace to remove selected item
  useEffect(() => {
    if (!open || !selection) return;
    const handler = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't intercept if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        pushUndo();
        if (selection.collection === 'highlight') {
          setHighlightOverlay(null);
        } else if (selection.collection === 'regions') {
          setRegions((prev) => prev.filter((_, i) => i !== selection.index));
        } else {
          setAnnotations((prev) => prev.filter((_, i) => i !== selection.index));
        }
        setSelection(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selection, pushUndo]);

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
    (ctx, x, y, text, color, fontSize) => {
      ctx.save();
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

  const drawHighlightOverlay = useCallback(
    (ctx, hl) => {
      if (!hl) return;
      const { x, y, width, height, borderRadius = 4 } = hl;
      ctx.save();
      // Outer glow
      ctx.strokeStyle = 'rgba(255, 107, 53, 0.3)';
      ctx.lineWidth = 4;
      const pad = 4;
      const outerRx = borderRadius + 2;
      ctx.beginPath();
      ctx.roundRect(x - pad, y - pad, width + pad * 2, height + pad * 2, outerRx);
      ctx.stroke();
      // Inner highlight rect
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 107, 53, 0.15)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, borderRadius);
      ctx.fill();
      ctx.stroke();
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
          drawTextShape(ctx, ann.x, ann.y, ann.text, ann.color, ann.fontSize || Math.max(14, (ann.width || 3) * 6));
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

    // Draw highlight overlay first (behind everything else)
    if (highlightOverlay) {
      drawHighlightOverlay(ctx, highlightOverlay);
    }

    // Draw committed regions
    for (const region of regions) {
      drawRegionPreview(ctx, region.type, region.x, region.y, region.w, region.h);
    }

    // Draw committed annotations
    for (const ann of annotations) {
      drawAnnotation(ctx, ann);
    }

    // Draw selection indicator for highlight overlay
    if (selection && selection.collection === 'highlight' && highlightOverlay) {
      ctx.save();
      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 / scale;
      ctx.strokeRect(
        highlightOverlay.x - 6, highlightOverlay.y - 6,
        highlightOverlay.width + 12, highlightOverlay.height + 12
      );
      ctx.restore();
    }

    // Draw selection indicator
    if (selection && selection.collection !== 'highlight') {
      const item = selection.collection === 'regions'
        ? regions[selection.index]
        : annotations[selection.index];
      if (item) {
        ctx.save();
        ctx.setLineDash([6, 3]);
        ctx.strokeStyle = '#38bdf8'; // sky-400
        ctx.lineWidth = 1.5 / scale;
        let bx, by, bw, bh;
        if (selection.collection === 'regions') {
          bx = item.x; by = item.y; bw = item.w; bh = item.h;
        } else {
          switch (item.type) {
            case 'arrow': {
              bx = Math.min(item.x1, item.x2) - 4;
              by = Math.min(item.y1, item.y2) - 4;
              bw = Math.abs(item.x2 - item.x1) + 8;
              bh = Math.abs(item.y2 - item.y1) + 8;
              break;
            }
            case 'circle':
            case 'rectangle': {
              bx = Math.min(item.x, item.x + item.w);
              by = Math.min(item.y, item.y + item.h);
              bw = Math.abs(item.w);
              bh = Math.abs(item.h);
              break;
            }
            case 'text': {
              const fontSize = item.fontSize || Math.max(14, (item.width || 3) * 6);
              bx = item.x - 2;
              by = item.y - 2;
              bw = fontSize * (item.text?.length || 1) * 0.6 + 4;
              bh = fontSize * 1.2 + 4;
              break;
            }
            case 'callout': {
              bx = item.x - 16;
              by = item.y - 16;
              bw = 32;
              bh = 32;
              break;
            }
            default:
              bx = 0; by = 0; bw = 0; bh = 0;
          }
        }
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();
      }
    }

    // Draw current selection preview
    if (isDrawing) {
      let w = currentX - startX;
      let h = currentY - startY;

      // Ctrl held: lock aspect ratio to 1:1 for circle/rectangle
      const lockAspect = ctrlHeldRef.current && (currentTool === 'circle' || currentTool === 'rectangle');
      if (lockAspect) ({ w, h } = constrainAspect(w, h));

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
    highlightOverlay,
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
    drawHighlightOverlay,
    drawArrowShape,
    drawCircleShape,
    drawRectOutline,
    constrainAspect,
    ctrlRedraw,
    selection,
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

      if (currentTool === 'select') {
        // Check highlight overlay first
        let hit = null;
        if (highlightOverlay && pointInRect(
          x, y,
          highlightOverlay.x - 4, highlightOverlay.y - 4,
          highlightOverlay.width + 8, highlightOverlay.height + 8
        )) {
          hit = { collection: 'highlight', index: 0 };
        }
        if (!hit) {
          hit = findItemAtPoint(x, y, regions, annotations);
        }
        if (hit) {
          // If clicking the already-selected item, start a drag
          if (selection && selection.collection === hit.collection && selection.index === hit.index) {
            pushUndo();
            setIsDragging(true);
            setDragStart({ x, y });
          } else {
            // Select new item (next click will drag)
            setSelection(hit);
            // Sync color/width pickers to the selected item's properties
            if (hit.collection !== 'highlight') {
              const item = hit.collection === 'regions' ? regions[hit.index] : annotations[hit.index];
              if (item.color) setStrokeColor(item.color);
              if (item.width) setStrokeWidth(item.width);
            }
          }
        } else {
          setSelection(null);
        }
        return;
      }

      if (isClickTool(currentTool)) {
        pushUndo();
        if (currentTool === 'text') {
          // Open text input via parent callback, then add annotation
          if (onOpenTextInput) {
            textPosRef.current = { x, y };
            onOpenTextInput({
              onSave: ({ text, fontSize }) => {
                if (text && textPosRef.current) {
                  setAnnotations((prev) => [
                    ...prev,
                    {
                      type: 'text',
                      x: textPosRef.current.x,
                      y: textPosRef.current.y,
                      text,
                      fontSize,
                      color: strokeColor,
                    },
                  ]);
                }
              },
            });
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
    [currentTool, toImageCoords, pushUndo, strokeColor, calloutCounter, onOpenTextInput, regions, annotations, highlightOverlay, selection]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging && selection) {
        const { x, y } = toImageCoords(e);
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        setDragStart({ x, y });

        if (selection.collection === 'highlight') {
          setHighlightOverlay((prev) => prev ? {
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy,
          } : prev);
        } else if (selection.collection === 'regions') {
          setRegions((prev) => prev.map((r, i) =>
            i === selection.index ? { ...r, x: r.x + dx, y: r.y + dy } : r
          ));
        } else {
          setAnnotations((prev) => prev.map((a, i) => {
            if (i !== selection.index) return a;
            switch (a.type) {
              case 'arrow':
                return { ...a, x1: a.x1 + dx, y1: a.y1 + dy, x2: a.x2 + dx, y2: a.y2 + dy };
              case 'circle':
              case 'rectangle':
              case 'text':
              case 'callout':
                return { ...a, x: a.x + dx, y: a.y + dy };
              default:
                return a;
            }
          }));
        }
        return;
      }

      if (!isDrawing) return;
      const { x, y } = toImageCoords(e);
      setCurrentX(x);
      setCurrentY(y);
    },
    [isDrawing, isDragging, selection, dragStart, toImageCoords]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (isDragging) {
        setIsDragging(false);
        return;
      }
      if (!isDrawing) return;
      setIsDrawing(false);

      const { x, y } = toImageCoords(e);
      let w = x - startX;
      let h = y - startY;

      // Ctrl held: lock aspect ratio to 1:1 for circle/rectangle
      const lockAspect = e.ctrlKey && (currentTool === 'circle' || currentTool === 'rectangle');
      if (lockAspect) ({ w, h } = constrainAspect(w, h));

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
    [isDrawing, isDragging, toImageCoords, startX, startY, currentTool, strokeColor, strokeWidth, pushUndo, constrainAspect]
  );

  // Text position ref for async text input
  const textPosRef = useRef({ x: 0, y: 0 });

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRegions(prev.regions);
    setAnnotations(prev.annotations);
    setHighlightOverlay(prev.highlightOverlay);
    setCalloutCounter(prev.calloutCounter);
    setSelection(null);
  }, [undoStack]);

  // Clear all
  const handleClear = useCallback(() => {
    if (regions.length === 0 && annotations.length === 0 && !highlightOverlay) return;
    pushUndo();
    setRegions([]);
    setAnnotations([]);
    setHighlightOverlay(null);
    setCalloutCounter(1);
    setSelection(null);
  }, [regions, annotations, highlightOverlay, pushUndo]);

  // Reset to original
  const handleReset = useCallback(async () => {
    if (!electronAPI || !recordingId || !filename) return;
    try {
      await electronAPI.resetScreenshotToOriginal({ recordingId, filename, projectId: state.currentProjectId });
      // Reload the image — try original first, fall back to screenshots/
      const resetOriginalPath = `${recordingDir}/screenshots-original/${filename}`.replace(/\\/g, '/');
      const resetEditedPath = `${recordingDir}/screenshots/${filename}`.replace(/\\/g, '/');
      const handleResetLoaded = (loadedImg) => {
        imageRef.current = loadedImg;
        setRegions([]);
        setAnnotations([]);
        setHighlightOverlay(null);
        setUndoStack([]);
        setCalloutCounter(1);
        setSelection(null);
        setImageLoaded(true);
      };
      const img = new Image();
      img.onload = () => handleResetLoaded(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => handleResetLoaded(fallback);
        fallback.onerror = () => console.error('Failed to load screenshot image:', resetEditedPath);
        fallback.src = `file://${resetEditedPath}?_cb=${Date.now()}`;
      };
      img.src = `file://${resetOriginalPath}?_cb=${Date.now()}`;
    } catch (err) {
      console.error('Failed to reset screenshot:', err);
    }
  }, [electronAPI, recordingId, filename, recordingDir, state.currentProjectId]);

  // Save edits
  const handleSave = useCallback(async () => {
    if (!electronAPI || !recordingId || !filename) return;
    try {
      await electronAPI.saveScreenshotEdits({
        recordingId,
        filename,
        blurRegions: regions,
        annotations,
        highlightOverlay,
        projectId: state.currentProjectId,
      });
      if (onSave) onSave();
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to save screenshot edits:', err);
    }
  }, [electronAPI, recordingId, filename, regions, annotations, onSave, onClose, state.currentProjectId]);

  // Get current tool hint
  const currentToolConfig =
    BLUR_TOOLS.find((t) => t.id === currentTool) ||
    ANNOTATE_TOOLS.find((t) => t.id === currentTool);

  function getStatusHint() {
    if (selection) {
      if (selection.collection === 'highlight') {
        return 'Selected element highlight \u2014 Drag to move \u00b7 Press Delete to remove';
      }
      const item = selection.collection === 'regions'
        ? regions[selection.index]
        : annotations[selection.index];
      const type = item?.type || selection.collection;
      return `Selected ${type} \u2014 Drag to move \u00b7 Press Delete to remove`;
    }
    if (currentTool === 'select') {
      return 'Click on an item to select it';
    }
    return currentToolConfig ? currentToolConfig.hint : 'Select a tool';
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 top-[38px] z-50 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          {/* Select tool */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Select
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setCurrentTool('select'); setSelection(null); }}
              className={cn(
                'h-7 w-7',
                currentTool === 'select'
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Select (click to select and edit items)"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Blur tools group */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Blur
            </span>
            <div className="flex items-center gap-0.5">
              {BLUR_TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (selection && selection.collection === 'regions') {
                      // Change selected region's type instead of switching tools
                      const item = regions[selection.index];
                      if (item && item.type !== tool.id) {
                        pushUndo();
                        setRegions((prev) => prev.map((r, i) =>
                          i === selection.index ? { ...r, type: tool.id } : r
                        ));
                      }
                      return;
                    }
                    setCurrentTool(tool.id);
                    setSelection(null);
                  }}
                  className={cn(
                    'h-7 w-7',
                    (currentTool === tool.id && !selection) ||
                    (selection?.collection === 'regions' && regions[selection.index]?.type === tool.id)
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={tool.label}
                >
                  <tool.icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Annotate tools group */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Annotate
            </span>
            <div className="flex items-center gap-0.5">
              {ANNOTATE_TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCurrentTool(tool.id); setSelection(null); }}
                  className={cn(
                    'h-7 w-7',
                    currentTool === tool.id && !selection
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={tool.label}
                >
                  <tool.icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Color */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Color
            </span>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => {
                const newColor = e.target.value;
                setStrokeColor(newColor);
                if (selection && selection.collection === 'annotations') {
                  pushUndo();
                  setAnnotations((prev) => prev.map((a, i) =>
                    i === selection.index ? { ...a, color: newColor } : a
                  ));
                }
              }}
              className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Stroke width */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Width
            </span>
            <div className="flex items-center gap-0.5">
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  title={`${sw}px`}
                  onClick={() => {
                    setStrokeWidth(sw);
                    if (selection && selection.collection === 'annotations') {
                      const item = annotations[selection.index];
                      if (item && (item.type === 'arrow' || item.type === 'circle' || item.type === 'rectangle')) {
                        pushUndo();
                        setAnnotations((prev) => prev.map((a, i) =>
                          i === selection.index ? { ...a, width: sw } : a
                        ));
                      }
                    }
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded transition-colors',
                    strokeWidth === sw
                      ? 'bg-teal-600'
                      : 'bg-muted hover:bg-accent'
                  )}
                >
                  <span
                    className="rounded-full bg-foreground"
                    style={{ width: `${Math.max(sw * 2.5, 4)}px`, height: `${Math.max(sw * 2.5, 4)}px` }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Zoom */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Zoom
            </span>
            <select
              value={zoomMode}
              onChange={(e) => setZoomMode(e.target.value)}
              className="h-7 rounded border border-border bg-muted px-1.5 pr-7 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="fit">Fit</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
              <option value="150">150%</option>
              <option value="200">200%</option>
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            title="Undo last action"
          >
            <Undo className="h-3.5 w-3.5" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={regions.length === 0 && annotations.length === 0 && !highlightOverlay}
            className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
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

          <div className="mx-1 h-6 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
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
        className={cn(
          'min-h-0 flex-1 bg-card/50',
          zoomMode === 'fit'
            ? 'flex overflow-hidden p-4'
            : 'flex overflow-auto p-4'
        )}
      >
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isDrawing) setIsDrawing(false);
              if (isDragging) setIsDragging(false);
            }}
            className="m-auto shadow-2xl"
            style={{
              imageRendering: 'auto',
              cursor: currentTool === 'select'
                ? (isDragging ? 'grabbing' : 'default')
                : 'crosshair',
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading screenshot...</div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-border px-4">
        <span className="text-[11px] text-muted-foreground">
          {getStatusHint()}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {imageDimensions.width > 0
            ? `${imageDimensions.width} \u00d7 ${imageDimensions.height}px \u00b7 ${Math.round(scale * 100)}%`
            : ''}
        </span>
      </div>
    </div>
  );
}
