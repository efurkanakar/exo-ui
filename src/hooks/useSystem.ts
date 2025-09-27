import { useQuery } from "@tanstack/react-query";
import { getRoot, getHealth, getReadiness } from "../api/client";

/** Checks service root for a friendly message. */
export const useSystemRoot = () =>
  useQuery({ queryKey: ["system", "root"], queryFn: getRoot });

/** Liveness probe. */
export const useSystemHealth = () =>
  useQuery({ queryKey: ["system", "health"], queryFn: getHealth });

/** Readiness probe (DB reachability). */
export const useSystemReadiness = () =>
  useQuery({ queryKey: ["system", "readiness"], queryFn: getReadiness });
