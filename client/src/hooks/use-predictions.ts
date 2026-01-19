import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { linera } from "@/lib/linera";
import { type CreatePredictionRequest, type CreateVoteRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function usePredictions() {
  return useQuery({
    queryKey: ["predictions"],
    queryFn: linera.getPredictions,
    refetchInterval: 5000, // Poll for live updates
  });
}

export function usePrediction(id: number) {
  return useQuery({
    queryKey: ["prediction", id],
    queryFn: () => linera.getPrediction(id),
    refetchInterval: 2000, // Faster polling for detail view
  });
}

export function useCreatePrediction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePredictionRequest) => linera.createPrediction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast({
        title: "Market Created",
        description: "Your prediction market is now live on the chain.",
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

export function useVote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateVoteRequest) => linera.vote(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prediction", variables.predictionId] });
      queryClient.invalidateQueries({ queryKey: ["my-votes"] });
      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded on the ledger.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Vote Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useMyVotes(identity: string) {
  return useQuery({
    queryKey: ["my-votes", identity],
    queryFn: () => linera.getMyVotes(identity),
  });
}

export function useResolvePrediction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, winningOptionId }: { id: number; winningOptionId: number }) => 
      linera.resolvePrediction(id, winningOptionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prediction", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      toast({
        title: "Market Resolved",
        description: "The prediction market has been settled.",
      });
    },
  });
}
