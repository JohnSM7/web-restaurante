<template>
  <div class="booking-form-wrap">

    <!-- Success screen -->
    <div v-if="bookingResult" ref="successRef" class="success-screen" role="alert">
      <div class="success-check" :class="bookingResult.confirmed ? 'success-check--confirmed' : ''">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p class="success-title">
        {{ bookingResult.confirmed ? '¡Reserva confirmada!' : '¡Solicitud recibida!' }}
      </p>
      <p v-if="bookingResult.confirmed" class="success-detail">
        {{ bookingResult.mesa }} · {{ bookingResult.pax }} personas · {{ bookingResult.hora }}h
      </p>
      <p class="success-sub">
        {{ bookingResult.confirmed
            ? 'Recibirás un email de confirmación en breve.'
            : 'Revisaremos tu solicitud y te confirmaremos por email.' }}
      </p>
    </div>

    <template v-else>

      <header class="booking-header">
        <p class="booking-eyebrow">Reservation</p>
        <h1 class="booking-title">
          Mesa para <em>{{ paxTitle }}?</em>
        </h1>
        <p class="booking-subtitle">
          Únete a nosotros para una experiencia culinaria mediterránea
          inolvidable. Cada detalle está cuidado para deleitar tus sentidos.
        </p>
      </header>

      <form @submit.prevent="submitBooking" novalidate>

      <!-- Global error -->
      <div v-if="errorMsg" class="form-error-banner" role="alert">
        {{ errorMsg }}
      </div>

      <!-- ── STEP 1: Personal data ── -->
      <fieldset class="form-section">
        <div class="form-grid form-grid--2">
          <div class="field-group">
            <label class="field-label" for="nombre">Nombre completo</label>
            <input id="nombre" v-model="form.nombre_cliente" type="text" required
              class="field-input" placeholder="Tu nombre completo"
              autocomplete="name">
          </div>
          <div class="field-group">
            <label class="field-label" for="email">Correo electrónico</label>
            <input id="email" v-model="form.email" type="email" required
              class="field-input" placeholder="email@ejemplo.com"
              autocomplete="email">
          </div>
        </div>
      </fieldset>

      <!-- ── STEP 2: Booking details ── -->
      <fieldset class="form-section">
        <div class="form-grid form-grid--3">

          <div class="field-group">
            <label class="field-label" for="telefono">Teléfono</label>
            <input id="telefono" v-model="form.telefono" type="tel" required
              class="field-input" placeholder="+34 600 000 000"
              autocomplete="tel">
          </div>

          <div class="field-group">
            <label class="field-label" for="fecha">Fecha</label>
            <input id="fecha" v-model="form.fecha" type="date" required
              :min="minDate" class="field-input">
          </div>

          <!-- Pax stepper -->
          <div class="field-group">
            <label class="field-label">Comensales</label>
            <div class="pax-stepper">
              <button type="button" @click="decrementPax" :disabled="form.comensales <= 1"
                class="pax-btn" aria-label="Reducir comensales">−</button>
              <span class="pax-count">{{ form.comensales }}</span>
              <button type="button" @click="incrementPax" :disabled="form.comensales >= 20"
                class="pax-btn" aria-label="Aumentar comensales">+</button>
            </div>
            <p class="field-hint">máx. 20 personas</p>
          </div>
        </div>
      </fieldset>

      <!-- ── STEP 3: Time slots ── -->
      <fieldset class="form-section">
        <label class="field-label">Hora del servicio</label>

        <!-- Loading slots -->
        <div v-if="loadingSlots" class="slots-loading">
          <div class="slots-skeleton" v-for="i in 10" :key="i"></div>
        </div>

        <!-- Slots grid -->
        <div v-else-if="!form.fecha" class="slots-hint">
          Selecciona una fecha para ver disponibilidad de horarios.
        </div>

        <div v-else-if="computedSlots.length === 0" class="slots-empty">
          No hay horarios disponibles para hoy. Por favor, selecciona otra fecha.
        </div>

        <div v-else class="slots-grid">
          <button
            v-for="slot in computedSlots"
            :key="slot.hora"
            type="button"
            @click="slot.available && selectHora(slot.hora)"
            :disabled="!slot.available"
            :class="[
              'time-slot',
              form.hora === slot.hora && 'time-slot--selected',
              !slot.available && 'time-slot--full',
              slot.available && slot.remaining <= 1 && 'time-slot--limited',
            ]"
            :title="slot.available ? `${slot.remaining} mesa${slot.remaining !== 1 ? 's' : ''} disponible${slot.remaining !== 1 ? 's' : ''}` : 'Completo'"
            :aria-pressed="form.hora === slot.hora">
            <span class="slot-time">{{ slot.hora }}</span>
            <span v-if="slot.available && slot.remaining <= 1" class="slot-tag">última</span>
            <span v-else-if="!slot.available" class="slot-tag">completo</span>
          </button>
        </div>

        <!-- Hidden input for form validation -->
        <input type="hidden" v-model="form.hora" required>
        <p v-if="showHoraError" class="field-error">Por favor, selecciona una hora.</p>
      </fieldset>

      <!-- ── STEP 4: Special requests ── -->
      <fieldset class="form-section">
        <div class="field-group">
          <label class="field-label" for="comentarios">
            Peticiones especiales
            <span class="field-label-opt">(opcional)</span>
          </label>
          <textarea id="comentarios" v-model="form.comentarios"
            class="field-input field-textarea"
            placeholder="Ej: Tenemos un comensal celíaco, preferimos mesa cerca de la ventana, celebración de cumpleaños…"
            rows="3"></textarea>
        </div>
      </fieldset>

      <!-- ── GDPR consent ── -->
      <fieldset class="form-section form-section--consent">
        <label class="consent-label">
          <input v-model="form.marketing_consent" type="checkbox"
            id="marketing" class="consent-checkbox">
          <span class="consent-text">
            Deseo recibir novedades, promociones e invitaciones exclusivas de
            <strong>{{ restaurantName || 'este restaurante' }}</strong>.
            <span class="consent-hint">Puedes darte de baja en cualquier momento.</span>
          </span>
        </label>
      </fieldset>

      <!-- ── Submit ── -->
      <div class="form-submit-area">
        <button type="submit" :disabled="submitting" class="submit-btn">
          <span v-if="submitting" class="submit-spinner"></span>
          {{ submitting ? 'ENVIANDO SOLICITUD…' : 'CONFIRMAR RESERVA' }}
        </button>
        <p class="form-legal">
          Al confirmar, aceptas nuestra
          <a href="#" class="legal-link">Política de Privacidad</a>
          y los términos del servicio.
          Los datos serán tratados según la LOPDGDD.
        </p>
      </div>

    </form>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { collection, addDoc, getDocs, getDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import {
  getTurnTime, BUFFER_MIN, timeToMinutes,
  findBestTable, countAvailableTables,
} from '../lib/reservationUtils.ts';

const props = defineProps({
  restaurantId: { type: String, default: 'the-editorial' }
});

// ─── Multi-tenant: resolve restaurant from URL param at runtime ───────────────
// SSG pre-renders with the default prop, but at runtime the URL ?id= overrides it.
// URL format: /booking?id=restaurante-abc  or  /booking-widget?id=restaurante-abc
// Start with the prop value; overridden at runtime by ?id= URL param
const resolvedId     = ref(props.restaurantId);
const restaurantName = ref('');

// ─── Default schedule config (overridden by Firestore per restaurant) ────────
const DEFAULT_HORARIOS = {
  comida:   { inicio: '13:00', fin: '17:00' },
  cena:     { inicio: '20:00', fin: '00:00' },
  intervalo: 30,
};
const restaurantConfig = ref({ ...DEFAULT_HORARIOS });

/** Generate HH:MM slots from inicio to fin (exclusive) at `intervalo` minutes */
const generateSlots = (inicio, fin, intervalo) => {
  const slots = [];
  let cur = timeToMinutes(inicio);
  const end = fin === '00:00' ? 1440 : timeToMinutes(fin);
  while (cur < end) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
    cur += intervalo;
  }
  return slots;
};

