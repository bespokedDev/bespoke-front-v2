"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { Topbar } from "@/components/ui/topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/login";
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = "Academia Bespoke | Admin";
  }, []);

  if (isPublicRoute) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen">
          <SidebarNav
            isMobileOpen={isMobileSidebarOpen}
            onMobileClose={() => setIsMobileSidebarOpen(false)}
          />
          <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
            <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
            <main className="flex-1 space-y-6 p-4 sm:p-6">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}

