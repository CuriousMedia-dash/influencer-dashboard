import { useParams } from "react-router-dom";
import { decodeShareToken } from "../utils/shareLink";
import { fmt } from "../utils/format";

// Standalone, public, read-only page — deliberately rendered outside the
// app's <Layout> (no sidebar/nav/internal chrome). Everything it shows
// comes from the URL token itself; it never touches CreatorsContext or
// CampaignsContext, so it works the same for an external viewer who has
// none of this app's data in their own browser.
export default function SharedCampaignView() {
  const { token } = useParams();
  const payload = decodeShareToken(token);

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E7F0FA] p-6">
        <div
          className="max-w-sm rounded-[14px] border p-6 text-center"
          style={{ background: "#fff", borderColor: "#D9E4F2" }}
        >
          <h1 className="mb-1.5 text-lg font-semibold" style={{ fontFamily: "Fraunces, serif" }}>
            Link not valid
          </h1>
          <p className="text-sm" style={{ color: "#5B6B82" }}>
            This share link is broken or incomplete. Ask for a fresh link from
            the campaign owner.
          </p>
        </div>
      </div>
    );
  }

  const generatedDate = payload.generatedAt
    ? new Date(payload.generatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="min-h-screen bg-[#E7F0FA] p-6">
      <div className="mx-auto max-w-2xl">
        <div
          className="mb-4 text-[11px] uppercase tracking-[.13em]"
          style={{ color: "#8494AC", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {generatedDate}
        </div>

        <h1
          className="mb-5 text-[28px] font-semibold"
          style={{ fontFamily: "Fraunces, serif", color: "#02060c", letterSpacing: "-0.01em" }}
        >
          {payload.name}
        </h1>

        <div
          className="overflow-hidden rounded-[13px] border"
          style={{ background: "#fff", borderColor: "#D9E4F2" }}
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["Creator", "Followers", "Language", "Locked Price"].map((h) => (
                  <th
                    key={h}
                    className="border-b px-4 py-3 text-left text-[11px] uppercase tracking-[.06em]"
                    style={{ borderColor: "#D9E4F2", color: "#8494AC", background: "#F4F8FC" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.rows.map((row, i) => (
                <tr key={i}>
                  <td className="border-b px-4 py-3" style={{ borderColor: "#EDF2F9" }}>
                    {row.link ? (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noreferrer"
                        title="View profile"
                        className="underline decoration-1 underline-offset-2"
                        style={{ color: "#1E6FE0" }}
                      >
                        {row.n}
                      </a>
                    ) : (
                      <span style={{ color: "#10243E" }}>{row.n}</span>
                    )}
                  </td>
                  <td
                    className="border-b px-4 py-3"
                    style={{
                      borderColor: "#EDF2F9",
                      color: "#10243E",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {fmt(row.f)}
                  </td>
                  <td className="border-b px-4 py-3" style={{ borderColor: "#EDF2F9", color: "#10243E" }}>
                    {row.lang || <span style={{ color: "#B7C2D6" }}>{"\u2014"}</span>}
                  </td>
                  <td className="border-b px-4 py-3" style={{ borderColor: "#EDF2F9" }}>
                    {row.lp !== null && row.lp !== "" ? (
                      <span style={{ color: "#10243E", fontWeight: 600 }}>
                        {"\u20b9"}{fmt(Number(row.lp) || row.lp)}
                      </span>
                    ) : (
                      <span style={{ color: "#B7C2D6" }}>Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payload.rows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "#8494AC" }}>
              No creators in this campaign yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}