/** All raw time slots derived from restaurant's schedule config */
const computedHoras = computed(() => {
  const cfg = restaurantConfig.value;
  return [
    ...generateSlots(cfg.comida.inicio, cfg.comida.fin, cfg.intervalo),
    ...generateSlots(cfg.cena.inicio,   cfg.cena.fin,   cfg.intervalo),
  ];
});

onMounted(async () => {
  // Read ?id= from URL — works at runtime even in SSG builds
  const urlId = new URLSearchParams(window.location.search).get('id');
  if (urlId) resolvedId.value = urlId;

  // Load restaurant branding name + horarios config from Firestore
  try {
    const snap = await getDoc(doc(db, 'restaurants', resolvedId.value));
    if (snap.exists()) {
      const data = snap.data();
      restaurantName.value = data.nombre || '';
      if (data.horarios) {
        restaurantConfig.value = {
          comida:    data.horarios.comida   ?? DEFAULT_HORARIOS.comida,
          cena:      data.horarios.cena     ?? DEFAULT_HORARIOS.cena,
          intervalo: data.horarios.intervalo ?? DEFAULT_HORARIOS.intervalo,
        };
      }
    } else {
      restaurantName.value = resolvedId.value.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    }
  } catch {
    restaurantName.value = '';
  }
});

