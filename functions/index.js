const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError, onRequest }        = require("firebase-functions/v2/https");
const { onSchedule }       = require("firebase-functions/v2/scheduler");
const { initializeApp }    = require("firebase-admin/app");
const { getFirestore }     = require("firebase-admin/firestore");
const { getAuth }          = require("firebase-admin/auth");
const { Resend }           = require("resend");
const Stripe               = require("stripe");
const templates            = require("./templates");
const { PLANS, isOverLimit, isNearLimit }    = require("./plans");
const { getTurnTime, findBestTable }         = require("./reservationUtils");

initializeApp();
const db     = getFirestore();
const auth   = getAuth();
const resend = new Resend(process.env.RESEND_API_KEY || "re_your_test_key");

// Stripe is optional — only active when STRIPE_SECRET_KEY is set
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

if (stripe && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn("[STARTUP] ⚠️  STRIPE_WEBHOOK_SECRET no configurado — los webhooks de Stripe fallarán.");
}
if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_your_test_key") {
  console.warn("[STARTUP] ⚠️  RESEND_API_KEY no configurado — los emails no se enviarán.");
}

const APP_URL     = "https://tane-restaurante-app.web.app";
const FROM_EMAIL  = "Tane Booking <reservas@tanesolutions.com>";

// NOTIFY_EMAILS: comma-separated list of admin emails to receive alerts.
// e.g. "admin@tanesolutions.com,otro@empresa.com"
const NOTIFY_EMAILS = (process.env.NOTIFY_EMAILS || "admin@tanesolutions.com")
  .split(",").map(e => e.trim()).filter(Boolean);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireSuperAdmin(authContext) {
  if (!authContext?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const snap = await db.collection("users").doc(authContext.uid).get();
  if (!snap.exists || snap.data().role !== "superadmin") {
    throw new HttpsError("permission-denied", "Solo el superadmin puede realizar esta acción.");
  }
}

async function getRestauranteData(restaurantId) {
  if (!restaurantId) return {};
  try {
    const snap = await db.collection("restaurants").doc(restaurantId).get();
    return snap.exists ? { id: restaurantId, ...snap.data() } : {};
  } catch (err) {
    console.warn("[fn] Could not fetch restaurant:", err.message);
    return {};
  }
}

/**
 * Rate limiter using Firestore sliding-window counter.
 * key        — unique identifier (e.g. "booking_{email}_{restaurantId}")
 * maxPerWindow — max allowed within the window
 * windowMs   — window duration in ms (default 1 hour)
 * Returns true if the request should be blocked.
 */
async function checkRateLimit(key, maxPerWindow = 5, windowMs = 3_600_000) {
  const safeKey = key.replace(/[^a-zA-Z0-9_@.-]/g, "_").slice(0, 200);
  const ref     = db.collection("rate_limits").doc(safeKey);
  const now     = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const winStart = data?.window_start?.toMillis?.() ?? data?.window_start ?? 0;

    if (!data || now - winStart > windowMs) {
      // New window: start fresh
      tx.set(ref, { count: 1, window_start: new Date(now) });
      return false;
    }
    if (data.count >= maxPerWindow) return true; // Blocked
    tx.update(ref, { count: data.count + 1 });
    return false;
  });
}

/** Count reservations this calendar month for a restaurant */
async function countReservasMes(restaurantId) {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const snap  = await db.collection("reservas")
    .where("restaurant_id", "==", restaurantId)
    .where("creado_en",     ">=", start)
    .where("creado_en",     "<",  end)
    .count()
    .get();
  return snap.data().count;
}

