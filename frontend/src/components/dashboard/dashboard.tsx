"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    RotateCcw,
    ChevronRight,
    CheckCircle2,
    Circle,
    Loader2,
    AlertCircle,
    Code,
    Layout,
    Terminal,
    Database,
    ShieldAlert,
    Settings2,
    Share2,
    Wrench,
    XCircle,
    Plus,
    User,
    Bell,
    Cpu
} from "lucide-react";
import { generateApp, getPipelineStatus, getProject } from "@/lib/api";
import { AppConfig, PipelineStatus } from "@/types/app-config";
import { GenerationHeader } from "./generation-header";
import { PipelineStepper } from "./pipeline-stepper";
import { ValidationScorePanel, RepairSuggestionsPanel, ExecutionPreviewPanel, JsonOutputPanel, AuthRolesPanel } from "./dashboard-panels";

const samplePrompts = [
    { title: "E-commerce platform with payments", icon: Share2 },
    { title: "Project management tool", icon: Layout },
    { title: "HR management system", icon: Database },
    { title: "Learning management system", icon: Code },
];

interface DashboardProps {
    status: PipelineStatus | null;
    onGenerate: (id: string) => void;
    projectId: string | null;
}

export function Dashboard({ status, onGenerate, projectId }: DashboardProps) {
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("gemini");
    const [isGenerating, setIsGenerating] = useState(false);
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [activeTab, setActiveTab] = useState("json");
    const [generateError, setGenerateError] = useState<string | null>(null);
    const fetchingConfig = useRef(false);
    const isIdle = !projectId && !isGenerating;

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setConfig(null);
        setGenerateError(null);
        fetchingConfig.current = false;
        lastFetchedStage.current = -1;
        setActiveTab("json");
        try {
            const data = await generateApp(prompt, model);
            onGenerate(data.project_id);
        } catch (error) {
            console.error("Failed to start generation:", error);
            setGenerateError(error instanceof Error ? error.message : "Failed to start generation");
            setIsGenerating(false);
        }
    };

    const lastFetchedStage = useRef<number>(-1);

    useEffect(() => {
        // Find the index of the latest successful stage
        const latestSuccessIdx = status?.stages?.reduce((max, s, i) =>
            s.status === "success" ? i : max, -1
        ) ?? -1;

        // Fetch if:
        // 1. We haven't fetched anything yet and architecture is ready
        // 2. A new stage has succeeded since our last fetch
        const shouldFetchEarly = latestSuccessIdx >= 1; // Stage 1 is System Design
        const hasNewData = latestSuccessIdx > lastFetchedStage.current;
        const isComplete = status?.progress === 100;

        if ((isComplete || (shouldFetchEarly && hasNewData)) && projectId && !fetchingConfig.current) {
            fetchingConfig.current = true;
            getProject(projectId)
                .then(newConfig => {
                    if (newConfig) setConfig(newConfig);
                    lastFetchedStage.current = latestSuccessIdx;
                    fetchingConfig.current = false;
                })
                .catch(err => {
                    console.error("Failed to fetch project update:", err);
                    fetchingConfig.current = false;
                });
        }

        if (isComplete) {
            setIsGenerating(false);
            setActiveTab("json");
            if (projectId && !fetchingConfig.current) {
                fetchingConfig.current = true;
                getProject(projectId)
                    .then(newConfig => {
                        if (newConfig) setConfig(newConfig);
                        fetchingConfig.current = false;
                    })
                    .catch(() => { fetchingConfig.current = false; });
            }
        }

        const fatalStage = status?.stages?.find(s => s.status === 'failed' && s.errors && s.errors.length > 0);
        if (fatalStage) {
            setIsGenerating(false);
            const stageError = fatalStage.errors[0];
            if (stageError) setGenerateError(stageError);
        }
    }, [status, projectId]);

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <GenerationHeader />

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 space-y-8 max-w-[1600px] mx-auto pb-32">
                    {/* Top Section: Prompt and Examples */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 block">Natural Language Prompt</label>
                            <Card className="rounded-3xl border border-border shadow-xl bg-card overflow-hidden">
                                <CardContent className="p-6 space-y-4">
                                    <Textarea
                                        placeholder="Build a CRM application with user authentication, role management, contacts management, deals tracking, and activity tracking."
                                        className="min-h-[140px] text-sm resize-none focus-visible:ring-0 border-none bg-transparent p-0 placeholder:text-muted-foreground/40 leading-relaxed font-medium"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        disabled={isGenerating}
                                    />
                                    <div className="flex items-center justify-between pt-4 border-t border-muted/20">
                                        <div className="flex gap-3">
                                            <Button
                                                className="h-10 px-6 rounded-xl font-bold transition-all active:scale-95"
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !prompt}
                                            >
                                                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                                Generate Application
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="h-10 px-6 rounded-xl border-muted-foreground/10 hover:bg-muted/50 font-bold transition-all"
                                                onClick={() => setPrompt("")}
                                                disabled={isGenerating}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Clear
                                            </Button>
                                        </div>
                                        <select
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            className="text-xs font-bold bg-muted/30 border-none rounded-lg px-3 py-2 outline-none dark:bg-zinc-800"
                                            disabled={isGenerating}
                                        >
                                            <option value="gemini">Gemini 1.5 Pro</option>
                                            <option value="ollama">Ollama (Local)</option>
                                        </select>
                                    </div>
                                    {generateError && (
                                        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-medium">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>{generateError}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3 block">Example Prompts</label>
                            <div className="grid grid-cols-1 gap-3">
                                {samplePrompts.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPrompt(item.title)}
                                        className="flex items-center gap-3 p-3 bg-card hover:bg-primary-light transition-all rounded-2xl border border-border hover:border-primary/20 text-left group shadow-sm"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <item.icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <span className="text-[11px] font-bold text-foreground/80 group-hover:text-primary transition-colors">{item.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Mesh */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                        <div className="lg:col-span-3 space-y-8">
                            <Card className="rounded-3xl border border-border shadow-xl bg-card overflow-hidden">
                                <PipelineStepper stages={status?.stages || []} />

                                <div className="px-6 pb-6 mt-4">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <TabsList className="bg-transparent border-b border-muted/20 w-full justify-start rounded-none h-12 p-0 gap-8 mb-6 overflow-x-auto overflow-y-hidden custom-scrollbar pb-1">
                                            {[
                                                { id: "json", label: "JSON Output" },
                                                { id: "architecture", label: "Architecture" },
                                                { id: "database", label: "Database Schema" },
                                                { id: "api", label: "API Endpoints" },
                                                { id: "ui", label: "UI/UX Structure" },
                                                { id: "auth", label: "Auth & Roles" },
                                                { id: "rules", label: "Business Rules" }
                                            ].map((tab) => (
                                                <TabsTrigger
                                                    key={tab.id}
                                                    value={tab.id}
                                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 h-12 text-[11px] font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:text-primary transition-all whitespace-nowrap"
                                                >
                                                    {tab.label}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>

                                        <div className="min-h-[400px]">
                                            <TabsContent value="json" className="mt-0">
                                                <JsonOutputPanel
                                                    config={config}
                                                    isGenerating={isGenerating}
                                                    isIdle={isIdle}
                                                />
                                            </TabsContent>

                                            <TabsContent value="architecture" className="mt-0 animate-in fade-in duration-500 space-y-6">
                                                <Card className="rounded-3xl border-none bg-slate-950 shadow-2xl relative overflow-hidden min-h-[300px]">
                                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #6C4CF1 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

                                                    <CardHeader className="relative z-10 pb-0">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">System Architecture Map</CardTitle>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-1.5 w-1.5 rounded-full bg-success animate-pulse"></div>
                                                                <span className="text-[9px] font-bold text-slate-500 uppercase">Live Diagram</span>
                                                            </div>
                                                        </div>
                                                    </CardHeader>

                                                    <CardContent className="relative z-10 pt-8 pb-12 text-white">
                                                        {config ? (
                                                            <div className="flex flex-col items-center gap-10">
                                                                {/* Central Hub */}
                                                                <div className="relative z-20 group">
                                                                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-[#8B5CF6] to-primary-dark p-[2px] shadow-[0_0_50px_rgba(108,76,241,0.3)]">
                                                                        <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center p-3 text-center">
                                                                            <Cpu className="w-7 h-7 text-primary mb-1" />
                                                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter leading-tight">
                                                                                {config.project_name}
                                                                            </p>
                                                                            <p className="text-[7px] text-primary/60 font-bold uppercase tracking-[0.2em] mt-0.5">Core Engine</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Layer Nodes Row */}
                                                                <div className="flex items-center justify-center gap-8 flex-wrap">
                                                                    {[
                                                                        { name: "Frontend", icon: Layout, color: "text-info", border: "border-info/30" },
                                                                        { name: "API Gateway", icon: Settings2, color: "text-primary", border: "border-primary/30" },
                                                                        { name: "Logic Layer", icon: Terminal, color: "text-[#8B5CF6]", border: "border-[#8B5CF6]/30" },
                                                                        { name: "Persistence", icon: Database, color: "text-success", border: "border-success/30" }
                                                                    ].map((node, i) => (
                                                                        <div key={i} className="flex flex-col items-center gap-2 group cursor-default">
                                                                            <div className={`w-14 h-14 rounded-2xl bg-white/5 border ${node.border} backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-xl group-hover:bg-white/10`}>
                                                                                <node.icon className={`w-6 h-6 ${node.color}`} />
                                                                            </div>
                                                                            <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">{node.name}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Description */}
                                                                <div className="w-full max-w-3xl mx-auto">
                                                                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15 text-center">
                                                                        <p className="text-[8px] font-bold text-primary/60 uppercase tracking-[0.2em] mb-2">Architectural Overview</p>
                                                                        <p className="text-[11px] text-white/80 leading-relaxed font-medium">
                                                                            {config.architecture.description}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Entity Cards */}
                                                                <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                    {config.architecture.entities.slice(0, 8).map((entity, i) => (
                                                                        <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors group">
                                                                            <p className="text-[9px] font-bold text-primary/80 uppercase tracking-tight mb-1 group-hover:text-primary transition-colors">{entity.name}</p>
                                                                            <p className="text-[8px] text-white/40 line-clamp-2">{entity.description}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : isGenerating ? (
                                                            <div className="flex flex-col items-center justify-center h-64 gap-4">
                                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                                <p className="text-[11px] text-primary font-bold uppercase tracking-[0.3em] animate-pulse">Calculating Flow Mesh...</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
                                                                <Layout className="w-8 h-8 text-muted-foreground/30" />
                                                                <p className="text-[11px] text-muted-foreground font-medium">Architecture will appear here after generation starts.</p>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">System Entities</h3>
                                                        <Badge variant="outline" className="text-[10px] border-muted/20">{config?.architecture.entities.length || 0} Entities</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {config?.architecture.entities.map((entity, i) => (
                                                            <div key={i} className="p-4 bg-card rounded-2xl border border-border group hover:border-primary/20 transition-all shadow-sm">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                                                                        <Circle className="w-2.5 h-2.5 text-primary fill-primary" />
                                                                    </div>
                                                                    <p className="text-[11px] font-black text-foreground/90 uppercase tracking-tight">{entity.name}</p>
                                                                </div>
                                                                <p className="text-[10px] text-muted-foreground leading-relaxed italic">"{entity.description}"</p>
                                                            </div>
                                                        )) || Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-muted/5 animate-pulse rounded-2xl" />)}
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="database" className="mt-0 animate-in fade-in duration-500 space-y-6">
                                                {config?.db.tables.map((table, i) => {
                                                    const columns = table.columns.map(col => {
                                                        let def = `  ${col.name} ${col.type}`;
                                                        if (col.primary_key) def += " PRIMARY KEY";
                                                        if (!col.nullable) def += " NOT NULL";
                                                        if (col.unique) def += " UNIQUE";
                                                        return def;
                                                    });
                                                    const sql = `CREATE TABLE ${table.name} (\n${columns.join(",\n")}\n);`;

                                                    return (
                                                        <Card key={i} className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
                                                            <div className="px-5 py-3 bg-muted/30 border-b border-muted/20 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Database className="w-4 h-4 text-primary" />
                                                                    <span className="text-[12px] font-black uppercase tracking-tight text-foreground/80">{table.name}</span>
                                                                </div>
                                                                <Badge variant="outline" className="text-[9px]">{table.columns.length} Columns</Badge>
                                                            </div>
                                                            <div className="p-0">
                                                                <table className="w-full text-left text-[10px]">
                                                                    <thead className="bg-muted/10 text-muted-foreground/60 uppercase text-[8px] font-bold">
                                                                        <tr>
                                                                            <th className="px-5 py-2.5">Column</th>
                                                                            <th className="px-5 py-2.5">Type</th>
                                                                            <th className="px-5 py-2.5">Nullable</th>
                                                                            <th className="px-5 py-2.5">Constraints</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-muted/10">
                                                                        {table.columns.map((col, j) => (
                                                                            <tr key={j} className="group hover:bg-primary/5 transition-colors">
                                                                                <td className="px-5 py-2.5 font-bold flex items-center gap-2">
                                                                                    {col.name}
                                                                                    {col.primary_key && <span className="text-[7px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-black">PK</span>}
                                                                                </td>
                                                                                <td className="px-5 py-2.5 text-muted-foreground font-mono text-[9px]">{col.type}</td>
                                                                                <td className="px-5 py-2.5 text-muted-foreground">{col.nullable ? "Yes" : "No"}</td>
                                                                                <td className="px-5 py-2.5 text-muted-foreground">
                                                                                    {col.unique && <span className="text-[7px] bg-info/10 text-info px-1.5 py-0.5 rounded-full font-black mr-1">UNIQUE</span>}
                                                                                    {col.primary_key && <span className="text-[7px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full font-black">PRIMARY</span>}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            {/* SQL Query Block */}
                                                            <div className="border-t border-muted/20 bg-slate-950 p-4 relative">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary/80">SQL • Create Table</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(sql);
                                                                            const btn = document.getElementById(`copy-btn-${i}`);
                                                                            if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy" }, 2000); }
                                                                        }}
                                                                        id={`copy-btn-${i}`}
                                                                        className="text-[9px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-lg transition-colors uppercase tracking-wider cursor-pointer"
                                                                    >
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                                <pre className="text-[10px] text-success/80 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto custom-scrollbar">{sql}</pre>
                                                            </div>
                                                        </Card>
                                                    );
                                                }) || (
                                                        <div className="h-40 flex items-center justify-center italic text-muted-foreground/40">
                                                            {isGenerating ? "Database schema loading..." : "No database schema yet."}
                                                        </div>
                                                    )}
                                            </TabsContent>

                                            <TabsContent value="api" className="mt-0 animate-in fade-in duration-500">
                                                <div className="grid grid-cols-1 gap-3">
                                                    {config?.api.endpoints.map((ep, i) => (
                                                        <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm transition-all hover:shadow-lg hover:border-primary/20 group">
                                                            <Badge className={`${ep.method === 'GET' ? 'bg-success' : ep.method === 'POST' ? 'bg-info' : 'bg-warning'} text-white border-none font-black text-[9px] w-12 justify-center h-6 uppercase`}>
                                                                {ep.method}
                                                            </Badge>
                                                            <span className="font-mono text-[11px] font-bold text-foreground/80">{ep.path}</span>
                                                            <span className="text-[11px] text-muted-foreground ml-auto group-hover:text-foreground transition-colors">{ep.summary}</span>
                                                            <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-all duration-300 transform group-hover:translate-x-1" />
                                                        </div>
                                                    )) || (
                                                            <div className="h-40 flex items-center justify-center italic text-muted-foreground/40">
                                                                {isGenerating ? "API endpoints loading..." : "No API endpoints yet."}
                                                            </div>
                                                        )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="ui" className="mt-0 animate-in fade-in duration-500">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {config?.ui.pages.map((page, i) => (
                                                        <Card key={i} className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden group hover:ring-primary/30 transition-all hover:-translate-y-1">
                                                            <div className="aspect-video relative overflow-hidden bg-muted/20">
                                                                <img
                                                                    src={i % 2 === 0 ? "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" : "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"}
                                                                    alt={page.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                                                    <div>
                                                                        <p className="text-[11px] font-black uppercase text-white tracking-widest">{page.name}</p>
                                                                        <p className="text-[9px] text-white/60 font-mono">{page.route}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="p-4 space-y-3">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {page.components.slice(0, 3).map((comp, j) => (
                                                                        <Badge key={j} variant="secondary" className="text-[8px] bg-muted/50 border-none font-bold uppercase">{comp.type}</Badge>
                                                                    ))}
                                                                </div>
                                                                <Button variant="outline" size="sm" className="w-full h-8 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                                                    Preview Prototype
                                                                </Button>
                                                            </div>
                                                        </Card>
                                                    )) || (
                                                            <div className="h-40 flex items-center justify-center italic text-muted-foreground/40">
                                                                {isGenerating ? "UI structure loading..." : "No UI structure yet."}
                                                            </div>
                                                        )}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="auth" className="mt-0 animate-in fade-in duration-500">
                                                <AuthRolesPanel
                                                    roles={config?.auth?.roles}
                                                    matrix={config?.auth?.matrix}
                                                    isGenerating={isGenerating}
                                                    isIdle={isIdle}
                                                />
                                            </TabsContent>

                                            <TabsContent value="rules" className="mt-0 animate-in fade-in duration-500">
                                                <div className="space-y-4">
                                                    {config?.rules?.rules.map((rule: any, i: number) => (
                                                        <div key={i} className="p-5 bg-card rounded-2xl border border-border shadow-sm flex gap-4 items-start">
                                                            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                                                                <ShieldAlert className="w-4 h-4 text-success" />
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground leading-relaxed">{rule.description || rule}</p>
                                                        </div>
                                                    )) || (
                                                            <div className="h-40 flex items-center justify-center italic text-muted-foreground/40">
                                                                {isGenerating ? "Business rules loading..." : "No business rules yet."}
                                                            </div>
                                                        )}
                                                </div>
                                            </TabsContent>
                                        </div>
                                    </Tabs>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 block">System Logs</label>
                                    <div className="bg-card rounded-3xl p-6 shadow-xl border border-border font-mono text-[10px] h-[200px] overflow-auto custom-scrollbar">
                                        {status?.stages ? status.stages.filter(s => s.status !== 'waiting').map((s, i) => (
                                            <div key={i} className="mb-1.5 flex gap-3 text-foreground/80">
                                                <span className="text-muted-foreground/40 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                                <span className={`${s.status === 'success' ? 'text-success' : s.status === 'running' ? 'text-primary' : s.status === 'failed' ? 'text-destructive' : ''}`}>
                                                    {s.status === 'success' ? '✓' : s.status === 'running' ? '●' : '×'} {s.name} {s.status}
                                                </span>
                                            </div>
                                        )) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/20">
                                                <Terminal className="w-8 h-8 mb-2" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting initialization...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-end pb-2">
                                    <div className="bg-card rounded-3xl p-6 shadow-xl border border-border space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-bold">{status?.progress === 100 ? 'Compilation Complete' : 'Compiling Application...'}</p>
                                            <p className="text-[11px] font-black text-primary">{status?.progress || 0}%</p>
                                        </div>
                                        <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${status?.progress || 0}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <ValidationScorePanel
                                data={status?.stages?.[7]?.output}
                                onFixAll={() => console.log('Fixing issues...')}
                            />
                            <RepairSuggestionsPanel data={status?.stages?.[8]?.output} />
                            <ExecutionPreviewPanel
                                data={status?.stages?.[9]?.output}
                                onLaunch={() => window.open('https://preview.vercel.app', '_blank')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
