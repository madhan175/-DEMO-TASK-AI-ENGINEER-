"use client";

import Link from "next/link";
import {
    LayoutDashboard,
    Zap,
    FolderOpen,
    ClipboardCheck,
    BarChart3,
    Settings,
    Workflow,
    Search,
    Cpu,
    Database,
    ShieldCheck,
    Wrench,
    Play,
    Layout,
    Sun,
    Bell,
    User
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    SidebarRail,
} from "@/components/ui/sidebar";

const mainItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Generate App", icon: Zap, url: "/", active: true },
    { title: "Projects", icon: FolderOpen, url: "/projects" },
    { title: "Evaluation", icon: ClipboardCheck, url: "/evaluation" },
    { title: "Analytics", icon: BarChart3, url: "/analytics" },
    { title: "Templates", icon: Layout, url: "#" },
    { title: "Settings", icon: Settings, url: "#" },
];

import { PipelineStatus } from "@/types/app-config";

export function AppSidebar({ status }: { status?: PipelineStatus | null }) {
    const displayStages = status?.stages?.map(s => ({
        title: s.name,
        icon: s.name === "Validation" ? ShieldCheck :
            s.name === "Repair" ? Wrench :
                s.name === "Execution" ? Play : Search,
        status: s.status === "success" ? "completed" : s.status === "running" ? "in-progress" : "waiting"
    })) || [
            { title: "Intent Extraction", icon: Search, status: "waiting" },
            { title: "System Design", icon: Cpu, status: "waiting" },
            { title: "Schema Generation", icon: Database, status: "waiting" },
            { title: "Validation", icon: ShieldCheck, status: "waiting" },
            { title: "Repair", icon: Wrench, status: "waiting" },
            { title: "Execution", icon: Play, status: "waiting" },
        ];

    return (
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl">
            <SidebarHeader className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
                <div className="flex items-center gap-3 font-bold text-primary overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Workflow className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm tracking-tight group-data-[collapsible=icon]:hidden">AI App Compiler</span>
                </div>
            </SidebarHeader>
            <SidebarContent className="px-2 py-4">
                <SidebarGroup>
                    <SidebarMenu>
                        {mainItems.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    className={`h-10 px-4 rounded-xl transition-all duration-200 ${item.active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-sidebar-accent'}`}
                                    render={
                                        <Link href={item.url} className="flex items-center gap-3 w-full">
                                            <item.icon className={`w-4.5 h-4.5 ${item.active ? 'text-primary' : 'text-sidebar-foreground/70'}`} />
                                            <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                        </Link>
                                    }
                                />
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>

                <div className="mt-8 px-4 group-data-[collapsible=icon]:hidden">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40 mb-4 px-2">Pipeline Status</h3>
                    <div className="space-y-1">
                        {displayStages.map((item) => (
                            <div key={item.title} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors group">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-colors ${item.status === 'completed' ? 'bg-success/10 border-success/20 text-success' :
                                    item.status === 'in-progress' ? 'bg-primary/10 border-primary/20 text-primary' :
                                        'bg-muted/30 border-transparent text-muted-foreground'
                                    }`}>
                                    {item.status === 'completed' ? (
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                    ) : item.status === 'in-progress' ? (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    ) : (
                                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className={`text-xs truncate ${item.status === 'waiting' ? 'text-muted-foreground' : 'text-sidebar-foreground/80 font-medium'}`}>
                                        {item.title}
                                    </p>
                                    {item.status === 'in-progress' && (
                                        <p className="text-[10px] text-primary/70 animate-pulse">Running...</p>
                                    )}
                                </div>
                                {item.status === 'completed' && (
                                    <div className="w-1 h-1 rounded-full bg-success" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </SidebarContent>

            <div className="mt-auto p-4 group-data-[collapsible=icon]:hidden">
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Current Project</p>
                    <p className="text-xs font-bold text-sidebar-foreground">{status ? "Active Compilation" : "No Active Project"}</p>
                    <p className="text-[10px] text-muted-foreground mb-3">{status ? `Progress: ${status.progress}%` : "Ready to start"}</p>
                    <Button size="sm" variant="outline" className="w-full text-[10px] h-8 rounded-lg bg-background/50">
                        {status ? "View Logs →" : "New Project →"}
                    </Button>
                </div>
            </div>

            <SidebarRail />
        </Sidebar>
    );
}
