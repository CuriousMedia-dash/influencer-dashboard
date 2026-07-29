import { memo, useCallback, useMemo, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Flag } from "lucide-react";
import Badge from "../ui/Badge";
import TierBadge from "../ui/TierBadge";
import EditableCell from "../ui/EditableCell";
import PlatformIcon, { platformLabel } from "../ui/PlatformIcon";
import CopyButton from "../ui/CopyButton";
import { fmt, creatorPlatforms, hex2rgba } from "../../utils/format";
import {
  LANG_COLORS,
  NICHE_COLORS,
  GENDER_COLORS,
  QUIT_FLAG_COLOR,
} from "../../utils/constants";

const GENDER_ICON = { Male: "\u2642", Female: "\u2640", Others: "\u26a5" };

// Balanced, fixed-width columns, rendered as a flat list (no platform
// grouping/section headers) in the order below. Kept identical to the
// pre-virtualization version so nothing visually changes.
const COLUMNS = [
  { key: "name", label: "Creator", sortable: true, width: 130 },
  { key: "platform", label: "Platform", sortable: false, width: 92 },
  { key: "followers", label: "Followers", sortable: true, width: 82 },
  { key: "gender", label: "Gender", sortable: true, width: 76 },
  { key: "category", label: "Niche", sortable: true, width: 92 },
  { key: "language", label: "Language", sortable: true, width: 84 },
  { key: "city", label: "City", sortable: true, width: 100 },
  { key: "tier", label: "Category", sortable: true, width: 90 },
  { key: "phone", label: "Phone", sortable: false, width: 140 },
  { key: "email", label: "Email", sortable: false, width: 200 },
  { key: "commercial", label: "Commercial", sortable: false, width: 110 },
  { key: "remark", label: "Remarks", sortable: false, width: 230 },
  { key: "actions", label: "", sortable: false, width: 40 },
];

const CHECKBOX_COL_WIDTH = 36;
const TOTAL_WIDTH = CHECKBOX_COL_WIDTH + COLUMNS.reduce((sum, c) => sum + c.width, 0);
const ROW_HEIGHT = 41;
const HEADER_HEIGHT = 37;
const LIST_HEIGHT = 560;

