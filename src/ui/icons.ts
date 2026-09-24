import type { IconId } from '../domain/model';
import { ICONS } from '../domain/model';

export const ICON_GLYPH: Record<IconId, string> = {
  moon: '🌙',
  star: '⭐',
  bear: '🐻',
  fox: '🦊',
  owl: '🦉',
  cloud: '☁️',
  sun: '☀️',
  leaf: '🍃',
};

export const ICON_LIST: readonly IconId[] = ICONS;