// ─── State ───────────────────────────────────────────
const submitting    = ref(false);
const bookingResult = ref(null); // { confirmed, mesa, hora, pax } | { confirmed: false }
const errorMsg      = ref('');
const successRef    = ref(null);
const showHoraError = ref(false);

const mesas          = ref([]);
const occupancyToday = ref([]);
const loadingSlots   = ref(false);

// ─── Form ────────────────────────────────────────────
const form = ref({
  nombre_cliente:    '',
  email:             '',
  telefono:          '',
  fecha:             '',
  hora:              '',
  comensales:        2,
  comentarios:       '',
  marketing_consent: true,
});

// ─── Date constraints ─────────────────────────────────
const minDate = computed(() => new Date().toISOString().split('T')[0]);

// ─── Dynamic heading title ────────────────────────────
const PAX_WORDS = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
  'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];
const paxTitle = computed(() => {
  const n = form.value.comensales;
  return n <= 12 ? PAX_WORDS[n] : String(n);
});

// ─── Pax stepper ──────────────────────────────────────
const decrementPax = () => {
  if (form.value.comensales > 1) { form.value.comensales--; form.value.hora = ''; }
};
const incrementPax = () => {
  if (form.value.comensales < 20) { form.value.comensales++; form.value.hora = ''; }
};
const selectHora = (hora) => { form.value.hora = hora; showHoraError.value = false; };

