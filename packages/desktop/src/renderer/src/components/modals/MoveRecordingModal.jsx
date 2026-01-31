import React from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { FolderOpen } from 'lucide-react';

export default function MoveRecordingModal({ open, onOpenChange, recordingId, onMove }) {
  const { state } = useApp();

  const otherProjects = state.projects.filter(
    (p) => p.id !== state.currentProjectId
  );

  const handleMove = (targetProjectId) => {
    onMove(recordingId, targetProjectId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Recording</DialogTitle>
          <DialogDescription>
            Select a project to move this recording to:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {otherProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <FolderOpen className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm">No other projects available.</p>
              <p className="text-xs text-slate-500 mt-1">
                Create another project first to move recordings.
              </p>
            </div>
          ) : (
            otherProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={cn(
                  'w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm',
                  'bg-slate-800 border border-slate-700 text-slate-200',
                  'hover:bg-slate-700 hover:border-slate-600 transition-colors'
                )}
                onClick={() => handleMove(project.id)}
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color || '#14b8a6' }}
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
