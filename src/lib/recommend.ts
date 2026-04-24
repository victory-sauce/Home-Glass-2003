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
}

/**
 * Recommend the best available glass piece.
 * Priority: thickness == && type == && fits (with optional rotation),
 * LEFTOVERS first, then other racks; rank by least waste area.
 */
export function recommendPiece(
  pieces: GlassPiece[],
  order: OrderSpec
): Recommendation | null {
  const orderArea = order.width * order.height;
  const candidates: Recommendation[] = [];

  for (const p of pieces) {
    if (p.status !== "available") continue;
    if (Number(p.thickness) !== Number(order.thickness)) continue;
    if (p.glass_type !== order.glass_type) continue;

    const fitsNormal = p.width >= order.width && p.height >= order.height;
    const fitsRotated =
      order.allow_rotation &&
      p.width >= order.height &&
      p.height >= order.width;

    if (!fitsNormal && !fitsRotated) continue;

    const waste = p.width * p.height - orderArea;
    candidates.push({ piece: p, waste, rotated: !fitsNormal && fitsRotated });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const aLeftover = a.piece.rack === "LEFTOVERS" ? 0 : 1;
    const bLeftover = b.piece.rack === "LEFTOVERS" ? 0 : 1;
    if (aLeftover !== bLeftover) return aLeftover - bLeftover;
    return a.waste - b.waste;
  });

  return candidates[0];
}
