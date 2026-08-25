import type React from 'react';
import type { UnitRendererProps } from '../UnitRendererProps';

export { ensureAbsoluteUrl, formatDisplayDateRange } from './helpers';

/**
 * Values computed once per unit in the UnitRenderer dispatcher and shared by
 * every branch component: template flags, section lookup and merged inline
 * styles derived from per-section customization.
 */
export interface UnitContext {
  isPP: boolean;
  isGerman: boolean;
  sec: any;
  localStyles: any;
  mergedStyles: React.CSSProperties;
  titleClass: string;
  handleContainerClickToFocus: (e: React.MouseEvent<HTMLElement>) => void;
}
