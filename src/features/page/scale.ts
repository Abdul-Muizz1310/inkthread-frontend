/** Maps a PDF-point bbox (origin top-left, unrotated page) to pixels of the rendered page image. */
export type PageSize = { width: number; height: number };
export type Box = { left: number; top: number; width: number; height: number };

export function toPixels(
  bbox: readonly [number, number, number, number],
  page: PageSize,
  imageWidth: number,
): Box {
  const k = imageWidth / page.width;
  const [x0, y0, x1, y1] = bbox;
  return { left: x0 * k, top: y0 * k, width: (x1 - x0) * k, height: (y1 - y0) * k };
}
