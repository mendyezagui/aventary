import type { TeamMember } from "@/lib/team";

/**
 * A person's face, or their monogram when there isn't one.
 *
 * One component so the roster card and the profile hero can never drift apart,
 * and so adding a photo is a data change rather than a markup change.
 *
 * `object-cover` on a square frame means the source should already be square
 * and cropped on the face; a tall portrait fed in raw gets centre-cropped,
 * which usually lands on the chin.
 */
export function TeamAvatar({
  member,
  size,
  className = ""
}: {
  member: TeamMember;
  /** Tailwind size classes, e.g. "w-16 h-16". */
  size: string;
  className?: string;
}) {
  const shared = `${size} rounded-full shrink-0 ${className}`;

  if (member.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.photo}
        alt={`${member.name}, ${member.role} at Aventary`}
        width={256}
        height={256}
        loading="lazy"
        decoding="async"
        className={`${shared} object-cover bg-surface-container`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${shared} bg-primary text-on-primary font-headline font-bold flex items-center justify-center`}
    >
      {member.initials}
    </div>
  );
}
