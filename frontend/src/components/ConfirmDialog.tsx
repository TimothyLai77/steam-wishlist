import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    description: React.ReactNode;
    confirmLabel?: string;
    confirmVariant?: 'default' | 'destructive';
    cancelLabel?: string;
    onConfirm: () => void;
    isLoading?: boolean;
}

export const ConfirmDialog = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    confirmVariant = 'default',
    cancelLabel = 'Cancel',
    onConfirm,
    isLoading = false,
}: ConfirmDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="pt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? '...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
