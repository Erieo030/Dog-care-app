/** 膠囊、點擊區與選取泡泡共用尺寸，避免六項導覽時左右偏移。 */
export const DOCK_HORIZONTAL_PADDING = 12;
export const TAB_ITEM_MARGIN = 2;
export const DOCK_EDGE = 10;

export function getDockSlotWidth(width: number, count: number): number {
  return count > 0 ? Math.max((width - DOCK_HORIZONTAL_PADDING * 2) / count, 0) : 0;
}
