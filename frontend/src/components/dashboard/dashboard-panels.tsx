"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, AlertCircle, Loader2, Sparkles, Wand2, XCircle } from "lucide-react";

export function ValidationScorePanel({ data, onFixAll }: { data?: any, onFixAll?: () => void }) {
    const score = data?.score ?? 0;
    const errors = data?.errors || [];
    const isValid = data?.is_valid ?? false;

    return (
        <Card className="rounded-3xl border border-border shadow-xl bg-card backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
            <CardHeader className="pb-0">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Validation Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="58"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-muted/10"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="58"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={364.4}
                                strokeDashoffset={364.4 * (1 - score / 100)}
                                className={`${score > 80 ? 'text-success' : score > 50 ? 'text-warning' : 'text-destructive'} transition-all duration-1000 ease-out`}
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-black tracking-tighter text-foreground">{score}</span>
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">/100</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                        <div className={`flex items-center gap-2 px-3 py-1 ${isValid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'} rounded-full`}>
                            {isValid ? <Sparkles className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span className="text-xs font-bold">{isValid ? 'Validated' : 'Issues Found'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5 max-h-[150px] overflow-auto pr-2 custom-scrollbar">
                    {errors.length > 0 ? (
                        errors.map((error: string, i: number) => (
                            <div key={i} className="flex items-start gap-2.5 group">
                                <AlertCircle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                                <span className="text-[11px] font-medium text-foreground/80 leading-tight">{error}</span>
                            </div>
                        ))
                    ) : (
                        ["Schema Consistency", "Relation Integrity", "Type Safety", "Auth Compliance"].map((item, i) => (
                            <div key={i} className="flex items-center justify-between group opacity-50">
                                <span className="text-[11px] font-medium text-foreground/80">{item}</span>
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            </div>
                        ))
                    )}
                </div>

                <Button
                    variant="outline"
                    className="w-full h-9 rounded-xl text-xs font-medium bg-muted/20 hover:bg-muted/40 border-none transition-all active:scale-95"
                    onClick={onFixAll}
                >
                    {errors.length > 0 ? 'Fix All Issues' : 'Detailed Report'}
                </Button>
            </CardContent>
        </Card>
    );
}

export function RepairSuggestionsPanel({ data }: { data?: any }) {
    const repairs = data?.repair_log || [];
    const message = data?.message;

    return (
        <Card className="rounded-3xl border border-border shadow-xl bg-card backdrop-blur-md overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
            <CardHeader className="pb-0">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Auto-Repair Engine</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                    <Badge className={`${repairs.length > 0 ? 'bg-primary/10 text-primary' : 'bg-muted/10 text-muted-foreground'} border-none px-2 py-0 h-5 text-[10px] font-bold uppercase`}>
                        {repairs.length} {repairs.length === 1 ? 'Repair Performed' : 'Repairs Performed'}
                    </Badge>
                </div>

                {repairs.length > 0 ? (
                    <div className="space-y-3 max-h-[200px] overflow-auto pr-2 custom-scrollbar">
                        {repairs.map((repair: any, i: number) => (
                            <div key={i} className="p-3 bg-primary/5 border border-primary/10 rounded-2xl space-y-2">
                                <p className="text-[10px] font-bold text-primary uppercase">Repair #{i + 1}</p>
                                <p className="text-[11px] font-medium text-foreground/80">{repair.repair_action}</p>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                                    <CheckCircle2 className="w-3 h-3 text-success" />
                                    <span>Applied successfully</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-muted/20 rounded-2xl">
                        <Wand2 className="w-8 h-8 text-muted/20 mx-auto mb-2" />
                        <p className="text-[11px] text-muted-foreground font-medium">{message || "No repairs needed yet."}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function ExecutionPreviewPanel({ data, onLaunch }: { data?: any, onLaunch?: () => void }) {
    const logs = data?.logs || [];
    const status = data?.status || 'pending';

    return (
        <Card className="rounded-3xl border-none shadow-xl bg-slate-950 text-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            <CardHeader className="pb-0">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Execution Log</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
                <div className="font-mono text-[10px] space-y-2 max-h-[150px] overflow-auto custom-scrollbar pr-2">
                    {logs.length > 0 ? (
                        logs.map((log: string, i: number) => (
                            <div key={i} className="flex gap-2 text-slate-400 group">
                                <span className="text-slate-600 shrink-0">$</span>
                                <span className={`transition-colors group-hover:text-slate-200 ${i === logs.length - 1 ? 'text-success font-bold' : ''}`}>
                                    {log}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-600 italic">Waiting for runtime logs...</div>
                    )}
                </div>

                <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {status === 'running' ? (
                            <>
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                <p className="text-[10px] font-bold text-primary animate-pulse uppercase tracking-wider">Executing...</p>
                            </>
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                <p className="text-[10px] font-bold text-success uppercase tracking-wider">Ready</p>
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-slate-700" />
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Idle</p>
                            </>
                        )}
                    </div>
                    {status === 'success' && (
                        <Button
                            size="xs"
                            className="h-7 rounded-lg bg-success hover:bg-success/90 text-white font-bold text-[10px] transition-all active:scale-95"
                            onClick={onLaunch}
                        >
                            Launch App
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
