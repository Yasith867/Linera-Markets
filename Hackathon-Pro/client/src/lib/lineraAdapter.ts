export interface LineraMarket {
  id: string;
  question: string;
  options: string[];
  closeTime: number;
  status: 'open' | 'closed' | 'resolved';
}

export const lineraAdapter = {
  createMarket: async (data: any): Promise<string> => {
    console.log("Linera: Creating market via microchain adapter", data);
    return `chain-msg-${Math.random().toString(36).substring(7)}`;
  },

  placePosition: async (marketId: string, optionIndex: number, amount: string): Promise<string> => {
    console.log(`Linera: Placing position on market ${marketId}`, { optionIndex, amount });
    return `trade-msg-${Math.random().toString(36).substring(7)}`;
  },

  resolveMarket: async (marketId: string, winningOptionIndex: number): Promise<string> => {
    console.log(`Linera: Resolving market ${marketId}`, { winningOptionIndex });
    return `resolve-msg-${Math.random().toString(36).substring(7)}`;
  }
};
