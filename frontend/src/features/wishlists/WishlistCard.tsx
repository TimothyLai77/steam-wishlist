import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
    DotsThreeVerticalIcon,
    ListIcon,
    PencilSimpleIcon,
    SteamLogoIcon,
    TrashIcon,
} from '@phosphor-icons/react';

interface WishlistCardProps {
    id: string;
    name: string;
    gameCount: number;
    /** Shows the Steam badge next to the name when true. */
    syncedFromSteam?: boolean;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    deleting: boolean;
}

export const WishlistCard = ({
    id,
    name,
    gameCount,
    syncedFromSteam = false,
    onRename,
    onDelete,
    deleting,
}: WishlistCardProps) => {
    const navigate = useNavigate();

    return (
        <Card
            className="group cursor-pointer hover:border-primary/50 hover:shadow-md transition-colors relative py-0"
            onClick={() => navigate(`/wishlists/${id}`)}
        >
            <DropdownMenu>
                <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground outline-none"
                >
                    <DotsThreeVerticalIcon size={18} weight="bold" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(id, name); }}>
                        <PencilSimpleIcon size={16} className="mr-2" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(id, name); }}
                        className="text-destructive focus:text-destructive"
                        disabled={deleting}
                    >
                        <TrashIcon size={16} className="mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CardContent className="pt-3 pb-3 px-4">
                {/* pr-8 keeps the name/badge clear of the hover dot menu (top-right, 32px wide) */}
                <div className="flex items-center gap-2 mb-1 pr-8">
                    <ListIcon size={18} weight="fill" className="text-primary -translate-y-0.75" />
                    <h2 className="text-lg font-semibold leading-none truncate">{name}</h2>
                    {syncedFromSteam && (
                        <span
                            title="Synced from Steam"
                            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                        >
                            <SteamLogoIcon size={12} weight="fill" />
                            Steam
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground text-left">
                    {gameCount === 1 ? '1 game' : `${gameCount} games`}
                </p>
            </CardContent>
        </Card>
    );
};