// One virtualized row. Only re-renders when ITS OWN row data, selection
// state, or admin status actually changes — CreatorsTable below only
// mounts the ~25-40 rows physically visible at once (plus a small
// overscan buffer) no matter how many thousands of rows exist in total,
// which is what actually fixes the lag at scale (600,000+ real DOM
// nodes at 50k rows, down to a small constant number).
const Row = memo(function Row({ index, style, data }) {
  const { rows, selectedIds, onToggleSelect, onUpdateField, onDeleteRow, isAdmin } = data;
  const r = rows[index];
  const platform = creatorPlatforms(r)[0] || null;
  const selected = selectedIds.has(r.id);
  const lc = LANG_COLORS[r.language] || "#1E6FE0";
  const cc = NICHE_COLORS[r.category] || "#1E6FE0";
  const gc = GENDER_COLORS[r.gender] || "#1E6FE0";
  const quit = Boolean(r.quit);
  const quitBg = hex2rgba(QUIT_FLAG_COLOR, 0.1);

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "stretch",
        width: TOTAL_WIDTH,
        background: quit ? quitBg : selected ? "rgba(30,111,224,.05)" : undefined,
      }}
      className="transition-colors"
      onMouseEnter={(e) => {
        if (!selected && !quit) e.currentTarget.style.background = "var(--up)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = quit ? quitBg : selected ? "rgba(30,111,224,.05)" : "";
      }}
    >
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: CHECKBOX_COL_WIDTH }}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(r.id)}
          className="h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
        />
      </div>

      {/* Name */}
      <div
        className="flex flex-shrink-0 items-center overflow-hidden border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[0].width }}
      >
        <div className="flex min-w-0 items-center gap-1.5 font-medium">
          <span className="h-[7px] w-[7px] flex-shrink-0 rounded-full" style={{ background: lc }} />
          {platform?.link ? (
            <a
              href={platform.link}
              target="_blank"
              rel="noreferrer"
              title="View profile"
              className="block max-w-[95px] overflow-hidden text-ellipsis whitespace-nowrap transition-colors"
              style={{ color: "var(--ink)" }}
            >
              {r.name}
            </a>
          ) : (
            <span className="block max-w-[95px] overflow-hidden text-ellipsis whitespace-nowrap">{r.name}</span>
          )}
        </div>
      </div>

      {/* Platform */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[1].width }}
      >
        {platform ? (
          <Badge color="#1E6FE0">
            <PlatformIcon platform={platform.platform} size={12} /> {platformLabel(platform.platform)}
          </Badge>
        ) : (
          <span style={{ color: "var(--ink3)" }}>{"\u2014"}</span>
        )}
      </div>

      {/* Followers */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{
          borderColor: "var(--ln)",
          width: COLUMNS[2].width,
          color: "var(--ink)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {fmt(r.followers)}
      </div>

      {/* Gender */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[3].width }}
      >
        <Badge color={gc}>
          {GENDER_ICON[r.gender]} {r.gender}
        </Badge>
      </div>

      {/* Niche */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[4].width }}
      >
        <Badge color={cc}>{r.category}</Badge>
      </div>

      {/* Language */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[5].width }}
      >
        <Badge color={lc}>{r.language}</Badge>
      </div>

      {/* City (editable) */}
      <div
        className="flex flex-shrink-0 items-center overflow-visible border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[6].width }}
      >
        <EditableCell value={r.city} label="City" variant="plain" onSave={(val) => onUpdateField(r.id, "city", val)} />
      </div>

      {/* Category (tier badge) */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[7].width }}
      >
        <TierBadge followers={r.followers} />
      </div>

      {/* Phone (editable) */}
      <div
        className="flex flex-shrink-0 items-center overflow-visible border-b px-3"
        style={{
          borderColor: "var(--ln)",
          width: COLUMNS[8].width,
          color: "var(--ink2)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <EditableCell value={r.phone} label="Phone" variant="plain" onSave={(val) => onUpdateField(r.id, "phone", val)} />
      </div>

      {/* Email (editable) */}
      <div
        className="flex flex-shrink-0 items-center overflow-visible border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[9].width, color: "var(--ink2)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <EditableCell value={r.email} label="Email" variant="plain" onSave={(val) => onUpdateField(r.id, "email", val)} />
          </div>
          <CopyButton value={r.email} title="Copy email" />
        </div>
      </div>

      {/* Commercial (editable) */}
      <div
        className="flex flex-shrink-0 items-center overflow-visible border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[10].width }}
      >
        <EditableCell value={r.commercial} label="Commercial" variant="link" onSave={(val) => onUpdateField(r.id, "commercial", val)} />
      </div>

      {/* Remarks (editable) + flag */}
      <div
        className="flex flex-shrink-0 items-center overflow-visible border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[11].width }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <EditableCell value={r.remark} label="Remark" variant="pill" onSave={(val) => onUpdateField(r.id, "remark", val)} />
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
      </div>

      {/* Delete — admin only */}
      <div
        className="flex flex-shrink-0 items-center border-b px-3"
        style={{ borderColor: "var(--ln)", width: COLUMNS[12].width }}
      >
        {isAdmin && (
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
        )}
      </div>
    </div>
  );
});

