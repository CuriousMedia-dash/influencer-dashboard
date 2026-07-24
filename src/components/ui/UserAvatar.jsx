import { useState } from "react";

// A consistent circular colour per person, derived from their email, so
// the same person always gets the same colour without needing to store
// one anywhere.
const AVATAR_COLORS = ["#1E6FE0", "#6E5BD6", "#2BAE66", "#E08A3B", "#E0524B", "#2BAE9E"];

function colorForEmail(email) {
  const str = email || "?";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Minimal, self-contained MD5 implementation — needed only because
// Gravatar's photo-lookup URL format specifically requires an MD5 hash
// of the email address (a fixed, unavoidable part of Gravatar's own
// API), and browsers don't provide MD5 natively (only the SHA family).
function md5(input) {
  function rotateLeft(x, c) { return (x << c) | (x >>> (32 - c)); }
  const s = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

  const bytes = [];
  for (let i = 0; i < input.length; i++) bytes.push(input.charCodeAt(i) & 0xff);
  const originalLenBits = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((originalLenBits / Math.pow(2, i * 8)) & 0xff);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
    const M = [];
    for (let i = 0; i < 16; i++) {
      M[i] =
        (bytes[chunkStart + i * 4]) |
        (bytes[chunkStart + i * 4 + 1] << 8) |
        (bytes[chunkStart + i * 4 + 2] << 16) |
        (bytes[chunkStart + i * 4 + 3] << 24);
    }
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) | 0;
      A = D; D = C; C = B;
      B = (B + rotateLeft(F, s[i])) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }

  return [a0, b0, c0, d0].map((n) => {
    const bytesOut = [];
    for (let i = 0; i < 4; i++) bytesOut.push((n >> (i * 8)) & 0xff);
    return bytesOut.map((b) => ("0" + b.toString(16)).slice(-2)).join("");
  }).join("");
}

function gravatarUrl(email, size) {
  const hash = md5(email.trim().toLowerCase());
  // d=404 makes Gravatar return an actual 404 instead of a default
  // placeholder image when the email has no photo set up — that's what
  // lets the <img> onError below detect "no real photo" and fall back
  // to initials, rather than showing Gravatar's generic default icon.
  return `https://www.gravatar.com/avatar/${hash}?s=${size * 2}&d=404`;
}

/**
 * Shows a real profile photo if one exists for this email — either from
 * an OAuth provider (Supabase's user_metadata.avatar_url) or from
 * Gravatar, the widely-used service that lets people attach a photo to
 * their email address globally, independent of any specific app. Falls
 * back to a coloured circle with their initial if neither has a photo.
 */
export default function UserAvatar({ email, avatarUrl, size = 30 }) {
  const [gravatarFailed, setGravatarFailed] = useState(false);
  const initial = (email || "?").trim().charAt(0).toUpperCase();

  const photoSrc = avatarUrl || (email && !gravatarFailed ? gravatarUrl(email, size) : null);

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt={email || "User"}
        title={email}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setGravatarFailed(true)}
      />
    );
  }

  return (
    <div
      title={email}
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: colorForEmail(email),
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </div>
  );
}