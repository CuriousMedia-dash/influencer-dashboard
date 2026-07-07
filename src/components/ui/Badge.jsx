import { hex2rgba } from "../../utils/format";

/**
 * Small colored pill badge — mirrors the approved HTML's `.bdg` class.
 * Used for Platform / Gender / Niche / Language columns.
 */
export default function Badge({ color = "#1E6FE0", children }) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full border px-2 py-[3px] text-[11px]"
      style={{
        color,
        borderColor: hex2rgba(color, 0.3),
        background: hex2rgba(color, 0.08),
      }}
    >
      {children}
    </span>
  );
}
