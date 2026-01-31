import React from 'react';
import { ChevronLeft, ChevronRight, RotateCw, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Toolbar({ webviewRef, onStopRecording, currentUrl }) {
  const handleBack = () => {
    if (webviewRef?.current) {
      webviewRef.current.goBack();
    }
  };

  const handleForward = () => {
    if (webviewRef?.current) {
      webviewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webviewRef?.current) {
      webviewRef.current.reload();
    }
  };

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-900 px-3">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-200"
          onClick={handleBack}
          title="Go back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-200"
          onClick={handleForward}
          title="Go forward"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-200"
          onClick={handleRefresh}
          title="Refresh"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
      </div>

      {/* URL display */}
      <div className="flex-1">
        <Input
          readOnly
          value={currentUrl || ''}
          className="h-8 cursor-default border-slate-700 bg-slate-800/50 text-xs text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0"
          title={currentUrl}
        />
      </div>

      {/* Stop recording button */}
      <Button
        onClick={onStopRecording}
        className="h-8 gap-2 bg-coral-600 px-4 text-xs font-medium text-white hover:bg-coral-700"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        Stop Recording
      </Button>
    </div>
  );
}