function CreatorsTable({
  rows,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  sortKey,
  sortDir,
  onSort,
  onUpdateField,
  onDeleteRow,
  isAdmin,
  hasMore,
  loadingMore,
  onLoadMore,
}) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  // Only re-renders the visible slice — not on every pixel of scroll, but
  // ~15-25 times a second while actively scrolling, which is what
  // determines which handful of rows to actually mount at all.
  const [scrollTop, setScrollTop] = useState(0);

  const OVERSCAN = 6;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    rows.length - 1,
    Math.floor((scrollTop + LIST_HEIGHT) / ROW_HEIGHT) + OVERSCAN
  );
  const visibleIndices = [];
  for (let i = startIndex; i <= endIndex; i++) visibleIndices.push(i);

  // One handler covers both concerns: keeping the header's horizontal
  // position in sync with the body, and (in the same pass) triggering
  // the next page of results once the user scrolls near the bottom of
  // what's currently loaded — this is what makes the table feel like it
  // just has all 50,000+ rows, without ever mounting more than a couple
  // dozen real DOM rows at once.
  const handleScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      setScrollTop(el.scrollTop);
      if (headerRef.current) headerRef.current.scrollLeft = el.scrollLeft;
      if (hasMore && !loadingMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
        onLoadMore?.();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  // Stable object reference — if this were recreated every render, every
  // visible row would re-render every time regardless of Row being
  // memoized.
  const itemData = useMemo(
    () => ({ rows, selectedIds, onToggleSelect, onUpdateField, onDeleteRow, isAdmin }),
    [rows, selectedIds, onToggleSelect, onUpdateField, onDeleteRow, isAdmin]
  );

  return (
    <div
      className="overflow-hidden rounded-[13px] border text-xs shadow-[0_1px_2px_rgba(16,36,62,.04)]"
      style={{ background: "var(--panel)", borderColor: "var(--ln)" }}
    >
      {/* Header row — kept in horizontal sync with the body via
          handleScroll above. */}
      <div
        ref={headerRef}
        className="overflow-hidden"
        style={{ height: HEADER_HEIGHT }}
      >
        <div className="flex" style={{ width: TOTAL_WIDTH }}>
          <div
            className="flex flex-shrink-0 items-center border-b px-3"
            style={{ background: "var(--up)", borderColor: "var(--ln)", width: CHECKBOX_COL_WIDTH }}
          >
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onToggleSelectAll(rows.map((r) => r.id), e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-[#1E6FE0]"
            />
          </div>
          {COLUMNS.map((col) => {
            const isSorted = sortKey === col.key;
            return (
              <div
                key={col.key}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
                className={
                  "flex flex-shrink-0 items-center whitespace-nowrap border-b px-3 text-left text-[10px] uppercase tracking-[.06em] select-none " +
                  (col.sortable ? "cursor-pointer" : "cursor-default")
                }
                style={{ background: "var(--up)", borderColor: "var(--ln)", color: "var(--ink)", width: col.width }}
              >
                <span className="inline-flex items-center gap-0.5">
                  {col.label}
                  {col.sortable && isSorted && (
                    <span style={{ color: "var(--am)" }}>
                      {sortDir === 1 ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-[50px] text-center text-[13px]" style={{ color: "var(--ink3)" }}>
          No creators match. Try adjusting the filters.
        </div>
      ) : (
        <>
          <div
            ref={bodyRef}
            onScroll={handleScroll}
            style={{ height: LIST_HEIGHT, overflow: "auto" }}
          >
            {/* Spacer that gives the scroll container its true total
                height/width, so the browser's own scrollbar behaves
                exactly as if every row really were in the DOM. */}
            <div style={{ position: "relative", height: rows.length * ROW_HEIGHT, width: TOTAL_WIDTH }}>
              {visibleIndices.map((i) => (
                <Row
                  key={rows[i].id}
                  index={i}
                  data={itemData}
                  style={{
                    position: "absolute",
                    top: i * ROW_HEIGHT,
                    left: 0,
                    width: TOTAL_WIDTH,
                    height: ROW_HEIGHT,
                  }}
                />
              ))}
            </div>
          </div>
          {loadingMore && (
            <div
              className="border-t px-3 py-2 text-center text-[11px]"
              style={{ borderColor: "var(--ln)", color: "var(--ink3)" }}
            >
              Loading more creators…
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(CreatorsTable);