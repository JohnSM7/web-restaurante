<template>
  <div class="registro-wrap">

    <!-- Success -->
    <div v-if="done" class="reg-success">
      <div class="reg-success-icon">✓</div>
      <h2 class="reg-success-title">¡Tu cuenta está lista!</h2>
      <p class="reg-success-sub">Redirigiendo al panel de gestión…</p>
    </div>

    <template v-else>
      <div class="reg-header">
        <h1 class="reg-title">Empieza gratis hoy</h1>
        <p class="reg-sub">14 días de prueba · Sin tarjeta de crédito · Cancela cuando quieras</p>
      </div>

      <div v-if="errorMsg" class="reg-error" role="alert">{{ errorMsg }}</div>

      <form @submit.prevent="submit" class="reg-form" novalidate>

        <div class="reg-field">
          <label for="r-restaurante">Nombre del restaurante <span class="req">*</span></label>
          <input id="r-restaurante" v-model="form.nombreRestaurante" type="text"
            placeholder="Ej: Restaurante La Plaza" autocomplete="organization"
            required :disabled="loading" />
        </div>

        <div class="reg-field">
          <label for="r-email">Tu email <span class="req">*</span></label>
          <input id="r-email" v-model="form.email" type="email"
            placeholder="tu@restaurante.com" autocomplete="email"
            required :disabled="loading" />
        </div>

        <div class="reg-field">
          <label for="r-telefono">Teléfono de contacto</label>
          <input id="r-telefono" v-model="form.telefono" type="tel"
            placeholder="+34 600 000 000" autocomplete="tel"
            :disabled="loading" />
        </div>

        <div class="reg-field">
          <label for="r-pwd">Contraseña <span class="req">*</span></label>
          <input id="r-pwd" v-model="form.password" type="password"
            placeholder="Mínimo 8 caracteres" autocomplete="new-password"
            required :disabled="loading" />
          <p class="reg-hint">Mínimo 8 caracteres con letras y números</p>
        </div>

        <div class="reg-field">
          <label for="r-pwd2">Repite la contraseña <span class="req">*</span></label>
          <input id="r-pwd2" v-model="form.password2" type="password"
            placeholder="Repite tu contraseña" autocomplete="new-password"
            required :disabled="loading" />
        </div>

        <label class="reg-consent">
          <input v-model="form.terms" type="checkbox" required :disabled="loading" />
          <span>
            Acepto los
            <a href="/legal/terminos" target="_blank">Términos de uso</a>
            y la
            <a href="/legal/privacidad" target="_blank">Política de privacidad</a>
          </span>
        </label>

        <button type="submit" class="reg-submit" :disabled="loading || !form.terms">
          <span v-if="loading" class="reg-spinner"></span>
          {{ loading ? 'Creando tu cuenta…' : 'Crear cuenta gratis →' }}
        </button>

        <p class="reg-login">
          ¿Ya tienes cuenta?
          <a href="/admin/dashboard">Inicia sesión</a>
        </p>

      </form>
    </template>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, fns } from '../lib/firebase.ts';

const setupFn = httpsCallable(fns, 'setupNewRestaurant');

const loading  = ref(false);
const done     = ref(false);
const errorMsg = ref('');

const form = ref({
  nombreRestaurante: '',
  email:             '',
  telefono:          '',
  password:          '',
  password2:         '',
  terms:             false,
});

const AUTH_ERRORS = {
  'auth/email-already-in-use':  'Ya existe una cuenta con ese email. Intenta iniciar sesión.',
  'auth/weak-password':         'La contraseña es demasiado débil. Usa al menos 8 caracteres.',
  'auth/invalid-email':         'El email no es válido.',
  'auth/network-request-failed':'Error de red. Comprueba tu conexión e inténtalo de nuevo.',
};

