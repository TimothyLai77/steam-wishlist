import { useState } from 'react';
import { useDeleteGameMutation } from '../../app/services/wishlistApi';
import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../../components/ui/dialog';
import { toast } from '../../../components/ui/toast';
import { TrashIcon } from '@phosphor-icons/react';

interface RemoveGameDialogProps {
    gameName: string;
    gameId: string;
    wishlistId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const RemoveGameDialog = ({ gameName, gameId, wishlistId, open, onOpenChange }: RemoveGameDialogProps) => {
    const [deleteGame, { isLoading }] = useDeleteGameMutation();

    const handleDelete = async () => {
        try {
            await deleteGame({ gameId, wishlistId }).unwrap();
            onOpenChange(false);
            toast.add({
                title: 'Game removed',
                description: `${gameName} was removed from your wishlist.`,
                type: 'success',
            });
        } catch {
            toast.add({
                title: 'Failed to remove game',
                description: 'Could not remove the game from your wishlist. Please try again.',
                type: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrashIcon size={20} weight="bold" className="text-red-500" />
                        Remove Game
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Are you sure you want to remove <strong>{gameName}</strong> from your wishlist? This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
