"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function RealtimeAlertsListener() {
  const router = useRouter();
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  useEffect(() => {
    // Only subscribe if Supabase client is initialized
    if (!supabase) {
      return;
    }

    const client = supabase;

    try {
      const channel = client
        .channel("realtime-alerts-channel")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "alerts",
          },
          (payload) => {
            console.log("Realtime alert update received:", payload);
            setRealtimeNotification("New alert update received. Refreshing dashboard...");
            router.refresh();
            setTimeout(() => setRealtimeNotification(null), 4000);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (err) {
      console.warn("Supabase realtime subscription deferred:", err);
    }
  }, [router]);

  if (!realtimeNotification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-teal-900 text-white px-4 py-3 rounded-xl shadow-lg border border-teal-700 flex items-center gap-3 animate-bounce">
      <span className="h-2.5 w-2.5 rounded-full bg-teal-400 animate-ping" />
      <span className="text-xs font-semibold">{realtimeNotification}</span>
    </div>
  );
}