const submit = async () => {
  errorMsg.value = '';

  // ── Client validation ──────────────────────────────
  const nombre = form.value.nombreRestaurante.trim();
  const email  = form.value.email.trim();
  const pwd    = form.value.password;
  const pwd2   = form.value.password2;

  if (!nombre)           { errorMsg.value = 'El nombre del restaurante es obligatorio.'; return; }
  if (!email)            { errorMsg.value = 'El email es obligatorio.'; return; }
  if (pwd.length < 8)    { errorMsg.value = 'La contraseña debe tener al menos 8 caracteres.'; return; }
  if (pwd !== pwd2)      { errorMsg.value = 'Las contraseñas no coinciden.'; return; }
  if (!form.value.terms) { errorMsg.value = 'Debes aceptar los términos de uso.'; return; }

  loading.value = true;

  try {
    // 1. Crear usuario en Firebase Auth (lo autentica automáticamente)
    await createUserWithEmailAndPassword(auth, email, pwd);

    // 2. Crear restaurante y perfil de usuario en Firestore (via Cloud Function)
    await setupFn({
      nombre_restaurante: nombre,
      telefono:           form.value.telefono.trim(),
    });

    // 3. Mostrar éxito y redirigir al panel
    done.value = true;
    setTimeout(() => { window.location.href = '/admin/dashboard'; }, 1800);

  } catch (err) {
    const code = err.code ?? '';
    errorMsg.value = AUTH_ERRORS[code]
      || err.message
      || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.registro-wrap {
  min-height: calc(100vh - 60px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 3rem 1.5rem;
  background: #fafafa;
}

/* ── Success screen ── */
.reg-success {
  text-align: center; padding: 3rem 2rem;
  animation: fadeUp 0.4s ease both;
}
.reg-success-icon {
  width: 60px; height: 60px;
  background: #000; color: #fff;
  border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 1.5rem; margin-bottom: 1.25rem;
}
.reg-success-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
.reg-success-sub   { color: #888; font-size: 0.85rem; }

/* ── Header ── */
.reg-header { text-align: center; margin-bottom: 2rem; max-width: 420px; width: 100%; }
.reg-title  { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 800; margin-bottom: 0.5rem; }
.reg-sub    { font-size: 0.78rem; color: #777; letter-spacing: 0.04em; }

/* ── Form ── */
.reg-form {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 2rem;
  width: 100%; max-width: 420px;
  display: flex; flex-direction: column; gap: 1.25rem;
}
.reg-error {
  background: #fff5f5; color: #991b1b;
  border: 1.5px solid #fca5a5;
  border-radius: 6px; padding: 0.875rem 1rem;
  font-size: 0.8rem; font-weight: 600;
  max-width: 420px; width: 100%;
  margin-bottom: 0.5rem;
}
.reg-field { display: flex; flex-direction: column; gap: 0.4rem; }
.reg-field label {
  font-size: 0.68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em; color: #333;
}
.req { color: #dc2626; }
.reg-field input {
  border: 1.5px solid #e0e0e0; border-radius: 4px;
  padding: 0.75rem 0.875rem;
  font-size: 0.9rem; font-family: inherit; color: #111;
  outline: none; transition: border-color 0.15s;
  background: #fff;
}
.reg-field input:focus   { border-color: #000; }
.reg-field input:disabled { background: #f7f7f7; color: #999; }
.reg-hint { font-size: 0.65rem; color: #aaa; }

/* ── Consent ── */
.reg-consent {
  display: flex; gap: 0.625rem; align-items: flex-start;
  font-size: 0.72rem; color: #555; cursor: pointer; line-height: 1.6;
}
.reg-consent input { margin-top: 2px; accent-color: #000; flex-shrink: 0; }
.reg-consent a { color: #000; font-weight: 700; text-decoration: underline; }

/* ── Submit ── */
.reg-submit {
  width: 100%; padding: 1rem;
  background: #000; color: #fff;
  border: none; border-radius: 4px;
  font-family: inherit; font-size: 0.8rem;
  font-weight: 800; letter-spacing: 0.12em;
  text-transform: uppercase; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  transition: opacity 0.15s;
}
.reg-submit:hover:not(:disabled) { opacity: 0.85; }
.reg-submit:disabled { opacity: 0.45; cursor: not-allowed; }
.reg-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeUp  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.reg-login { text-align: center; font-size: 0.72rem; color: #888; }
.reg-login a { color: #000; font-weight: 700; text-decoration: underline; }
</style>
