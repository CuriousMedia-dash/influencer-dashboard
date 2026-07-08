import { useId } from "react";

// Real per-platform brand colors. Instagram uses its actual multi-color
// gradient (not a flat substitute) since that's core to how the logo is
// recognized. Twitter's stored value stays "Twitter" everywhere in the
// data model (so existing creator/campaign records aren't broken by a
// rename), but it's displayed as "X" with the current black X mark,
// matching the platform's real 2023 rebrand.
export const PLATFORM_BRAND_COLORS = {
  Instagram: "#C13584",
  YouTube: "#FF0000",
  Twitter: "#000000",
  LinkedIn: "#0A66C2",
};

function InstagramMark({ size, gradientId }) {
  return (
    <svg width={size} height={size} viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#F56040" />
          <stop offset="70%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#5851DB" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.2 9s-102.7 2.6-132.2-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.2s-2.6-102.7 9-132.2c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.2-9s102.7-2.6 132.2 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.2s2.7 102.7-9 132.2z"
      />
    </svg>
  );
}

function YouTubeMark({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#FF0000"
        d="M549.7 124.1c-6.3-23.7-24.8-42.3-48.3-48.6C458.8 64 288 64 288 64S117.2 64 74.6 75.5c-23.5 6.3-42 24.9-48.3 48.6-11.4 42.9-11.4 132.3-11.4 132.3s0 89.4 11.4 132.3c6.3 23.7 24.8 41.5 48.3 47.8C117.2 448 288 448 288 448s170.8 0 213.4-11.5c23.5-6.3 42-24.2 48.3-47.8 11.4-42.9 11.4-132.3 11.4-132.3s0-89.4-11.4-132.3zM232 335.6V176.4l142.7 79.6L232 335.6z"
      />
    </svg>
  );
}

// Twitter is now X — solid black mark, matching the current brand.
function XMark({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#000000"
        d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"
      />
    </svg>
  );
}

function LinkedInMark({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#0A66C2"
        d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3C448 46.5 433.6 32 416 32zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"
      />
    </svg>
  );
}

/**
 * Real brand logo for a platform — Instagram's actual gradient, YouTube
 * red, X's black mark, LinkedIn blue — in place of a generic emoji.
 * `size` is in pixels (square).
 */
export default function PlatformIcon({ platform, size = 14 }) {
  const gradientId = useId();
  switch (platform) {
    case "Instagram":
      return <InstagramMark size={size} gradientId={gradientId} />;
    case "YouTube":
      return <YouTubeMark size={size} />;
    case "Twitter":
      return <XMark size={size} />;
    case "LinkedIn":
      return <LinkedInMark size={size} />;
    default:
      return <span style={{ fontSize: size, lineHeight: 1 }}>{"\ud83d\udd17"}</span>;
  }
}

/**
 * Display label for a platform value — everything in storage, filters,
 * and matching logic still uses "Twitter" so existing creator/campaign
 * data isn't broken by the rename; only what's shown on screen says "X".
 */
export function platformLabel(platform) {
  return platform === "Twitter" ? "X" : platform;
}
