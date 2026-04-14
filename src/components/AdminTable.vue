<template>
  <!-- Screen: Login -->
  <div v-if="!user && !checkingAuth" class="login-screen animate-in fade-in">
    <div class="login-card">
      <div class="login-header">
        <span class="logo-text">TANE <span class="accent">SISTEMAS</span></span>
        <h1>Acceso denegado</h1>
        <p>Introduce tus credenciales para gestionar el restaurante</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="loginError" class="login-error">{{ loginError }}</div>
        
        <div class="input-group">
          <label>Email Administrador</label>
          <input v-model="email" type="email" required placeholder="admin@tanesolutions.com">
        </div>

        <div class="input-group">
          <label>Contraseña</label>
          <input v-model="password" type="password" required placeholder="••••••••">
        </div>

        <button type="submit" :disabled="loggingIn" class="btn-login">
          {{ loggingIn ? 'Verificando...' : 'Entrar al Dashboard' }}
        </button>
      </form>
      
      <div class="login-footer">
        Protección por Tane Solutions Security
      </div>
    </div>
  </div>

  <!-- Screen: Loader -->
  <div v-else-if="checkingAuth" class="loading-overlay">
    <div class="loading-spinner"></div>
    <p class="mt-4 font-bold uppercase tracking-widest text-xs">Verificando sesión...</p>
  </div>

  <!-- Screen: Dashboard -->
  <div v-else class="crm-app">
    <!-- Sidebar / Navigation -->
    <aside class="crm-sidebar" :class="{ 'mobile-open': sidebarOpen }">
      <div class="sidebar-header">
        <span class="logo-text">TANE <span class="accent">CRM</span></span>
        <button @click="sidebarOpen = false" class="md:hidden text-white/50">&times;</button>
      </div>
      
      <nav class="sidebar-nav">
        <button v-for="item in navItems" :key="item.id" 
                @click="currentView = item.id; sidebarOpen = false" 
                :class="['nav-item', currentView === item.id ? 'active' : '']">
          <span class="nav-icon" v-html="item.icon"></span>
          {{ item.label }}
        </button>
      </nav>

      <div class="sidebar-footer">
        <button @click="handleLogout" class="btn-logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar Sesión
        </button>
        <div class="status-indicator mt-6">
          <div :class="['dot', status === 'connected' ? 'bg-green-400' : 'bg-red-400 animate-pulse']"></div>
          <span>{{ statusMsg }}</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="crm-main">
      <!-- Top Mobile Header -->

      <!-- View Header -->
      <section class="view-header">
        <div>
          <h1 class="view-title">{{ activeNavItem?.label }}</h1>
          <p class="view-subtitle">{{ activeNavItem?.description }}</p>
        </div>
        <div class="header-actions">
        </div>
      </section>

      <!-- VIEW: RESERVAS -->
      <div v-if="currentView === 'reservas'" class="view-content animate-in fade-in duration-300">
        <!-- Stats Summary -->
        <div class="stats-grid">
          <div v-for="stat in enhancedStats" :key="stat.label" class="stat-card">
            <div class="stat-icon" :style="{ backgroundColor: stat.color + '20', color: stat.color }" v-html="stat.icon"></div>
            <div class="stat-info">
              <span class="stat-label">{{ stat.label }}</span>
              <span class="stat-value">{{ stat.value }}</span>
            </div>
          </div>
        </div>

        <!-- Filters Bar -->
        <div class="filters-bar">
          <div class="filter-group scroll-x">
            <button v-for="f in stateFilters" :key="f.id" 
                    @click="filter = f.id" 
                    :class="['filter-tab', filter === f.id ? 'active' : '']">
              {{ f.label }}
              <span class="count-badge" v-if="getFilterCount(f.id)">{{ getFilterCount(f.id) }}</span>
            </button>
          </div>
          
          <div class="search-and-date">
            <div class="search-input-wrap">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" v-model="searchQuery" placeholder="Buscar cliente...">
            </div>
            <input type="date" v-model="dateFilter" class="date-picker">
            <button v-if="dateFilter" @click="dateFilter = ''" class="clear-date">&times;</button>
          </div>
        </div>

        <!-- Reservations List -->
        <div v-if="loading" class="loader-wrap">
          <div class="loader"></div>
          <p>Sincronizando base de datos...</p>
        </div>

        <div v-else-if="filteredReservas.length === 0" class="empty-state">
           <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
           <p>No hay reservas que coincidan con los filtros</p>
           <button @click="resetFilters" class="btn-text">Ver todas las pendientes</button>
        </div>

        <div v-else class="reserva-list">
          <div v-for="reserva in filteredReservas" :key="reserva.id" class="reserva-card" :class="reserva.estado">
            <div class="card-main">
              <div class="customer-info">
                <div class="avatar">{{ reserva.nombre_cliente.charAt(0) }}</div>
                <div>
                  <h3 class="customer-name">{{ reserva.nombre_cliente }}</h3>
                  <div class="marketing-badge" :class="reserva.marketing_consent ? 'active' : 'inactive'">
                    {{ reserva.marketing_consent ? 'Marketing OK' : 'Sin Marketing' }}
                  </div>
                  <div class="contact-links">
                    <a :href="'tel:' + reserva.telefono">{{ reserva.telefono }}</a>
                    <span class="divider">•</span>
                    <a :href="'mailto:' + reserva.email" class="truncate max-w-[120px]">{{ reserva.email }}</a>
                  </div>
                </div>
              </div>

              <div class="booking-details">
                <div class="detail-item">
                  <span class="detail-label">Fecha y Hora</span>
                  <span class="detail-value">{{ formatDateLong(reserva.fecha) }} • {{ reserva.hora }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Comensales</span>
                  <span class="detail-value">{{ reserva.comensales }} personas</span>
                </div>
                <!-- Mesa Assignment -->
                <div v-if="reserva.estado === 'confirmada'" class="detail-item">
                  <span class="detail-label">Mesa Asignada</span>
                  <select :value="reserva.mesa_id || ''" 
                          @change="assignTable(reserva.id, $event.target.value)"
                          class="table-selector">
                    <option value="">Sin Asignar</option>
                    <option v-for="m in mesas" :key="m.id" :value="m.id">
                      {{ m.nombre }} ({{ m.zona }}) - {{ m.pax_max }}p
                    </option>
                  </select>
                </div>
              </div>

              <div class="status-badge" :class="reserva.estado">
                {{ translateEstado(reserva.estado) }}
              </div>
            </div>

            <!-- Client Comments Section -->
            <div v-if="reserva.comentarios" class="client-comments">
              <span class="label">PETICIONES DEL CLIENTE</span>
              <p>{{ reserva.comentarios }}</p>
            </div>

            <!-- Internal Notes Section -->
            <div class="card-notes">
              <div class="notes-header">
                <span class="label">NOTAS INTERNAS (Alergias, VIP, Preferencias)</span>
                <button @click="saveNote(reserva.id, reserva.notas)" 
                        :disabled="noteSaving === reserva.id"
                        class="save-note-btn">
                  {{ noteSaving === reserva.id ? 'Guardando...' : 'Guardar Nota' }}
                </button>
              </div>
              <textarea v-model="reserva.notas" 
                        placeholder="Escribe aquí peticiones especiales o alergias..."
                        rows="2"></textarea>
            </div>

            <div class="card-actions">
              <template v-if="reserva.estado === 'pendiente'">
                <button @click="confirmAction(reserva.id, 'confirmada')" class="btn-action approve">Aprobar Reserva</button>
                <button @click="confirmAction(reserva.id, 'cancelada')" class="btn-action reject">Rechazar</button>
              </template>
              <template v-else>
                <button @click="resetToPending(reserva.id)" class="btn-action reset">Restablecer</button>
                <div class="flex-grow"></div>
                <button @click="deleteReserva(reserva.id)" class="btn-action delete">Eliminar</button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW: MAPA DE MESAS -->
      <div v-else-if="currentView === 'mapa'" class="view-content animate-in fade-in">
        <div class="map-controls flex justify-between items-center mb-8">
           <div class="flex gap-4">
             <button @click="initMockTables" v-if="mesas.length === 0" class="btn-primary">Inicializar Sala (Mock)</button>
             <button @click="addTable" v-else class="btn-secondary">+ Nueva Mesa</button>
           </div>
           
           <button @click="isDesignMode = !isDesignMode" 
                   :class="['btn-design', isDesignMode ? 'active' : '']">
              {{ isDesignMode ? '💾 Guardar Posiciones' : '📐 Editar Diseño' }}
           </button>
        </div>

        <div class="map-container" :class="{ 'design-active': isDesignMode }">
          <!-- Layer 1: The Grid cells for dropping -->
          <div class="interactive-grid-base">
             <div v-for="cellIdx in 144" :key="'cell-'+cellIdx" 
                  class="grid-cell"
                  @dragover.prevent
                  @drop="onDropMesa($event, cellIdx)">
             </div>
          </div>

          <!-- Layer 2: The Tables (positioned over the grid) -->
          <div class="tables-layer">
             <div v-for="mesa in mesas" :key="mesa.id" 
                  class="mesa-icon" 
                  :class="[mesa.estado, mesa.zona, { 'is-dragging': draggingId === mesa.id }]"
                  :style="{ 
                    left: `${((mesa.x || 1) - 1) * 100}px`, 
                    top: `${((mesa.y || 1) - 1) * 100}px` 
                  }"
                  :draggable="isDesignMode"
                  @dragstart="onDragStartMesa($event, mesa.id)"
                  @dragend="draggingId = null"
                  @click="!isDesignMode ? editMesa(mesa) : null">
                
                <div class="mesa-header">
                  <span class="mesa-id">{{ mesa.nombre }}</span>
                  <span class="mesa-pax">{{ mesa.pax_max }}p</span>
                </div>
                <div v-if="!isDesignMode" class="mesa-body">
                   <div class="status-indicator-min">
                      <span class="status-dot"></span>
                      <span class="status-text">{{ translateTableStatus(mesa.estado) }}</span>
                   </div>
                </div>
                <div class="mesa-footer">
                  <span class="zona-tag">{{ mesa.zona }}</span>
                </div>
             </div>
          </div>
        </div>

        <!-- Mesa Details Side Panel (Simplified) -->
        <div v-if="editingMesa" class="mesa-editor-overlay" @click.self="editingMesa = null">
          <div class="mesa-editor-card">
            <h2>Editar Mesa</h2>
            <div class="edit-fields">
               <div class="field">
                 <label>Nombre de la Mesa</label>
                 <input type="text" v-model="editingMesa.nombre" placeholder="Ej: Mesa 12">
               </div>
               <div class="field">
                 <label>Estado</label>
                 <select v-model="editingMesa.estado">
                    <option value="libre">Libre</option>
                    <option value="reservada">Reservada</option>
                    <option value="ocupada">Ocupada</option>
                    <option value="bloqueada">Bloqueada</option>
                 </select>
               </div>
               <div class="field">
                 <label>Zona</label>
                 <select v-model="editingMesa.zona">
                    <option value="interior">Interior</option>
                    <option value="terraza">Terraza</option>
                    <option value="vip">VIP</option>
                 </select>
               </div>
               <div class="field">
                 <label>Capacidad Máxima</label>
                 <input type="number" v-model="editingMesa.pax_max">
               </div>
            </div>
            <div class="editor-actions">
               <button @click="updateMesaStatus" class="btn-save">Guardar Cambios</button>
               <button @click="deleteTable(editingMesa.id)" class="btn-delete-mesa">Eliminar Mesa</button>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW: GUESTS -->
      <div v-else-if="currentView === 'guests'" class="view-content animate-in fade-in">
        <div class="table-container shadow-sm border border-slate-100">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto Principal</th>
                <th class="text-right">Total Visitas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="guest in uniqueGuests" :key="guest.email">
                <td><span class="font-bold">{{ guest.name }}</span></td>
                <td>
                  <div class="text-xs uppercase opacity-60">{{ guest.email }}</div>
                  <div class="text-xs">{{ guest.phone }}</div>
                </td>
                <td class="text-right">
                  <span class="count-pill">{{ guest.count }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="uniqueGuests.length === 0" class="py-20 text-center opacity-40">
           No hay clientes registrados
        </div>
      </div>
    </main>

    <!-- Global Loading Overlay -->
    <div v-if="updatingId" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase.ts';

// Auth State
const user = ref(null);
const checkingAuth = ref(true);
const loggingIn = ref(false);
const loginError = ref('');
const email = ref('');
const password = ref('');

const sidebarOpen = ref(false);
const currentView = ref('reservas');
const reservas = ref([]);
const mesas = ref([]);
const loading = ref(true);
const status = ref('connecting');
const statusMsg = ref('Sincronizando...');
const filter = ref('pendiente');
const dateFilter = ref('');
const searchQuery = ref('');
const updatingId = ref(null);
const noteSaving = ref(null);
const isDesignMode = ref(false);
const draggingId = ref(null);
let unsubscribe = null;

const navItems = [
  { id: 'reservas', label: 'Reservas', description: 'Gestiona el flujo diario del restaurante', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  { id: 'mapa', label: 'Mapa de Mesas', description: 'Distribución y estado de sala en tiempo real', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' },
  { id: 'guests', label: 'Lista de Clientes', description: 'Historial completo de comensales', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' }
];

const stateFilters = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'all', label: 'Historial (Todo)' }
];

const activeNavItem = computed(() => navItems.find(n => n.id === currentView.value));

const enhancedStats = computed(() => {
  const total = reservas.value.length;
  const pending = reservas.value.filter(r => r.estado === 'pendiente').length;
  const today = new Date().toISOString().split('T')[0];
  const forToday = reservas.value.filter(r => {
    const d = r.fecha.toDate ? r.fecha.toDate().toISOString().split('T')[0] : new Date(r.fecha).toISOString().split('T')[0];
    return d === today && r.estado === 'confirmada';
  }).reduce((acc, curr) => acc + (Number(curr.comensales) || 0), 0);

  return [
    { label: 'Pendientes Hoy', value: pending, color: '#000000', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { label: 'Pax Confirmados', value: forToday, color: '#059669', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
    { label: 'Total Reservas', value: total, color: '#6366f1', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' }
  ];
});

const filteredReservas = computed(() => {
  let list = [...reservas.value];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    return list.filter(r => r.nombre_cliente.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.telefono && r.telefono.includes(q)));
  }
  if (filter.value === 'all') list = list.filter(r => r.estado !== 'cancelada');
  else list = list.filter(r => r.estado === filter.value);
  if (dateFilter.value) {
    list = list.filter(r => {
      const d = r.fecha.toDate ? r.fecha.toDate().toISOString().split('T')[0] : new Date(r.fecha).toISOString().split('T')[0];
      return d === dateFilter.value;
    });
  }
  return list;
});

const uniqueGuests = computed(() => {
  const g = {};
  reservas.value.forEach(r => {
    const e = (r.email || '').toLowerCase();
    if (!e) return;
    if (!g[e]) g[e] = { name: r.nombre_cliente, email: e, phone: r.telefono, count: 1 };
    else g[e].count++;
  });
  return Object.values(g).sort((a,b) => b.count - a.count);
});

const getFilterCount = (fid) => {
  if (fid === 'pendiente') return reservas.value.filter(r => r.estado === 'pendiente').length;
  return 0;
};

// Sincronizar Mesas
const syncMesas = () => {
  const q = query(collection(db, "mesas"), orderBy("nombre", "asc"));
  onSnapshot(q, (snapshot) => {
    mesas.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  });
};

const syncReservas = () => {
  const q = query(collection(db, "reservas"), orderBy("creado_en", "desc"));
  unsubscribe = onSnapshot(q, (qs) => {
    const list = [];
    qs.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
    reservas.value = list;
    loading.value = false;
    status.value = 'connected';
    statusMsg.value = 'Sincronizado';
  });
};

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    checkingAuth.value = false;
    if (u) {
      user.value = u;
      syncReservas();
      syncMesas();
    } else {
      user.value = null;
      if (unsubscribe) unsubscribe();
      reservas.value = [];
      mesas.value = [];
    }
  });
});

