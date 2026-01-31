import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';
import { FolderOpen, Trash2 } from 'lucide-react';

const PROJECT_COLORS = [
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#84cc16', label: 'Lime' },
];

const VIEWPORT_PRESETS = [
  { label: 'WSXGA+ (1680x950)', value: '1680x950' },
  { label: 'Full HD (1920x980)', value: '1920x980' },
  { label: 'HD (1280x620)', value: '1280x620' },
  { label: 'Mobile (375x667)', value: '375x667' },
  { label: 'Mobile Landscape (667x375)', value: '667x375' },
  { label: 'Tablet (768x1024)', value: '768x1024' },
  { label: 'Tablet Landscape (1024x768)', value: '1024x768' },
  { label: 'Custom', value: 'custom' },
];

export default function ProjectModal({ open, onOpenChange, editingProjectId, onSave, onDelete }) {
  const { state } = useApp();
  const electronAPI = useElectronAPI();

  const isEditing = !!editingProjectId;
  const editingProject = isEditing
    ? state.projects.find((p) => p.id === editingProjectId)
    : null;

  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0].value);
  const [siteUrl, setSiteUrl] = useState('');
  const [viewportPreset, setViewportPreset] = useState('1280x620');
  const [customWidth, setCustomWidth] = useState('1280');
  const [customHeight, setCustomHeight] = useState('720');
  const [injectCSS, setInjectCSS] = useState(false);
  const [customCSS, setCustomCSS] = useState('');

  useEffect(() => {
    if (open) {
      if (editingProject) {
        setName(editingProject.name || '');
        setFolder(editingProject.folder || '');
        setDescription(editingProject.description || '');
        setColor(editingProject.color || PROJECT_COLORS[0].value);
        setSiteUrl(editingProject.defaultSettings?.siteUrl || '');
        const vp = editingProject.defaultSettings?.viewport || '1280x620';
        const matchedPreset = VIEWPORT_PRESETS.find((p) => p.value === vp);
        if (matchedPreset && matchedPreset.value !== 'custom') {
          setViewportPreset(vp);
        } else {
          setViewportPreset('custom');
          const [w, h] = vp.split('x');
          setCustomWidth(w || '1280');
          setCustomHeight(h || '720');
        }
        const css = editingProject.defaultSettings?.customCSS || '';
        setInjectCSS(!!css);
        setCustomCSS(css);
      } else {
        setName('');
        setFolder('');
        setDescription('');
        setColor(PROJECT_COLORS[0].value);
        setSiteUrl('');
        setViewportPreset('1280x620');
        setCustomWidth('1280');
        setCustomHeight('720');
        setInjectCSS(false);
        setCustomCSS('');
      }
    }
  }, [open, editingProject]);

  const handleBrowseFolder = async () => {
    if (isEditing) return;
    const result = await electronAPI.selectProjectFolder();
    if (result) {
      setFolder(result);
    }
  };

  const handleViewportChange = (value) => {
    setViewportPreset(value);
    if (value !== 'custom') {
      const [w, h] = value.split('x');
      setCustomWidth(w);
      setCustomHeight(h);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const viewport =
      viewportPreset === 'custom'
        ? `${customWidth}x${customHeight}`
        : viewportPreset;

    onSave({
      id: editingProjectId || undefined,
      name: name.trim(),
      folder: folder.trim(),
      description: description.trim(),
      color,
      defaultSettings: {
        siteUrl: siteUrl.trim(),
        viewport,
        customCSS: injectCSS ? customCSS : '',
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">
              Project Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="project-name"
              placeholder="My Documentation Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Project Folder */}
          <div className="space-y-2">
            <Label htmlFor="project-folder">Project Folder</Label>
            <div className="flex gap-2">
              <Input
                id="project-folder"
                placeholder="Select a folder..."
                value={folder}
                readOnly
                className={cn(isEditing && 'opacity-60 cursor-not-allowed')}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleBrowseFolder}
                disabled={isEditing}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="Brief description of this project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'hover:scale-110'
                  )}
                  style={{
                    backgroundColor: c.value,
                    ringColor: c.value,
                    ...(color === c.value ? { '--tw-ring-color': c.value } : {}),
                  }}
                  onClick={() => setColor(c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Default Recording Settings */}
          <div className="space-y-3 border-t border-slate-700 pt-4">
            <h3 className="text-sm font-medium text-slate-300">
              Default Recording Settings
            </h3>

            {/* Site URL */}
            <div className="space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <Input
                id="site-url"
                type="url"
                placeholder="https://example.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>

            {/* Viewport Preset */}
            <div className="space-y-2">
              <Label>Viewport</Label>
              <Select value={viewportPreset} onValueChange={handleViewportChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIEWPORT_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Viewport */}
            {viewportPreset === 'custom' && (
              <div className="flex gap-3">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="custom-width">Width</Label>
                  <Input
                    id="custom-width"
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="custom-height">Height</Label>
                  <Input
                    id="custom-height"
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* CSS Injection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="inject-css"
                  checked={injectCSS}
                  onCheckedChange={(checked) => setInjectCSS(!!checked)}
                />
                <Label htmlFor="inject-css" className="cursor-pointer">
                  Inject custom CSS
                </Label>
              </div>
              {injectCSS && (
                <Textarea
                  placeholder="/* Hide cookie banners, popups, etc. */"
                  value={customCSS}
                  onChange={(e) => setCustomCSS(e.target.value)}
                  rows={3}
                  className="font-mono text-xs"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {isEditing ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(editingProjectId)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Project
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {isEditing ? 'Save' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
