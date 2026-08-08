import { useState } from 'react';
import {
    useGetWishlistsQuery,
    useMoveGameMutation,
} from '../../app/services/wishlistApi';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { toast } from '../../../components/ui/toast';
import { ArrowRightIcon } from '@phosphor-icons/react';

interface MoveGameDialogProps {
    gameId: string;
    gameName: string;
    sourceWishlistId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const MoveGameDialog: React.FC<MoveGameDialogProps> = ({
    gameId,
    gameName,
    sourceWishlistId,
    open,
    onOpenChange,
}) => {
    const { data: wishlists } = useGetWishlistsQuery();
    const [moveGame, { isLoading }] = useMoveGameMutation();
    const [targetWishlistId, setTargetWishlistId] = useState('');

    const availableWishlists = wishlists?.filter(
        (w) => w.id !== sourceWishlistId
    ) ?? [];

    const handleSubmit = async () => {
        if (!targetWishlistId) {
            toast.add({
                title: 'Select a wishlist',
                description: 'Please choose a target wishlist.',
            });
            return;
        }

        try {
            const result = await moveGame({ gameId, targetWishlistId }).unwrap();

            onOpenChange(false);

            if (result.moved) {
                toast.add({
                    title: 'Game moved',
                    description: `"${gameName}" has been moved.`,
                });
            } else {
                toast.add({
                    title: 'Game already exists',
                    description: `"${gameName}" already exists in the target wishlist and was removed from the current wishlist.`,
                });
            }
        } catch (error: any) {
            const message =
                error?.data?.message || error?.message || 'Failed to move game';
            toast.add({
                title: 'Failed to move game',
                description: message,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move Game</DialogTitle>
                    <DialogDescription>
                        Move "{gameName}" to a different wishlist.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="targetWishlist">Target Wishlist</Label>
                        <select
                            id="targetWishlist"
                            value={targetWishlistId}
                            onChange={(e) => setTargetWishlistId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="">Select a wishlist...</option>
                            {availableWishlists.map((wishlist) => (
                                <option key={wishlist.id} value={wishlist.id}>
                                    {wishlist.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!targetWishlistId || isLoading}
                    >
                        <ArrowRightIcon size={16} className="mr-1" />
                        Move
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
