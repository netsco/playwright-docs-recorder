import React from 'react';
import {
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  RotateCw,
  Pencil,
  FolderOpen,
  ArrowRightLeft,
  Trash2,
  Image,
  FileText,
  MoreVertical,
} from 'lucide-react';
import { cn, getProjectInitials, escapeHtml } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';

export function Sidebar({
  onBackToProjects,
  onEditProject,
  onNewRecording,
  onRefetchAll,
  onSelectRecording,
  onRecordingAction,
}) {
  const { state, dispatch } = useApp();
  const {
    currentProject,
    sidebarCollapsed,
    recordings,
    screenshotPreviews,
    activeHistoryId,
    isRecording,
  } = state;

  const [openMenuId, setOpenMenuId] = React.useState(null);
  const menuRef = React.useRef(null);

  // Close context menu on outside click
  React.useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const projectColor = currentProject?.color || '#14b8a6';
  const projectName = currentProject?.name || 'Untitled Project';

  // Collapsed sidebar
  if (sidebarCollapsed) {
    return (
      <div className="flex h-full w-[52px] flex-col items-center border-r border-slate-700 bg-slate-900 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-200"
          onClick={handleToggleSidebar}
          title="Expand sidebar"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>

        {/* Project color dot */}
        <div
          className="mt-3 h-6 w-6 rounded-full border-2 border-slate-700 text-center text-[8px] font-bold leading-[20px] text-white"
          style={{ backgroundColor: projectColor }}
          title={projectName}
        >
          {getProjectInitials(projectName)}
        </div>

        {/* Screenshot previews as small thumbnails */}
        {screenshotPreviews.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {screenshotPreviews.slice(-5).map((preview, i) => (
              <div
                key={i}
                className="h-6 w-8 overflow-hidden rounded border border-slate-700"
              >
                <img
                  src={preview.dataUrl || preview.path}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-700 bg-slate-900">
      {/* Project header */}
      <div className="flex items-center gap-2 border-b border-slate-700 px-3 py-2.5">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: projectColor }}
        >
          {getProjectInitials(projectName)}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
          {projectName}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-slate-200"
            onClick={onBackToProjects}
            title="Back to projects"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-slate-200"
            onClick={onEditProject}
            title="Edit project"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-slate-200"
            onClick={handleToggleSidebar}
            title="Collapse sidebar"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Recordings header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Recordings
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-teal-400"
            onClick={onRefetchAll}
            title="Refetch all screenshots"
            disabled={isRecording}
          >
            <RotateCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-teal-400"
            onClick={onNewRecording}
            title="New recording"
            disabled={isRecording}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Recording history list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {recordings.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-500">
              No recordings yet. Click{' '}
              <span className="text-teal-400">+</span> to start.
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  'group relative flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                  activeHistoryId === rec.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                )}
                onClick={() => onSelectRecording(rec.id)}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {rec.title || rec.id}
                </span>
                <span className="shrink-0 text-[10px] text-slate-600">
                  {rec.screenshotCount || 0}
                  <Image className="ml-0.5 inline h-2.5 w-2.5" />
                </span>

                {/* Context menu trigger */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === rec.id ? null : rec.id);
                  }}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>

                {/* Context menu dropdown */}
                {openMenuId === rec.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-2 top-full z-50 w-40 rounded-md border border-slate-700 bg-slate-800 py-1 shadow-lg"
                  >
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        onRecordingAction('open', rec.id);
                      }}
                    >
                      <FolderOpen className="h-3 w-3" /> Open Folder
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        onRecordingAction('refetch', rec.id);
                      }}
                    >
                      <RotateCw className="h-3 w-3" /> Refetch Screenshots
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        onRecordingAction('move', rec.id);
                      }}
                    >
                      <ArrowRightLeft className="h-3 w-3" /> Move to Project
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-slate-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                        onRecordingAction('delete', rec.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Screenshot previews */}
      {screenshotPreviews.length > 0 && (
        <div className="border-t border-slate-700">
          <div className="px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Screenshots
            </span>
          </div>
          <ScrollArea className="max-h-48">
            <div className="flex flex-col gap-1 px-2 pb-2">
              {screenshotPreviews.map((preview, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded border border-slate-700"
                >
                  <img
                    src={preview.dataUrl || preview.path}
                    alt={preview.note || `Screenshot ${i + 1}`}
                    className="w-full object-contain"
                  />
                  {preview.note && (
                    <div className="bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                      {preview.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
