// Phase 2 Week 6 Design System Agent - Class Name Utility
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for Tailwind-specific merging
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility to create responsive class variants
 * 
 * @param base - Base classes
 * @param responsive - Responsive variants
 * @returns Merged responsive classes
 */
export function responsive(
  base: string,
  responsive: Partial<{
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }>
) {
  return cn(
    base,
    responsive.sm && `sm:${responsive.sm}`,
    responsive.md && `md:${responsive.md}`,
    responsive.lg && `lg:${responsive.lg}`,
    responsive.xl && `xl:${responsive.xl}`,
    responsive['2xl'] && `2xl:${responsive['2xl']}`
  )
}

/**
 * Utility to create focus-visible classes with fallback
 * 
 * @param classes - Focus classes
 * @returns Focus-visible classes with fallback
 */
export function focusVisible(classes: string) {
  return cn(
    'focus-visible:' + classes,
    // Fallback for browsers without focus-visible support
    'focus:' + classes
  )
}

/**
 * Utility to create hover classes with touch device considerations
 * 
 * @param classes - Hover classes
 * @returns Hover classes that respect user preferences
 */
export function hover(classes: string) {
  return cn(
    // Only apply hover on devices that can hover
    '@media (hover: hover) { &:hover }': classes,
    // Fallback for touch devices
    'active:' + classes
  )
}