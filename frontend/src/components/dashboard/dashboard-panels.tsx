"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronRight, AlertCircle, Loader2, Sparkles, Wand2, XCircle, Copy, Download, FileJson, Shield, KeyRound, Lock } from "lucide-react";
import { AppConfig, AuthRole } from "@/types/app-config";

const inputClass = "h-9 text-[11px] font-medium bg-muted/20 border-muted/30 read-only:cursor-default read-only:opacity-100";
const labelClass = "text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-1.5 block";

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

function AuthFormField({
    label,
    value,
    placeholder,
    readOnly = true,
    mono = false,
}: {
    label: string;
    value?: string;
    placeholder?: string;
    readOnly?: boolean;
    mono?: boolean;
}) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <Input
                readOnly={readOnly}
                value={value ?? ""}
                placeholder={placeholder}
                className={`${inputClass} ${mono ? "font-mono" : ""}`}
            />
        </div>
    );
}

export function AuthRolesPanel({
    roles = [],
    matrix = {},
    isGenerating = false,
    isIdle = false,
}: {
    roles?: AuthRole[];
    matrix?: Record<string, string[]>;
    isGenerating?: boolean;
    isIdle?: boolean;
}) {
    const hasRoles = roles.length > 0;
    const matrixEntries = Object.entries(matrix ?? {}).filter(([, perms]) => perms?.length > 0);
    const hasMatrix = matrixEntries.length > 0;

    if (isIdle) {
        return (
            <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="border-b border-muted/20 bg-muted/10">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        Authentication & Role Configuration
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                        Generated roles and permissions will appear here as form fields.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6 opacity-50">
                    <AuthFormField label="Role Name" placeholder="e.g. Admin" readOnly />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AuthFormField label="Action" placeholder="e.g. read" readOnly />
                        <AuthFormField label="Resource" placeholder="e.g. contacts" readOnly />
                    </div>
                    <AuthFormField label="Access Matrix (Role → Actions)" placeholder="Admin: read, write, delete" readOnly />
                </CardContent>
            </Card>
        );
    }

    if (isGenerating && !hasRoles) {
        return (
            <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="border-b border-muted/20 bg-muted/10">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        Authentication & Role Configuration
                    </CardTitle>
                    <CardDescription className="text-[11px]">Generating auth model...</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="h-9 bg-muted/30 rounded-lg animate-pulse" />
                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-9 bg-muted/30 rounded-lg animate-pulse" />
                        <div className="h-9 bg-muted/30 rounded-lg animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const matrixRows = hasMatrix
        ? matrixEntries
        : roles.map((role) => [
              role.name,
              (role.permissions ?? []).map((p) => `${p.action}:${p.resource}`),
          ] as [string, string[]]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="border-b border-muted/20 bg-muted/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Authentication & Role Configuration
                            </CardTitle>
                            <CardDescription className="text-[11px] mt-1">
                                Role-based access control generated from your prompt
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-bold">
                            {roles.length} {roles.length === 1 ? "Role" : "Roles"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    {roles.map((role, i) => (
                        <div key={i} className="space-y-4 pb-8 border-b border-muted/20 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2">
                                <KeyRound className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                    Role {i + 1}
                                </span>
                            </div>

                            <AuthFormField label="Role Name" value={role.name} />

                            <div className="space-y-3">
                                <label className={labelClass}>Permissions</label>
                                {(role.permissions ?? []).length > 0 ? (
                                    <div className="space-y-3">
                                        {(role.permissions ?? []).map((perm, j) => (
                                            <div
                                                key={j}
                                                className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/10 border border-muted/20"
                                            >
                                                <AuthFormField label="Action" value={perm.action} />
                                                <AuthFormField label="Resource" value={perm.resource} mono />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Input
                                        readOnly
                                        value=""
                                        placeholder="No permissions defined"
                                        className={inputClass}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="border-b border-muted/20 bg-muted/10 py-4">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-primary">
                        Access Matrix
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                        {hasMatrix ? "Role-to-action mapping" : "Derived from role permissions above"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    {matrixRows.map(([roleName, permissions], i) => (
                        <div key={i} className="space-y-3 p-4 rounded-2xl bg-muted/10 border border-muted/20">
                            <AuthFormField label="Role" value={roleName} />
                            <div>
                                <label className={labelClass}>Allowed Actions</label>
                                <Textarea
                                    readOnly
                                    value={permissions.join(", ")}
                                    className="min-h-[72px] text-[11px] font-mono bg-muted/20 border-muted/30 resize-none read-only:cursor-default"
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

export function JsonOutputPanel({
    config,
    isGenerating,
    isIdle,
}: {
    config: AppConfig | null;
    isGenerating: boolean;
    isIdle: boolean;
}) {
    const jsonText = config ? JSON.stringify(config, null, 2) : "";

    const handleCopy = async () => {
        if (!jsonText) return;
        await navigator.clipboard.writeText(jsonText);
    };

    const handleDownload = () => {
        if (!jsonText || !config) return;
        const blob = new Blob([jsonText], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${config.project_name?.replace(/\s+/g, "-").toLowerCase() || "app-config"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isIdle) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileJson className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-bold text-foreground">No output yet</p>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-sm">
                        Enter a prompt above and click <strong>Generate Application</strong> to see the full JSON blueprint here.
                    </p>
                </div>
            </div>
        );
    }

    if (isGenerating && !config) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-[11px] text-primary font-bold uppercase tracking-[0.2em] animate-pulse">
                    Generating JSON output...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-primary/20 text-primary">
                        AppConfig JSON
                    </Badge>
                    {config?.project_name && (
                        <span className="text-[11px] font-bold text-foreground">{config.project_name}</span>
                    )}
                    {isGenerating && (
                        <Badge className="text-[9px] bg-primary/10 text-primary border-none">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                            Updating live
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-[10px] font-bold"
                        onClick={handleCopy}
                        disabled={!jsonText}
                    >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy JSON
                    </Button>
                    <Button
                        size="sm"
                        className="h-8 rounded-lg text-[10px] font-bold"
                        onClick={handleDownload}
                        disabled={!jsonText}
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download
                    </Button>
                </div>
            </div>
            <div className="rounded-2xl border border-border bg-slate-950 overflow-hidden shadow-xl">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        Generated Output
                    </span>
                </div>
                <pre className="p-5 text-[11px] text-emerald-400/90 font-mono leading-relaxed overflow-auto max-h-[520px] custom-scrollbar whitespace-pre-wrap">
                    {jsonText}
                </pre>
            </div>
        </div>
    );
}
