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

function normalizeGlassType(value: string) {
  return value.trim().toLowerCase();
}

export function getRecommendations(
  pieces: GlassPiece[],
  order: OrderSpec
): Recommendation[] {
  const orderArea = order.width * order.height;
  const candidates: Recommendation[] = [];

  for (const piece of pieces) {
    if (piece.status !== "available") continue;
    if (Number(piece.thickness) !== Number(order.thickness)) continue;

    if (normalizeGlassType(piece.glass_type) !== normalizeGlassType(order.glass_type)) {
      continue;
    }

    const fitsNormal =
      Number(piece.width) >= Number(order.width) &&
      Number(piece.height) >= Number(order.height);

    const fitsRotated =
      order.allow_rotation &&
      Number(piece.width) >= Number(order.height) &&
      Number(piece.height) >= Number(order.width);

    if (!fitsNormal && !fitsRotated) continue;

    const waste = Number(piece.width) * Number(piece.height) - orderArea;
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
