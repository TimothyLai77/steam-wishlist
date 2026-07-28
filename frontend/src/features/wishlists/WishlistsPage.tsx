import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetWishlistsQuery,
  usePostWishlistMutation,
  usePutWishlistMutation,
  useDeleteWishlistMutation,
} from '../../app/services/wishlistApi';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { PlusIcon, DotsThreeVerticalIcon, ListIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { toast } from '../../../components/ui/toast';

const WishlistsPage = () => {
  const navigate = useNavigate();
  const { data: wishlists = [], isLoading } = useGetWishlistsQuery();
  const [createWishlist, { isLoading: creating }] = usePostWishlistMutation();
  const [updateWishlist, { isLoading: updating }] = usePutWishlistMutation();
  const [deleteWishlist, { isLoading: deleting }] = useDeleteWishlistMutation();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState('');

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      await createWishlist({ name: createName.trim() }).unwrap();
      setCreateDialogOpen(false);
      setCreateName('');
      toast.add({
        title: 'Wishlist created',
        description: `"${createName.trim()}" has been created.`,
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Failed to create wishlist',
        type: 'error',
      });
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCreate();
  };

  const openRenameDialog = (id: string, currentName: string) => {
    setRenameId(id);
    setRenameName(currentName);
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!renameId || !renameName.trim()) return;
    try {
      await updateWishlist({ id: renameId, payload: { name: renameName.trim() } }).unwrap();
      setRenameDialogOpen(false);
      setRenameId(null);
      setRenameName('');
      toast.add({
        title: 'Wishlist renamed',
        description: `"${renameName.trim()}" has been updated.`,
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Failed to rename wishlist',
        type: 'error',
      });
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRename();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? All games in this wishlist will be permanently removed.`)) return;
    try {
      await deleteWishlist(id).unwrap();
      toast.add({
        title: 'Wishlist deleted',
        description: `"${name}" and its games have been removed.`,
        type: 'success',
      });
    } catch {
      toast.add({
        title: 'Failed to delete wishlist',
        type: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading wishlists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">All Wishlists</h1>

        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon size={18} weight="bold" className="mr-2" />
          New Wishlist
        </Button>
      </div>

      {/* Grid */}
      {wishlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListIcon size={48} weight="light" className="text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">No wishlists yet</p>
          <p className="text-muted-foreground mt-1 max-w-xs">
            Create your first wishlist to start tracking games.
          </p>
          <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon size={18} weight="bold" className="mr-2" />
            Create Wishlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlists.map((wishlist: { id: string; name: string; gameCount: number }) => (
            <Card
              key={wishlist.id}
              className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-colors relative"
              onClick={() => navigate(`/wishlists/${wishlist.id}`)}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <DotsThreeVerticalIcon size={18} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openRenameDialog(wishlist.id, wishlist.name)}
                  >
                    <PencilSimpleIcon size={16} className="mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(wishlist.id, wishlist.name)}
                    className="text-destructive focus:text-destructive"
                    disabled={deleting}
                  >
                    <TrashIcon size={16} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <CardContent className="pt-6 pb-6 pr-12">
                <div className="flex items-center gap-2 mb-1">
                  <ListIcon size={18} weight="fill" className="text-primary" />
                  <h2 className="text-lg font-semibold truncate">{wishlist.name}</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {wishlist.gameCount === 1 ? '1 game' : `${wishlist.gameCount} games`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
                placeholder="e.g., Must Haves"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim() || creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Wishlist</DialogTitle>
            <DialogDescription>
              Update the name of your wishlist.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameName.trim() || updating}>
              {updating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WishlistsPage;
