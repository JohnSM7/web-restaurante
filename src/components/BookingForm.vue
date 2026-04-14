<template>
  <div class="editorial-booking-form">
    <div v-if="successMsg" ref="successRef" class="success-alert">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-2"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <p class="font-serif text-lg mb-1">¡Solicitud recibida!</p>
      <p class="text-[0.65rem] opacity-70 uppercase tracking-widest">Te confirmaremos por email en breve.</p>
    </div>

    <form @submit.prevent="submitBooking" class="space-y-10 md:space-y-16">
      <div v-if="errorMsg" class="error-alert">
        {{ errorMsg }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-10">
        <div class="form-group">
          <label class="editorial-label">Nombre completo</label>
          <input v-model="form.nombre_cliente" type="text" required
            class="editorial-input"
            placeholder="Introduce tu nombre">
        </div>

        <div class="form-group">
          <label class="editorial-label">Correo electrónico</label>
          <input v-model="form.email" type="email" required
            class="editorial-input"
            placeholder="email@ejemplo.com">
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-20 gap-y-10">
        <div class="form-group">
          <label class="editorial-label">Teléfono</label>
          <input v-model="form.telefono" type="tel" required
            class="editorial-input"
            placeholder="+34 ...">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          <div class="form-group sm:col-span-2">
            <label class="editorial-label">Fecha</label>
            <input v-model="form.fecha" type="date" required :min="minDate"
              class="editorial-input date-input">
          </div>
          <div class="form-group">
             <label class="editorial-label">Pax</label>
             <select v-model="form.comensales" required class="editorial-input select-input">
                <option v-for="n in 20" :key="n" :value="n">{{ n }} personas</option>
             </select>
          </div>
        </div>
      </div>

      <div class="form-group !mb-0">
        <label class="editorial-label">Hora del servicio</label>
        <div class="grid grid-cols-3 md:grid-cols-5 gap-3 mt-6">
            <button v-for="hora in horasFiltradas" 
                    :key="hora" 
                    type="button"
                    @click="form.hora = hora"
                    :class="['time-slot', form.hora === hora ? 'active' : '']">
                {{ hora }}
            </button>
        </div>
        <div v-if="horasFiltradas.length === 0 && form.fecha" class="text-[0.6rem] text-red-800 uppercase tracking-widest mt-4">
          No hay más horas disponibles para hoy. Por favor, selecciona otra fecha.
        </div>
        <input type="hidden" v-model="form.hora" required>
      </div>

      <div class="form-group">
        <label class="editorial-label">Peticiones especiales (Intolerancias, alergias, etc.)</label>
        <textarea v-model="form.comentarios" 
          class="editorial-input min-h-[100px] !border-b !py-4"
          placeholder="Ej: Tenemos un comensal celíaco, preferimos mesa cerca de la ventana..."></textarea>
      </div>

      <div class="form-group flex items-start gap-4 pt-4">
        <input v-model="form.marketing_consent" type="checkbox" id="marketing" 
          class="w-5 h-5 mt-1 accent-black cursor-pointer">
        <label for="marketing" class="text-[0.7rem] text-gray-600 leading-relaxed cursor-pointer select-none">
          Deseo recibir novedades, promociones e invitaciones exclusivas de <strong>THE EDITORIAL</strong>. 
          <span class="block text-[0.6rem] mt-1 opacity-70">Puedes dárte de baja en cualquier momento.</span>
        </label>
      </div>

      <div class="pt-8">
        <button type="submit" :disabled="loading" class="editorial-btn">
          <span>{{ loading ? 'ENVIANDO SOLICITUD...' : 'CONFIRMAR RESERVA' }}</span>
        </button>
        
        <p class="terms-text !mt-4">
          Al confirmar, aceptas nuestra <a href="#" class="underline">Política de Privacidad</a> y los términos del servicio.
          Los datos serán tratados según la LOPDGDD para la gestión de tu reserva.
        </p>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';

const loading = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const successRef = ref(null);

const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

const rawHoras = [
  '13:30', '14:00', '14:30', '15:00', '15:30',
  '20:30', '21:00', '21:30', '22:00', '22:30'
];

const horasFiltradas = computed(() => {
  if (!form.value.fecha) return rawHoras;
  
  const now = new Date();
  const selectedDate = new Date(form.value.fecha + 'T00:00:00');
  
  // Si la fecha seleccionada es hoy (comparando solo año/mes/día local)
  const isToday = selectedDate.toDateString() === now.toDateString();
  
  if (!isToday) return rawHoras;
  
  // Si es hoy, filtramos horas pasadas + 1 hora de margen
  return rawHoras.filter(hora => {
    const [h, m] = hora.split(':').map(Number);
    const horaCita = new Date();
    horaCita.setHours(h, m, 0, 0);
    
    // Solo permitimos reservas con al menos 60 minutos de antelación
    return horaCita.getTime() > (now.getTime() + 60 * 60000);
  });
});

const form = ref({
  nombre_cliente: '',
  email: '',
  telefono: '',
  fecha: '',
  hora: '',
  comensales: 2,
  comentarios: '',
  marketing_consent: true // Marcado por defecto según petición del usuario
});

watch(successMsg, async (newVal) => {
  if (newVal) {
    await nextTick();
    successRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

const submitBooking = async () => {
  if (!form.value.hora) {
    errorMsg.value = "Por favor, selecciona una hora para tu reserva.";
    return;
  }

  loading.value = true;
  successMsg.value = '';
  errorMsg.value = '';

  try {
    const dateObj = new Date(`${form.value.fecha}T${form.value.hora}:00`);
    
    await addDoc(collection(db, "reservas"), {
      nombre_cliente: form.value.nombre_cliente,
      email: form.value.email,
      telefono: form.value.telefono,
      fecha: dateObj,
      hora: form.value.hora,
      comensales: Number(form.value.comensales),
      comentarios: form.value.comentarios || '',
      marketing_consent: Boolean(form.value.marketing_consent),
      estado: "pendiente",
      creado_en: serverTimestamp()
    });

    successMsg.value = 'Solicitud recibida';
    form.value = {
      nombre_cliente: '',
      email: '',
      telefono: '',
      fecha: '',
      hora: '',
      comensales: 2,
      comentarios: '',
      marketing_consent: true
    };
  } catch (err) {
    console.error("Booking Error:", err);
    errorMsg.value = `Error: ${err.message || 'No se pudo procesar la reserva'}`;
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.editorial-booking-form {
  font-family: 'Work Sans', sans-serif;
  max-width: 1000px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 0;
}

.editorial-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.35em;
  color: #000; /* Pure black for labels */
  margin-bottom: 0.75rem;
  font-weight: 800; /* Significant weight */
}

.editorial-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 2px solid #000; /* Solid 2px black line */
  padding: 1rem 0;
  font-size: 1rem;
  color: black;
  transition: all 0.3s;
  outline: none;
  border-radius: 0;
}

/* Darken Placeholders - Critical for visibility */
.editorial-input::placeholder {
  color: #666; 
  opacity: 1;
  font-weight: 400;
}

.editorial-input:focus {
  border-bottom-color: black;
  background: rgba(0,0,0,0.02);
}

.time-slot {
    border: 1.5px solid #000; /* Solid black borders */
    padding: 1.25rem 0;
    font-size: 0.85rem;
    font-family: 'Work Sans', sans-serif;
    letter-spacing: 0.1em;
    transition: all 0.25s;
    background: white;
    color: #000;
    font-weight: 600;
}

.time-slot:hover {
    background: #000;
    color: #fff;
}

.time-slot.active {
    background: black;
    color: white;
    border-color: black;
}

.editorial-btn {
    width: 100%;
    background: black;
    color: white;
    padding: 1.75rem 0;
    text-transform: uppercase;
    letter-spacing: 0.4em;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.3s;
    border: none;
    cursor: pointer;
    margin-top: 1rem;
}

.editorial-btn:hover:not(:disabled) {
    background: #222;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.editorial-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.success-alert {
    background: black;
    color: white;
    padding: 4rem 2rem;
    text-align: center;
    margin-bottom: 3rem;
    animation: fadeIn 0.5s ease-out;
}

.error-alert {
    background: #fef2f2;
    color: #991b1b;
    border: 2px solid #991b1b;
    padding: 1.5rem;
    font-size: 0.9rem;
    margin-bottom: 3rem;
    text-align: center;
    font-weight: 600;
}

.terms-text {
    font-size: 0.65rem;
    color: #444; /* Darker footer text */
    text-align: center;
    margin-top: 2.5rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    line-height: 1.8;
    font-weight: 600;
}

.terms-text a {
  color: #000;
  font-weight: 800;
}

.select-input {
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23777777%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem top 50%;
    background-size: .65em auto;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
