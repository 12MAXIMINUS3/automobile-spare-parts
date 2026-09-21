/** Mock shipping rule: free over $100, otherwise flat $8.90. */
export const shippingFor = (subtotal: number) => (subtotal === 0 || subtotal >= 100 ? 0 : 8.9);
