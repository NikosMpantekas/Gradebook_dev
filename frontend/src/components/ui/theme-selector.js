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
      <div className="w-full h-12 rounded-lg overflow-hidden flex shadow-sm">
        <div 
          className="flex-[2]" 
          style={{ backgroundColor: theme.colors.primary }}
        />
        <div 
          className="flex-[3]" 
          style={{ backgroundColor: theme.colors.secondary }}
        />
        <div 
          className="flex-1" 
          style={{ backgroundColor: theme.colors.accent }}
        />
      </div>
    );
  };

  return (
    <div className="w-full max-w-none">
      <Card className="glass-card border-gradient shadow-premium-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-gradient text-lg">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Palette className="h-5 w-5 text-white" />
            </div>
            {t('profile.themeSelection', 'Theme Selection')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t('profile.themeDescription', 'Choose from our curated collection of elegant themes. Each theme creates a unique visual experience across your entire application.')}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Theme Grid - 2 rows x 5 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
            {Object.entries(themes).map(([themeId, theme]) => (
              <div key={themeId} className="relative group">
                <Button
                  variant="ghost"
                  onClick={() => switchTheme(themeId)}
                  className={cn(
                    "premium-card h-auto p-3 w-full flex-col space-y-2 transition-all duration-300 relative overflow-hidden",
                    currentTheme === themeId 
                      ? "border-2 border-primary/50 shadow-premium-lg scale-[1.02]" 
                      : "border border-border/50 hover:border-primary/30 hover:shadow-premium-md"
                  )}
                >
                  {/* Active indicator */}
                  {currentTheme === themeId && (
                    <div className="absolute top-1 right-1 z-10">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* Theme Preview */}
                  <div className="w-full">
                    {getThemePreview(theme)}
                  </div>
                  
                  {/* Theme Name */}
                  <div className="w-full text-center">
                    <h4 className="font-semibold text-xs leading-tight text-foreground">
                      {theme.name}
                    </h4>
                  </div>
                  
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </div>
            ))}
          </div>

          {/* Current Theme Display */}
          <div className="glass-subtle p-4 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-primary/10 border border-primary/20">
                  <Palette className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {t('profile.currentTheme', 'Active Theme')}:
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {themes[currentTheme]?.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {themes[currentTheme]?.description}
                  </p>
                </div>
              </div>
              
              {/* Current theme preview */}
              <div className="w-20">
                {getThemePreview(themes[currentTheme])}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeSelector;
