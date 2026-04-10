import { useEffect, useState } from "react";

const RESERVED_HOSTS = new Set(["www", "app", "api", "localhost", "vercel", "netlify"]);

export function getSubdomainFromHostname(hostname) {
  if (!hostname) return null;

  const normalized = hostname.toLowerCase();
  
  // Ignore local hosts
  if (normalized === "localhost" || normalized.startsWith("127.") || normalized.endsWith(".localhost")) {
    return null;
  }

  // Ignore deployment platforms (Vercel, Netlify) to show main landing page
  if (normalized.endsWith(".vercel.app") || normalized.endsWith(".netlify.app")) {
    return null;
  }

  const parts = normalized.split(".").filter(Boolean);
  if (parts.length < 3) return null;

  const subdomain = parts[0];
  if (RESERVED_HOSTS.has(subdomain)) return null;

  return subdomain;
}

export default function useSubdomain() {
  const [subdomain, setSubdomain] = useState(() =>
    typeof window === "undefined" ? null : getSubdomainFromHostname(window.location.hostname)
  );

  useEffect(() => {
    setSubdomain(getSubdomainFromHostname(window.location.hostname));
  }, []);

  return subdomain;
}
