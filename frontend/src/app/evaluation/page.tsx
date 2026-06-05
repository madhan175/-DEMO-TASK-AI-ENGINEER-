"use client";

import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Play, Bug, Clock, BarChart4 } from "lucide-react";

const evalResults = [
    { id: 1, prompt: "Build a CRM...", type: "Standard", success: true, score: 98, latency: "4.2s", repairs: 0 },
    { id: 2, prompt: "Create e-commerce...", type: "Standard", success: true, score: 95, latency: "5.1s", repairs: 1 },
    { id: 11, prompt: "Make an app.", type: "Edge Case", success: true, score: 88, latency: "3.2s", repairs: 2 },
    { id: 12, prompt: "CRM with no DB...", type: "Edge Case", success: false, score: 40, latency: "4.8s", repairs: 3 },
    // More results would be populated from the evaluation script output
];

export default function EvaluationsPage() {
    return (
        <div className="flex min-h-screen w-full bg-background overflow-hidden">
            <AppSidebar />
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-14 items-center justify-between border-b px-4 lg:px-6 shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger />
                        <h1 className="text-lg font-semibold tracking-tight">Evaluation Framework</h1>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Compiler Evaluation</h2>
                            <p className="text-muted-foreground">Automated testing across 20 prompts (10 Standard, 10 Edge cases).</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-semibold">Success Rate</span>
                                <span className="text-2xl font-black text-success">85%</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-semibold">Avg. Score</span>
                                <span className="text-2xl font-black text-primary">91.4</span>
                            </div>
                        </div>
                    </div>

                    <Card className="shadow-lg border-muted/50">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Prompt</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Val. Score</TableHead>
                                    <TableHead className="text-right">Repairs</TableHead>
                                    <TableHead className="text-right">Latency</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {evalResults.map((res) => (
                                    <TableRow key={res.id}>
                                        <TableCell className="font-mono text-xs">{res.id}</TableCell>
                                        <TableCell className="max-w-md truncate font-medium">{res.prompt}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={res.type === "Edge Case" ? "border-warning/50 text-warning" : ""}>
                                                {res.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {res.success ? (
                                                <div className="flex items-center gap-1.5 text-success font-medium text-xs">
                                                    <Play className="w-3.5 h-3.5 fill-success" />
                                                    SUCCESS
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-destructive font-medium text-xs">
                                                    <Bug className="w-3.5 h-3.5 fill-destructive" />
                                                    FAILURE
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{res.score}%</TableCell>
                                        <TableCell className="text-right">{res.repairs}</TableCell>
                                        <TableCell className="text-right text-muted-foreground">{res.latency}</TableCell>
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
