/**
 * Animaciones de la etapa 1 de la tienda (spec §17). Todas respetan `prefers-reduced-motion`:
 * con esa preferencia muestran su contenido en el estado final, sin animar, y nunca lo dejan
 * invisible.
 */
export { CountUp, countUpValue, formatCount } from './CountUp'
export type { CountUpProps } from './CountUp'
export { DrawCheck } from './DrawCheck'
export type { DrawCheckProps } from './DrawCheck'
export { FadeImage } from './FadeImage'
export type { FadeImageProps } from './FadeImage'
export { Float } from './Float'
export type { FloatProps } from './Float'
export { GridReplay } from './GridReplay'
export type { GridReplayProps } from './GridReplay'
export { registerHeaderHideZone, useHeaderHideZone, useHeaderMayHide } from './header-hide-zone'
export {
  HorizontalScroll,
  horizontalScrollTarget,
  HorizontalScrollProgress,
} from './HorizontalScroll'
export type {
  HorizontalScrollProgressProps,
  HorizontalScrollProps,
  HorizontalScrollTargetInput,
} from './HorizontalScroll'
export { Magnetic } from './Magnetic'
export type { MagneticProps } from './Magnetic'
export { MouseParallax } from './MouseParallax'
export type { MouseParallaxProps } from './MouseParallax'
export { PageCurtain } from './PageCurtain'
export type { PageCurtainProps } from './PageCurtain'
export { PAGE_COVERED_ATTRIBUTE, PageEnter } from './PageEnter'
export type { PageEnterProps } from './PageEnter'
export { Ping } from './Ping'
export type { PingProps } from './Ping'
export { Reveal, REVEAL_KINDS } from './Reveal'
export type { RevealKind, RevealProps } from './Reveal'
export { RiseText } from './RiseText'
export type { RiseTextProps } from './RiseText'
export { ScrubText, wordOpacity } from './ScrubText'
export type { ScrubTextProps } from './ScrubText'
export { ScrollStage, STAGE_STOP_ATTRIBUTE, useScrollStage } from './ScrollStage'
export type { ScrollStageContextValue, ScrollStageProps } from './ScrollStage'
export { Shake } from './Shake'
export type { ShakeHandle, ShakeProps } from './Shake'
export { TabFade } from './TabFade'
export type { TabFadeProps } from './TabFade'
export { Tilt, tiltAngles } from './Tilt'
export type { TiltAngles, TiltProps } from './Tilt'
export { useMediaQuery } from './use-media-query'
export { usePrefersReducedMotion } from './use-prefers-reduced-motion'
export { scrollDirectionAt, useScrollDirection } from './use-scroll-direction'
export type { ScrollDirection } from './use-scroll-direction'
export { useScrollTopOnStep } from './use-scroll-top-on-step'
export { EASE_MAIN, EASE_SPRING } from './easing'
