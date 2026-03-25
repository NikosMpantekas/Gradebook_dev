import { useState, useEffect } from 'react';

/**
 * Hook that returns true when the user has requested reduced motion,
 * either via the accessibility menu toggle or the OS-level
 * prefers-reduced-motion media query.
 */
const useReducedMotion = () => {
    const [reducedMotion, setReducedMotion] = useState(() => {
        // Check the CSS class set by the accessibility menu
        const fromMenu = document.documentElement.classList.contains('reduce-motion');
        // Check the OS-level preference
        const fromOS = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        return fromMenu || fromOS;
    });

    useEffect(() => {
        // Watch for OS-level changes
        const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        const handleMediaChange = (e) => setReducedMotion(
            e.matches || document.documentElement.classList.contains('reduce-motion')
        );

        mediaQuery?.addEventListener?.('change', handleMediaChange);

        // Watch for class changes from the accessibility menu
        const observer = new MutationObserver(() => {
            const fromMenu = document.documentElement.classList.contains('reduce-motion');
            const fromOS = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            setReducedMotion(fromMenu || fromOS);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            mediaQuery?.removeEventListener?.('change', handleMediaChange);
            observer.disconnect();
        };
    }, []);

    return reducedMotion;
};

export default useReducedMotion;