// ─── Computed slots with real availability ────────────
// Slots are generated from per-restaurant schedule config (loaded in onMounted).
// Uses shared reservationUtils algorithm:
//   - turn time by party size (60-120 min)
//   - 15-min buffer between seatings
//   - blocks 'confirmada' AND 'pendiente' bookings
// When restaurant has no mesas configured, all slots are available (booking → pendiente).
const computedSlots = computed(() => {
  const horas = computedHoras.value;

  if (!form.value.fecha) {
    return horas.map(hora => ({ hora, available: true, remaining: 99 }));
  }

  // Still loading data — keep skeleton UI (loadingSlots handles the template branch)
  if (loadingSlots.value) {
    return horas.map(hora => ({ hora, available: true, remaining: 99 }));
  }

  const now          = new Date();
  const selectedDate = new Date(form.value.fecha + 'T00:00:00');
  const isToday      = selectedDate.toDateString() === now.toDateString();
  const pax          = form.value.comensales;

  // No mesas configured → accept bookings as pendiente, show all available
  if (mesas.value.length === 0) {
    return horas.map(hora => {
      if (isToday) {
        const [h, m] = hora.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(h, m, 0, 0);
        if (slotTime.getTime() <= now.getTime() + 60 * 60_000) {
          return { hora, available: false, remaining: 0 };
        }
      }
      return { hora, available: true, remaining: 99 };
    });
  }

  const tablesForPax = mesas.value.filter(m => m.pax_max >= pax);

  return horas.map(hora => {
    // Block past hours on today (need ≥ 60 min lead time)
    if (isToday) {
      const [h, m] = hora.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      if (slotTime.getTime() <= now.getTime() + 60 * 60_000) {
        return { hora, available: false, remaining: 0 };
      }
    }

    if (tablesForPax.length === 0) return { hora, available: false, remaining: 0 };

    const remaining = countAvailableTables(mesas.value, pax, hora, occupancyToday.value);
    return { hora, available: remaining > 0, remaining };
  });
});

// ─── Load room data when date changes ─────────────────
const loadRoomData = async () => {
  if (!form.value.fecha) return;
  loadingSlots.value = true;
  try {
    // Mesas: public read (allow read: if true in rules)
    const mesasSnap = await getDocs(
      query(collection(db, 'mesas'), where('restaurant_id', '==', resolvedId.value))
    );
    mesas.value = mesasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Reservas: requires auth — anonymous sign-in covers this; graceful fallback if it fails
    try {
      const resSnap = await getDocs(query(
        collection(db, 'reservas'),
        where('restaurant_id', '==', resolvedId.value),
        where('fecha', '>=', new Date(form.value.fecha + 'T00:00:00')),
        where('fecha', '<=', new Date(form.value.fecha + 'T23:59:59')),
      ));
      occupancyToday.value = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('[BookingForm] Could not load occupancy (slots shown as available):', err.code);
      occupancyToday.value = [];
    }
  } catch (err) {
    console.error('[BookingForm] loadRoomData error:', err);
  } finally {
    loadingSlots.value = false;
  }
};

