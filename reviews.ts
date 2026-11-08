export type Review = {
  name: string;
  city: string;
  text: string;
  sku?: string;
};

// Add ONLY real, consented customer reviews here. While empty, the proof section stays hidden.
export const reviews: Review[] = [];
