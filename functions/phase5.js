/**
 * Tane Booking — Phase 5 Cloud Functions
 * Trial funnel, reviews, waitlist, blacklist, SaaS metrics
 * Required by index.js via: Object.assign(exports, require('./phase5'))
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated }  = require("firebase-functions/v2/firestore");
const { onSchedule }         = require("firebase-functions/v2/scheduler");
const { getFirestore }       = require("firebase-admin/firestore");
const { Resend }             = require("resend");
const templates              = require("./templates");

const db     = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY || "re_your_test_key");

const APP_URL    = "https://tane-restaurante-app.web.app";
const FROM_EMAIL = "Tane Booking <reservas@tanesolutions.com>";
const PLAN_PRICES = { basic: 29, pro: 59, trial: 0 };

async function getRestauranteData(restaurantId) {
  const snap = await db.collection("restaurants").doc(restaurantId).get();
  if (!snap.exists) throw new HttpsError("not-found", `Restaurante ${restaurantId} no encontrado.`);
  return { id: snap.id, ...snap.data() };
}

async function requireSuperAdmin(authCtx) {
  if (!authCtx?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const snap = await db.collection("users").doc(authCtx.uid).get();
  if (!snap.exists || snap.data().role !== "superadmin")
    throw new HttpsError("permission-denied", "Solo superadmin.");
}

async function requireAdmin(authCtx) {
  if (!authCtx?.uid) throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  const snap = await db.collection("users").doc(authCtx.uid).get();
  const role = snap.exists ? snap.data().role : null;
  if (!["admin", "superadmin"].includes(role))
    throw new HttpsError("permission-denied", "Sin permisos.");
  return { uid: authCtx.uid, ...snap.data() };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED: trialExpiryReminders  (09:00 diario Europe/Madrid)
// ─────────────────────────────────────────────────────────────────────────────
exports.trialExpiryReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Europe/Madrid" },
  async () => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const snap = await db.collection("restaurants")
      .where("plan", "==", "trial")
      .get();

    for (const doc of snap.docs) {
      const r = doc.data();
      if (!r.trial_ends_at || !r.email) continue;

      const trialEnd = r.trial_ends_at.toDate ? r.trial_ends_at.toDate() : new Date(r.trial_ends_at);
      const endDay   = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
      const diffDays = Math.round((endDay - today) / 86400000);

      const upgradeUrl = `${APP_URL}/precios`;
      let subject, html;

      if (diffDays === 7) {
        subject = "Tu prueba de Tane Booking termina en 7 dias";
        html    = templates.trialExpiry7Days(r.nombre, r.email, upgradeUrl);
      } else if (diffDays === 3) {
        subject = `Solo 3 dias de prueba restantes — ${r.nombre}`;
        html    = templates.trialExpiry3Days(r.nombre, r.email, upgradeUrl);
      } else if (diffDays === 1) {
        subject = "Tu prueba termina manana — activa tu plan";
        html    = templates.trialExpiry1Day(r.nombre, r.email, upgradeUrl);
      } else if (diffDays === -1) {
        subject = `Tu periodo de prueba ha finalizado — ${r.nombre}`;
        html    = templates.trialExpired(r.nombre, r.email, upgradeUrl);
        if (r.activo !== false) await doc.ref.update({ activo: false });
      } else {
        continue;
      }

      try {
        await resend.emails.send({ from: FROM_EMAIL, to: [r.email], subject, html });
        console.log(`[trialExpiry] D${diffDays} -> ${r.email}`);
      } catch (e) {
        console.error(`[trialExpiry] ${doc.id}:`, e.message);
      }
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED: reviewRequests  (22:00 diario Europe/Madrid)
// ─────────────────────────────────────────────────────────────────────────────
exports.reviewRequests = onSchedule(
  { schedule: "0 22 * * *", timeZone: "Europe/Madrid" },
  async () => {
    const now   = new Date();
    const today = now.toISOString().split("T")[0];

    const snap = await db.collection("reservas")
      .where("estado", "==", "confirmada")
      .get();

    const todayDocs = snap.docs.filter(d => {
      const rv = d.data();
      if (rv.review_sent) return false;
      const f = rv.fecha;
      if (!f) return false;
      const s = f.toDate ? f.toDate().toISOString().split("T")[0] : new Date(f).toISOString().split("T")[0];
      return s === today;
    });

    const restCache = {};
    for (const doc of todayDocs) {
      const r = doc.data();
      if (!r.restaurant_id || !r.email) continue;

      if (!restCache[r.restaurant_id]) {
        try { restCache[r.restaurant_id] = await getRestauranteData(r.restaurant_id); }
        catch { continue; }
      }
      const rest = restCache[r.restaurant_id];
      if (!rest.google_maps_url || !rest.activo) continue;

      try {
        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      [r.email],
          subject: `Como fue tu visita a ${rest.nombre}? Dejanos tu resena`,
          html:    templates.reviewRequest(r.nombre_cliente, rest, rest.google_maps_url),
        });
        await doc.ref.update({ review_sent: true });
        console.log(`[review] sent to ${r.email}`);
      } catch (e) {
        console.error(`[review] ${doc.id}:`, e.message);
      }
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: joinWaitlist
// ─────────────────────────────────────────────────────────────────────────────
exports.joinWaitlist = onCall(async (request) => {
  const { restaurant_id, nombre, email, telefono, fecha, hora, comensales } = request.data;
  if (!restaurant_id || !nombre || !email || !fecha || !hora || !comensales)
    throw new HttpsError("invalid-argument", "Faltan datos obligatorios.");

  const emailLower = email.toLowerCase().trim();

  const blSnap = await db.collection("blacklist")
    .where("restaurant_id", "==", restaurant_id)
    .where("email", "==", emailLower)
    .limit(1).get();
  if (!blSnap.empty) throw new HttpsError("permission-denied", "No es posible realizar esta solicitud.");

  const dupSnap = await db.collection("waitlist")
    .where("restaurant_id", "==", restaurant_id)
    .where("email", "==", emailLower)
    .where("fecha", "==", fecha)
    .where("estado", "==", "waiting")
    .limit(1).get();
  if (!dupSnap.empty) throw new HttpsError("already-exists", "Ya estas en la lista de espera para ese dia.");

  const rest = await getRestauranteData(restaurant_id);

  await db.collection("waitlist").add({
    restaurant_id,
    nombre:     nombre.trim(),
    email:      emailLower,
    telefono:   (telefono || "").trim(),
    fecha,
    hora,
    comensales: Number(comensales),
    estado:     "waiting",
    creado_en:  new Date(),
  });

  try {
    const fechaFmt = new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      [emailLower],
      subject: `Lista de espera — ${rest.nombre}`,
      html:    templates.waitlistConfirmation(nombre.trim(), fechaFmt, hora, rest),
    });
  } catch (e) {
    console.error("[joinWaitlist] email:", e.message);
  }

  return { ok: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER: onReservaCancelledNotifyWaitlist
// ─────────────────────────────────────────────────────────────────────────────
exports.onReservaCancelledNotifyWaitlist = onDocumentUpdated(
  "reservas/{reservaId}",
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();
    if (before.estado === after.estado || after.estado !== "cancelada") return;
    if (!after.restaurant_id || !after.fecha) return;

    const fechaStr = after.fecha.toDate
      ? after.fecha.toDate().toISOString().split("T")[0]
      : new Date(after.fecha).toISOString().split("T")[0];

    const waitSnap = await db.collection("waitlist")
      .where("restaurant_id", "==", after.restaurant_id)
      .where("fecha", "==", fechaStr)
      .where("estado", "==", "waiting")
      .orderBy("creado_en", "asc")
      .limit(1).get();

    if (waitSnap.empty) return;

    const waitDoc  = waitSnap.docs[0];
    const waitData = waitDoc.data();

    let rest;
    try { rest = await getRestauranteData(after.restaurant_id); }
    catch { return; }

    await waitDoc.ref.update({ estado: "notified", notificado_en: new Date() });

    const bookingUrl = `${APP_URL}/booking?id=${after.restaurant_id}`;
    const fechaFmt   = new Date(fechaStr + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

    try {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      [waitData.email],
        subject: `Se libero una mesa en ${rest.nombre}!`,
        html:    templates.waitlistNotification(waitData.nombre, fechaFmt, waitData.hora, bookingUrl, rest),
      });
      console.log(`[waitlist] notified ${waitData.email}`);
    } catch (e) {
      console.error("[waitlist] notify:", e.message);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: addToBlacklist / removeFromBlacklist
// ─────────────────────────────────────────────────────────────────────────────
exports.addToBlacklist = onCall(async (request) => {
  const caller = await requireAdmin(request.auth);
  const restaurantId = caller.role === "superadmin"
    ? (request.data.restaurant_id || caller.restaurant_id)
    : caller.restaurant_id;

  const { email, motivo } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email requerido.");

  const emailLower = email.toLowerCase().trim();
  const docId = `${restaurantId}_${emailLower.replace(/[^a-z0-9]/g, "_")}`;
  await db.collection("blacklist").doc(docId).set({
    restaurant_id: restaurantId,
    email:         emailLower,
    motivo:        motivo || "No-show reiterado",
    bloqueado_por: request.auth.uid,
    creado_en:     new Date(),
  });
  return { ok: true };
});

exports.removeFromBlacklist = onCall(async (request) => {
  const caller = await requireAdmin(request.auth);
  const restaurantId = caller.role === "superadmin"
    ? (request.data.restaurant_id || caller.restaurant_id)
    : caller.restaurant_id;

  const { email } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email requerido.");

  const emailLower = email.toLowerCase().trim();
  const docId = `${restaurantId}_${emailLower.replace(/[^a-z0-9]/g, "_")}`;
  await db.collection("blacklist").doc(docId).delete();
  return { ok: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// CALLABLE: getSaasMetrics  (superadmin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.getSaasMetrics = onCall(async (request) => {
  await requireSuperAdmin(request.auth);

  const restSnap = await db.collection("restaurants").get();
  const restaurants = restSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const trials  = restaurants.filter(r => r.plan === "trial" && r.activo !== false);
  const paid    = restaurants.filter(r => ["basic", "pro"].includes(r.plan) && r.activo !== false);
  const churned = restaurants.filter(r => r.activo === false);
  const mrr     = paid.reduce((s, r) => s + (PLAN_PRICES[r.plan] || 0), 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSignups = restaurants.filter(r => {
    const d = r.creado_en?.toDate ? r.creado_en.toDate() : new Date(r.creado_en || 0);
    return d >= thirtyDaysAgo;
  }).length;

  const convRate = paid.length + churned.length > 0
    ? Math.round((paid.length / (paid.length + churned.length)) * 100)
    : 0;

  return {
    mrr,
    total:        restaurants.length,
    trials:       trials.length,
    paid:         paid.length,
    churned:      churned.length,
    recentSignups,
    convRate,
    byPlan: {
      basic: paid.filter(r => r.plan === "basic").length,
      pro:   paid.filter(r => r.plan === "pro").length,
    },
  };
});
