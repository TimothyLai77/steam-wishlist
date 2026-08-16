import { useEffect, useRef, useState } from 'react';
import { CheckIcon, RssIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useGenerateTokenMutation } from '../../app/services/rssApi';

/**
 * localStorage key for the last generated feed URL. The server only keeps
 * a SHA-256 hash of the token, so the UI is the only place that can show
 * the URL again.
 */
const RSS_FEED_URL_KEY = 'rssFeedUrl';

/** How long the copy button shows "Copied" before reverting to "Copy". */
const COPIED_FEEDBACK_MS = 1500;

interface RssSettingsDialogProps {
  /** Whether the sidebar is collapsed (icon-only trigger with tooltip). */
  collapsed: boolean;
  /**
   * Called when the dialog opens. Used by the mobile layout to close the
   * sheet the trigger lives in.
   */
  onOpen?: () => void;
}

/**
 * Sidebar trigger + dialog for managing the user's RSS feed URL.
 *
 * State A (no stored URL) shows a single "Create feed URL" action.
 * State B shows the URL in a one-time "ticket" chip (dashed accent border,
 * code surface, mono type) with Copy and Regenerate actions. The last
 * generated URL is persisted in localStorage because the server can never
 * show it again.
 *
 * @param props - Component props (see {@link RssSettingsDialogProps}).
 * @returns The trigger button, the feed dialog, and the regenerate confirm.
 */
const RssSettingsDialog = ({ collapsed, onOpen }: RssSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(() =>
    localStorage.getItem(RSS_FEED_URL_KEY),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generateToken, { isLoading }] = useGenerateTokenMutation();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending "Copied" revert when the component unmounts.
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  /**
   * Handles the dialog's open state: notifies the parent on open (so the
   * mobile layout can close its sheet) and resets the one-time reveal flag
   * on close.
   *
   * @param next - The next open state of the dialog.
   * @returns Nothing.
   */
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      onOpen?.();
    } else {
      setJustCreated(false);
    }
  };

  /**
   * Calls the token endpoint and stores the returned feed URL locally.
   *
   * @returns True when a new URL was created, false on failure.
   */
  const handleGenerate = async (): Promise<boolean> => {
    try {
      const result = await generateToken().unwrap();
      setFeedUrl(result.feedUrl);
      localStorage.setItem(RSS_FEED_URL_KEY, result.feedUrl);
      setJustCreated(true);
      setError(null);
      return true;
    } catch {
      setError("Couldn't create your link. Check your connection and try again.");
      return false;
    }
  };

  /**
   * Confirms a token rotation from the ConfirmDialog. Closes the confirm
   * only on success so a failed request keeps it open for a retry.
   *
   * @returns Nothing.
   */
  const handleConfirmRegenerate = async () => {
    const ok = await handleGenerate();
    if (ok) setConfirmOpen(false);
  };

  /**
   * Copies the feed URL to the clipboard and flips the button to "Copied"
   * briefly. If the Clipboard API is unavailable (e.g. non-secure
   * context), the chip text remains manually selectable as a fallback.
   *
   * @returns Nothing.
   */
  const handleCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
    } catch {
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <>
      {/* Sidebar trigger (matches the other sidebar link styling) */}
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        title={collapsed ? 'RSS Feed' : undefined}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${collapsed ? 'justify-center' : ''}`}
      >
        <RssIcon size={18} />
        {!collapsed && <span>RSS Feed</span>}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>RSS Feed</DialogTitle>
            <DialogDescription>
              {feedUrl
                ? "Paste this link into your RSS reader. You won't be able to see it again."
                : 'Get price drops from all your wishlists in your RSS reader. Your link is private and is shown only once.'}
            </DialogDescription>
          </DialogHeader>

          {feedUrl ? (
            <>
              {/* One-time "ticket" chip: the dashed accent border encodes that the URL is single-use */}
              <div
                className={`rounded border border-dashed border-[var(--accent-border)] bg-[var(--code-bg)] p-3 ${
                  justCreated ? 'animate-in fade-in-0 duration-150 motion-reduce:animate-none' : ''
                }`}
              >
                <div className="mb-1 flex justify-end">
                  <span className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">
                    shown once
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <textarea
                    readOnly
                    tabIndex={-1}
                    spellCheck={false}
                    rows={2}
                    value={feedUrl}
                    aria-label="RSS feed URL"
                    className="min-w-0 flex-1 resize-none break-all bg-transparent font-heading text-xs leading-relaxed text-foreground outline-none field-sizing-content"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCopy()}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckIcon size={14} weight="bold" />
                        <span role="status">Copied</span>
                      </>
                    ) : (
                      'Copy'
                    )}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isLoading}
                >
                  Regenerate link
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button onClick={() => void handleGenerate()} disabled={isLoading}>
                  {isLoading ? 'Creating…' : 'Create feed URL'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Regenerate link?"
        description="Your current link will stop working. Readers using it won't get updates until you add the new one."
        confirmLabel="Regenerate"
        confirmVariant="destructive"
        cancelLabel="Keep current link"
        onConfirm={() => void handleConfirmRegenerate()}
        isLoading={isLoading}
      />
    </>
  );
};

export default RssSettingsDialog;
