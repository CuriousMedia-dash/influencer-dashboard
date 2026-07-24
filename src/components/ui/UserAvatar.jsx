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

/**
 * Shows the logged-in user's profile photo if one exists (e.g. from an
 * OAuth provider) — Supabase stores this under user_metadata.avatar_url,
 * which is empty for plain email+password accounts, so in practice this
 * will usually fall back to a coloured circle with the person's initial.
 */
export default function UserAvatar({ email, avatarUrl, size = 30 }) {
  const initial = (email || "?").trim().charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={email || "User"}
        title={email}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
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
