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
    TrashIcon,
} from '@phosphor-icons/react';

interface WishlistCardProps {
    id: string;
    name: string;
    gameCount: number;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    deleting: boolean;
}

export const WishlistCard = ({
    id,
    name,
    gameCount,
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
                    <DropdownMenuItem onClick={() => onRename(id, name)}>
                        <PencilSimpleIcon size={16} className="mr-2" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onDelete(id, name)}
                        className="text-destructive focus:text-destructive"
                        disabled={deleting}
                    >
                        <TrashIcon size={16} className="mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                    <ListIcon size={18} weight="fill" className="text-primary -translate-y-0.75" />
                    <h2 className="text-lg font-semibold leading-none truncate">{name}</h2>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                    {gameCount === 1 ? '1 game' : `${gameCount} games`}
                </p>
            </CardContent>
        </Card>
    );
};
