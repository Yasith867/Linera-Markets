import { api, buildUrl, type CreatePredictionRequest, type CreateVoteRequest } from "@shared/routes";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MockModeState {
  isMockMode: boolean;
  toggleMockMode: () => void;
  identity: string;
  setIdentity: (id: string) => void;
  name: string;
}

export const useMockMode = create<MockModeState>()(
  persist(
    (set) => ({
      isMockMode: true,
      toggleMockMode: () => set((state) => ({ isMockMode: !state.isMockMode })),
      identity: sessionStorage.getItem("lm_user_id") || `user_${Math.random().toString(36).substring(7)}`,
      name: `User ${Math.random().toString(36).substring(7)}`,
      setIdentity: (id: string) => {
        sessionStorage.setItem("lm_user_id", id);
        // Extract random part from id to keep name in sync
        const shortId = id.includes("_") ? id.split("_")[1] : id.substring(0, 6);
        set({ identity: id, name: `User ${shortId}` });
      },
    }),
    {
      name: "lm_user_identity_v3",
      onRehydrateStorage: () => (state) => {
        if (state && !sessionStorage.getItem("lm_user_id")) {
          sessionStorage.setItem("lm_user_id", state.identity);
        }
      }
    }
  )
);

// Wrapper that checks mock mode state before making calls
export const linera = {
  getPredictions: async () => {
    // In a real app, check useMockMode.getState().isMockMode here
    // For now we always route to our backend API as the "mock" implementation
    const res = await fetch(api.predictions.list.path);
    if (!res.ok) throw new Error("Failed to fetch predictions");
    return api.predictions.list.responses[200].parse(await res.json());
  },

  getPrediction: async (id: number) => {
    const url = buildUrl(api.predictions.get.path, { id });
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch prediction");
    return api.predictions.get.responses[200].parse(await res.json());
  },

  createPrediction: async (data: CreatePredictionRequest) => {
    const res = await fetch(api.predictions.create.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create prediction");
    return api.predictions.create.responses[201].parse(await res.json());
  },

  vote: async (data: CreateVoteRequest) => {
    const res = await fetch(api.votes.create.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to submit vote");
    return api.votes.create.responses[201].parse(await res.json());
  },

  trade: async (marketId: number, data: { optionId: number, amount: string, userAddress: string }) => {
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

  getMyVotes: async (identity: string) => {
    const url = buildUrl(api.votes.listMyVotes.path, { identity });
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch my votes");
    return api.votes.listMyVotes.responses[200].parse(await res.json());
  },
  
  resolvePrediction: async (id: number, winningOptionId: number) => {
    const url = buildUrl(api.predictions.resolve.path, { id });
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winningOptionId }),
    });
    if (!res.ok) throw new Error("Failed to resolve prediction");
    return api.predictions.resolve.responses[200].parse(await res.json());
  }
};
