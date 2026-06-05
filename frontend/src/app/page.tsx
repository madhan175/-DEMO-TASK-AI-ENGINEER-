"use client";

import { useState, useEffect, useRef } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Dashboard } from "@/components/dashboard/dashboard";
import { PipelineStage, PipelineStatus } from "@/types/app-config";
import { getPipelineStatus } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const pollStatus = async (id: string) => {
    try {
      const statusData = await getPipelineStatus(id);
      if (!statusData) return false;
      setStatus(statusData);

      const hasFailed = statusData.stages?.some((s: PipelineStage) => s.status === "failed");
      const isComplete = statusData.progress === 100;
      return hasFailed || isComplete;
    } catch (error) {
      console.error("Polling error:", error);
      return false;
    }
  };

  const startPolling = (id: string) => {
    setProjectId(id);
    setStatus(null);
    if (pollInterval.current) clearInterval(pollInterval.current);

    pollStatus(id).then((done) => {
      if (done) return;
      pollInterval.current = setInterval(async () => {
        const finished = await pollStatus(id);
        if (finished && pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      }, 2000);
    });
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