onUnmounted(() => unsubscribe && unsubscribe());

const handleLogin = async () => {
  loggingIn.value = true;
  loginError.value = '';
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
  } catch (e) {
    loginError.value = "Credenciales incorrectas. Verifica tu email y contraseña.";
  } finally {
    loggingIn.value = false;
  }
};

const handleLogout = async () => {
    if (confirm('¿Cerrar sesión?')) {
        await signOut(auth);
    }
};

// Table Management logic
const editingMesa = ref(null);
const editMesa = (m) => { editingMesa.value = { ...m }; };

const updateMesaStatus = async () => {
  if (!editingMesa.value) return;
  const { id, estado, ...data } = editingMesa.value;
  
  // Si se intenta marcar como ocupada, verificar si hay reservas pronto
  if (estado === 'ocupada') {
    const now = new Date();
    const currMin = now.getHours() * 60 + now.getMinutes();
    
    const hasSoonReservation = reservas.value.some(r => {
      if (r.mesa_id !== id || r.estado !== 'confirmada') return false;
      
      // Solo para hoy
      const rDate = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      if (rDate.toDateString() !== now.toDateString()) return false;
      
      const rMin = timeToMinutes(r.hora);
      // Bloquear si la reserva es en los próximos 60 minutos
      return (rMin >= currMin && rMin <= currMin + 60);
    });
    
    if (hasSoonReservation) {
      alert('¡ATENCIÓN! No puedes marcar esta mesa como ocupada porque tiene una reserva confirmada en menos de 60 minutos. Por favor, utiliza otra mesa o libera la reserva primero.');
      return;
    }
  }

  await updateDoc(doc(db, "mesas", id), { estado, ...data });
  editingMesa.value = null;
};

