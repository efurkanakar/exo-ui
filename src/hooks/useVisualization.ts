import { useQuery } from "@tanstack/react-query";
import { getDiscoveryDataset } from "../api/client";
import type { DiscoveryDataset, DiscoveryChartType } from "../api/types";

export function useDiscoveryDataset(params: {
  chart: DiscoveryChartType;
  bins?: number;
  sigma?: number;
}) {
  const queryKey = [
    "vis",
    "discovery",
    params.chart,
    params.chart === "hist" ? params.bins ?? null : null,
    params.chart === "hist" ? params.sigma ?? null : null,
  ] as const;

  return useQuery<DiscoveryDataset, Error>({
    queryKey,
    queryFn: () => getDiscoveryDataset(params),
  });
}
