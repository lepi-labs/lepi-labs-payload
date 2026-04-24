import { Field } from "payload";

/**
 * Unified validation for ShippingRateJSON field
 * Used across Carts, Transactions, and Orders collections
 */
export const validateShippingRate = (v: unknown): true | string => {
  if (!v) return true; // Optional field

  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return 'Shipping rate must be a JSON object';
  }

  const rate = v as Record<string, unknown>;

  if (!rate.provider || typeof rate.provider !== 'string') {
    return 'Shipping rate must have a valid provider string';
  }

  if (!rate.providerId || typeof rate.providerId !== 'string') {
    return 'Shipping rate must have a valid providerId string';
  }

  if (typeof rate.cost !== 'number' || rate.cost < 0) {
    return 'Shipping rate cost must be a non-negative number';
  }

  if (!rate.displayName || typeof rate.displayName !== 'string') {
    return 'Shipping rate must have a displayName string';
  }

  if (typeof rate.minDays !== 'number' || rate.minDays < 0) {
    return 'Shipping rate must have a non-negative minDays number';
  }

  if (typeof rate.maxDays !== 'number' || rate.maxDays < 0) {
    return 'Shipping rate must have a non-negative maxDays number';
  }

  if (rate.minDays > rate.maxDays) {
    return 'Shipping rate minDays cannot be greater than maxDays';
  }

  return true;
}

/**
 * Reusable shippingRate field configuration for collections
 * Includes validation and basic field properties
 */
export const shippingRateField: Field = {
  name: 'shippingRate',
  type: 'json',
  label: 'Shipping rate',
  validate: validateShippingRate,
}
