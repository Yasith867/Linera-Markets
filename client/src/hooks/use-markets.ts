import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Market, type MarketWithDetail, type insertMarketSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type CreateMarketRequest = z.infer<typeof insertMarketSchema>;

export function useMarkets() {
  return useQuery({
    queryKey: ["/api/markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json() as Promise<MarketWithDetail[]>;
    },
    refetchInterval: 1000,
  });
}

export function useMarket(id: number) {
  return useQuery({
    queryKey: ["/api/markets", id],
    queryFn: async () => {
      const res = await fetch(buildUrl("/api/markets/:id", { id }));
      if (!res.ok) throw new Error("Failed to fetch market");
      return res.json() as Promise<MarketWithDetail>;
    },
    refetchInterval: 1000,
  });
}

export function useCreateMarket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMarketRequest) => {
      const res = await fetch("/api/markets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create market");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({
        title: "Market Created",
        description: "Your prediction market is now live.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to place position");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets", variables.marketId] });
      queryClient.invalidateQueries({ queryKey: ["/api/positions", variables.userAddress] });
    },
  });
}

export function useDeleteMarket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: number, userId: string }) => {
      const res = await fetch(`/api/markets/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": userId }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete market");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({
        title: "Market Deleted",
        description: "The market has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
