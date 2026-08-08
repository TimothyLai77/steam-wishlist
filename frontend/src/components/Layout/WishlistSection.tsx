import { type Wishlist } from '../../app/services/wishlistApi';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Button } from '../../../components/ui/button';
import { ListIcon, CaretDownIcon } from '@phosphor-icons/react';

interface WishlistSectionProps {
  collapsed: boolean;
  mobileMode: boolean;
  wishlistsOpen: boolean;
  setWishlistsOpen: (open: boolean) => void;
  wishlists: Wishlist[] | undefined;
  wishlistsLoading: boolean;
  activeLinkClass: string;
  isActive: (path: string) => boolean;
  isWishlistActive: (id: string) => boolean;
  handleNav: (path: string) => void;
}

export const WishlistSection = ({
  collapsed,
  mobileMode,
  wishlistsOpen,
  setWishlistsOpen,
  wishlists,
  wishlistsLoading,
  activeLinkClass,
  isActive,
  isWishlistActive,
  handleNav,
}: WishlistSectionProps) => {
  return (
    <div className="mb-1">
      {collapsed && !mobileMode ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button
              variant="ghost"
              size="icon"
              className="mx-auto h-9 w-9"
              title="Wishlists"
            >
              <ListIcon size={18} />
            </Button>
          } />
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuItem
              onClick={() => handleNav('/wishlists')}
              className="font-semibold"
            >
              <ListIcon size={14} weight="fill" className="mr-2" />
              All Wishlists
            </DropdownMenuItem>
            {wishlistsLoading && (
              <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
            )}
            {!wishlistsLoading && wishlists?.length === 0 && (
              <DropdownMenuItem disabled>No wishlists yet</DropdownMenuItem>
            )}
            {!wishlistsLoading && wishlists && wishlists.length > 0 && <div className="my-1 h-px bg-border" />}
            {!wishlistsLoading &&
              wishlists?.map((wishlist: Wishlist) => (
                <DropdownMenuItem
                  key={wishlist.id}
                  onClick={() => handleNav(`/wishlists/${wishlist.id}`)}
                  className={`flex items-center justify-between ${isWishlistActive(wishlist.id) ? activeLinkClass : ''
                    }`}
                >
                  <span className="ml-2 truncate">{wishlist.name}</span>
                  <span className="mr-2 text-[10px] text-muted-foreground">
                    {wishlist.gameCount ?? 0}
                  </span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Collapsible open={wishlistsOpen} onOpenChange={setWishlistsOpen}>
          <div
            onClick={() => handleNav('/wishlists')}
            className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${isActive('/wishlists') ? activeLinkClass : ''
              }`}
          >
            <div className="flex flex-1 items-center gap-2.5">
              <ListIcon size={18} weight={isActive('/wishlists') ? 'fill' : 'regular'} />
              {!collapsed && <span>Wishlists</span>}
            </div>
            {!collapsed && (
              <CollapsibleTrigger render={
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="p-0.5 rounded"
                >
                  <CaretDownIcon
                    size={14}
                    className={`transition-transform ${wishlistsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              } />
            )}
          </div>
          <CollapsibleContent>
            {/* Wishlist Items */}
            {wishlistsLoading ? (
              <div className="ml-6 px-3 py-1.5 text-xs text-muted-foreground">Loading...</div>
            ) : wishlists?.length === 0 ? (
              <div className="ml-6 px-3 py-1.5 text-xs text-muted-foreground">No wishlists yet</div>
            ) : (
              wishlists?.map((wishlist: Wishlist) => (
                <button
                  key={wishlist.id}
                  onClick={() => handleNav(`/wishlists/${wishlist.id}`)}
                  className={`ml-6 flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground ${isWishlistActive(wishlist.id) ? activeLinkClass : ''
                    }`}
                >
                  <ListIcon size={12} weight={isWishlistActive(wishlist.id) ? 'fill' : 'regular'} />
                  <span className="truncate">{wishlist.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {wishlist.gameCount ?? 0}
                  </span>
                </button>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
