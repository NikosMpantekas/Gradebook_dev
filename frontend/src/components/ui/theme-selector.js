import React from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { useTheme, themes } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

const ThemeSelector = () => {
  const { t } = useTranslation();
  const { currentTheme, switchTheme } = useTheme();

  const getThemePreview = (theme) => {
    return (
      <div className="w-full h-16 rounded-md border overflow-hidden flex">
        <div 
          className="flex-1" 
          style={{ backgroundColor: theme.colors.primary }}
        />
        <div 
          className="flex-1" 
          style={{ backgroundColor: theme.colors.secondary }}
        />
        <div 
          className="w-4" 
          style={{ backgroundColor: theme.colors.background }}
        />
      </div>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Palette className="h-5 w-5" />
          {t('profile.themeSelection', 'Theme Selection')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('profile.themeDescription', 'Choose a color theme that suits your style. The theme will be applied across the entire application.')}
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(themes).map(([themeId, theme]) => (
            <div key={themeId} className="relative">
              <Button
                variant="ghost"
                onClick={() => switchTheme(themeId)}
                className={cn(
                  "h-auto p-4 w-full flex-col space-y-3 hover:bg-primary/5 border-2 transition-all duration-300",
                  currentTheme === themeId 
                    ? "border-primary bg-primary/10 shadow-lg" 
                    : "border-border hover:border-primary/30"
                )}
              >
                {/* Theme Preview */}
                {getThemePreview(theme)}
                
                {/* Theme Info */}
                <div className="w-full text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{theme.name}</h4>
                    {currentTheme === themeId && (
                      <Badge variant="default" className="h-5 px-2 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        {t('common.active', 'Active')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {theme.description}
                  </p>
                </div>
              </Button>
            </div>
          ))}
        </div>

        {/* Current Theme Info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {t('profile.currentTheme', 'Current Theme')}: {themes[currentTheme]?.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {themes[currentTheme]?.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSelector;
