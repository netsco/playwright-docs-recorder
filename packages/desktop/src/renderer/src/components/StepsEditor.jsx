import { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  StickyNote,
  Pencil,
  Trash2,
  Save,
  Plus,
  Loader2,
  RefreshCw,
  X,
  MessageSquareText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZoomSelect } from '@/components/ZoomSelect';
import { useApp } from '@/context/AppContext';

export function StepsEditor({
  onSave,
  onCancel,
  onCaptureScreenshot,
  onRetakeScreenshot,
  onSelectStep,
  onEditNote,
  selectedRealIndex,
  zoomMode,
  onZoomChange,
}) {
  const { state, dispatch } = useApp();
  const { stepsActions, stepsOriginalActions, stepsReplaying } = state;

  // Filter to screenshot + note steps, tracking realIndex
  const steps = stepsActions
    .map((action, i) => ({ ...action, realIndex: i }))
    .filter((a) => a.type === 'screenshot' || a.type === 'note');

  // Current step index within filtered steps
  const currentStepIdx = steps.findIndex((s) => s.realIndex === selectedRealIndex);
  const currentStep = currentStepIdx >= 0 ? steps[currentStepIdx] : null;

  const hasChanges =
    JSON.stringify(stepsActions) !== JSON.stringify(stepsOriginalActions);

  // Navigation
  const goToPrev = useCallback(() => {
    if (currentStepIdx > 0) {
      onSelectStep(steps[currentStepIdx - 1].realIndex);
    }
  }, [currentStepIdx, steps, onSelectStep]);

  const goToNext = useCallback(() => {
    if (currentStepIdx < steps.length - 1) {
      onSelectStep(steps[currentStepIdx + 1].realIndex);
    }
  }, [currentStepIdx, steps, onSelectStep]);

  // Delete
  const handleDelete = useCallback(() => {
    if (!currentStep || !confirm('Delete this step?')) return;
    const updated = stepsActions.filter((_, i) => i !== currentStep.realIndex);
    dispatch({ type: 'SET_STEPS_ACTIONS', payload: updated });
    const newSteps = updated
      .map((a, i) => ({ ...a, realIndex: i }))
      .filter((a) => a.type === 'screenshot' || a.type === 'note');
    if (newSteps.length > 0) {
      const newIdx = Math.min(
        currentStepIdx > 0 ? currentStepIdx - 1 : 0,
        newSteps.length - 1
      );
      onSelectStep(newSteps[newIdx].realIndex);
    }
  }, [currentStep, currentStepIdx, stepsActions, dispatch, onSelectStep]);

  // Cancel with unsaved guard
  const handleCancel = useCallback(() => {
    if (hasChanges && !confirm('You have unsaved changes. Discard and leave?')) {
      return;
    }
    onCancel();
  }, [hasChanges, onCancel]);

  // Insert screenshot after current step
  const handleInsert = useCallback(() => {
    if (currentStep == null) return;
    onCaptureScreenshot(currentStep.realIndex);
  }, [currentStep, onCaptureScreenshot]);

  // Retake current screenshot
  const handleRetake = useCallback(() => {
    if (currentStep == null || currentStep.type !== 'screenshot') return;
    onRetakeScreenshot(currentStep.realIndex);
  }, [currentStep, onRetakeScreenshot]);

  // Edit note via modal
  const handleEditNote = useCallback(() => {
    if (currentStep == null) return;
    onEditNote(currentStep.realIndex, currentStep.note || '');
  }, [currentStep, onEditNote]);

  const isScreenshot = currentStep?.type === 'screenshot';
  const hasNote = !!(currentStep?.note);

  if (steps.length === 0) {
    return (
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card px-3">
        <span className="text-xs text-muted-foreground">No screenshot or note steps found.</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-border bg-card px-2">
      {/* Navigation */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={goToPrev}
        disabled={currentStepIdx <= 0 || stepsReplaying}
        title="Previous step"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1.5 shrink-0">
        {stepsReplaying && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        <span className="text-xs font-medium text-foreground whitespace-nowrap">
          {currentStepIdx + 1} / {steps.length}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={goToNext}
        disabled={currentStepIdx >= steps.length - 1 || stepsReplaying}
        title="Next step"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Separator */}
      <div className="h-5 w-px bg-border shrink-0" />

      {/* Step type badge + note indicator */}
      {currentStep && (
        <>
          {isScreenshot ? (
            <span className="flex items-center gap-1 rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-medium text-teal-400 shrink-0">
              <Camera className="h-2.5 w-2.5" />
              {currentStep.filename || 'Screenshot'}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 shrink-0">
              <StickyNote className="h-2.5 w-2.5" />
              Note
            </span>
          )}

          {/* Note indicator */}
          {hasNote && (
            <span
              className="flex items-center gap-1 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-400 shrink-0 max-w-[200px] cursor-pointer hover:bg-violet-500/30 transition-colors"
              onClick={handleEditNote}
              title={currentStep.note}
            >
              <MessageSquareText className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{currentStep.note}</span>
            </span>
          )}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[10px] px-2"
          onClick={handleEditNote}
          disabled={!currentStep || stepsReplaying}
          title={hasNote ? 'Edit note' : 'Add note'}
        >
          <Pencil className="h-3 w-3" />
          {hasNote ? 'Edit Note' : 'Add Note'}
        </Button>
        {isScreenshot && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-[10px] px-2"
            onClick={handleRetake}
            disabled={stepsReplaying}
            title="Retake screenshot"
          >
            <RefreshCw className="h-3 w-3" />
            Retake
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[10px] px-2"
          onClick={handleInsert}
          disabled={!currentStep || stepsReplaying}
          title="Insert screenshot after this step"
        >
          <Plus className="h-3 w-3" />
          Insert
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-[10px] text-red-400 hover:text-red-300 px-2"
          onClick={handleDelete}
          disabled={!currentStep || stepsReplaying}
          title="Delete this step"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border shrink-0" />

      {/* Zoom control */}
      <div className="shrink-0">
        <ZoomSelect zoomMode={zoomMode} onZoomChange={onZoomChange} />
      </div>

      {/* Separator */}
      <div className="h-5 w-px bg-border shrink-0" />

      {/* Cancel / Save */}
      <div className="flex items-center gap-0.5 shrink-0">
        {hasChanges && (
          <span className="text-[10px] text-amber-400 mr-1">unsaved</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs px-2"
          onClick={handleCancel}
          title="Cancel"
        >
          <X className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-teal-400 hover:text-teal-300 px-2"
          onClick={onSave}
          disabled={!hasChanges}
          title="Save changes"
        >
          <Save className="h-3 w-3" />
          Save
        </Button>
      </div>
    </div>
  );
}
