import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface CreateWishlistDialogProps {
  triggerNode: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  creating: boolean;
}

export const CreateWishlistDialog = ({
  triggerNode,
  open,
  onOpenChange,
  value,
  onChange,
  onCreate,
  onKeyDown,
  creating,
}: CreateWishlistDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerNode}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Wishlist</DialogTitle>
          <DialogDescription>
            Give your wishlist a name to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="wishlist-name">Name</Label>
            <Input
              id="wishlist-name"
              placeholder="e.g., Holiday Shopping List"
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!value.trim() || creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
