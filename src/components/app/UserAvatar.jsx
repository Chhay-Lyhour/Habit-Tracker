import { cn } from 'cn'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

/** "chhay.lyhour@…" → "CL", "sam@…" → "S". Empty string if nothing usable. */
function initialsFrom(email) {
  const local = email?.split('@')[0] ?? ''
  return local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/**
 * The user's avatar, in three states: a skeleton circle while the profile
 * loads, the image when there is one, and initials (or a wave) when there is
 * not — or while the image itself is still downloading.
 *
 * `src` wins over the stored URL so the uploader can show a local preview.
 *
 * `size` is the rendered size in px and must match the size-* class. It is
 * written onto the <img> as width/height so the box is reserved even before
 * CSS applies — no layout shift when the photo arrives.
 *
 * Deliberately NOT loading="lazy" (Zone B): every avatar is above the fold
 * (header, and the first card on the tracker), where lazy loading only delays
 * the image. It would also do nothing here — Radix preloads the src with
 * `new Image()` and renders the <img> only once it has loaded.
 */
export function UserAvatar({
  src,
  email,
  alt = '',
  loading = false,
  size = 40,
  className,
  fallbackClassName,
}) {
  if (loading) {
    return <Skeleton className={cn('size-10 shrink-0 rounded-full', className)} />
  }

  const initials = initialsFrom(email)

  return (
    <Avatar className={cn('size-10', className)}>
      {src ? <AvatarImage src={src} alt={alt} width={size} height={size} /> : null}
      <AvatarFallback
        className={cn(
          'bg-sky/10 font-extrabold text-sky',
          fallbackClassName
        )}
      >
        {initials || (
          <span role="img" aria-label="">
            👋
          </span>
        )}
      </AvatarFallback>
    </Avatar>
  )
}
