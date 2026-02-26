import React, { useState, useEffect, useCallback } from 'react';
import { PersonStanding, Type, ZapOff, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '../ui/popover';
import {
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
} from '../ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '../ui/tooltip';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

const FONT_SIZES = [
    { key: 'sm', label: 'S' },
    { key: 'md', label: 'M' },
    { key: 'lg', label: 'L' },
    { key: 'xl', label: 'XL' },
];

const AccessibilityMenu = ({ variant = 'popover' }) => {
    const { t } = useTranslation();
    const { currentTheme, switchTheme } = useTheme();

    // State
    const [fontSize, setFontSize] = useState(() => localStorage.getItem('a11y-font-size') || 'md');
    const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('a11y-reduce-motion') === 'true');
    const [dyslexiaFont, setDyslexiaFont] = useState(() => localStorage.getItem('a11y-dyslexia-font') === 'true');
    const [highContrast, setHighContrast] = useState(() => currentTheme === 'high-contrast');
    const [previousTheme, setPreviousTheme] = useState(() => localStorage.getItem('a11y-previous-theme') || 'default');

    // Apply font size class
    const applyFontSize = useCallback((size) => {
        const root = document.documentElement;
        FONT_SIZES.forEach(({ key }) => root.classList.remove(`font-size-${key}`));
        root.classList.add(`font-size-${size}`);
        localStorage.setItem('a11y-font-size', size);
    }, []);

    // Apply reduce motion class
    const applyReduceMotion = useCallback((enabled) => {
        document.documentElement.classList.toggle('reduce-motion', enabled);
        localStorage.setItem('a11y-reduce-motion', String(enabled));
    }, []);

    // Apply dyslexia font class
    const applyDyslexiaFont = useCallback((enabled) => {
        document.documentElement.classList.toggle('dyslexia-font', enabled);
        localStorage.setItem('a11y-dyslexia-font', String(enabled));
    }, []);

    // Initialize on mount
    useEffect(() => {
        applyFontSize(fontSize);
        applyReduceMotion(reduceMotion);
        applyDyslexiaFont(dyslexiaFont);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setHighContrast(currentTheme === 'high-contrast');
    }, [currentTheme]);

    // Handlers
    const handleFontSize = (size) => {
        setFontSize(size);
        applyFontSize(size);
    };

    const handleReduceMotion = (checked) => {
        setReduceMotion(checked);
        applyReduceMotion(checked);
    };

    const handleDyslexiaFont = (checked) => {
        setDyslexiaFont(checked);
        applyDyslexiaFont(checked);
    };

    const handleHighContrast = (checked) => {
        if (checked) {
            // Save current theme and switch to HC
            const prev = currentTheme !== 'high-contrast' ? currentTheme : previousTheme;
            setPreviousTheme(prev);
            localStorage.setItem('a11y-previous-theme', prev);
            switchTheme('high-contrast');
        } else {
            // Restore previous theme
            switchTheme(previousTheme);
        }
        setHighContrast(checked);
    };

    // Check if any a11y setting is active (for indicator dot)
    const isAnyActive = fontSize !== 'md' || reduceMotion || dyslexiaFont || highContrast;

    const menuContent = (
        <div className="p-4 space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <PersonStanding className="h-4 w-4" />
                {t('settings.accessibility', 'Accessibility')}
            </h4>

            {/* Font Size */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5" />
                    {t('settings.fontSize', 'Font Size')}
                </label>
                <div className="flex gap-1">
                    {FONT_SIZES.map(({ key, label }) => (
                        <Button
                            key={key}
                            variant={fontSize === key ? 'default' : 'outline'}
                            size="sm"
                            className={cn(
                                'flex-1 text-xs h-8',
                                fontSize === key && 'pointer-events-none'
                            )}
                            onClick={() => handleFontSize(key)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Reduce Motion */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ZapOff className="h-3.5 w-3.5" />
                    {t('settings.reduceMotion', 'Reduce Motion')}
                </label>
                <Switch
                    checked={reduceMotion}
                    onCheckedChange={handleReduceMotion}
                />
            </div>

            {/* Dyslexia Font */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5" />
                    {t('settings.dyslexiaFont', 'Dyslexia Font')}
                </label>
                <Switch
                    checked={dyslexiaFont}
                    onCheckedChange={handleDyslexiaFont}
                />
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {t('settings.highContrast', 'High Contrast')}
                </label>
                <Switch
                    checked={highContrast}
                    onCheckedChange={handleHighContrast}
                />
            </div>
        </div>
    );

    if (variant === 'sub') {
        return (
            <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                    <PersonStanding className="h-4 w-4" />
                    <span>{t('settings.accessibility', 'Accessibility')}</span>
                    {isAnyActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent
                        className="dropdown-slide-in p-0 w-[260px] max-w-[calc(100vw-30px)]"
                        sideOffset={8}
                    >
                        {menuContent}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
        );
    }

    if (variant === 'expanded') {
        return <div className="border-t">{menuContent}</div>;
    }

    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild side="bottom">
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <PersonStanding className="h-5 w-5" />
                            {isAnyActive && (
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                            )}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{t('settings.accessibility', 'Accessibility')}</p>
                </TooltipContent>
            </Tooltip>

            <PopoverContent align="end" sideOffset={8} className="w-72 p-0">
                {menuContent}
            </PopoverContent>
        </Popover>
    );
};

export default AccessibilityMenu;
