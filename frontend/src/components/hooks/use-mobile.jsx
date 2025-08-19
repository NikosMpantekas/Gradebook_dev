import * as React from "react"

/**
 * Hook to determine when to show the sidebar toggle button
 * 
 * This hook returns true for screens up to 1023px, which includes:
 * - Mobile phones (portrait and landscape)
 * - Tablets (portrait and landscape) 
 * - Small desktop screens
 * 
 * The 1024px breakpoint aligns with Tailwind's 'lg' breakpoint
 * where the sidebar spacing (lg:ml-64) kicks in.
 */
const SIDEBAR_TOGGLE_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    // Show sidebar toggle on screens up to 1023px (including tablets and small desktops)
    // This aligns with Tailwind's lg breakpoint where lg:ml-64 sidebar spacing kicks in
    const mql = window.matchMedia(`(max-width: ${SIDEBAR_TOGGLE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < SIDEBAR_TOGGLE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < SIDEBAR_TOGGLE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
