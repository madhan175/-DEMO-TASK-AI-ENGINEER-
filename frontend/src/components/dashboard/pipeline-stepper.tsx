"use client";

import { CheckCircle2, Circle, Loader2, Search, Cpu, Database, ShieldCheck, Wrench, Play, XCircle } from "lucide-react";

const STAGE_ICONS: Record<string, any> = {
    "Intent Extraction": Search,
    "Architecture Design": Cpu,
    "Database Generation": Database,
    "API Generation": Code,
    "UI Generation": Layout,
    "Validation": ShieldCheck,
    "Repair": Wrench,
    "Execution": Play,
};

import { Code, Layout } from "lucide-react";

interface PipelineStepperProps {
    stages?: any[];
}

export function PipelineStepper({ stages = [] }: PipelineStepperProps) {
    // If no stages provided, show empty state or default waiting stages
    const displayStages = stages.length > 0 ? stages.map((s, idx) => ({
        id: idx + 1,
        name: s.name,
        status: s.status === "success" ? "completed" : s.status === "running" ? "in-progress" : s.status === "failed" ? "failed" : "waiting",
        icon: STAGE_ICONS[s.name] || Search,
        time: s.duration ? `${s.duration.toFixed(1)}s` : undefined
    })) : [
        { id: 1, name: "Intent Extraction", icon: Search, status: "waiting", time: undefined },
        { id: 2, name: "Architecture Design", icon: Cpu, status: "waiting", time: undefined },
        { id: 3, name: "Database Generation", icon: Database, status: "waiting", time: undefined },
        { id: 4, name: "Validation", icon: ShieldCheck, status: "waiting", time: undefined },
        { id: 5, name: "Repair", icon: Wrench, status: "waiting", time: undefined },
        { id: 6, name: "Execution", icon: Play, status: "waiting", time: undefined },
    ];

    return (
        <div className="w-full py-8 px-4 overflow-x-auto">
            <div className="relative flex justify-between items-start min-w-[800px] max-w-5xl mx-auto">
                {/* Connecting Line */}
                <div className="absolute top-6 left-0 w-full h-[2px] bg-muted/30 -z-10" />

                {displayStages.map((stage, idx) => (
                    <div key={stage.name + idx} className="flex flex-col items-center group relative z-10 px-4">
                        {/* Stage Icon Circle */}
                        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${stage.status === 'completed' ? 'bg-success border-success text-white shadow-success/20' :
                            stage.status === 'in-progress' ? 'bg-white border-primary text-primary shadow-primary/20 scale-110' :
                                stage.status === 'failed' ? 'bg-destructive border-destructive text-white shadow-destructive/20' :
                                    'bg-muted/30 border-transparent text-muted-foreground'
                            }`}>
                            <stage.icon className={`w-5 h-5 ${stage.status === 'in-progress' ? 'animate-pulse' : ''}`} />

                            {/* Status Indicator Overlays */}
                            {stage.status === 'completed' && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                    <CheckCircle2 className="w-4 h-4 text-success fill-white" />
                                </div>
                            )}
                            {stage.status === 'failed' && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                    <XCircle className="w-4 h-4 text-destructive fill-white" />
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="mt-3 text-center">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter mb-0.5">
                                    {stage.id}
                                </span>
                                <span className={`text-[11px] font-bold whitespace-nowrap ${stage.status === 'waiting' ? 'text-muted-foreground' : 'text-foreground'
                                    }`}>
                                    {stage.name}
                                </span>
                            </div>

                            <div className="mt-1 h-4 flex items-center justify-center">
                                {stage.status === 'completed' && stage.time && (
                                    <span className="text-[10px] text-muted-foreground font-medium">{stage.time}</span>
                                ) || stage.status === 'completed' && (
                                    <span className="text-[10px] text-success font-bold">Done</span>
                                )}
                                {stage.status === 'in-progress' && (
                                    <div className="flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                        <span className="text-[10px] text-primary font-bold">Running</span>
                                    </div>
                                )}
                                {stage.status === 'failed' && (
                                    <span className="text-[10px] text-destructive font-bold uppercase">Failed</span>
                                )}
                                {stage.status === 'waiting' && (
                                    <span className="text-[10px] text-muted-foreground/40 italic">Waiting</span>
                                )}
                            </div>
                        </div>

                        {/* Progress Line Extension (Active Color) */}
                        {idx < displayStages.length - 1 && stage.status === 'completed' && (
                            <div className="absolute top-6 left-12 w-[calc(100%-24px)] h-[2px] bg-success -z-10" />
                        )}
                        {idx < displayStages.length - 1 && stage.status === 'in-progress' && (
                            <div className="absolute top-6 left-12 w-[calc(100%-24px)] h-[2px] bg-gradient-to-r from-primary to-muted/30 -z-10" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
