import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useElectronAPI } from '@/hooks/useElectronAPI';

export function ThemeToggle() {
  const { state, dispatch } = useApp();
  const api = useElectronAPI();

  const toggleTheme = async () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'SET_THEME', payload: newTheme });
    if (api) {
      await api.saveSettings({ theme: newTheme });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
      onClick={toggleTheme}
      title={state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {state.theme === 'dark' ? (
        <Sun className="h-3 w-3" />
      ) : (
        <Moon className="h-3 w-3" />
      )}
    </Button>
  );
}
