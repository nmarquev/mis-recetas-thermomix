import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { Palette } from 'lucide-react';

const themes: { value: Theme; label: string }[] = [
  { value: 'violetas', label: 'Violetas' },
  { value: 'tierra', label: 'Tierra' },
  { value: 'pop', label: 'Pop' },
  { value: 'frutilla', label: 'Frutilla' }
];

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Tema" />
        </SelectTrigger>
        <SelectContent>
          {themes.map((themeOption) => (
            <SelectItem key={themeOption.value} value={themeOption.value}>
              {themeOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};