const translateTableStatus = (s) => {
  const map = { libre: 'Libre', reservada: 'Reservada', ocupada: 'Ocupada', bloqueada: 'Bloqueada' };
  return map[s] || s;
};

const addTable = async () => {
  const name = prompt('Nombre de la mesa (ej: Mesa 25):');
  if (!name) return;
  await addDoc(collection(db, "mesas"), {
    nombre: name,
    pax_max: 4,
    zona: 'interior',
    estado: 'libre',
    x: 1,
    y: 1
  });
};

const onDragStartMesa = (event, id) => {
  draggingId.value = id;
  event.dataTransfer.setData('mesaId', id);
  event.dataTransfer.effectAllowed = 'move';
};

const onDropMesa = async (event, cellIdx) => {
  const id = draggingId.value || event.dataTransfer.getData('mesaId');
  if (!id) return;

  // Calculate X,Y from 1D cell index (1 to 144 for a 12x12 grid)
  const x = ((cellIdx - 1) % 12) + 1;
  const y = Math.floor((cellIdx - 1) / 12) + 1;

  await updateDoc(doc(db, "mesas", id), { x, y });
  draggingId.value = null;
};

const initMockTables = async () => {
  const mock = [
    { nombre: 'Mesa 1', pax_max: 2, zona: 'interior', estado: 'libre', x: 2, y: 2 },
    { nombre: 'Mesa 2', pax_max: 4, zona: 'interior', estado: 'libre', x: 2, y: 5 },
    { nombre: 'Mesa 3', pax_max: 6, zona: 'vip', estado: 'libre', x: 8, y: 2 },
    { nombre: 'T1', pax_max: 2, zona: 'terraza', estado: 'libre', x: 5, y: 8 },
    { nombre: 'T2', pax_max: 4, zona: 'terraza', estado: 'libre', x: 8, y: 8 }
  ];
  for (const item of mock) {
    await addDoc(collection(db, "mesas"), item);
  }
};

