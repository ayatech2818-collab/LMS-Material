"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RealtimeListener() {
  const router = useRouter();
  // Memoize so the client reference is stable across renders and doesn't
  // re-trigger the useEffect subscription on every render cycle.
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // We subscribe to the entire "tasks" table for updates
    // In a prod app, we'd scope RLS correctly or use event filters by Board/User, but 
    // for this ecosystem, knowing ANY task state changed allows us to auto-refresh the Kanbans.
    
    const channel = supabase
      .channel("kanban-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          console.log("Realtime Update Received!", payload);
          const newStatus = payload.new.current_status.replace(/_/g, " ").toUpperCase();
          
          toast.success("Board Updated Live!", {
            description: `A task has been moved to ${newStatus}.`,
            style: { 
              background: '#0070cc', // ps-blue 
              color: 'white',
              border: 'none',
              borderRadius: '12px'
            }
          });
          
          // Re-fetch Server Components seamlessly via Next 15 router
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
        },
        (_payload) => {
          toast("New Task Deployed", {
            description: "A new creation task entered the pipeline.",
            style: { background: '#1f1f1f', color: '#fff', border: '1px solid #333', borderRadius: '12px' }
          });
          router.refresh();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Live Kanban Socket Online.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return null; // Silent global watcher
}
