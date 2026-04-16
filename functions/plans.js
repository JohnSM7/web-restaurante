/**
 * Tane Booking — Plan definitions
 * Límites soft: se permite la acción pero se alerta al superadmin.
 */

const PLANS = {
  trial: {
    label:         'Trial',
    precio_mes:    0,
    reservas_mes:  50,
    mesas:         10,
    usuarios:      1,
    emails:        false,   // notificaciones email al cliente
    widget:        false,   // widget embebible
    crm:           false,   // acceso al CRM
    recordatorio:  false,   // email recordatorio 24h
    soporte:       'ninguno',
    stripe_price_id: null,
  },
  basic: {
    label:         'Basic',
    precio_mes:    29,
    reservas_mes:  200,
    mesas:         20,
    usuarios:      3,
    emails:        true,
    widget:        false,
    crm:           true,
    recordatorio:  false,
    soporte:       'email',
    stripe_price_id: process.env.STRIPE_PRICE_BASIC,
  },
  pro: {
    label:         'Pro',
    precio_mes:    59,
    reservas_mes:  Infinity,
    mesas:         Infinity,
    usuarios:      Infinity,
    emails:        true,
    widget:        true,
    crm:           true,
    recordatorio:  true,
    soporte:       'prioritario',
    stripe_price_id: process.env.STRIPE_PRICE_PRO,
  },
};

/**
 * Returns how far (0–1) a restaurant is into its monthly reservation limit.
 * Returns null if the plan has no limit (Infinity).
 */
function getUsageRatio(plan, reservasMes) {
  const limite = PLANS[plan]?.reservas_mes;
  if (!limite || limite === Infinity) return null;
  return reservasMes / limite;
}

/**
 * Returns true if the restaurant has exceeded its soft limit.
 */
function isOverLimit(plan, reservasMes) {
  const ratio = getUsageRatio(plan, reservasMes);
  return ratio !== null && ratio > 1;
}

/**
 * Returns true if the restaurant is approaching (≥80%) its limit.
 */
function isNearLimit(plan, reservasMes) {
  const ratio = getUsageRatio(plan, reservasMes);
  return ratio !== null && ratio >= 0.8 && ratio <= 1;
}

module.exports = { PLANS, getUsageRatio, isOverLimit, isNearLimit };
