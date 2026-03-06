import Image from "next/image";

export type PlayerLite = {
  id: string;
  display_name: string;
  picture_url: string | null;
};

function SessionAvatar({
  displayName,
  pictureUrl,
  size = 24,
  className = "",
}: {
  displayName: string;
  pictureUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = displayName.trim().charAt(0).toUpperCase();
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex-shrink-0 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-white ${className}`}
    >
      {pictureUrl ? (
        <Image
          src={pictureUrl}
          alt={displayName}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-[10px] font-semibold text-gray-500">{initials}</span>
      )}
    </div>
  );
}

export function AvatarStack({
  players,
  max = 4,
  size = 24,
}: {
  players: PlayerLite[];
  max?: number;
  size?: number;
}) {
  const visible = players.slice(0, max);
  if (visible.length === 0) return null;

  return (
    <div className="flex items-center">
      {visible.map((player, i) => (
        <SessionAvatar
          key={player.id}
          displayName={player.display_name}
          pictureUrl={player.picture_url}
          size={size}
          className={i === 0 ? "" : "-ml-2"}
        />
      ))}
    </div>
  );
}
