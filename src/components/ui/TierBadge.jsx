import { hex2rgba, getTier } from "../../utils/format";
import { TIER_COLORS, TIER_LABELS } from "../../utils/constants";

/**
 * Tier pill — mirrors the approved HTML's `.tier-badge` class.
 * On the All Creators page this column is labeled "Category" (Phase 2 rename)
 * but the underlying tier logic/colors/labels are unchanged.
 */
export default function TierBadge({ followers }) {
  const tier = getTier(followers);
  const color = TIER_COLORS[tier];
  const label = TIER_LABELS[tier];
  return (
    <span
      className="whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        color,
        borderColor: hex2rgba(color, 0.35),
        background: hex2rgba(color, 0.1),
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label}
    </span>
  );
}