/** Send alert email to superadmin */
async function sendLimitAlert(restaurante, tipo) {
  // Global pause or per-client pause does not affect superadmin limit alerts
  const plan      = restaurante.plan || "trial";
  const planData  = PLANS[plan] || PLANS.trial;
  const limite    = planData.reservas_mes;
  const count     = await countReservasMes(restaurante.id);
  const adminUrl  = `${APP_URL}/admin/dashboard`;

  const subject = tipo === "superado"
    ? `⚠️ ${restaurante.nombre} ha superado su límite de reservas`
    : `ℹ️ ${restaurante.nombre} se acerca a su límite de reservas`;

  const html = tipo === "superado"
    ? templates.alertaLimiteSuperado(restaurante, plan, count, limite, adminUrl)
    : templates.alertaLimiteCercano(restaurante, plan, count, limite, adminUrl);

  await resend.emails.send({ from: FROM_EMAIL, to: NOTIFY_EMAILS, subject, html });
  console.log(`[limit-alert] ${tipo} sent for ${restaurante.id} (${count}/${limite})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE TRIGGER: onReservaCreate — soft limit monitoring
// ─────────────────────────────────────────────────────────────────────────────
exports.onReservaCreate = onDocumentCreated("reservas/{reservaId}", async (event) => {
  const data = event.data.data();
  if (!data?.restaurant_id) return;

  const restaurante = await getRestauranteData(data.restaurant_id);
  const plan        = restaurante.plan || "trial";
  const planData    = PLANS[plan] || PLANS.trial;

  // ── Soft limit monitoring ──────────────────────────────────────────────────
  if (planData.reservas_mes !== Infinity) {
    const count = await countReservasMes(data.restaurant_id);
    if (isOverLimit(plan, count)) {
      const limite = planData.reservas_mes;
      if (count === limite + 1) {
        await sendLimitAlert(restaurante, "superado").catch(console.error);
      }
    } else if (isNearLimit(plan, count)) {
      const limite    = planData.reservas_mes;
      const threshold = Math.ceil(limite * 0.8);
      if (count === threshold) {
        await sendLimitAlert(restaurante, "cercano").catch(console.error);
      }
    }
  }

  if (!restaurante.nombre) {
    console.warn(`[email] restaurante.nombre vacío para restaurant_id=${data.restaurant_id} — revisar /restaurants/${data.restaurant_id} en Firestore`);
  }

  // ── Email de solicitud recibida si la reserva está pendiente (modo manual) ──
  // En modo manual el estado inicial es "pendiente": enviamos acuse de recibo.
  if (data.estado === "pendiente" && data.email && planData.emails && !restaurante.pausa_emails) {
    const { nombre_cliente, email, fecha, hora } = data;
    const pax     = data.pax || data.personas || 1;
    const dateStr = (fecha.toDate ? fecha.toDate() : new Date(fecha))
      .toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    try {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Hemos recibido tu solicitud — ${restaurante.nombre || "el restaurante"}`,
        html:    templates.solicitudRecibida(nombre_cliente, dateStr, hora, pax, restaurante),
      });
      console.log(`[email] solicitud-recibida → ${email}`);
    } catch (e) {
      console.error("[email] solicitud-recibida:", e);
    }
  }

  // ── Email de confirmación si la reserva nació ya como "confirmada" ─────────
  // (modo automático: onReservaUpdate no se dispara en creaciones)
  if (data.estado === "confirmada" && data.email && planData.emails && !restaurante.pausa_emails) {
    const { nombre_cliente, email, fecha, hora } = data;
    const dateStr = (fecha.toDate ? fecha.toDate() : new Date(fecha))
      .toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    const cancelLink = `${APP_URL}/cancel?id=${event.params.reservaId}`;
    try {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `¡Tu mesa en ${restaurante.nombre || "el restaurante"} está confirmada!`,
        html:    templates.reservaConfirmada(nombre_cliente, dateStr, hora, cancelLink, restaurante),
      });
      console.log(`[email] auto-confirmada → ${email}`);
    } catch (e) {
      console.error("[email] auto-confirmada:", e);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE TRIGGER: onReservaUpdate — email confirmación/cancelación
// ─────────────────────────────────────────────────────────────────────────────
exports.onReservaUpdate = onDocumentUpdated("reservas/{reservaId}", async (event) => {
  const dataBefore = event.data.before.data();
  const dataAfter  = event.data.after.data();

  // ── Audit log: always record state changes ─────────────────────────────────
  if (dataBefore.estado !== dataAfter.estado) {
    db.collection("reservation_logs").add({
      reserva_id:    event.params.reservaId,
      restaurant_id: dataAfter.restaurant_id,
      cliente:       dataAfter.nombre_cliente,
      email:         dataAfter.email,
      campo:         "estado",
      valor_antes:   dataBefore.estado,
      valor_despues: dataAfter.estado,
      modificado_por: dataAfter.updated_by || null, // set by admin UI
      modificado_en: new Date(),
    }).catch(err => console.error("[audit]", err.message));
  }

  if (dataBefore.estado === dataAfter.estado) return;

  const { nombre_cliente, email, fecha, hora, restaurant_id } = dataAfter;
  const restaurante = await getRestauranteData(restaurant_id);
  const plan        = restaurante.plan || "trial";
  const planData    = PLANS[plan] || PLANS.trial;

  // Only send emails if the plan allows it and they are not manually paused
  if (!planData.emails || restaurante.pausa_emails) return;

  if (!restaurante.nombre) {
    console.warn(`[email] restaurante.nombre vacío para restaurant_id=${restaurant_id} — revisar /restaurants/${restaurant_id} en Firestore`);
  }

  const dateStr = (fecha.toDate ? fecha.toDate() : new Date(fecha))
    .toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' });

  let subject, html;
  if (dataAfter.estado === "confirmada") {
    const cancelLink = `${APP_URL}/cancel?id=${event.params.reservaId}`;
    subject = `¡Tu mesa en ${restaurante.nombre || "el restaurante"} está confirmada!`;
    html    = templates.reservaConfirmada(nombre_cliente, dateStr, hora, cancelLink, restaurante);
  } else if (dataAfter.estado === "cancelada") {
    // no-show es un estado interno del admin — NO se notifica al cliente
    subject = `Actualización de tu reserva en ${restaurante.nombre || "el restaurante"}`;
    html    = templates.reservaCancelada(nombre_cliente, dateStr, hora, restaurante);
  } else {
    // pendiente, no-show, etc. → sin email al cliente
    return;
  }

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: [email], subject, html });
    console.log(`[email] ${dataAfter.estado} → ${email}`);
  } catch (e) {
    console.error(`[email] ${dataAfter.estado}:`, e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: createStaffUser
// ─────────────────────────────────────────────────────────────────────────────
exports.createStaffUser = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const { email, role, restaurant_id } = request.data;
  if (!email || !role || !restaurant_id)
    throw new HttpsError("invalid-argument", "Faltan parámetros: email, role, restaurant_id.");
  if (!["admin", "staff"].includes(role))
    throw new HttpsError("invalid-argument", "El rol debe ser 'admin' o 'staff'.");

  // Verificar rol del invocador
  const callerSnap       = await db.collection("users").doc(request.auth.uid).get();
  const caller           = callerSnap.exists ? callerSnap.data() : null;
  const callerSuperAdmin = caller?.role === "superadmin";
  const callerAdmin      = caller?.role === "admin";

  if (!callerSuperAdmin && !callerAdmin)
    throw new HttpsError("permission-denied", "Solo admin o superadmin puede crear usuarios.");

  // Admin solo puede crear 'staff' para su propio restaurante
  if (callerAdmin && !callerSuperAdmin) {
    if (role !== "staff")
      throw new HttpsError("permission-denied", "Admin solo puede crear usuarios con rol 'staff'.");
    if (caller.restaurant_id !== restaurant_id)
      throw new HttpsError("permission-denied", "Solo puedes gestionar usuarios de tu propio restaurante.");
  }

  const rand    = Math.random().toString(36).slice(2, 6).toUpperCase();
  const tempPwd = `Tane-${rand}-${new Date().getFullYear()}!`;
  let uid, isNewUser = true;

  try {
    const userRecord = await auth.createUser({ email, password: tempPwd });
    uid = userRecord.uid;
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      const existing = await auth.getUserByEmail(email);
      uid       = existing.uid;
      isNewUser = false;
    } else {
      throw new HttpsError("internal", `Error al crear la cuenta: ${err.message}`);
    }
  }

  await db.collection("users").doc(uid).set(
    { email, role, restaurant_id, updated_en: new Date() },
    { merge: true }
  );

  // Enviar email de activación/acceso siempre — tanto a nuevos como a usuarios existentes
  // cuyo rol/restaurante acaba de ser actualizado.
  try {
    const restaurante = await getRestauranteData(restaurant_id);
    const setPwdLink  = await auth.generatePasswordResetLink(email, {
      url: `${APP_URL}/admin/dashboard`,
    });
    if (!restaurante.pausa_emails) {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      [email],
        subject: `Acceso a ${restaurante.nombre || "el panel de gestión"} — Tane Booking`,
        html:    templates.activacionCuenta(email, setPwdLink, APP_URL + "/admin/dashboard", restaurante, role),
      });
      console.log(`[createStaffUser] activation email → ${email} (isNewUser=${isNewUser})`);
    } else {
      console.log(`[createStaffUser] email skipped (paused) → ${email}`);
    }
  } catch (e) {
    console.error("[createStaffUser] email failed:", e);
  }

  return { uid, email, role, isNewUser };
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: revokeStaffUser
// ─────────────────────────────────────────────────────────────────────────────
exports.revokeStaffUser = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Falta uid.");

  const callerSnap       = await db.collection("users").doc(request.auth.uid).get();
  const caller           = callerSnap.exists ? callerSnap.data() : null;
  const callerSuperAdmin = caller?.role === "superadmin";
  const callerAdmin      = caller?.role === "admin";

  if (!callerSuperAdmin && !callerAdmin)
    throw new HttpsError("permission-denied", "Solo admin o superadmin puede revocar usuarios.");

  // Admin solo puede revocar staff de su propio restaurante
  if (callerAdmin && !callerSuperAdmin) {
    const targetSnap = await db.collection("users").doc(uid).get();
    const target     = targetSnap.exists ? targetSnap.data() : null;
    if (target?.role !== "staff")
      throw new HttpsError("permission-denied", "Admin solo puede revocar usuarios con rol 'staff'.");
    if (target?.restaurant_id !== caller.restaurant_id)
      throw new HttpsError("permission-denied", "Solo puedes gestionar usuarios de tu propio restaurante.");
  }

  await db.collection("users").doc(uid).set({ role: null, restaurant_id: null }, { merge: true });
  return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: resetStaffPassword
