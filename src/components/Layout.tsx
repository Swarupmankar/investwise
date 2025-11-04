import { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  FileText,
  Bell,
  Receipt,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/API/auth.api"; // adjust if needed

const sidebarItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/referrals", label: "Referrals", icon: Users },
  { path: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { path: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { path: "/transactions", label: "Transactions", icon: Receipt },
  { path: "/instructions", label: "Instructions", icon: FileText },
  { path: "/notifications", label: "Notifications", icon: Bell },
  { path: "/broadcasts", label: "Reports", icon: Megaphone },
  { path: "/support", label: "Support", icon: MessageSquare },
  { path: "/profile", label: "Profile", icon: Settings },
];

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch: any = useDispatch();
  const navigate = useNavigate();

  const auth = useSelector((state: any) => state.auth);
  const user = auth?.user ?? null;

  const displayName = useMemo(() => {
    if (!user) return "User";
    const { firstName, lastName, email } = user;
    if (firstName || lastName)
      return `${firstName ?? ""} ${lastName ?? ""}`.trim();
    return email || "User";
  }, [user]);

  const initials = useMemo(() => {
    if (!user) return "U";
    const { firstName, lastName, email } = user;
    if (firstName && lastName)
      return (firstName[0] + lastName[0]).toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return "U";
  }, [user]);

  const handleSignOut = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-dvh w-64 xl:w-72 z-50 transform transition-all duration-300 ease-out",
          "bg-gradient-to-b from-sidebar-bg to-sidebar-bg/95 backdrop-blur-xl border-r border-sidebar-muted/20 shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* FLEX column that fills the sidebar height */}
        <div className="h-full flex flex-col p-8">
          {/* Brand / Close */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-primary-foreground font-bold text-lg">
                    V
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-sidebar-bg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-sidebar-foreground tracking-tight">
                  VaultPro
                </h1>
                <p className="text-xs text-sidebar-foreground/60">
                  Investment Platform
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-muted/50 h-8 w-8 p-0"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Nav (scrollable but scrollbar HIDDEN) */}
          <nav
            className={cn(
              "space-y-2 flex-1 pr-1", // takes remaining height
              // hide scrollbar visually (still scrolls when needed)
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            )}
            style={{ overflowY: "auto", paddingBottom: "0.5rem" }}
          >
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center space-x-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-white shadow-lg shadow-sidebar-accent/20"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-muted/50 hover:text-sidebar-foreground"
                  )
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="tracking-wide">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer stuck to bottom (NO absolute) */}
          <div className="pt-4 mt-6">
            <div className="bg-sidebar-muted/30 backdrop-blur-sm rounded-xl p-4 mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {initials}
                  </span>
                </div>
                <div>
                  <p className="text-sidebar-foreground text-sm font-medium">
                    {displayName}
                  </p>
                  <p className="text-sidebar-foreground/60 text-xs">
                    Premium Member
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-muted/50 hover:text-sidebar-foreground rounded-xl"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 xl:ml-72">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="container mx-auto py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-sm font-semibold">VaultPro</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
          <div className="container mx-auto py-4 sm:py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
