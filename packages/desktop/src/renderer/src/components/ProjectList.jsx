import { Plus, FolderOpen, Pencil, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

export function ProjectList({ onSelectProject, onNewProject, onEditProject, onOpenFolder }) {
  const { state } = useApp();
  const projects = state.projects;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="h-full w-full overflow-auto bg-gradient-to-b from-background via-card to-background">
      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a project to start a new recording or manage existing ones.
            </p>
          </div>
          <Button
            onClick={onNewProject}
            className="bg-teal-500 text-white hover:bg-teal-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Project Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project)}
                className="group relative rounded-lg border border-border/50 bg-muted/50 p-4 text-left transition-all hover:border-border hover:bg-muted"
              >
                {/* Top row: color dot + name + action buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color || '#14b8a6' }}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {project.name}
                    </span>
                  </div>

                  {/* Hover-visible action buttons */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <span
                      role="button"
                      tabIndex={0}
                      title="Open folder"
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFolder(project.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          onOpenFolder(project.id);
                        }
                      }}
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      title="Edit project"
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProject(project.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          onEditProject(project.id);
                        }
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {project.description}
                  </p>
                )}

                {/* Meta: recording count + last modified */}
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {project.recordingCount ?? 0} recording{project.recordingCount !== 1 ? 's' : ''}
                  </span>
                  {project.lastModified && (
                    <>
                      <span className="text-border">&middot;</span>
                      <span>{formatDate(project.lastModified)}</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <Folder className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">No projects yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a project to start recording documentation.
            </p>
            <Button
              onClick={onNewProject}
              variant="outline"
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create your first project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
