"use client";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, Search } from "lucide-react";

const projects = [
    { id: "e82b...", name: "CRM Pro", prompt: "Build a CRM with login...", date: "2024-06-04", status: "Success" },
    { id: "a41f...", name: "Shopify Clone", prompt: "Create an e-commerce...", date: "2024-06-03", status: "Success" },
    { id: "f92d...", name: "Vague App", prompt: "Make an app", date: "2024-06-02", status: "Success (Assumed)" },
];

export default function ProjectsPage() {
    return (
        <div className="flex min-h-screen w-full bg-background overflow-hidden">
            <AppSidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger />
                        <h1 className="text-lg font-semibold tracking-tight">Project History</h1>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight">Recent Generations</h2>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                className="pl-9 h-9 w-[250px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </div>

                    <Card className="shadow-lg border-muted/50 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project Name</TableHead>
                                    <TableHead>Original Prompt</TableHead>
                                    <TableHead>Generated Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map((proj) => (
                                    <TableRow key={proj.id}>
                                        <TableCell className="font-bold">{proj.name}</TableCell>
                                        <TableCell className="max-w-md truncate text-muted-foreground">{proj.prompt}</TableCell>
                                        <TableCell>{proj.date}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20 border-none">
                                                {proj.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </main>
        </div>
    );
}
