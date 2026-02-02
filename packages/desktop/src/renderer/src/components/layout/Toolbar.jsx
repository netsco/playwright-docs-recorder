import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
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
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleBack}
          title="Go back"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleForward}
          title="Go forward"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
          className="h-8 cursor-default border-border bg-muted/50 text-xs text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
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
