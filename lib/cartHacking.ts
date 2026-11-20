import type {
  MenuItem,
  OptimizationResult,
  Promo,
  Restaurant,
  SplitOrderResult,
  SplitScenario,
} from './types';

export function formatRp(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatRpShort(amount: number): string {
  if (amount >= 1000 && amount % 1000 === 0) {
    return 'Rp' + amount / 1000 + 'rb';
  }
  return 'Rp' + Math.round(amount).toLocaleString('id-ID');
}

export function optimizeCart(
  restaurant: Restaurant,
  mainDish: MenuItem,
  addons: MenuItem[],
  promos: Promo[],
  maxCalories: number | null
): OptimizationResult {
  const extraFees = restaurant.base_delivery_fee + restaurant.service_fee;

  let bestResult: OptimizationResult = {
    restaurant,
    mainDish,
    addedAddon: null,
    appliedPromo: null,
    normalPriceWithoutHack: mainDish.price + extraFees,
    finalPrice: mainDish.price + extraFees,
    discountAmount: 0,
    totalCalories: mainDish.calories,
    extraSavings: 0,
    isCartHacked: false,
  };

  for (const promo of promos) {
    if (mainDish.price >= promo.min_spend) {
      const disc = Math.min(
        (mainDish.price * promo.discount_percent) / 100,
        promo.max_discount
      );
      const price = mainDish.price + extraFees - disc;
      if (price < bestResult.finalPrice) {
        bestResult.finalPrice = price;
        bestResult.normalPriceWithoutHack = price;
        bestResult.discountAmount = disc;
        bestResult.appliedPromo = promo;
      }
    }
  }

  const baselinePrice = bestResult.finalPrice;

  for (const addon of addons) {
    const totalCalories = mainDish.calories + addon.calories;
    if (maxCalories !== null && totalCalories > maxCalories) continue;

    const combinedFoodPrice = mainDish.price + addon.price;

    for (const promo of promos) {
      if (combinedFoodPrice >= promo.min_spend) {
        const rawDiscount = (combinedFoodPrice * promo.discount_percent) / 100;
        const actualDiscount = Math.min(rawDiscount, promo.max_discount);
        const finalPrice = combinedFoodPrice + extraFees - actualDiscount;

        if (finalPrice < bestResult.finalPrice) {
          bestResult = {
            restaurant,
            mainDish,
            addedAddon: addon,
            appliedPromo: promo,
            normalPriceWithoutHack: baselinePrice,
            finalPrice,
            discountAmount: actualDiscount,
            totalCalories,
            extraSavings: baselinePrice - finalPrice,
            isCartHacked: true,
          };
        }
      }
    }
  }

  return bestResult;
}

export function optimizeSplitOrder(
  totalFood: number,
  feePerOrder: number,
  minSpend: number,
  discountPercent: number,
  maxDiscount: number
): SplitOrderResult {
  const scenarios: SplitScenario[] = [1, 2, 3, 4].map((k) => {
    const perOrderFood = totalFood / k;
    const eligible = perOrderFood >= minSpend;
    const discPerOrder = eligible
      ? Math.min((perOrderFood * discountPercent) / 100, maxDiscount)
      : 0;
    const totalPay = totalFood + k * feePerOrder - k * discPerOrder;

    return {
      k,
      perOrderFood,
      eligible,
      totalDiscount: k * discPerOrder,
      totalPay,
    };
  });

  const baseline = scenarios[0].totalPay;
  let winner = scenarios[0];
  for (const scenario of scenarios) {
    if (scenario.totalPay < winner.totalPay) {
      winner = scenario;
    }
  }

  return {
    scenarios,
    winner,
    savingsVsSingle: baseline - winner.totalPay,
  };
}
