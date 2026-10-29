"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgentRootPage() {
  const router = useRouter();
  useEffect(() => {
    const code = sessionStorage.getItem("agent_code");
    router.replace(code ? "/agent/portal" : "/agent/login");
  }, [router]);
  return null;
}
