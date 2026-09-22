import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCw, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/app/ErrorState'
import { FormField } from '@/components/app/FormField'
import { UserAvatar } from '@/components/app/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useProfile } from '@/hooks/useProfile'
import { friendlyProfileError } from '@/lib/profile'
import { ALLOWED_AVATAR_TYPES, validateAvatar } from '@/lib/validateAvatar'

const INPUT_ID = 'avatar-file'

/**
 * Pick → validate → preview → upload.
 *
 * validateAvatar runs before anything else; a file that fails it never leaves
 * the browser. The error sits inline under the input (FormField gives it
 * role="alert" and the id the input's aria-describedby points at).
 *
 * The preview is a blob: URL. It is created in the change handler and revoked
 * by the effect below whenever it is replaced or the card unmounts —
 * otherwise every file picked keeps its bytes alive in memory until reload.
 *
 * Upload errors are async, so an ErrorBoundary would never see them: they are
 * caught here and shown with a Retry.
 */
export function AvatarUploader() {
  const { user } = useAuth()
  const { profile, status, error, uploading, refresh, upload } = useProfile()
  // Picking and previewing work offline; uploading does not, and avatar
  // uploads are not queued (a file is too big for localStorage).
  const online = useOnlineStatus()

  const [selected, setSelected] = useState(null) // { file, url } | null
  const [fieldError, setFieldError] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const inputRef = useRef(null)
  // Picking twice quickly must not let the first, slower validation win.
  const pickRef = useRef(0)

  const previewUrl = selected?.url ?? null
  useEffect(() => {
    if (!previewUrl) return
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function clearInput() {
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleChange(event) {
    const file = event.target.files?.[0] ?? null
    const pickId = (pickRef.current += 1)

    setUploadError(null)

    // Cancelling the picker: keep whatever was already chosen.
    if (!file) return

    const result = await validateAvatar(file)
    if (pickRef.current !== pickId) return

    if (!result.ok) {
      setSelected(null)
      setFieldError(result.error)
      // So picking the same file again still fires a change event.
      clearInput()
      return
    }

    setFieldError(null)
    setSelected({ file, url: URL.createObjectURL(file) })
  }

  function handleCancel() {
    setSelected(null)
    setFieldError(null)
    setUploadError(null)
    clearInput()
  }

  async function handleUpload() {
    if (!selected || uploading) return
    setUploadError(null)

    try {
      await upload(selected.file)
      setSelected(null)
      clearInput()
      toast.success('Looking good! Avatar updated.')
    } catch (caught) {
      setUploadError(friendlyProfileError(caught))
    }
  }

  if (status === 'loading') {
    return (
      <Card aria-busy="true">
        <CardContent className="flex items-center gap-4">
          <span className="sr-only">Loading your profile…</span>
          <Skeleton className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="Could not load your profile"
        description={friendlyProfileError(error)}
        onRetry={() => refresh()}
      />
    )
  }

  const hasAvatar = Boolean(profile?.avatar_url)
  const describedBy = fieldError ? `${INPUT_ID}-error` : `${INPUT_ID}-hint`

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4 sm:flex-col sm:items-center">
          <UserAvatar
            src={previewUrl ?? profile?.avatar_url}
            email={user?.email}
            alt={previewUrl ? 'Preview of your new avatar' : 'Your avatar'}
            size={80}
            className="size-20 ring-4 ring-sky-bright/30"
            fallbackClassName="text-2xl"
          />
          {previewUrl ? (
            <span className="rounded-full bg-streak/10 px-3 py-1 text-xs font-extrabold tracking-wide text-streak uppercase">
              Preview
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-extrabold">You</h2>
            <p className="truncate text-sm text-muted-foreground">
              {user?.email}
            </p>
            {!hasAvatar && !previewUrl ? (
              <p className="text-base">No photo yet. Add one and make it yours!</p>
            ) : null}
          </div>

          <FormField
            id={INPUT_ID}
            label={hasAvatar ? 'Change your photo' : 'Choose a photo'}
            error={fieldError}
            hint="JPG, PNG or WebP, up to 1 MB."
          >
            <Input
              ref={inputRef}
              id={INPUT_ID}
              type="file"
              accept={ALLOWED_AVATAR_TYPES.join(',')}
              disabled={uploading}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={describedBy}
              onChange={handleChange}
              className="cursor-pointer pt-2.5 file:mr-3 file:cursor-pointer file:font-extrabold file:text-sky"
            />
          </FormField>

          {uploadError ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-control border-2 border-danger/30 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-bold text-danger">
                Upload didn’t go through. {uploadError}
              </p>
              <Button
                variant="quiet"
                size="touch"
                onClick={handleUpload}
                disabled={uploading || !online}
                className="shrink-0"
              >
                <RotateCw aria-hidden="true" />
                Retry
              </Button>
            </div>
          ) : null}

          {selected && !online ? (
            <p id="avatar-offline" className="text-sm font-bold text-muted-foreground">
              You’re offline. Save your photo when you’re back online.
            </p>
          ) : null}

          {selected ? (
            <div className="flex flex-wrap gap-3">
              {/* While a failed upload is showing, Retry above is the action. */}
              {uploadError ? null : (
              <Button
                variant="sky"
                size="touch"
                onClick={handleUpload}
                disabled={uploading || !online}
                aria-busy={uploading || undefined}
                aria-describedby={online ? undefined : 'avatar-offline'}
              >
                {uploading ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Upload aria-hidden="true" />
                )}
                {uploading ? 'Uploading…' : 'Save photo'}
              </Button>
              )}
              <Button
                variant="quiet"
                size="touch"
                onClick={handleCancel}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
