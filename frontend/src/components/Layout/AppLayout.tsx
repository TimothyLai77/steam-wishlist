import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Sheet, SheetContent, SheetTrigger } from '../../../components/ui/sheet';
import { Button } from '../../../components/ui/button';
import { logout } from '../../features/auth/authSlice';
import { useGetWishlistsQuery } from '../../app/services/wishlistApi';
import {
  SteamLogoIcon,
  ListIcon,
  CaretLeftIcon,
  CaretRightIcon,
  HouseIcon,
  SignOutIcon,
} from '@phosphor-icons/react';
import { WishlistSection } from './WishlistSection';

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [collapsed, setCollapsed] = useState(false);
  const [wishlistsOpen, setWishlistsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { data: wishlists, isLoading: wishlistsLoading } = useGetWishlistsQuery();

  const currentWishlistId = location.pathname.match(/^\/wishlists\/([^/]+)/)?.[1];

  // Handle resize to switch between mobile/desktop sidebar modes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if a route is active
  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/wishlists') return location.pathname === '/wishlists';
    return false;
  };

  // Check if a wishlist item is active
  const isWishlistActive = (wishlistId: string) => currentWishlistId === wishlistId;

  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  // Close mobile sheet on navigation
  const handleNav = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Shared active link styling
  const activeLinkClass = 'bg-accent text-accent-foreground';
  const baseLinkClass = `flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${collapsed ? 'justify-center' : ''
    }`;


  // Sidebar content (reused for both desktop and mobile)
  const sidebarContent = (mobileMode = false) => (
    <div className="flex h-full flex-col gap-1">
      {/* Header: Branding + collapse toggle */}
      <div className="flex items-center gap-2 border-b px-3 py-3">
        {mobileMode ? (
          <div className="flex items-center gap-2">
            <SteamLogoIcon size={24} weight="fill" />
            <span className="font-semibold">Steam Wishlist</span>
          </div>
        ) : collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
          >
            <CaretRightIcon size={18} />
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1">
              <SteamLogoIcon size={24} weight="fill" />
              <span className="font-semibold truncate">Steam Wishlist</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
            >
              <CaretLeftIcon size={18} />
            </Button>
          </>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {/* Dashboard */}
        <button
          onClick={() => handleNav('/dashboard')}
          className={`${baseLinkClass} ${isActive('/dashboard') ? activeLinkClass : ''}`}
        >
          <HouseIcon size={18} weight={isActive('/dashboard') ? 'fill' : 'regular'} />
          {!collapsed && <span>Dashboard</span>}
        </button>

        {/* Wishlists Section */}
        <div className="mt-3">
          <WishlistSection
            collapsed={collapsed}
            mobileMode={mobileMode}
            wishlistsOpen={wishlistsOpen}
            setWishlistsOpen={setWishlistsOpen}
            wishlists={wishlists}
            wishlistsLoading={wishlistsLoading}
            activeLinkClass={activeLinkClass}
            isActive={isActive}
            isWishlistActive={isWishlistActive}
            handleNav={handleNav}
          />
        </div>
      </nav>

      {/* Bottom: Logout */}
      <div className="border-t px-2 py-2">
        <button
          onClick={handleLogout}
          className={baseLinkClass}
        >
          <SignOutIcon size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  // Mobile: Sidebar as Sheet
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Top bar with hamburger */}
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={
              <Button variant="ghost" size="icon">
                <ListIcon size={20} />
              </Button>
            } />
            <SheetContent side="left" className="w-[260px] p-0">
              {sidebarContent(true)}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <SteamLogoIcon size={20} weight="fill" />
            <span className="font-semibold">Steam Wishlist</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  // Desktop: Collapsible sidebar
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`flex h-screen flex-col border-r bg-background transition-all duration-200 ${collapsed ? 'w-[64px]' : 'w-[260px]'
          }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
