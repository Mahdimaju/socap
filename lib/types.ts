export type Platform = 'GoFood' | 'GrabFood' | 'ShopeeFood';

export interface Restaurant {
  id: string;
  name: string;
  platform: Platform;
  category: string;
  city: string;
  base_delivery_fee: number;
  service_fee: number;
  deep_link_url: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  calories: number;
  is_addon: boolean;
}

export interface Promo {
  id: string;
  platform: Platform;
  promo_code: string;
  title: string;
  min_spend: number;
  discount_percent: number;
  max_discount: number;
  payment_method: string;
  expires_at: string;
  status: 'pending' | 'active' | 'expired';
}

export interface OptimizationResult {
  restaurant: Restaurant;
  mainDish: MenuItem;
  addedAddon: MenuItem | null;
  appliedPromo: Promo | null;
  normalPriceWithoutHack: number;
  finalPrice: number;
  discountAmount: number;
  totalCalories: number;
  extraSavings: number;
  isCartHacked: boolean;
}

export interface OptimizeRequest {
  craving: string;
  maxBudget: number;
  maxCalories: number | null;
  wallets: string[];
}

export interface OptimizeResponse {
  results: OptimizationResult[];
  nearest: OptimizationResult | null;
  totalCandidates: number;
}

export interface SplitScenario {
  k: number;
  perOrderFood: number;
  eligible: boolean;
  totalDiscount: number;
  totalPay: number;
}

export interface SplitOrderResult {
  scenarios: SplitScenario[];
  winner: SplitScenario;
  savingsVsSingle: number;
}
