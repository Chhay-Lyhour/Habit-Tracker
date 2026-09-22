import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Invite someone to the app.
 *
 * What is shared is deliberately generic: the app's public origin and a fixed
 * line of copy. Never the current URL (it can carry query strings), never a
 * habit name, a streak, an email or a token — the share sheet hands the text
 * to another app we do not control.
 *
 * Three tiers, best first:
 *   1. navigator.share — the native share sheet (phones, Safari, Edge).
 *   2. navigator.clipboard.writeText — "Link copied!" toast.
 *   3. A dialog with the link pre-selected in a read-only input, for browsers
 *      without either (or with the clipboard blocked).
 */
function shareData() {
  return {
    title: 'Habit Tracker',
    text: 'I’m building better habits one day at a time. Join me on Habit Tracker:',
    url: `${window.location.origin}/`,
  }
}

export function ShareButton() {
  const [fallbackOpen, setFallbackOpen] = useState(false)
  const data = shareData()

  async function handleShare() {
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data)
        return
      } catch (error) {
        // Closing the share sheet rejects with AbortError. That is the user
        // changing their mind, not a failure — say nothing.
        if (error?.name === 'AbortError') return
        // Anything else (e.g. NotAllowedError): fall through to the clipboard.
      }
    }

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(data.url)
        toast.success('Link copied!')
        return
      } catch {
        // Permission denied or unfocused document: fall through.
      }
    }

    setFallbackOpen(true)
  }

  return (
    <>
      <Button
        variant="quiet"
        size="touch-icon"
        onClick={handleShare}
        aria-label="Share Habit Tracker"
      >
        <Share2 aria-hidden="true" />
      </Button>

      <Dialog open={fallbackOpen} onOpenChange={setFallbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Habit Tracker</DialogTitle>
            <DialogDescription>
              Copy this link and send it to a friend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="share-link" className="text-sm font-bold">
              Link
            </Label>
            <Input
              id="share-link"
              readOnly
              value={data.url}
              autoFocus
              // Select all on focus/click so a long-press or Cmd+C copies it
              // in one go.
              onFocus={(event) => event.target.select()}
              onClick={(event) => event.target.select()}
            />
          </div>

          <DialogFooter>
            <Button
              variant="quiet"
              size="touch"
              onClick={() => setFallbackOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
