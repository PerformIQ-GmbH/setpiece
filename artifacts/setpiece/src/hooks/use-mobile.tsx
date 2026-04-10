import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

function getBreakpoint(width: number): Breakpoint {
  if (width < MOBILE_BREAKPOINT) return 'mobile'
  if (width < TABLET_BREAKPOINT) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = React.useState<Breakpoint>(() =>
    typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'desktop'
  )

  React.useEffect(() => {
    const update = () => setBp(getBreakpoint(window.innerWidth))
    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const mqlTablet = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    mqlMobile.addEventListener("change", update)
    mqlTablet.addEventListener("change", update)
    update()
    return () => {
      mqlMobile.removeEventListener("change", update)
      mqlTablet.removeEventListener("change", update)
    }
  }, [])

  return bp
}

export function useIsMobile() {
  const bp = useBreakpoint()
  return bp === 'mobile'
}
