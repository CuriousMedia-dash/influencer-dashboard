import { ChevronUp, ChevronDown, Trash2, Flag } from "lucide-react";
import Badge from "../ui/Badge";
import TierBadge from "../ui/TierBadge";
import EditableCell from "../ui/EditableCell";
import PlatformIcon, { platformLabel } from "../ui/PlatformIcon";
import { fmt, creatorPlatforms, hex2rgba } from "../../utils/format";
import {
  LANG_COLORS,
  NICHE_COLORS,
  GENDER_COLORS,
  QUIT_FLAG_COLOR,
} from "../../utils/constants";

const GENDER_ICON = { Male: "\u2642", Female: "\u2640", Others: "\u26a5" };

// Balanced, fixed-width columns, rendered as a flat list (no platform
// grouping/section headers) in the order below.
const COLUMNS = [
  { key: "name", label: "Creator", sortable: true, width: 130 },
  { key: "platform", label: "Platform", sortable: false, width: 92 },
  { key: "followers", label: "Followers", sortable: true, width: 82 },
  { key: "gender", label: "Gender", sortable: true, width: 76 },
  { key: "category", label: "Niche", sortable: true, width: 92 },
  { key: "language", label: "Language", sortable: true, width: 84 },
  { key: "tier", label: "Category", sortable: true, width: 90 },
  { key: "phone", label: "Phone", sortable: false, width: 140 },
  { key: "email", label: "Email", sortable: false, width: 190 },
  { key: "commercial", label: "Commercial", sortable: false, width: 110 },
  { key: "remark", label: "Remarks", sortable: false, width: 230 },
  { key: "actions", label: "", sortable: false, width: 40 },
];

