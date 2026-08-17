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
 * Sidebar trigger + dialog for managing the user's RSS feed link.
 *
 * The server only stores a hash of the token, so the link is shown exactly
 * once — the moment it is created. Nothing is persisted client-side: after
 * the dialog closes the link is gone, and creating a new one rotates the
 * token and invalidates any previous link. Both creation/rotation and
 * closing an un-copied link are therefore guarded by confirmations.
 *
 * @param props - Component props (see {@link RssSettingsDialogProps}).
 * @returns The trigger button, the feed dialog, and its confirm dialogs.
 */
const RssSettingsDialog = ({ collapsed, onOpen }: RssSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

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
   * Resets the dialog to its initial face for the next open.
   *
   * @returns Nothing.
   */
  const reset = () => {
    setFeedUrl(null);
    setHasCopied(false);
    setJustCreated(false);
    setCopied(false);
    setError(null);
  };

  /**
   * Handles the dialog's open state. Opens notify the parent (so the mobile
   * layout can close its sheet). Closes are intercepted when a link was
   * created but never copied — closing without copying makes it
   * unrecoverable.
   *
   * @param next - The next open state of the dialog.
   * @returns Nothing.
   */
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true);
      onOpen?.();
      return;
    }
    if (feedUrl && !hasCopied) {
      setCloseConfirmOpen(true);
      return;
    }
    setOpen(false);
    reset();
  };

  /**
   * Calls the token endpoint and shows the returned feed link.
   * The link is never persisted — the server keeps only a hash.
   *
   * @returns True when a new link was created, false on failure.
   */
  const handleGenerate = async (): Promise<boolean> => {
    try {
      const result = await generateToken().unwrap();
      setFeedUrl(result.feedUrl);
      setHasCopied(false);
      setJustCreated(true);
      setError(null);
      return true;
    } catch {
      setError("Couldn't create your link. Check your connection and try again.");
      return false;
    }
  };

  /**
   * Confirms creation/rotation from the confirm dialog. Closes the confirm
   * only on success so a failed request keeps it open for a retry.
   *
   * @returns Nothing.
   */
  const handleConfirmCreate = async () => {
    const ok = await handleGenerate();
    if (ok) setCreateConfirmOpen(false);
  };

  /**
   * Copies the feed link to the clipboard and flips the button to "Copied"
   * briefly. If the Clipboard API is unavailable (e.g. non-secure context),
   * the chip text remains manually selectable as a fallback.
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
    setHasCopied(true);
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

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}

          {feedUrl ? (
            <>
              {/* One-time "ticket" chip: the dashed accent border encodes that the link is single-use */}
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
                  onClick={() => setCreateConfirmOpen(true)}
                  disabled={isLoading}
                >
                  Regenerate link
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter>
              <Button onClick={() => setCreateConfirmOpen(true)} disabled={isLoading}>
                Create feed link
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Creation/rotation confirm — warns that an existing link would be invalidated */}
      <ConfirmDialog
        open={createConfirmOpen}
        onOpenChange={setCreateConfirmOpen}
        title="Create new link?"
        description="The new link is shown only once. If you already have a link in an RSS reader, it will stop working."
        confirmLabel="Create link"
        confirmVariant="destructive"
        cancelLabel="Cancel"
        onConfirm={() => void handleConfirmCreate()}
        isLoading={isLoading}
      />

      {/* Close guard — the created link would be unrecoverable */}
      <ConfirmDialog
        open={closeConfirmOpen}
        onOpenChange={setCloseConfirmOpen}
        title="Close without copying?"
        description="You haven't copied the link yet. If you close now, you won't be able to see it again."
        confirmLabel="Close anyway"
        confirmVariant="destructive"
        cancelLabel="Keep open"
        onConfirm={() => {
          setCloseConfirmOpen(false);
          setOpen(false);
          reset();
        }}
      />
    </>
  );
};

export default RssSettingsDialog;
