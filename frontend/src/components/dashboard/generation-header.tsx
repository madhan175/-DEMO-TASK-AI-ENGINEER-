"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Bell, User, Plus, Workflow, Layers } from "lucide-react";

export function GenerationHeader() {
    return (
        <div className="flex items-center justify-between px-8 py-4 border-b bg-background/50 backdrop-blur-md sticky top-0 z-20">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Workflow className="w-3 h-3" />
                    <span>Projects</span>
                    <span>/</span>
                    <span className="text-foreground">Generate New Application</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Generate New Application</h1>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                    <p>Transform your idea into a production-ready application</p>
                    <div className="flex gap-2">
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex gap-1.5 items-center py-0 h-6">
                            <Workflow className="w-3 h-3" />
                            Compiler Mode
                        </Badge>
                        <Badge variant="outline" className="bg-primary-light text-primary border-primary/20 flex gap-1.5 items-center py-0 h-6">
                            <Layers className="w-3 h-3" />
                            Multi-AI Pipeline
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="default" className="rounded-xl px-5 h-10">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                </Button>
                <div className="flex items-center gap-1 ml-4 border-l pl-4">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full">
                        <Sun className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 rounded-full relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-4 h-4 bg-danger text-white text-[10px] flex items-center justify-center rounded-full border-2 border-background">3</span>
                    </Button>
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm ml-2 cursor-pointer shadow-md shadow-primary/25">
                        A
                    </div>
                </div>
            </div>
        </div>
    );
}