export default function CreatorsTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortKey,
  sortDir,
  onSort,
  onUpdateField,
  onDeleteRow,
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  

  return (
    <div
      className="overflow-auto rounded-[13px] border shadow-[0_1px_2px_rgba(16,36,62,.04)]"
      style={{ background: "var(--panel)", borderColor: "var(--ln)", maxHeight: 560 }}
    >
      <table
        className="table-fixed border-collapse text-xs"
        style={{ width: "100%", minWidth: 1340 }}
      >
        <thead>
          <tr>
            <th
              className="sticky top-0 z-10 border-b px-3 py-2.5"
              style={{ background: "var(--up)", borderColor: "var(--ln)", width: 36 }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) =>
                  onToggleSelectAll(rows.map((r) => r.id), e.target.checked)
                }
                className="h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
              />
            </th>
            {COLUMNS.map((col) => {
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                  className={
                    "sticky top-0 z-10 whitespace-nowrap border-b px-3 py-2.5 text-left text-[10px] uppercase tracking-[.06em] select-none " +
                    (col.sortable ? "cursor-pointer" : "cursor-default")
                  }
                  style={{
                    background: "var(--up)",
                    borderColor: "var(--ln)",
                    color: "var(--ink)",
                    width: col.width,
                  }}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    {col.sortable && isSorted && (
                      <span style={{ color: "var(--am)" }}>
                        {sortDir === 1 ? (
                          <ChevronUp size={11} />
                        ) : (
                          <ChevronDown size={11} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const platform = creatorPlatforms(r)[0] || null;
            const selected = selectedIds.has(r.id);
            const lc = LANG_COLORS[r.language] || "#1E6FE0";
            const cc = NICHE_COLORS[r.category] || "#1E6FE0";
            const gc = GENDER_COLORS[r.gender] || "#1E6FE0";
            const quit = Boolean(r.quit);
            const quitBg = hex2rgba(QUIT_FLAG_COLOR, 0.1);

            return (
              <tr
                key={r.id}
                className="transition-colors"
                style={{
                  background: quit
                    ? quitBg
                    : selected
                    ? "rgba(30,111,224,.05)"
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!selected && !quit) e.currentTarget.style.background = "var(--up)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = quit
                    ? quitBg
                    : selected
                    ? "rgba(30,111,224,.05)"
                    : "";
                }}
              >
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleSelect(r.id)}
                        className="h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
                      />
                    </td>

                    {/* Name */}
                    <td
                      className="overflow-hidden border-b px-3 py-2"
                      style={{ borderColor: "var(--ln)" }}
                    >
                      <div className="flex min-w-0 items-center gap-1.5 font-medium">
                        <span
                          className="h-[7px] w-[7px] flex-shrink-0 rounded-full"
                          style={{ background: lc }}
                        />
                        {platform?.link ? (
                          <a
                            href={platform.link}
                            target="_blank"
                            rel="noreferrer"
                            title="View profile"
                            className="block max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap transition-colors"
                            style={{ color: "var(--ink)" }}
                          >
                            {r.name}
                          </a>
                        ) : (
                          <span className="block max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {r.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Platform */}
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      {platform ? (
                        <Badge color="#1E6FE0">
                          <PlatformIcon platform={platform.platform} size={12} /> {platformLabel(platform.platform)}
                        </Badge>
                      ) : (
                        <span style={{ color: "var(--ink3)" }}>{"\u2014"}</span>
                      )}
                    </td>

                    {/* Followers */}
                    <td
                      className="border-b px-3 py-2"
                      style={{
                        borderColor: "var(--ln)",
                        color: "var(--ink)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {fmt(r.followers)}
                    </td>

                    {/* Gender */}
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      <Badge color={gc}>
                        {GENDER_ICON[r.gender]} {r.gender}
                      </Badge>
                    </td>

                    {/* Niche (renamed from Category) */}
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      <Badge color={cc}>{r.category}</Badge>
                    </td>

                    {/* Language */}
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      <Badge color={lc}>{r.language}</Badge>
                    </td>

                    {/* Category (renamed from Tier) */}
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      <TierBadge followers={r.followers} />
                    </td>

                    {/* Phone */}
                    <td
                      className="border-b px-3 py-2 break-words"
                      style={{
                        borderColor: "var(--ln)",
                        color: "var(--ink2)",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {r.phone}
                    </td>

                    {/* Email */}
                    <td
                      className="border-b px-3 py-2 break-words"
                      style={{ borderColor: "var(--ln)", color: "var(--ink2)" }}
                    >
                      {r.email}
                    </td>

                    

                    {/* Commercial (editable) */}
                    <td
                      className="overflow-visible border-b px-3 py-2"
                      style={{ borderColor: "var(--ln)" }}
                    >
                      <EditableCell
                        value={r.commercial}
                        label="Commercial"
                        variant="link"
                        onSave={(val) => onUpdateField(r.id, "commercial", val)}
                      />
                    </td>

                    {/* Remarks (editable) */}
                    <td
                      className="overflow-visible border-b px-3 py-2"
                      style={{ borderColor: "var(--ln)" }}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <EditableCell
                          value={r.remark}
                          label="Remark"
                          variant="pill"
                          onSave={(val) => onUpdateField(r.id, "remark", val)}
                        />
                        <button
                          type="button"
                          title={quit ? "Flagged — click to unflag" : "Flag this creator"}
                          onClick={() => onUpdateField(r.id, "quit", !quit)}
                          className="flex h-[20px] w-fit flex-shrink-0 items-center gap-1 rounded-[6px] border px-1.5 transition-colors"
                          style={
                            quit
                              ? { borderColor: QUIT_FLAG_COLOR, background: hex2rgba(QUIT_FLAG_COLOR, 0.12), color: QUIT_FLAG_COLOR }
                              : { borderColor: "var(--ln)", color: "var(--ink3)", background: "var(--up)" }
                          }
                        >
                          <Flag size={11} fill={quit ? QUIT_FLAG_COLOR : "none"} />
                          <span className="text-[10px]">Flag</span>
                        </button>
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="border-b px-3 py-2" style={{ borderColor: "var(--ln)" }}>
                      <button
                        type="button"
                        title={`Delete ${r.name}`}
                        onClick={() => onDeleteRow?.(r.id, r.name)}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border border-transparent transition-colors"
                        style={{ color: "var(--ink3)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "rgba(224,82,75,.3)";
                          e.currentTarget.style.color = "#E0524B";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "transparent";
                          e.currentTarget.style.color = "var(--ink3)";
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div
          className="px-5 py-[50px] text-center text-[13px]"
          style={{ color: "var(--ink3)" }}
        >
          No creators match. Try adjusting the filters.
        </div>
      )}
    </div>
  );
}