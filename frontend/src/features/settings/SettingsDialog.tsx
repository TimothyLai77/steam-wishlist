import { useState } from 'react';
import { GearIcon, SteamLogoIcon, SpinnerIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from '../../../components/ui/toast';
import { useGetProfileQuery, useUpdateProfileMutation } from '../../app/services/authApi';
import { useSyncFromSteamMutation } from '../../app/services/wishlistApi';

interface SettingsDialogProps {
  /** Whether the sidebar is collapsed (icon-only trigger). */
  collapsed: boolean;
  /** Called when the dialog opens (mobile layout closes the sheet). */
  onOpen?: () => void;
}

/** Maps the API `code` of a failed import to the user-facing message. */
const importErrorText = (code?: string): string => {
  switch (code) {
    case 'NO_STEAM_ID':
      return 'Save your Steam ID64 above, then import.';
    case 'INVALID_STEAM_ID':
      return 'Invalid Steam ID. Please check your 17-digit Steam ID64.';
    case 'WISHLIST_NOT_PUBLIC':
      return 'Your Steam wishlist must be set to Public to import it.';
    case 'STEAM_API_ERROR':
      return "Couldn't reach Steam right now. Please try again.";
    default:
      return 'Import failed. Please try again.';
  }
};

/**
 * Sidebar "Settings" dialog: save/clear the user's Steam ID64 and import
 * their public Steam wishlist into the app.
 *
 * @param props - See {@link SettingsDialogProps}.
 * @returns The settings trigger button and dialog.
 */
const SettingsDialog = ({ collapsed, onOpen }: SettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const { data: profile, isFetching: profileFetching } = useGetProfileQuery();
  const [updateProfile] = useUpdateProfileMutation();
  const [syncFromSteam, { isLoading: importing }] = useSyncFromSteamMutation();

  // Prefill the input from the saved profile each time the dialog opens.
  // (The profile loads with the app layout, so it is ready by the time of a click.)
  const handleOpen = () => {
    setInput(profile?.user.steamId ?? '');
    setOpen(true);
    onOpen?.();
  };

  /**
   * Saves the Steam ID from the input, or clears it when the input is empty.
   *
   * @returns Nothing.
   */
  const handleSave = async () => {
    const steamId = input.trim();
    try {
      await updateProfile({ steamId: steamId === '' ? null : steamId }).unwrap();
      setImportError(null);
      toast.add({
        title: steamId === '' ? 'Steam ID cleared' : 'Settings saved',
        description: steamId === '' ? 'Your Steam ID64 was removed.' : undefined,
        type: steamId === '' ? 'destructive' : 'success',
      });
    } catch (e) {
      const code = (e as { data?: { code?: string } }).data?.code;
      setImportError(importErrorText(code));
      toast.add({ title: 'Failed to save settings', type: 'error' });
    }
  };

  /**
   * Imports the user's public Steam wishlist.
   *
   * @returns Nothing.
   */
  const handleImport = async () => {
    try {
      const result = await syncFromSteam().unwrap();
      setImportError(null);
      toast.add({
        title: 'Imported from Steam',
        description: `${result.imported} games added to "Synced from Steam".`,
        type: 'success',
      });
    } catch (e) {
      const code = (e as { data?: { code?: string } }).data?.code;
      setImportError(importErrorText(code));
      toast.add({ title: 'Import failed', description: importErrorText(code), type: 'error' });
    }
  };

  return (
    <>
      {/* Sidebar trigger (matches the RSS Feed button styling) */}
      <button
        type="button"
        onClick={handleOpen}
        title={collapsed ? 'Settings' : undefined}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${collapsed ? 'justify-center' : ''}`}
      >
        <GearIcon size={18} />
        {!collapsed && <span>Settings</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Your Steam connection. Importing creates a "Synced from Steam" wishlist
              that updates daily.
            </DialogDescription>
          </DialogHeader>

          {/* Steam ID64 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="steam-id">Steam ID64</Label>
            <Input
              id="steam-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 76561198000000000"
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Your 17-digit Steam ID. Used for importing your public Steam wishlist.
            </p>
            <DialogFooter className="mt-1 h-auto">
              <Button variant="outline" size="sm" onClick={() => void handleSave()} disabled={profileFetching}>
                Save
              </Button>
            </DialogFooter>
          </div>

          {/* Import from Steam */}
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            <Button size="sm" className="w-fit" onClick={() => void handleImport()} disabled={importing}>
              {importing ? <SpinnerIcon size={16} className="animate-spin" /> : <SteamLogoIcon size={16} weight="fill" />}
              <span className="ml-2">Import from Steam</span>
            </Button>
            {importError && (
              <p role="alert" className="text-xs text-destructive">
                {importError}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SettingsDialog;
