import {
  Calendar,
  LayoutDashboard,
  User,
  Search,
  Settings,
  Plus,
  Sun,
  Box,
  Contact,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AppSidebar() {
  const [userType, setUserType] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedType = localStorage.getItem("userType");
      setUserType(storedType || "");
    }
  }, []);

  const items = [
    ...(userType !== "Customer Service"
      ? [
          { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
          { title: "New Booking", url: "/awb/create", icon: Plus },
        ]
      : []),

    { title: "Show Bookings", url: "/awb", icon: Box },

    ...(userType === "admin" || userType === "branch"
      ? [
          { title: "Customers", url: "/customers", icon: Contact },
          { title: "Clients", url: "/clients", icon: User },
          { title: "Franchise", url: "/franchise", icon: User },
        ]
      : []),

    ...(userType === "franchise"
      ? [{ title: "Clients", url: "/clients", icon: User }]
      : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 text-center">
        <Sun />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="py-8">
                    <Link href={item.url} className="flex items-center space-x-2">
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
