import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePostGameMutation } from '../../app/services/wishlistApi';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '../../../components/ui/card';
import { toast } from '../../../components/ui/toast';
import { ArrowLeftIcon } from '@phosphor-icons/react';

const STEAM_URL_REGEX = /app\/(\d+)/;

const AddGamePage = () => {
    const { id: wishlistId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');
    const [postGame, { isLoading }] = usePostGameMutation();

    const extractAppId = (value: string): string | null => {
        const trimmed = value.trim();

        // Try matching Steam URL format first
        const urlMatch = trimmed.match(STEAM_URL_REGEX);
        if (urlMatch && urlMatch[1]) {
            return urlMatch[1];
        }

        // Try parsing as plain number
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
            navigate(`/wishlists/${wishlistId}`);
        } catch {
            toast.add({
                title: 'Failed to add game',
                description: 'Could not add the game to your wishlist. Please check the AppID or URL.',
                type: 'destructive',
            });
        }
    };

    if (!wishlistId) {
        return <div>Invalid wishlist.</div>;
    }

    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Add Game to Wishlist</CardTitle>
                    <CardDescription>
                        Enter a Steam AppID or store URL to add a game
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="steam-input">Steam AppID or URL</Label>
                            <Input
                                id="steam-input"
                                type="text"
                                placeholder='e.g. 123456 or https://store.steampowered.com/app/123456'
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Adding...' : 'Add'}
                            </Button>
                            <Link to={`/wishlists/${wishlistId}`}>
                                <Button type="button" variant="outline">
                                    <ArrowLeftIcon /> Back
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AddGamePage;
