import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePostGameMutation } from '../../app/services/wishlistApi';
import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from '../../../components/ui/toast';

const STEAM_URL_REGEX = /app\/(\d+)/;

interface AddGameDialogProps {
    wishlistId: string;
    triggerNode: React.ReactNode;
}

export const AddGameDialog = ({ wishlistId, triggerNode }: AddGameDialogProps) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [postGame, { isLoading }] = usePostGameMutation();

    const extractAppId = (value: string): string | null => {
        const trimmed = value.trim();

        const urlMatch = trimmed.match(STEAM_URL_REGEX);
        if (urlMatch && urlMatch[1]) {
            return urlMatch[1];
        }

        const num = Number(trimmed);
        if (!isNaN(num) && num > 0 && String(num) === trimmed) {
            return trimmed;
        }

        return null;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!wishlistId) {
            toast.add({
                title: 'Error',
                description: 'Invalid wishlist.',
                type: 'destructive',
            });
            return;
        }

        const appId = extractAppId(inputValue);
        if (!appId) {
            toast.add({
                title: 'Invalid input',
                description: 'Please enter a valid Steam AppID or store URL.',
                type: 'destructive',
            });
            return;
        }

        try {
            await postGame({ wishlistId, steamId: appId }).unwrap();
            setInputValue('');
            setOpen(false);
            toast.add({
                title: 'Game added',
                description: 'The game was added to your wishlist.',
                type: 'success',
            });
        } catch {
            toast.add({
                title: 'Failed to add game',
                description: 'Could not add the game to your wishlist. Please check the AppID or URL.',
                type: 'destructive',
            });
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setInputValue('');
        }
        setOpen(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{triggerNode}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Game</DialogTitle>
                    <DialogDescription>
                        Enter a Steam AppID or store URL
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="steam-input">Steam AppID or URL</Label>
                            <Input
                                id="steam-input"
                                type="text"
                                placeholder='e.g. 123456 or https://store.steampowered.com/app/123456'
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