const assignTable = async (reservaId, mesaId) => {
  await updateDoc(doc(db, "reservas", reservaId), { mesa_id: mesaId });
  // Opcionalmente, cambiar estado de la mesa a 'reservada'
  if (mesaId) {
    await updateDoc(doc(db, "mesas", mesaId), { estado: 'reservada' });
  }
};

const saveNote = async (id, notes) => {
  noteSaving.value = id;
  try { await updateDoc(doc(db, "reservas", id), { notas: notes || '' }); }
  finally { noteSaving.value = null; }
};

const exportToCSV = () => {
  const headers = ['Nombre', 'Email', 'Telefono', 'Fecha', 'Hora', 'Pax', 'Estado', 'Marketing', 'Comentarios', 'Notas'];
  const rows = reservas.value.map(r => [
    `\"${r.nombre_cliente}\"`, `\"${r.email}\"`, `\"${r.telefono}\"`, 
    r.fecha.toDate ? r.fecha.toDate().toLocaleDateString() : r.fecha, 
    r.hora, r.comensales, r.estado, 
    r.marketing_consent ? 'SI' : 'NO',
    `\"${r.comentarios || ''}\"`, `\"${r.notas || ''}\"`
  ]);
  let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `reservas_${new Date().toLocaleDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
};

const confirmAction = async (id, n) => {
  if (!confirm(`¿Confirmas cambiar el estado a ${n.toUpperCase()}?`)) return;
  updatingId.value = id;
  try { 
    const updateObj = { estado: n };
    
     if (n === 'confirmada') {
      const res = reservas.value.find(r => r.id === id);
      if (res && !res.mesa_id) {
         const resTime = timeToMinutes(res.hora);
         const resDuration = res.comensales > 4 ? 120 : 90;

         const possibleTables = mesas.value.filter(m => m.pax_max >= res.comensales);
         
         const reservationsInDate = reservas.value.filter(existingRes => 
           existingRes.estado === 'confirmada' && 
           existingRes.mesa_id &&
           (existingRes.fecha?.seconds === res.fecha?.seconds)
         );

         const availableTable = possibleTables.find(mesa => {
            const hasOverlap = reservationsInDate.some(ex => {
               if (ex.mesa_id !== mesa.id) return false;
               const exTime = timeToMinutes(ex.hora);
               const exDuration = ex.comensales > 4 ? 120 : 90;
               return (resTime >= exTime && resTime < exTime + exDuration) ||
                      (exTime >= resTime && exTime < resTime + resDuration);
            });
            return !hasOverlap;
         });

         if (availableTable) {
            updateObj.mesa_id = availableTable.id;
            await updateDoc(doc(db, "mesas", availableTable.id), { estado: 'reservada' });
         } else {
            alert('Aviso: No hay mesas libres para esa ventana de tiempo (90/120 min). Se confirmará sin mesa asignada.');
         }
      }
    }
    
    await updateDoc(doc(db, "reservas", id), updateObj); 
  }
  finally { updatingId.value = null; }
};

const resetToPending = async (id) => {
  updatingId.value = id;
  try { await updateDoc(doc(db, "reservas", id), { estado: 'pendiente' }); }
  finally { updatingId.value = null; }
};

const deleteReserva = async (id) => {
  if (!confirm('ELIMINAR PERMANENTEMENTE?')) return;
  updatingId.value = id;
  try { await deleteDoc(doc(db, "reservas", id)); }
  finally { updatingId.value = null; }
};

const formatDateLong = (d) => {
  if (!d) return '';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};

const translateEstado = (e) => e.toUpperCase();
const resetFilters = () => { filter.value = 'pendiente'; dateFilter.value = ''; searchQuery.value = ''; };

const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
</script>

<style scoped>
.crm-app {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
  font-family: 'Inter', system-ui, sans-serif;
  color: #1e293b;
}

/* Sidebar */
.crm-sidebar {
  width: 280px;
  background: #0f172a;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 1200;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 1024px) {
  .crm-sidebar { transform: translateX(-100%); width: 280px; }
  .crm-sidebar.mobile-open { transform: translateX(0); box-shadow: 20px 0 50px rgba(0,0,0,0.3); }
}

.sidebar-header {
  padding: 2.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-text { font-size: 1.5rem; font-weight: 900; letter-spacing: 0.05em; }
.logo-text .accent { color: #38bdf8; }

.sidebar-nav { flex: 1; padding: 1.5rem; }
.nav-item {
  width: 100%;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
  transition: all 0.2s;
  background: transparent;
  color: #94a3b8;
  border: none;
  cursor: pointer;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
.nav-item.active { background: #38bdf8; color: white; box-shadow: 0 10px 15px -3px rgba(56, 189, 248, 0.3); }

.btn-logout {
  width: 100%;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255,255,255,0.05);
  color: #ef4444;
  border-radius: 0.5rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-logout:hover { background: #ef4444; color: white; }

.sidebar-footer { padding: 2rem; border-top: 1px solid rgba(255,255,255,0.05); }
.status-indicator { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
.dot { width: 10px; height: 10px; border-radius: 100%; }

/* Main Content Wrapper */
.crm-main { 
  flex: 1; 
  margin-left: 280px; 
  min-height: 100vh;
  padding: 3rem;
  padding-top: 8rem; /* Enough space for fixed header */
  transition: margin 0.3s ease;
}

@media (max-width: 1024px) { 
  .crm-main { margin-left: 0; padding: 1.5rem; padding-top: 8rem; } 
}

/* Fixed Header */
.mobile-header {
  position: fixed;
  top: 0; 
  right: 0;
  left: 280px; /* Respect sidebar on desktop */
  height: 6rem;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  padding: 0 3rem;
  gap: 2rem;
  z-index: 1100;
}

@media (max-width: 1024px) {
  .mobile-header { left: 0; padding: 0 1.5rem; }
}

.logo-text-sm { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
.menu-trigger { 
  background: #f1f5f9; 
  border: none; 
  color: #1e293b; 
  width: 44px; height: 44px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
@media (min-width: 1025px) { .menu-trigger { display: none; } }

/* View Typography */
.view-header { margin-bottom: 4rem; }
.view-title { font-size: 3rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
.view-subtitle { color: #64748b; font-size: 1.15rem; font-weight: 500; }

.btn-secondary {
  display: flex; align-items: center; gap: 0.75rem;
  background: #0f172a; color: white; border: none;
  padding: 1rem 2rem; border-radius: 0.75rem;
  font-size: 1rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
.btn-secondary:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 4rem; }
.stat-card { background: white; padding: 2.5rem; border-radius: 1.5rem; display: flex; gap: 2rem; align-items: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
.stat-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-label { display: block; font-size: 0.9rem; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
.stat-value { font-size: 2.5rem; font-weight: 900; color: #0f172a; line-height: 1; }

/* Filters */
.filters-bar { background: white; border-radius: 1.25rem; padding: 1.25rem; display: flex; flex-wrap: wrap; gap: 2rem; align-items: center; margin-bottom: 2.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.filter-group { display: flex; gap: 0.75rem; }
.filter-tab {
  padding: 0.75rem 1.25rem; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 700;
  background: transparent; border: none; color: #64748b; cursor: pointer;
  display: flex; align-items: center; gap: 0.6rem;
}
.filter-tab.active { background: #0f172a; color: white; }
.count-badge { background: #fee2e2; color: #991b1b; padding: 0.2rem 0.6rem; border-radius: 100px; font-size: 0.75rem; font-weight: 800; }

.search-and-date { display: flex; gap: 1rem; flex: 1; justify-content: flex-end; align-items: center; }
.search-input-wrap { display: flex; align-items: center; gap: 0.75rem; border: 1px solid #e2e8f0; padding: 0.75rem 1.25rem; border-radius: 0.75rem; background: #f8fafc; flex: 1; max-width: 350px; }
.search-input-wrap input { border: none; background: none; outline: none; font-size: 0.95rem; width: 100%; font-family: inherit; }
.date-picker { border: 1px solid #e2e8f0; padding: 0.75rem; border-radius: 0.75rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; }

/* Reserva Cards */
.reserva-list { display: grid; gap: 1.5rem; }
.reserva-card { background: white; border-radius: 1.5rem; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-left: 6px solid #cbd5e1; }
.reserva-card.confirmada { border-left-color: #10b981; }
.reserva-card.pendiente { border-left-color: #f59e0b; }

.card-main { display: flex; flex-wrap: wrap; gap: 2.5rem; align-items: center; margin-bottom: 2rem; }
.customer-info { flex: 1; min-width: 250px; display: flex; gap: 1.5rem; align-items: center; }
.avatar { width: 56px; height: 56px; border-radius: 16px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #1e293b; font-size: 1.2rem; flex-shrink: 0; }
.customer-name { font-weight: 800; font-size: 1.35rem; letter-spacing: -0.01em; color: #0f172a; }

.marketing-badge { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: 2rem; display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.25rem; letter-spacing: 0.05em; }
.marketing-badge.active { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.marketing-badge.inactive { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

.contact-links { display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.9rem; color: #64748b; margin-top: 0.4rem; font-weight: 500; }

.booking-details { display: flex; gap: 3rem; }
.detail-item { display: flex; flex-direction: column; gap: 0.35rem; }
.detail-label { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; }
.detail-value { font-size: 1.05rem; font-weight: 700; color: #334155; }

.status-badge { padding: 0.5rem 1rem; border-radius: 100px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.05em; }
.status-badge.pendiente { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
.status-badge.confirmada { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }

/* Client Comments Box */
.client-comments { background: #fff1f2; padding: 1.5rem; border-radius: 1rem; margin-bottom: 1rem; border: 1px solid #ffe4e6; }
.client-comments .label { font-size: 0.7rem; font-weight: 800; color: #be123c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; display: block; }
.client-comments p { font-size: 1rem; color: #9f1239; font-weight: 600; line-height: 1.5; }

/* Notes Section */
.card-notes { background: #f8fafc; padding: 1.5rem; border-radius: 1rem; margin-bottom: 1.5rem; border: 1px solid #f1f5f9; }
.notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.notes-header .label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.card-notes textarea { width: 100%; background: transparent; border: none; resize: none; outline: none; font-size: 1rem; color: #1e293b; font-style: italic; font-weight: 500; }

.card-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }
.btn-action { padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; border: 1px solid #e2e8f0; background: white; transition: all 0.2s; }
.btn-action:hover { background: #f8fafc; }
.btn-action.approve { background: #0f172a; color: white; border: none; }
.btn-action.approve:hover { background: #1e293b; }
.btn-action.reject { color: #ef4444; border-color: #fee2e2; }
.btn-action.reset { color: #64748b; }
.btn-action.delete { color: #94a3b8; border: none; opacity: 0.3; }
.btn-action.delete:hover { color: #ef4444; opacity: 1; }

/* Table Component */
.table-container { background: white; border-radius: 1rem; overflow-x: auto; }
.crm-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.crm-table th { padding: 1rem 1.5rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; border-bottom: 1px solid #f1f5f9; }
.crm-table td { padding: 1.5rem; border-bottom: 1px solid #f8fafc; }
.count-pill { background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 100px; font-weight: 700; font-size: 0.75rem; }

/* Table Map Specific CSS */
.map-container {
  background: white;
  border-radius: 1.5rem;
  padding: 0; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  overflow: auto;
  min-height: 600px;
  position: relative;
  width: 100%;
}

.interactive-grid-base {
  display: grid;
  grid-template-columns: repeat(12, 100px);
  grid-template-rows: repeat(12, 100px);
  width: 1200px;
  height: 1200px;
  background: #f8fafc;
}

.grid-cell {
  border: 0.5px solid #f1f5f9;
}

.design-active .grid-cell {
  border: 1px solid #e2e8f0;
  background: white;
}

.tables-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 1200px;
  height: 1200px;
  pointer-events: none;
}

.mesa-icon {
  position: absolute;
  pointer-events: auto;
  background: white;
  border-radius: 1.25rem;
  padding: 0.75rem;
  border: 3px solid #e2e8f0;
  width: 95px;
  height: 95px;
  margin: 2.5px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s, top 0.3s, left 0.3s;
  z-index: 10;
  overflow: hidden;
}

.design-active .mesa-icon {
  cursor: grab;
  border-style: dashed;
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
}

.mesa-icon.is-dragging {
  opacity: 0; 
}

.mesa-icon.libre { border-color: #10b981; }
.mesa-icon.reservada { border-color: #f59e0b; }
.mesa-icon.ocupada { border-color: #ef4444; }

.mesa-id { 
  font-weight: 900; 
  font-size: 0.75rem; 
  color: #0f172a; 
  line-height: 1.1;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.mesa-pax { 
  font-size: 0.65rem; 
  font-weight: 800; 
  color: #64748b; 
  background: #f1f5f9; 
  padding: 0.15rem 0.4rem; 
  border-radius: 6px; 
}

.status-indicator-min { 
  display: flex; 
  align-items: center; 
  gap: 0.4rem; 
  margin: 0.25rem 0;
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; display: block; }
.status-text { 
  font-size: 0.65rem; 
  font-weight: 700; 
  color: #475569; 
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.mesa-footer {
  border-top: 1px solid #f1f5f9;
  padding-top: 0.4rem;
  margin-top: auto;
}
.zona-tag { 
  font-size: 0.6rem; 
  font-weight: 800; 
  text-transform: uppercase; 
  color: #94a3b8; 
  letter-spacing: 0.08em; 
  display: block; 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-design {
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem;
  font-weight: 700;
  font-size: 0.9rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-design.active {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}

.mesa-header { display: flex; justify-content: space-between; align-items: center; }
.mesa-id { font-weight: 800; font-size: 1.1rem; color: #0f172a; }
.mesa-pax { font-size: 0.7rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 6px; }

.mesa-body { display: flex; align-items: center; gap: 0.5rem; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: block; }
.status-text { font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

.mesa-footer { margin-top: auto; }
.zona-tag { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }

/* Mesa Editor Panel */
.mesa-editor-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 2rem; }
.mesa-editor-card { background: white; width: 100%; max-width: 450px; border-radius: 2rem; padding: 3rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.mesa-editor-card h2 { font-size: 1.75rem; font-weight: 800; margin-bottom: 2.5rem; color: #0f172a; }

.edit-fields { display: flex; flex-direction: column; gap: 2rem; margin-bottom: 3rem; }
.field { display: flex; flex-direction: column; gap: 0.75rem; }
.field label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; }
.field select, .field input { padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: 600; font-family: inherit; }

.editor-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.btn-save { background: #0f172a; color: white; border: none; padding: 1.25rem; border-radius: 1rem; font-weight: 700; cursor: pointer; }
.btn-delete-mesa { background: #fee2e2; color: #991b1b; border: none; padding: 1.25rem; border-radius: 1rem; font-weight: 700; cursor: pointer; }

/* Selector in Card */
.table-selector {
  margin-top: 0.25rem;
  padding: 0.35rem 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f8fafc;
  color: #0f172a;
  outline: none;
  cursor: pointer;
}

/* Overlays */
.loading-overlay { position: fixed; inset:0; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
.scroll-x { overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none; }
.scroll-x::-webkit-scrollbar { display: none; }

/* Transitions */
.animate-in { animation: enter 0.3s ease-out; }
@keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
