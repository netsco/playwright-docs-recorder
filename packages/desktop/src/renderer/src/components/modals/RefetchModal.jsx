import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function RefetchModal({ open, onOpenChange, refetchState, onCancel, onDone }) {
  const { progress, total, text, currentItem, view, summary } = refetchState || {};

  const isProgress = view === 'progress';
  const isSummary = view === 'summary';
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  const hasErrors = summary?.errors?.length > 0;

  const getTitle = () => {
    if (isProgress) return 'Refetching Screenshots';
    if (isSummary && hasErrors) return 'Refetch Completed with Warnings';
    if (isSummary) return 'Refetch Complete';
    return 'Refetching Screenshots';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {isProgress && (
            <div className="space-y-4">
              {text && (
                <p className="text-sm text-slate-300">{text}</p>
              )}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    {progress} of {total}
                  </span>
                  <span>{percentage}%</span>
                </div>
                <Progress value={percentage} />
              </div>
              {currentItem && (
                <p className="text-xs text-slate-500 truncate">{currentItem}</p>
              )}
            </div>
          )}

          {isSummary && summary && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {hasErrors ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="text-sm text-slate-200">{summary.text}</p>
                  {summary.details && (
                    <p className="text-xs text-slate-400">{summary.details}</p>
                  )}
                </div>
              </div>

              {hasErrors && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">Errors:</p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {summary.errors.map((error, i) => (
                      <li
                        key={i}
                        className="text-xs text-red-400 bg-red-950/30 rounded px-2 py-1"
                      >
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isProgress && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {isSummary && (
            <Button onClick={onDone}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
