import type { GlassPiece } from "./supabase";

export interface OrderSpec {
  glass_type: string;
  width: number;
  height: number;
  thickness: number;
  allow_rotation: boolean;
}

export interface Recommendation {
  piece: GlassPiece;
  waste: number;
  rotated: boolean;
  priority: number;
}

function normalizeGlassType(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

export function getRecommendations(
  pieces: GlassPiece[],
  order: OrderSpec
): Recommendation[] {
  const orderWidth = toNumber(order.width);
  const orderHeight = toNumber(order.height);
  const orderThickness = toNumber(order.thickness);
  const orderArea = orderWidth * orderHeight;

  if (!orderWidth || !orderHeight || !orderThickness || !order.glass_type) {
    return [];
  }

  const candidates: Recommendation[] = [];

  for (const piece of pieces) {
    if (piece.status !== "available") continue;

    const pieceWidth = toNumber(piece.width);
    const pieceHeight = toNumber(piece.height);
    const pieceThickness = toNumber(piece.thickness);

    if (pieceThickness !== orderThickness) continue;

    if (
      normalizeGlassType(piece.glass_type) !==
      normalizeGlassType(order.glass_type)
    ) {
      continue;
    }

    const fitsNormal =
      pieceWidth >= orderWidth && pieceHeight >= orderHeight;

    const fitsRotated =
      order.allow_rotation &&
      pieceWidth >= orderHeight &&
      pieceHeight >= orderWidth;

    if (!fitsNormal && !fitsRotated) continue;

    const waste = pieceWidth * pieceHeight - orderArea;
    const priority = piece.rack === "LEFTOVERS" ? 0 : 1;

    candidates.push({
      piece,
      waste,
      rotated: !fitsNormal && fitsRotated,
      priority,
    });
  }

  return candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.waste !== b.waste) return a.waste - b.waste;
    return (a.piece.rack_order ?? 0) - (b.piece.rack_order ?? 0);
  });
}

/**
 * Backwards-compatible helper.
 * Returns only the best available recommendation.
 */
export function recommendPiece(
  pieces: GlassPiece[],
  order: OrderSpec
): Recommendation | null {
  return getRecommendations(pieces, order)[0] ?? null;
}
