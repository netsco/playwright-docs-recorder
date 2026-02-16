import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTCUT_GROUPS = [
  {
    title: 'Screenshots',
    shortcuts: [
      { keys: 'Ctrl+Shift+S', action: 'Take screenshot' },
      { keys: 'Ctrl+Shift+K', action: 'Screenshot with note' },
      { keys: 'Ctrl+Shift+F', action: 'Full page screenshot' },
    ],
  },
  {
    title: 'Highlighting',
    shortcuts: [
      { keys: 'Ctrl+Click', action: 'Highlight element' },
      { keys: 'Ctrl+Hover', action: 'Preview highlight' },
      { keys: 'Ctrl+Shift+H', action: 'Record hover + toggle highlight' },
      { keys: 'Ctrl+Shift+X', action: 'Clear highlight' },
    ],
  },
  {
    title: 'Recording',
    shortcuts: [
      { keys: 'Ctrl+C', action: 'Stop recording and save' },
    ],
  },
  {
    title: 'Editor',
    shortcuts: [
      { keys: 'Ctrl+S', action: 'Save markdown' },
      { keys: 'Ctrl+Enter', action: 'Save note dialog' },
      { keys: 'Escape', action: 'Cancel / close dialog' },
    ],
  },
];

export default function KeyboardShortcutsModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-foreground">{shortcut.action}</span>
                    <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
