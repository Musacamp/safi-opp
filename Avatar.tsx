import type { Contact } from "@/types/database";

interface AvatarProps {
  contact: Pick<Contact, "photo_url" | "full_name">;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
};

export function Avatar({ contact, size = "md", onClick }: AvatarProps) {
  const initials = contact.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white shrink-0 ${
        onClick ? "cursor-pointer" : ""
      }`}
      style={{
        background: contact.photo_url
          ? undefined
          : "linear-gradient(135deg, #0f6641, #1a48b8)",
      }}
    >
      {contact.photo_url ? (
        <img
          src={contact.photo_url}
          alt={contact.full_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        initials
      )}
    </div>
  );
}