// Genera un enlace de restablecimiento y lo envía por email al usuario.
// ─────────────────────────────────────────────────────────────────────────────
exports.resetStaffPassword = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const { uid } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "Falta uid.");

  const isSelfReset = request.auth.uid === uid;

  // Cualquier usuario puede resetear su propia contraseña.
  // Para resetear la de otro, se necesita ser admin o superadmin.
  if (!isSelfReset) {
    const callerSnap   = await db.collection("users").doc(request.auth.uid).get();
    const caller       = callerSnap.exists ? callerSnap.data() : null;
    const isSuperAdmin = caller?.role === "superadmin";
    const isAdmin      = caller?.role === "admin";

    if (!isSuperAdmin && !isAdmin)
      throw new HttpsError("permission-denied", "Solo admin o superadmin puede resetear contraseñas de otros usuarios.");

    // Admin solo puede resetear contraseñas de staff de su propio restaurante
    if (isAdmin && !isSuperAdmin) {
      const targetSnap = await db.collection("users").doc(uid).get();
      const target     = targetSnap.exists ? targetSnap.data() : null;
      if (target?.restaurant_id !== caller.restaurant_id)
        throw new HttpsError("permission-denied", "No tienes permiso sobre este usuario.");
      if (target?.role !== "staff")
        throw new HttpsError("permission-denied", "Solo puedes resetear contraseñas de staff.");
    }
  }

  // Obtener datos del usuario objetivo en Firestore
  const targetSnap = await db.collection("users").doc(uid).get();
  if (!targetSnap.exists) throw new HttpsError("not-found", "Usuario no encontrado.");
  const target = targetSnap.data();

  // Obtener el email desde Firebase Auth
  const authUser   = await auth.getUser(uid);
  const { email }  = authUser;

  // Generar enlace de restablecimiento de Firebase Auth
  const resetLink  = await auth.generatePasswordResetLink(email, {
    url: `${APP_URL}/admin/dashboard`,
  });

  // Obtener datos del restaurante para el branding del email
  const restaurante = await getRestauranteData(target.restaurant_id);

  // Enviar email vía Resend (si no está pausado)
  if (!restaurante.pausa_emails) {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      [email],
      subject: `Restablece tu contraseña — ${restaurante.nombre || "Tane Booking"}`,
      html:    templates.restablecimientoContrasena(email, resetLink, restaurante),
    });
    console.log(`[resetStaffPassword] reset email → ${email}`);
  } else {
    console.log(`[resetStaffPassword] email skipped (paused) → ${email}`);
  }
  return { success: true, email };
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: createCheckoutSession
// Creates a Stripe Checkout session for plan upgrade.
// ─────────────────────────────────────────────────────────────────────────────
exports.createCheckoutSession = onCall(async (request) => {
  await requireSuperAdmin(request.auth);
  if (!stripe) throw new HttpsError("failed-precondition", "Stripe no está configurado.");

  const { restaurant_id, plan } = request.data;
  if (!restaurant_id || !["basic", "pro"].includes(plan))
    throw new HttpsError("invalid-argument", "Faltan parámetros: restaurant_id, plan.");

  const planData = PLANS[plan];
  if (!planData.stripe_price_id)
    throw new HttpsError("failed-precondition", `Precio de Stripe no configurado para el plan ${plan}.`);

  const restaurante = await getRestauranteData(restaurant_id);

  // Get or create Stripe customer linked to this restaurant
  let customerId = restaurante.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name:     restaurante.nombre,
      email:    restaurante.email || NOTIFY_EMAILS[0],
      metadata: { restaurant_id },
    });
    customerId = customer.id;
    await db.collection("restaurants").doc(restaurant_id).update({
      stripe_customer_id: customerId,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer:             customerId,
    mode:                 "subscription",
    payment_method_types: ["card"],
    line_items: [{
      price:    planData.stripe_price_id,
      quantity: 1,
    }],
    metadata:   { restaurant_id, plan },
    success_url: `${APP_URL}/admin/dashboard?upgrade=success&plan=${plan}`,
    cancel_url:  `${APP_URL}/admin/dashboard?upgrade=cancelled`,
  });

  console.log(`[checkout] session created for ${restaurant_id} → ${plan}`);
  return { url: session.url };
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP: stripeWebhook
// Handles subscription lifecycle events from Stripe.
// ─────────────────────────────────────────────────────────────────────────────
exports.stripeWebhook = onRequest(async (req, res) => {
  if (!stripe) { res.status(503).send("Stripe not configured"); return; }

  const sig     = req.headers["stripe-signature"];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch (err) {
    console.error("[webhook] signature failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const session      = event.data.object;
  const restaurant_id = session.metadata?.restaurant_id;
  const plan          = session.metadata?.plan;

  switch (event.type) {
    case "checkout.session.completed":
      if (restaurant_id && plan) {
        await db.collection("restaurants").doc(restaurant_id).update({
          plan,
          stripe_subscription_id: session.subscription,
          plan_activo_desde:      new Date(),
        });
        console.log(`[webhook] ${restaurant_id} upgraded to ${plan}`);
      }
      break;

    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      // Downgrade to trial when subscription cancelled
      const sub = session; // subscription object
      const snap = await db.collection("restaurants")
        .where("stripe_subscription_id", "==", sub.id)
        .limit(1).get();
      if (!snap.empty) {
        await snap.docs[0].ref.update({ plan: "trial", stripe_subscription_id: null });
        console.log(`[webhook] subscription cancelled → downgraded to trial`);
      }
      break;
    }

    default:
      console.log(`[webhook] unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: getPlanUsage
// Returns current month usage for a restaurant (for the admin UI).
// ─────────────────────────────────────────────────────────────────────────────
exports.getPlanUsage = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");

  const { restaurant_id } = request.data;
  if (!restaurant_id) throw new HttpsError("invalid-argument", "Falta restaurant_id.");

  const [restaurante, reservasMes] = await Promise.all([
    getRestauranteData(restaurant_id),
    countReservasMes(restaurant_id),
  ]);

  const plan     = restaurante.plan || "trial";
  const planData = PLANS[plan] || PLANS.trial;

  // Count users
  const usersSnap = await db.collection("users")
    .where("restaurant_id", "==", restaurant_id)
    .count().get();
  const usuariosCount = usersSnap.data().count;

  // Count mesas
  const mesasSnap = await db.collection("mesas")
    .where("restaurant_id", "==", restaurant_id)
    .count().get();
  const mesasCount = mesasSnap.data().count;

  return {
    plan,
    planData: {
      ...planData,
      reservas_mes: planData.reservas_mes === Infinity ? null : planData.reservas_mes,
      mesas:        planData.mesas        === Infinity ? null : planData.mesas,
      usuarios:     planData.usuarios     === Infinity ? null : planData.usuarios,
    },
    uso: {
      reservas_mes: reservasMes,
      mesas:        mesasCount,
      usuarios:     usuariosCount,
    },
    stripe_customer_id:      restaurante.stripe_customer_id      || null,
    stripe_subscription_id:  restaurante.stripe_subscription_id  || null,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: createReserva
// Secure, server-side booking creation with:
//   - Input validation
//   - Rate limiting (5 attempts/hour per email+restaurant)
//   - Duplicate check (same email + date)
//   - Server-side table assignment (mirrors frontend algorithm)
// Replaces direct client-side addDoc for security and reliability.
// ─────────────────────────────────────────────────────────────────────────────
exports.createReserva = onCall(async (request) => {
  const {
    restaurant_id, nombre_cliente, email, telefono,
    fecha, hora, comensales, comentarios, marketing_consent,
  } = request.data;

  // ── 1. Input validation ────────────────────────────────────────────────────
  if (!restaurant_id) throw new HttpsError("invalid-argument", "Falta restaurant_id.");
  const nombreTrim   = (nombre_cliente ?? "").trim();
  const emailTrim    = (email          ?? "").trim().toLowerCase();
  const telefonoTrim = (telefono       ?? "").trim();

  if (!nombreTrim)   throw new HttpsError("invalid-argument", "El nombre es obligatorio.");
  if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim))
    throw new HttpsError("invalid-argument", "El email no es válido.");
  if (!telefonoTrim) throw new HttpsError("invalid-argument", "El teléfono es obligatorio.");
  if (!fecha || !hora)
    throw new HttpsError("invalid-argument", "Fecha y hora son obligatorias.");

  // ── 2. Past date/time check ───────────────────────────────────────────────
  const selectedDateTime = new Date(`${fecha}T${hora}:00`);
  if (isNaN(selectedDateTime.getTime()) || selectedDateTime <= new Date())
    throw new HttpsError("failed-precondition", "La fecha y hora seleccionadas ya han pasado.");

  // ── 3. Rate limit: max 5 booking attempts/hour per email+restaurant ────────
  const rateLimitKey = `booking_${emailTrim}_${restaurant_id}`;
  const isLimited    = await checkRateLimit(rateLimitKey, 5, 3_600_000);
  if (isLimited)
    throw new HttpsError("resource-exhausted", "Demasiadas solicitudes. Inténtalo en unos minutos.");

  // ── 4. Restaurant validation ──────────────────────────────────────────────
  const restaurante = await getRestauranteData(restaurant_id);
  if (!restaurante.id) throw new HttpsError("not-found", "Restaurante no encontrado.");

  const plan     = restaurante.plan || "trial";
  const planData = PLANS[plan] || PLANS.trial;

  // ── 5. Duplicate check (same email + date, non-cancelled) ─────────────────
  const dupSnap = await db.collection("reservas")
    .where("email", "==", emailTrim)
    .get();
  const hasDuplicate = dupSnap.docs.some(d => {
    const r = d.data();
    if (!r.restaurant_id || r.restaurant_id !== restaurant_id) return false;
    if (["cancelada", "no-show"].includes(r.estado)) return false;
    const reservaDate = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
    return reservaDate.toDateString() === selectedDateTime.toDateString();
  });
  if (hasDuplicate)
    throw new HttpsError("already-exists", "Ya existe una reserva para este día con ese email.");

  // ── 6. Table assignment ───────────────────────────────────────────────────
  const pax      = Math.max(1, Math.min(Number(comensales) || 1, 100));
  const duracion = getTurnTime(pax);

  const fechaStart = new Date(`${fecha}T00:00:00`);
  const fechaEnd   = new Date(`${fecha}T23:59:59`);

  const [mesasSnap, resSnap] = await Promise.all([
    db.collection("mesas").where("restaurant_id", "==", restaurant_id).get(),
    db.collection("reservas")
      .where("restaurant_id", "==", restaurant_id)
      .where("fecha", ">=", fechaStart)
      .where("fecha", "<=", fechaEnd)
      .get(),
  ]);

  const mesas         = mesasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const reservasDelDia = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const modoAuto  = (restaurante.modo_confirmacion ?? "auto") === "auto";
  const bestTable = modoAuto ? findBestTable(mesas, pax, hora, reservasDelDia) : null;

  // ── 7. Create reservation ─────────────────────────────────────────────────
  const reservaData = {
    restaurant_id,
    nombre_cliente:    nombreTrim,
    email:             emailTrim,
    telefono:          telefonoTrim,
    fecha:             selectedDateTime,
    hora,
    comensales:        pax,
    comentarios:       (comentarios ?? "").trim(),
    marketing_consent: Boolean(marketing_consent),
    estado:            bestTable ? "confirmada" : "pendiente",
    mesa_id:           bestTable?.id ?? null,
    duracion_min:      duracion,
    creado_en:         new Date(),
    notas:             "",
  };

  const docRef = await db.collection("reservas").add(reservaData);
  console.log(`[createReserva] ${docRef.id} → ${reservaData.estado} (${restaurant_id})`);

  return {
    id:        docRef.id,
    confirmed: !!bestTable,
    mesa:      bestTable?.nombre ?? null,
    hora,
    pax,
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED: recordatoriosReservas
// Runs daily at 10:00 (Europe/Madrid) and sends 24h reminder emails
// to confirmed reservations for tomorrow (plan Pro only).
// ─────────────────────────────────────────────────────────────────────────────
exports.recordatoriosReservas = onSchedule(
  { schedule: "0 10 * * *", timeZone: "Europe/Madrid" },
  async () => {
    const manana      = new Date();
    manana.setDate(manana.getDate() + 1);
    const startManana = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate(), 0,  0,  0);
    const endManana   = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate(), 23, 59, 59);

    const snap = await db.collection("reservas")
      .where("estado", "==", "confirmada")
      .where("fecha", ">=", startManana)
      .where("fecha", "<=", endManana)
      .get();

    console.log(`[recordatorio] ${snap.docs.length} reservas confirmadas para mañana`);

    for (const doc of snap.docs) {
      const r = doc.data();
      try {
        const restaurante = await getRestauranteData(r.restaurant_id);
        const planData    = PLANS[restaurante.plan || "trial"] || PLANS.trial;

        if (!planData.recordatorio || restaurante.pausa_emails) continue;

        const dateStr = (r.fecha.toDate ? r.fecha.toDate() : new Date(r.fecha))
          .toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" });

        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      [r.email],
          subject: `Recordatorio: tu reserva en ${restaurante.nombre || "el restaurante"} es mañana`,
          html:    templates.recordatorio(r.nombre_cliente, dateStr, r.hora, restaurante),
        });
        console.log(`[recordatorio] → ${r.email} (${doc.id})`);
      } catch (e) {
        console.error(`[recordatorio] error doc ${doc.id}:`, e.message);
      }
    }
  }
);
