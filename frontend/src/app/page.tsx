"use client";

import { useState, useEffect, useRef } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Dashboard } from "@/components/dashboard/dashboard";
import { PipelineStatus } from "@/types/app-config";
import { getPipelineStatus } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const startPolling = (id: string) => {
    setProjectId(id);
    if (pollInterval.current) clearInterval(pollInterval.current);
    pollInterval.current = setInterval(async () => {
      try {
        const statusData = await getPipelineStatus(id);
        setStatus(statusData);

        const hasFailed = statusData && statusData.stages && statusData.stages.some((s: any) => s.status === "failed");
        const isComplete = statusData && statusData.progress === 100;

        if (hasFailed || isComplete) {
          clearInterval(pollInterval.current!);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar status={status} />
      <main className="flex-1 flex flex-col min-h-0 relative">
        <Dashboard
          status={status}
          onGenerate={startPolling}
          projectId={projectId}
        />
      </main>
    </div>
  );
}
