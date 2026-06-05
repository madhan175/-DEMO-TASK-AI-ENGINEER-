"use client";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart3,
    CheckCircle2,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    Activity,
    History
} from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="flex min-h-screen w-full bg-background overflow-hidden">
            <AppSidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger />
                        <h1 className="text-lg font-semibold tracking-tight">Analytics Dashboard</h1>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-primary/5 border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
                                <Zap className="w-4 h-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">128</div>
                                <p className="text-xs text-muted-foreground">+12% from last month</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-success/5 border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                                <CheckCircle2 className="w-4 h-4 text-success" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">94.2%</div>
                                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-warning/5 border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium">Avg. Repairs</CardTitle>
                                <TrendingUp className="w-4 h-4 text-warning" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">1.4</div>
                                <p className="text-xs text-muted-foreground">Repairs per config</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-info/5 border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
                                <Clock className="w-4 h-4 text-info" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">6.8s</div>
                                <p className="text-xs text-muted-foreground">Pipeline execution time</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="shadow-lg border-muted/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Validation Score History
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-64 flex items-center justify-center text-muted-foreground italic">
                                [Chart Placeholder: Validation Scores Over Time]
                            </CardContent>
                        </Card>
                        <Card className="shadow-lg border-muted/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <History className="w-4 h-4" />
                                    Failure Types
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-64 flex items-center justify-center text-muted-foreground italic">
                                [Chart Placeholder: Failure Type Distribution]
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
