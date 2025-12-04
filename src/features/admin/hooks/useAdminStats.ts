import { useMemo } from "react";

export function useAdminStats(orders) {
  return useMemo(() => {
    // Filtrer commandes valides (payées ou servies)
    const validOrders = orders.filter(
      (o) => o.status === "paid" || o.status === "served"
    );

    // 1. Chiffre d'affaires
    const totalRevenue = validOrders.reduce(
      (sum, o) => sum + (o.total_cents || 0),
      0
    );

    // 2. Best Seller
    // Typage explicite : Clé (nom produit) -> Valeur (nombre de ventes)
    const productCounts: Record<string, number> = {};

    validOrders.forEach((o) => {
      o.items?.forEach((item) => {
        const name = item.name;
        productCounts[name] = (productCounts[name] || 0) + (item.qty || 1);
      });
    });

    const sortedProducts = Object.entries(productCounts).sort(
      (a, b) => b[1] - a[1]
    );
    const bestSeller = sortedProducts.length > 0 ? sortedProducts[0] : null;

    // 3. Panier moyen
    const averageCart = validOrders.length
      ? totalRevenue / validOrders.length
      : 0;

    return {
      totalRevenue,
      bestSeller,
      averageCart,
      count: validOrders.length,
    };
  }, [orders]);
}