// ─── Watchers ─────────────────────────────────────────
watch(() => form.value.fecha, () => { form.value.hora = ''; loadRoomData(); });
watch(() => form.value.comensales, () => { form.value.hora = ''; });
watch(bookingResult, async (val) => {
  if (val) { await nextTick(); successRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});

// ─── Submit — auto-assign table ───────────────────────
const submitBooking = async () => {
  if (!form.value.hora) {
    showHoraError.value = true;
    errorMsg.value = 'Por favor, selecciona una hora para tu reserva.';
    return;
  }

  submitting.value    = true;
  bookingResult.value = null;
  errorMsg.value      = '';

  try {
    const pax      = Number(form.value.comensales);
    const duracion = getTurnTime(pax);
    const dateObj  = new Date(`${form.value.fecha}T${form.value.hora}:00`);

    // ── Best-fit table assignment ──────────────────────
    // Find the smallest available table for this slot
    const bestTable = findBestTable(mesas.value, pax, form.value.hora, occupancyToday.value);

    await addDoc(collection(db, 'reservas'), {
      restaurant_id:     resolvedId.value,
      nombre_cliente:    form.value.nombre_cliente,
      email:             form.value.email,
      telefono:          form.value.telefono,
      fecha:             dateObj,
      hora:              form.value.hora,
      comensales:        pax,
      comentarios:       form.value.comentarios || '',
      marketing_consent: Boolean(form.value.marketing_consent),
      // Auto-confirm when table found; pending only if restaurant has no tables configured
      estado:            bestTable ? 'confirmada' : 'pendiente',
      mesa_id:           bestTable?.id ?? null,
      duracion_min:      duracion,
      creado_en:         serverTimestamp(),
      notas:             '',
    });

    bookingResult.value = bestTable
      ? { confirmed: true,  mesa: bestTable.nombre, hora: form.value.hora, pax }
      : { confirmed: false };

    // Reset
    form.value = {
      nombre_cliente: '', email: '', telefono: '',
      fecha: '', hora: '', comensales: 2,
      comentarios: '', marketing_consent: true,
    };
    mesas.value          = [];
    occupancyToday.value = [];
  } catch (err) {
    console.error('[BookingForm] submit error:', err);
    errorMsg.value = 'No se pudo procesar la reserva. Inténtalo de nuevo o llámanos.';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
/* ════════════════════════════════════════════════════
   BOOKING FORM — Editorial Design System
   Hereda tokens de global.css
════════════════════════════════════════════════════ */

.booking-form-wrap {
  font-family: 'Work Sans', system-ui, sans-serif;
  max-width: 600px;
  width: 100%;
}

/* ── Header ────────────────────────────────── */
.booking-header { margin-bottom: 3rem; }
.booking-eyebrow {
  font-size: 0.65rem; font-weight: 700;
  letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--outline, #555); margin: 0 0 1rem;
}
.booking-title {
  font-family: 'Noto Serif', Georgia, serif;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 300; line-height: 1.1;
  margin: 0 0 1.25rem; color: var(--on-surface, #000);
  transition: opacity 0.2s;
}
.booking-title em {
  font-style: italic;
  color: var(--outline-variant, #b0b0b0);
}
.booking-subtitle {
  font-size: 0.75rem; font-weight: 500;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--on-surface-variant, #555);
  line-height: 1.8; margin: 0;
}

/* ── Form sections ────────────────────────────────── */
.form-section {
  border: none; padding: 0;
  margin-bottom: 2.5rem;
}
.form-section--consent { margin-bottom: 1.5rem; }
.form-grid { display: grid; gap: 1.5rem; }
.form-grid--2 { grid-template-columns: 1fr 1fr; }
.form-grid--3 { grid-template-columns: 1fr 1fr 1fr; }

@media (max-width: 560px) {
  .form-grid--2 { grid-template-columns: 1fr; }
  .form-grid--3 { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 380px) {
  .form-grid--3 { grid-template-columns: 1fr; }
}

/* ── Fields ───────────────────────────────────────── */
.field-group { display: flex; flex-direction: column; gap: 0.625rem; }
.field-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #000;
}
.field-label-opt {
  font-weight: 400; color: #999;
  letter-spacing: 0.05em; font-size: 0.6rem;
}
.field-input {
  background: transparent;
  border: none;
  border-bottom: 2px solid #000;
  padding: 0.875rem 0;
  font-size: 0.9375rem;
  color: #000;
  font-family: inherit;
  outline: none;
  border-radius: 0;
  transition: border-bottom-color 0.2s, background 0.2s;
  width: 100%;
}
.field-input::placeholder { color: #999; font-size: 0.875rem; }
.field-input:focus {
  border-bottom-color: #000;
  background: rgba(0,0,0,0.015);
}
.field-textarea { min-height: 80px; resize: vertical; border-bottom: 2px solid #000; padding-top: 0.875rem; }
.field-hint { font-size: 0.65rem; color: #aaa; margin: 0; }
.field-error { font-size: 0.7rem; color: #d90429; margin-top: 0.5rem; font-weight: 600; }

/* ── Pax stepper ──────────────────────────────────── */
.pax-stepper {
  display: flex; align-items: center; gap: 0;
  border-bottom: 2px solid #000;
  padding: 0.5rem 0;
}
.pax-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: #000; color: #fff; border: none;
  font-size: 1.25rem; font-weight: 300;
  cursor: pointer; border-radius: 2px;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.pax-btn:disabled { opacity: 0.25; cursor: not-allowed; }
.pax-btn:hover:not(:disabled) { opacity: 0.75; }
.pax-count {
  flex: 1; text-align: center;
  font-size: 1.125rem; font-weight: 700;
}

/* ── Time slots ───────────────────────────────────── */
.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem;
  margin-top: 0.875rem;
}
.time-slot {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0.2rem;
  padding: 0.875rem 0.5rem;
  border: 1.5px solid #000;
  background: #fff; color: #000;
  font-family: inherit;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.18s, color 0.18s, border-color 0.18s, opacity 0.18s;
  position: relative;
}
.time-slot:hover:not(:disabled) { background: #000; color: #fff; }
.time-slot--selected { background: #000; color: #fff; border-color: #000; }
.time-slot--full {
  border-color: #e0e0e0; color: #ccc;
  cursor: not-allowed; opacity: 0.55;
}
.time-slot--limited { border-color: #f59e0b; color: #000; }
.time-slot--limited:hover:not(:disabled) { background: #f59e0b; color: #000; border-color: #f59e0b; }
.time-slot--limited.time-slot--selected { background: #f59e0b; color: #000; border-color: #f59e0b; }
.slot-time { font-size: 0.875rem; font-weight: 700; letter-spacing: 0.05em; }
.slot-tag { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; }

/* Skeleton loading slots */
.slots-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 0.5rem; margin-top: 0.875rem;
}
.slots-skeleton {
  height: 56px; border-radius: 2px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

.slots-hint, .slots-empty {
  margin-top: 0.875rem;
  font-size: 0.75rem; color: #999;
  font-style: italic;
}
.slots-empty { color: #d90429; }

/* ── Consent ──────────────────────────────────────── */
.consent-label {
  display: flex; gap: 0.875rem; align-items: flex-start; cursor: pointer;
}
.consent-checkbox {
  width: 18px; height: 18px; margin-top: 2px;
  accent-color: #000; cursor: pointer; flex-shrink: 0;
}
.consent-text {
  font-size: 0.7rem; color: #555; line-height: 1.7;
}
.consent-hint {
  display: block; font-size: 0.65rem; color: #999; margin-top: 0.25rem;
}

/* ── Submit ───────────────────────────────────────── */
.form-submit-area { padding-top: 0.5rem; }
.submit-btn {
  display: flex; align-items: center; justify-content: center; gap: 0.625rem;
  width: 100%;
  background: #000; color: #fff;
  padding: 1.5rem 2rem;
  font-family: inherit;
  font-size: 0.8rem; font-weight: 700;
  letter-spacing: 0.3em; text-transform: uppercase;
  border: none; cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.85;
  transform: translateY(-1px);
}
.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.submit-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.form-legal {
  font-size: 0.6rem; color: #aaa;
  text-align: center; margin-top: 1.25rem;
  text-transform: uppercase; letter-spacing: 0.1em;
  line-height: 1.8;
}
.legal-link { color: #000; font-weight: 700; text-decoration: underline; }

/* ── Alerts ───────────────────────────────────────── */
.form-error-banner {
  background: #fff5f5; color: #991b1b;
  border: 1.5px solid #fca5a5;
  padding: 1rem 1.25rem;
  font-size: 0.8rem; font-weight: 600;
  margin-bottom: 2rem; border-radius: 4px;
}

/* ── Success screen ───────────────────────────────── */
.success-screen {
  text-align: center;
  padding: 3rem 2rem;
  background: #000; color: #fff;
  margin-bottom: 2rem;
  animation: fadeInUp 0.4s ease both;
}
.success-check {
  display: inline-flex; align-items: center; justify-content: center;
  width: 56px; height: 56px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%; margin-bottom: 1.25rem;
}
.success-check--confirmed {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}
.success-title {
  font-family: 'Noto Serif', Georgia, serif;
  font-size: 1.5rem; font-weight: 300;
  margin: 0 0 0.5rem;
}
.success-detail {
  font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.15em; text-transform: uppercase;
  color: #4ade80; margin: 0 0 0.75rem;
}
.success-sub {
  font-size: 0.65rem; opacity: 0.6;
  text-transform: uppercase; letter-spacing: 0.2em; margin: 0;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}
</style>
