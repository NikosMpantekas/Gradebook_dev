import React from 'react';
import {
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';

const LanguageSwitcher = ({ variant = 'icon' }) => {
  const { i18n, t } = useTranslation();

  const languages = [
    {
      code: 'gr',
      name: 'Greek',
      nativeName: 'Ελληνικά'
    },
    {
      code: 'en',
      name: 'English',
      nativeName: 'English'
    }
  ];

  const getBaseLanguage = (langCode) => {
    if (!langCode) return 'gr';
    const lower = langCode.toLowerCase();
    if (lower.startsWith('el') || lower.startsWith('gr')) return 'gr';
    if (lower.startsWith('en')) return 'en';
    return 'gr';
  };

  const currentLanguageCode = getBaseLanguage(i18n.language);
  const currentLanguage = languages.find(lang => lang.code === currentLanguageCode) || languages.find(lang => lang.code === 'gr');

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('gradebook_language', languageCode);
  };

  if (variant === 'button') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="dropdown-slide-in"
          sideOffset={8}
        >
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="gap-3"
            >
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
              {currentLanguageCode === language.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'sub') {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="gap-2">
          <Globe className="h-4 w-4" />
          <span>{t('settings.language', 'Language')}</span>
          <span className="ml-auto text-xs text-muted-foreground mr-1">{currentLanguage.nativeName}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent
            className="dropdown-slide-in"
            sideOffset={8}
          >
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className="gap-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{language.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{language.name}</span>
                </div>
                {currentLanguageCode === language.code && (
                  <span className="ml-auto text-primary">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  if (variant === 'expanded') {
    return (
      <div className="p-4 space-y-4 border-t">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('settings.language', 'Language')}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {languages.map((language) => (
            <Button
              key={language.code}
              variant={currentLanguageCode === language.code ? 'default' : 'outline'}
              size="sm"
              className="flex items-center justify-center gap-2 h-10 px-3 overflow-hidden text-center"
              onClick={() => handleLanguageChange(language.code)}
            >
              <span className="text-xs font-medium truncate">{language.nativeName}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Default icon variant
  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('settings.language', 'Language')}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="end"
          className="dropdown-slide-in"
          sideOffset={8}
        >
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="gap-3"
            >
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
              {currentLanguageCode === language.code && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};

export default LanguageSwitcher;
