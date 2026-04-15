<template>
  <!-- ══════════════════════════════════════════════════
       TANE BOOKING SYSTEM — CRM v3.0
       Admin Panel + SaaS Multi-tenant Dashboard
  ══════════════════════════════════════════════════ -->

  <!-- 1. Auth checking loader -->
  <div v-if="checkingAuth" class="auth-loader">
    <div class="pulse-ring"></div>
    <p class="loader-label">VALIDANDO ACCESO</p>
  </div>

  <!-- 2. Login screen -->
  <div v-else-if="!user" class="login-screen">
    <div class="login-card">
      <header class="login-brand">
        <h1>TANE</h1>
        <p>BOOKING SYSTEM</p>
      </header>
      <form @submit.prevent="login" class="login-form" novalidate>
        <div class="field">
          <label for="login-email">Email</label>
          <input id="login-email" v-model="loginEmail" type="email" required
            autocomplete="email" placeholder="admin@empresa.com" :class="loginError ? 'has-error' : ''">
        </div>
        <div class="field">
          <label for="login-pw">Contraseña</label>
          <input id="login-pw" v-model="loginPw" type="password" required
            autocomplete="current-password" placeholder="••••••••" :class="loginError ? 'has-error' : ''">
        </div>
        <div v-if="loginError" class="login-error-msg" role="alert">{{ loginError }}</div>
        <button type="submit" :disabled="loggingIn" class="login-submit">
          <span v-if="loggingIn" class="btn-spinner"></span>
          {{ loggingIn ? 'ENTRANDO…' : 'INICIAR SESIÓN' }}
        </button>
      </form>
    </div>
  </div>

  <!-- 3. Main dashboard -->
  <div v-else class="dashboard-wrap">

    <!-- SIDEBAR -->
    <aside :class="['sidebar', sidebarOpen ? 'sidebar--open' : '']" role="navigation">
      <div class="sidebar-head">
        <div class="sidebar-logo">
          <span class="logo-word">TANE</span>
          <span class="logo-tag">{{ isSuperAdmin ? 'SUPREME' : 'ADMIN' }}</span>
        </div>
        <button class="sidebar-close" @click="sidebarOpen = false" aria-label="Cerrar menú">✕</button>
      </div>

      <nav class="sidebar-nav">
        <!-- Superadmin: gestión SaaS -->
        <template v-if="isSuperAdmin">
          <button v-if="currentView === 'restaurant-profile'" @click="nav('saas-clients')" class="nav-btn nav-btn--back">
            ← CLIENTES SAAS
          </button>
          <button @click="nav('saas-clients')"
            :class="['nav-btn', currentView === 'saas-clients' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            CLIENTES SAAS
          </button>
        </template>

        <!-- Restaurant navigation -->
        <template v-if="currentRestaurantId">
          <p v-if="isSuperAdmin" class="nav-section-label">{{ currentRestaurantName || 'Restaurante' }}</p>
          <button @click="nav('reservas')"
            :class="['nav-btn', currentView === 'reservas' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
            RESERVAS
            <span v-if="pendingCount > 0" class="nav-badge">{{ pendingCount }}</span>
          </button>
          <button @click="nav('customers')"
            :class="['nav-btn', currentView === 'customers' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            CRM CLIENTES
          </button>
          <button @click="nav('mapa')"
            :class="['nav-btn', currentView === 'mapa' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            MAPA SALA
          </button>
        </template>
      </nav>

      <div class="sidebar-foot">
        <p class="user-email-tag">{{ user.email }}</p>
        <div class="status-row">
          <span :class="['status-dot', `status-dot--${status}`]"></span>
          <span class="status-label">{{ statusMsg }}</span>
        </div>
        <button @click="logout" class="logout-btn">Cerrar sesión</button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <!-- MAIN CONTENT -->
    <main class="main-area">

      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="hamburger" @click="sidebarOpen = true" aria-label="Abrir menú">
            <span></span><span></span><span></span>
          </button>
          <h2 class="topbar-title">{{ viewTitle }}</h2>
        </div>
        <div v-if="isSuperAdmin" class="topbar-right">
          <select v-model="selectedRestaurantId" @change="switchRestaurant" class="res-switcher">
            <option value="">— Seleccionar restaurante —</option>
            <option v-for="r in restaurants" :key="r.id" :value="r.id">{{ r.nombre }}</option>
          </select>
        </div>
      </header>

      <!-- ── VIEW: RESERVAS ── -->
      <section v-if="currentView === 'reservas' && currentRestaurantId" class="view-section">

        <!-- KPI strip -->
        <div class="kpi-strip">
          <div class="kpi-card">
            <p class="kpi-num">{{ kpis.total }}</p>
            <p class="kpi-lbl">Total</p>
          </div>
          <div class="kpi-card kpi-card--warn">
            <p class="kpi-num">{{ kpis.pendientes }}</p>
            <p class="kpi-lbl">Pendientes</p>
          </div>
          <div class="kpi-card kpi-card--success">
            <p class="kpi-num">{{ kpis.confirmadas }}</p>
            <p class="kpi-lbl">Confirmadas</p>
          </div>
          <div class="kpi-card">
            <p class="kpi-num">{{ kpis.pax }}</p>
            <p class="kpi-lbl">Pax total</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="filters-bar">
          <div class="filter-group" style="flex-direction:row; align-items:center; gap:0.375rem;">
            <input type="date" v-model="filterDate" class="filter-input" style="width:auto">
            <button @click="setToday" :class="['quick-date-btn', filterDate === today && 'quick-date-btn--active']">Hoy</button>
            <button v-if="filterDate" @click="filterDate = ''" class="quick-date-btn" title="Ver todas las fechas">✕ Todas</button>
          </div>
          <div class="tab-group">
            <button v-for="tab in statusTabs" :key="tab.value"
              @click="filterStatus = tab.value"
              :class="['tab-pill', filterStatus === tab.value && 'tab-pill--active']">
              {{ tab.label }}
            </button>
          </div>
          <div class="filter-group filter-search-wrap" style="flex-direction:row; align-items:center; gap:0.375rem;">
            <input v-model="searchQuery" type="search"
              placeholder="Buscar nombre, email o teléfono…" class="filter-input filter-search">
            <button @click="refreshData" :disabled="refreshing" class="refresh-btn" title="Recargar reservas">
              <span :class="refreshing ? 'spin-icon' : ''">↻</span>
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="state-feedback">
          <div class="mini-spinner"></div>
          <span>Sincronizando reservas en tiempo real…</span>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredBookings.length === 0" class="state-empty">
          <p class="empty-icon">📋</p>
          <p class="empty-title">Sin reservas</p>
          <p class="empty-sub">No hay reservas para los filtros seleccionados.</p>
        </div>

        <!-- Bookings list -->
        <div v-else class="bookings-list">
          <article v-for="res in filteredBookings" :key="res.id"
            :class="['booking-row', `booking-row--${res.estado}`]">

            <!-- Colored status bar -->
            <div class="booking-bar"></div>

            <!-- Main info -->
            <div class="booking-body">
              <div class="booking-top">
                <div class="booking-identity">
                  <strong class="booking-name">{{ res.nombre_cliente }}</strong>
                  <span class="booking-pax-pill">{{ res.comensales }} pax</span>
                  <span :class="['estado-badge', `estado-badge--${res.estado}`]">
                    {{ estadoLabel(res.estado) }}
                  </span>
                </div>
                <div class="booking-time-block">
                  <span class="time-big">{{ res.hora }}</span>
                  <span class="date-small">{{ formatDate(res.fecha) }}</span>
                </div>
              </div>

              <div class="booking-meta-row">
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {{ res.email }}
                </span>
                <span class="meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.54 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {{ res.telefono }}
                </span>
                <span v-if="res.mesa_id" class="meta-item meta-mesa">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  {{ getMesaNombre(res.mesa_id) }}
                </span>
              </div>

              <div v-if="res.comentarios" class="booking-comment">
                💬 <em>{{ res.comentarios }}</em>
              </div>

              <!-- Inline notes -->
              <div class="notes-wrap">
                <textarea v-model="notasEdit[res.id]"
                  placeholder="Nota interna del staff (se guarda automáticamente)…"
                  class="notes-textarea" rows="1"
                  @blur="saveNota(res.id)"
                  @input="autoGrow($event)"></textarea>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="booking-actions">
              <template v-if="res.estado === 'pendiente'">
                <button @click="approveBooking(res)" class="act-btn act-btn--confirm">
                  ✓ APROBAR
                </button>
                <button @click="changeStatus(res.id, 'cancelada')" class="act-btn act-btn--cancel">
                  ✕ RECHAZAR
                </button>
              </template>
              <template v-if="res.estado === 'confirmada'">
                <button @click="changeStatus(res.id, 'no-show')" class="act-btn act-btn--noshow">
                  ⊘ NO SHOW
                </button>
                <button @click="changeStatus(res.id, 'cancelada')" class="act-btn act-btn--cancel act-btn--sm">
                  CANCELAR
                </button>
              </template>
              <template v-if="res.estado === 'cancelada' || res.estado === 'no-show'">
                <button @click="changeStatus(res.id, 'pendiente')" class="act-btn act-btn--restore">
                  ↩ RESTAURAR
                </button>
              </template>
            </div>

          </article>
        </div>
      </section>

      <!-- ── VIEW: CRM CLIENTES ── -->
      <section v-else-if="currentView === 'customers' && currentRestaurantId" class="view-section">
        <div class="view-header">
          <div>
            <h3 class="view-heading">Base de Datos de Clientes</h3>
            <p class="view-sub">{{ uniqueCustomers.length }} clientes únicos registrados</p>
          </div>
          <div class="view-actions">
            <input v-model="customerSearch" type="search"
              placeholder="Buscar cliente…" class="filter-input filter-search">
          </div>
        </div>

        <div class="table-wrap">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Visitas</th>
                <th>Última visita</th>
                <th>Marketing</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in filteredCustomers" :key="c.email" class="crm-row">
                <td><strong>{{ c.nombre }}</strong></td>
                <td class="email-cell">{{ c.email }}</td>
                <td>{{ c.telefono || '—' }}</td>
                <td>
                  <span class="visit-pill">{{ c.count }}</span>
                </td>
                <td class="date-cell">{{ c.lastVisit }}</td>
                <td>
                  <span :class="['marketing-pill', c.marketing ? 'marketing-pill--yes' : 'marketing-pill--no']">
                    {{ c.marketing ? '✓ Sí' : '— No' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ── VIEW: MAPA SALA ── -->
      <section v-else-if="currentView === 'mapa' && currentRestaurantId" class="view-section">
        <div class="view-header">
          <div>
            <h3 class="view-heading">Mapa de Sala</h3>
            <p class="view-sub">
              {{ editingMapa ? 'Arrastra mesas · Clic en hueco para añadir' : 'Clic en una mesa para cambiar su estado' }}
            </p>
          </div>
          <div class="mapa-header-actions">
            <div v-if="!editingMapa" class="mapa-legend">
              <span class="legend-dot legend-dot--libre">Libre</span>
              <span class="legend-dot legend-dot--reservada">Reservada</span>
              <span class="legend-dot legend-dot--ocupada">Ocupada</span>
            </div>
            <button v-if="!editingMapa" @click="editingMapa = true" class="btn-outline-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              EDITAR MAPA
            </button>
            <button v-else @click="editingMapa = false" class="btn-primary-sm">✓ LISTO</button>
          </div>
        </div>

        <div class="mapa-grid-wrap">
          <div class="mapa-grid" :class="{ 'mapa-grid--editing': editingMapa }">

            <!-- Celdas de fondo (solo modo edición) -->
            <template v-if="editingMapa">
              <div v-for="cell in mapaGridCells" :key="cell.key"
                class="mapa-cell"
                :class="{
                  'mapa-cell--over':     dragOverCell && dragOverCell.x === cell.x && dragOverCell.y === cell.y,
                  'mapa-cell--occupied': occupiedCells.has(`${cell.x}-${cell.y}`)
                }"
                :style="{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }"
                @dragover.prevent="dragOverCell = cell"
                @dragleave="dragOverCell = null"
                @drop.prevent="dropMesa(cell.x, cell.y)"
                @click="openAddMesa(cell.x, cell.y)"
              ></div>
            </template>

            <!-- Mesa tiles -->
            <div v-for="mesa in mesas" :key="mesa.id"
              :class="['mesa-tile', `mesa-tile--${mesa.estado}`, { 'mesa-tile--edit': editingMapa }]"
              :style="{ gridColumn: (mesa.x ?? 0) + 1, gridRow: (mesa.y ?? 0) + 1 }"
              :draggable="editingMapa"
              @dragstart="editingMapa && startDragMesa($event, mesa)"
              @click.stop="editingMapa ? openEditMesa(mesa) : toggleMesaEstado(mesa)"
              :title="`${mesa.nombre} — ${mesa.pax_max} pax`">
              <span class="mesa-name">{{ mesa.nombre }}</span>
              <span class="mesa-cap">{{ mesa.pax_max }}p</span>
              <button v-if="editingMapa" @click.stop="confirmDeleteMesa(mesa)"
                class="mesa-del-btn" title="Eliminar mesa">✕</button>
            </div>

            <!-- Hint cuando no hay mesas -->
            <div v-if="mesas.length === 0 && !editingMapa" class="mapa-empty-hint">
              <p class="empty-icon">🪑</p>
              <p class="empty-title">Sin mesas configuradas</p>
              <p class="empty-sub">Pulsa <strong>EDITAR MAPA</strong> para añadir mesas.</p>
            </div>
            <div v-if="mesas.length === 0 && editingMapa" class="mapa-empty-hint">
              Clic en cualquier celda para colocar tu primera mesa
            </div>
          </div>
        </div>
      </section>

      <!-- ── VIEW: SAAS CLIENTS (superadmin) ── -->
      <section v-else-if="currentView === 'saas-clients'" class="view-section">
        <div class="view-header">
          <div>
            <h3 class="view-heading">Clientes SaaS</h3>
            <p class="view-sub">{{ restaurants.length }} restaurantes en la plataforma</p>
          </div>
          <button @click="showCreateModal = true" class="btn-primary-sm">
            + NUEVO CLIENTE
          </button>
        </div>

        <div v-if="restaurants.length === 0" class="state-empty">
          <p class="empty-icon">🏪</p>
          <p class="empty-title">Sin clientes aún</p>
          <p class="empty-sub">Crea el primer restaurante en la plataforma.</p>
          <button @click="showCreateModal = true" class="btn-primary-sm" style="margin-top:1.5rem">
            + AÑADIR PRIMER CLIENTE
          </button>
        </div>

        <div v-else class="saas-grid">
          <article v-for="res in restaurants" :key="res.id" class="saas-card">
            <div class="saas-card-head">
              <h4 class="saas-name">{{ res.nombre }}</h4>
              <span class="saas-active-badge">ACTIVO</span>
            </div>
            <div class="saas-card-meta">
              <p class="saas-id">slug: <code>{{ res.id }}</code></p>
              <p class="saas-date" v-if="res.creado_en">
                desde {{ formatDate(res.creado_en) }}
              </p>
            </div>
            <div class="saas-card-footer">
              <button @click="openProfile(res)" class="btn-manage">Ver perfil →</button>
              <button @click="openDeleteModal(res.id, res.nombre)" class="btn-delete">
                Dar de baja
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- ── VIEW: RESTAURANT PROFILE ── -->
      <section v-else-if="currentView === 'restaurant-profile' && profileRestaurant" class="view-section">

        <!-- Header with restaurant name and quick actions -->
        <div class="view-header">
          <div>
            <h3 class="view-heading">{{ profileRestaurant.nombre }}</h3>
            <p class="view-sub">ID: <code class="profile-id">{{ profileRestaurant.id }}</code></p>
          </div>
          <div style="display:flex; gap:0.5rem">
            <button @click="selectAndGo(profileRestaurant.id)" class="btn-outline-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
              VER RESERVAS
            </button>
          </div>
        </div>

        <div class="profile-grid">

          <!-- LEFT: Datos del restaurante (editable) -->
          <div class="profile-section">
            <h4 class="profile-section-title">Datos del restaurante</h4>
            <div class="profile-form">
              <div class="field"><label>Nombre</label><input v-model="profileForm.nombre" type="text" placeholder="Nombre del restaurante"></div>
              <div class="field"><label>Dirección</label><input v-model="profileForm.direccion" type="text" placeholder="Calle, número, ciudad"></div>
              <div class="field-row">
                <div class="field"><label>Teléfono</label><input v-model="profileForm.telefono" type="tel" placeholder="+34 600 000 000"></div>
                <div class="field"><label>Email contacto</label><input v-model="profileForm.email" type="email" placeholder="info@restaurante.com"></div>
              </div>
              <div class="field"><label>Sitio web</label><input v-model="profileForm.web" type="url" placeholder="https://restaurante.com"></div>
              <div class="field-row">
                <div class="field">
                  <label>Plan</label>
                  <select v-model="profileForm.plan" class="field-select">
                    <option value="trial">Trial (gratis)</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div class="field">
                  <label>Estado</label>
                  <label class="toggle-label">
                    <input type="checkbox" v-model="profileForm.activo" class="toggle-input">
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                    <span class="toggle-text">{{ profileForm.activo ? 'Activo' : 'Inactivo' }}</span>
                  </label>
                </div>
              </div>
              <button @click="saveProfile" :disabled="profileSaving" class="btn-primary-sm" style="margin-top:0.5rem; align-self:flex-start">
                <span v-if="profileSaving">Guardando…</span>
                <span v-else>Guardar cambios</span>
              </button>
              <p v-if="profileSaved" class="profile-saved-msg">✓ Guardado</p>
            </div>
          </div>

          <!-- CENTER: Configuración de horarios -->
          <div class="profile-section">
            <h4 class="profile-section-title">Horarios de reservas</h4>
            <div class="profile-form">
              <p class="horarios-hint">Define los turnos disponibles y el intervalo entre franjas. BookingForm lo usará automáticamente.</p>
              <div class="horarios-block">
                <span class="horarios-label">Comida</span>
                <div class="field-row" style="gap:0.75rem; align-items:flex-end">
                  <div class="field">
                    <label>Inicio</label>
                    <input v-model="profileForm.horarios.comida.inicio" type="time" class="field-input-sm">
                  </div>
                  <div class="field">
                    <label>Fin</label>
                    <input v-model="profileForm.horarios.comida.fin" type="time" class="field-input-sm">
                  </div>
                </div>
              </div>
              <div class="horarios-block">
                <span class="horarios-label">Cena</span>
                <div class="field-row" style="gap:0.75rem; align-items:flex-end">
                  <div class="field">
                    <label>Inicio</label>
                    <input v-model="profileForm.horarios.cena.inicio" type="time" class="field-input-sm">
                  </div>
                  <div class="field">
                    <label>Fin</label>
                    <input v-model="profileForm.horarios.cena.fin" type="time" class="field-input-sm">
                  </div>
                </div>
              </div>
              <div class="field">
                <label>Intervalo entre franjas</label>
                <select v-model.number="profileForm.horarios.intervalo" class="field-select">
                  <option :value="15">15 minutos</option>
                  <option :value="30">30 minutos</option>
                  <option :value="60">60 minutos (cada hora)</option>
                </select>
              </div>
              <button @click="saveProfile" :disabled="profileSaving" class="btn-primary-sm" style="margin-top:0.5rem; align-self:flex-start">
                <span v-if="profileSaving">Guardando…</span>
                <span v-else>Guardar horarios</span>
              </button>
              <p v-if="profileSaved" class="profile-saved-msg">✓ Guardado</p>
            </div>
          </div>

          <!-- RIGHT: URLs + Accesos -->
          <div class="profile-section">

            <!-- URLs del sistema -->
            <h4 class="profile-section-title">URLs del sistema</h4>
            <div class="url-list">
              <div class="url-item">
                <div class="url-info">
                  <span class="url-label">Formulario de reservas</span>
                  <span class="url-value">/booking?id={{ profileRestaurant.id }}</span>
                </div>
                <button @click="copyUrl('booking', profileRestaurant.id)" class="copy-btn" :class="{ 'copy-btn--copied': copiedUrl === 'booking' }">
                  {{ copiedUrl === 'booking' ? '✓' : 'Copiar' }}
                </button>
              </div>
              <div class="url-item">
                <div class="url-info">
                  <span class="url-label">Widget embebible</span>
                  <span class="url-value">/booking-widget?id={{ profileRestaurant.id }}</span>
                </div>
                <button @click="copyUrl('widget', profileRestaurant.id)" class="copy-btn" :class="{ 'copy-btn--copied': copiedUrl === 'widget' }">
                  {{ copiedUrl === 'widget' ? '✓' : 'Copiar' }}
                </button>
              </div>
              <div class="url-item">
                <div class="url-info">
                  <span class="url-label">Panel admin restaurante</span>
                  <span class="url-value">/admin/dashboard?id={{ profileRestaurant.id }}</span>
                </div>
                <button @click="copyUrl('admin', profileRestaurant.id)" class="copy-btn" :class="{ 'copy-btn--copied': copiedUrl === 'admin' }">
                  {{ copiedUrl === 'admin' ? '✓' : 'Copiar' }}
                </button>
              </div>
            </div>

            <!-- Accesos y usuarios -->
            <h4 class="profile-section-title" style="margin-top:1.5rem">
              Accesos y usuarios
              <button @click="addUserModal.show = true" class="add-user-btn">+ Añadir acceso</button>
            </h4>

            <div v-if="loadingUsers" class="profile-loading">Cargando usuarios…</div>
            <div v-else-if="restaurantUsers.length === 0" class="profile-empty-users">
              Sin usuarios asignados. Añade el primer acceso.
            </div>
            <div v-else class="users-list">
              <div v-for="u in restaurantUsers" :key="u.uid" class="user-row">
                <div class="user-info">
                  <span class="user-email">{{ u.email }}</span>
                  <span :class="['user-role-badge', `user-role-badge--${u.role}`]">{{ u.role }}</span>
                </div>
                <button @click="revokeAccess(u)" class="revoke-btn" title="Revocar acceso">✕</button>
              </div>
            </div>

          </div>
        </div>

        <!-- Danger zone -->
        <div class="danger-zone">
          <h4 class="danger-title">Zona de peligro</h4>
          <p class="danger-desc">Dar de baja eliminará el perfil del restaurante de la plataforma. Las reservas existentes NO se borrarán.</p>
          <button @click="openDeleteModal(profileRestaurant.id, profileRestaurant.nombre)" class="btn-danger-sm">
            Dar de baja {{ profileRestaurant.nombre }}
          </button>
        </div>

      </section>

      <!-- Empty / fallback -->
      <section v-else class="view-section state-empty">
        <p class="empty-icon">◈</p>
        <p class="empty-title">Selecciona un módulo</p>
        <p class="empty-sub">Usa el menú lateral para navegar.</p>
      </section>

    </main>
  </div>

  <!-- ══ MODAL: Crear Restaurante ══ -->
  <Teleport to="body">
    <div v-if="showCreateModal" class="modal-backdrop" @click.self="showCreateModal = false" role="dialog" aria-modal="true">
      <div class="modal-box">
        <h3 class="modal-title">Nuevo Cliente SaaS</h3>
        <p class="modal-desc">El nombre se usará para identificar al restaurante en la plataforma.</p>
        <div class="field">
          <label>Nombre del restaurante</label>
          <input v-model="newRestaurantName" type="text"
            placeholder="Ej: La Terraza Mediterránea"
            class="modal-input" ref="createInputRef"
            @keyup.enter="createRestaurant">
        </div>
        <div class="modal-footer">
          <button @click="showCreateModal = false" class="btn-ghost-sm">CANCELAR</button>
          <button @click="createRestaurant" :disabled="!newRestaurantName.trim()" class="btn-primary-sm">
            CREAR CLIENTE
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ══ MODAL: Mesa (añadir / editar) ══ -->
  <Teleport to="body">
    <div v-if="mesaModal.show" class="modal-backdrop" @click.self="mesaModal.show = false" role="dialog" aria-modal="true">
      <div class="modal-box">
        <h3 class="modal-title">{{ mesaModal.isNew ? 'Nueva mesa' : 'Editar mesa' }}</h3>
        <p class="mesa-modal-pos">
          Posición: <strong>Col {{ mesaModal.x + 1 }}, Fila {{ mesaModal.y + 1 }}</strong>
        </p>
        <div class="field-row">
          <div class="field">
            <label>Nombre</label>
            <input v-model="mesaModal.nombre" type="text" placeholder="M1, Terraza 2…"
              @keyup.enter="saveMesa" autofocus>
          </div>
          <div class="field field--narrow">
            <label>Capacidad (pax)</label>
            <input v-model.number="mesaModal.pax_max" type="number" min="1" max="30">
          </div>
        </div>
        <div class="modal-footer">
          <button @click="mesaModal.show = false" class="btn-ghost-sm">CANCELAR</button>
          <button @click="saveMesa" :disabled="!mesaModal.nombre.trim()" class="btn-primary-sm">
            {{ mesaModal.isNew ? 'CREAR MESA' : 'GUARDAR CAMBIOS' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ══ MODAL: Añadir acceso ══ -->
  <Teleport to="body">
    <div v-if="addUserModal.show" class="modal-backdrop" @click.self="closeAddUserModal" role="dialog" aria-modal="true">
      <div class="modal-box">
        <h3 class="modal-title">Añadir acceso</h3>
        <p class="modal-desc">Crea una cuenta para que el restaurante gestione sus propias reservas.</p>

        <!-- Result: success -->
        <div v-if="addUserModal.result?.success" class="add-user-success">
          <p class="add-user-success-title">✓ Cuenta creada</p>
          <p class="add-user-success-desc">Comparte estas credenciales con el cliente:</p>
          <div class="credentials-box">
            <p><strong>Email:</strong> {{ addUserModal.email }}</p>
            <p><strong>Contraseña temporal:</strong> <code>{{ addUserModal.result.password }}</code></p>
          </div>
          <p class="add-user-hint">El usuario debe cambiar la contraseña en su primer acceso.</p>
          <div class="modal-footer">
            <button @click="closeAddUserModal" class="btn-primary-sm">Cerrar</button>
          </div>
        </div>

        <!-- Result: error -->
        <div v-else-if="addUserModal.result?.success === false" class="add-user-error">
          {{ addUserModal.result.message }}
          <div class="modal-footer" style="margin-top:1rem">
            <button @click="addUserModal.result = null" class="btn-ghost-sm">Intentar de nuevo</button>
            <button @click="closeAddUserModal" class="btn-primary-sm">Cerrar</button>
          </div>
        </div>

        <!-- Form -->
        <div v-else>
          <div class="field-row">
            <div class="field">
              <label>Email del usuario</label>
              <input v-model="addUserModal.email" type="email" placeholder="manager@restaurante.com" @keyup.enter="addUser">
            </div>
            <div class="field field--narrow">
              <label>Rol</label>
              <select v-model="addUserModal.role" class="field-select">
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeAddUserModal" class="btn-ghost-sm">CANCELAR</button>
            <button @click="addUser" :disabled="!addUserModal.email.trim() || addUserModal.saving" class="btn-primary-sm">
              <span v-if="addUserModal.saving">Creando…</span>
              <span v-else>CREAR ACCESO</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ══ MODAL: Confirmar Borrado ══ -->
  <Teleport to="body">
    <div v-if="deleteModal.show" class="modal-backdrop" @click.self="deleteModal.show = false" role="dialog" aria-modal="true">
      <div class="modal-box modal-box--danger">
        <h3 class="modal-title">Confirmar baja</h3>
        <p class="modal-desc">
          ¿Estás seguro de dar de baja a <strong>{{ deleteModal.name }}</strong>?
          Esta acción eliminará el registro del restaurante. Las reservas existentes no se borrarán.
        </p>
        <div class="modal-footer">
          <button @click="deleteModal.show = false" class="btn-ghost-sm">CANCELAR</button>
          <button @click="execDelete" class="btn-danger-sm">DAR DE BAJA</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  collection, query, where, orderBy,
  onSnapshot, updateDoc, doc, deleteDoc,
  setDoc, addDoc, getDoc, getDocs, serverTimestamp
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { findBestTable, getTurnTime, timeToMinutes } from '../lib/reservationUtils.ts';

defineProps({ restaurantId: { type: String, default: 'the-editorial' } });

// ─── Auth ───────────────────────────────────────────
const user          = ref(null);
const userProfile   = ref(null);
const checkingAuth  = ref(true);
const loggingIn     = ref(false);
const loginEmail    = ref('');
const loginPw       = ref('');
const loginError    = ref('');

// ─── UI State ───────────────────────────────────────
const isSuperAdmin      = ref(false);
const sidebarOpen       = ref(false);
const currentView       = ref('reservas');
const loading           = ref(true);
const status            = ref('connecting');
const statusMsg         = ref('Conectando…');

// ─── Data ────────────────────────────────────────────
const restaurants       = ref([]);
const reservas          = ref([]);
const mesas             = ref([]);
const selectedRestaurantId = ref('');
let unsubs = [];

// ─── Modals ──────────────────────────────────────────
const showCreateModal   = ref(false);
const newRestaurantName = ref('');
const createInputRef    = ref(null);
const deleteModal       = ref({ show: false, id: '', name: '' });

// ─── Restaurant profile ────────────────────────────
const profileRestaurant = ref(null);
const profileForm       = ref({});
const profileSaving     = ref(false);
const profileSaved      = ref(false);
const restaurantUsers   = ref([]);
const loadingUsers      = ref(false);
const copiedUrl         = ref('');
const addUserModal      = ref({ show: false, email: '', role: 'admin', saving: false, result: null });

// ─── Filters ─────────────────────────────────────────
const filterDate    = ref('');   // empty = todas las fechas
const filterStatus  = ref('todas');
const searchQuery   = ref('');
const customerSearch = ref('');
const today         = new Date().toISOString().split('T')[0];
const setToday      = () => { filterDate.value = filterDate.value === today ? '' : today; };

// ─── Inline notes ────────────────────────────────────
const notasEdit = ref({});

// ─── Mapa editor ─────────────────────────────────────
const editingMapa  = ref(false);
const dragMesaId   = ref(null);
const dragOverCell = ref(null);
const mesaModal    = ref({ show: false, isNew: true, id: '', nombre: '', pax_max: 4, x: 0, y: 0 });

// ─── Config ──────────────────────────────────────────
const statusTabs = [
  { value: 'todas',     label: 'Todas'      },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'confirmada',label: 'Confirmadas'},
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'no-show',   label: 'No Show'    },
];

// ─── Computed ────────────────────────────────────────
const currentRestaurantId = computed(() =>
  isSuperAdmin.value ? selectedRestaurantId.value : userProfile.value?.restaurant_id
);

const currentRestaurantName = computed(() =>
  restaurants.value.find(r => r.id === currentRestaurantId.value)?.nombre ?? ''
);

const viewTitle = computed(() => ({
  'reservas':            currentRestaurantName.value || 'RESERVAS',
  'customers':           'CRM CLIENTES',
  'mapa':                'MAPA DE SALA',
  'saas-clients':        'CLIENTES SAAS',
  'restaurant-profile':  profileRestaurant.value?.nombre ?? 'PERFIL',
}[currentView.value] ?? 'PANEL DE CONTROL'));

const pendingCount = computed(() =>
  reservas.value.filter(r => r.estado === 'pendiente').length
);

const filteredBookings = computed(() => {
  let list = [...reservas.value];

  // Filter by selected date
  if (filterDate.value) {
    list = list.filter(r => {
      const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      return d.toISOString().split('T')[0] === filterDate.value;
    });
  }

  // Filter by status
  if (filterStatus.value !== 'todas') {
    list = list.filter(r => r.estado === filterStatus.value);
  }

  // Search across name, email and phone
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(r =>
      r.nombre_cliente?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.telefono?.includes(q)
    );
  }

  // Sort by hour ascending
  return list.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''));
});

const kpis = computed(() => {
  // KPIs always reference the selected date, independent of other filters
  const day = reservas.value.filter(r => {
    if (!filterDate.value) return true;
    const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
    return d.toISOString().split('T')[0] === filterDate.value;
  });
  return {
    total:       day.length,
    pendientes:  day.filter(r => r.estado === 'pendiente').length,
    confirmadas: day.filter(r => r.estado === 'confirmada').length,
    pax:         day.reduce((sum, r) => sum + (Number(r.comensales) || 0), 0),
  };
});

const uniqueCustomers = computed(() => {
  const map = new Map();
  reservas.value.forEach(r => {
    if (!map.has(r.email)) {
      map.set(r.email, {
        nombre:    r.nombre_cliente,
        email:     r.email,
        telefono:  r.telefono,
        count:     0,
        marketing: r.marketing_consent ?? false,
        lastDate:  null,
      });
    }
    const c = map.get(r.email);
    c.count++;
    const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
    if (!c.lastDate || d > c.lastDate) c.lastDate = d;
  });
  return [...map.values()]
    .map(c => ({
      ...c,
      lastVisit: c.lastDate
        ? c.lastDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—',
    }))
    .sort((a, b) => b.count - a.count);
});

const filteredCustomers = computed(() => {
  if (!customerSearch.value.trim()) return uniqueCustomers.value;
  const q = customerSearch.value.toLowerCase();
  return uniqueCustomers.value.filter(c =>
    c.nombre?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  );
});

const GRID_COLS = 13;
const GRID_ROWS = 9;
const mapaGridCells = computed(() => {
  const cells = [];
  for (let y = 0; y < GRID_ROWS; y++)
    for (let x = 0; x < GRID_COLS; x++)
      cells.push({ key: `${x}-${y}`, x, y });
  return cells;
});
const occupiedCells = computed(() => {
  const s = new Set();
  mesas.value.forEach(m => s.add(`${m.x ?? 0}-${m.y ?? 0}`));
  return s;
});

// ─── Helpers ─────────────────────────────────────────
const estadoLabel = (estado) => ({
  pendiente:  'PENDIENTE',
  confirmada: 'CONFIRMADA',
  cancelada:  'CANCELADA',
  'no-show':  'NO SHOW',
}[estado] ?? estado?.toUpperCase() ?? '');

const formatDate = (fecha) => {
  if (!fecha) return '—';
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', weekday: 'short' });
};

const getMesaNombre = (mesaId) =>
  mesas.value.find(m => m.id === mesaId)?.nombre ?? mesaId;

const autoGrow = (e) => {
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
};

// ─── Manual refresh (fallback when real-time listener is blocked) ─────────────
const refreshing = ref(false);
const refreshData = async () => {
  const rid = selectedRestaurantId.value;
  if (!rid) return;
  refreshing.value = true;
  try {
    const [resSnap, mesasSnap] = await Promise.all([
      getDocs(query(collection(db, 'reservas'), where('restaurant_id', '==', rid), orderBy('creado_en', 'desc'))),
      getDocs(query(collection(db, 'mesas'), where('restaurant_id', '==', rid))),
    ]);
    reservas.value = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    mesas.value    = mesasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('[AdminTable] refreshData error:', err);
  } finally {
    refreshing.value = false;
  }
};

// ─── Data sync (real-time) ────────────────────────────
const syncData = (rid) => {
  unsubs.forEach(u => u());
  unsubs = [];
  if (!rid) return;

  loading.value   = true;
  status.value    = 'connecting';
  statusMsg.value = 'Sincronizando…';

  const qReservas = query(
    collection(db, 'reservas'),
    where('restaurant_id', '==', rid),
    orderBy('creado_en', 'desc')
  );
  const qMesas = query(collection(db, 'mesas'), where('restaurant_id', '==', rid));

  unsubs.push(
    onSnapshot(qReservas, (snap) => {
      reservas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Init notes cache for each reservation
      reservas.value.forEach(r => {
        if (notasEdit.value[r.id] === undefined) {
          notasEdit.value[r.id] = r.notas ?? '';
        }
      });
      loading.value   = false;
      status.value    = 'connected';
      statusMsg.value = 'EN VIVO ●';
    }, (err) => {
      console.error('[AdminTable] Firestore error:', err);
      status.value    = 'error';
      statusMsg.value = 'ERROR DE CONEXIÓN';
      loading.value   = false;
    })
  );

  unsubs.push(
    onSnapshot(qMesas, (snap) => {
      mesas.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    })
  );
};

const syncRestaurants = () => {
  unsubs.push(
    onSnapshot(collection(db, 'restaurants'), (snap) => {
      restaurants.value = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    })
  );
};

// ─── Auth lifecycle ───────────────────────────────────
onMounted(() => {
  const unsubAuth = onAuthStateChanged(auth, async (u) => {
    user.value = u;
    if (u) {
      const profileSnap = await getDoc(doc(db, 'users', u.uid));
      if (profileSnap.exists()) {
        userProfile.value  = profileSnap.data();
        isSuperAdmin.value = userProfile.value.role === 'superadmin';
        if (isSuperAdmin.value) {
          syncRestaurants();
          currentView.value = 'saas-clients';
        } else if (userProfile.value.restaurant_id) {
          syncData(userProfile.value.restaurant_id);
        }
      } else if (u.email === 'admin@tanesolutions.com') {
        // Bootstrap superadmin on first login
        await setDoc(doc(db, 'users', u.uid), {
          role: 'superadmin', email: u.email, creado_en: serverTimestamp()
        });
        isSuperAdmin.value = true;
        syncRestaurants();
        currentView.value = 'saas-clients';
      }
    }
    checkingAuth.value = false;
  });
  unsubs.push(unsubAuth);
});

onUnmounted(() => unsubs.forEach(u => u()));

// ─── Navigation ──────────────────────────────────────
const nav = (view) => { currentView.value = view; sidebarOpen.value = false; };

const switchRestaurant = () => {
  if (selectedRestaurantId.value) syncData(selectedRestaurantId.value);
};

const selectAndGo = (id) => {
  selectedRestaurantId.value = id;
  currentView.value = 'reservas';
  syncData(id);
};

// ─── Auth actions ─────────────────────────────────────
const login = async () => {
  loggingIn.value  = true;
  loginError.value = '';
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPw.value);
  } catch (e) {
    loginError.value = e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
      ? 'Email o contraseña incorrectos.'
      : 'Error de acceso. Inténtalo de nuevo.';
  } finally {
    loggingIn.value = false;
  }
};

const logout = () => signOut(auth);

// ─── Reservation actions ──────────────────────────────
const changeStatus = async (id, newStatus) => {
  await updateDoc(doc(db, 'reservas', id), { estado: newStatus });
};

/**
 * Confirm a pending booking with smart best-fit table assignment.
 * Uses the same algorithm as BookingForm (reservationUtils):
 *  - Smallest eligible table (minimize waste)
 *  - Checks time conflicts with the day's other reservations
 *  - 15-min buffer between seatings
 */
const approveBooking = async (res) => {
  const update = { estado: 'confirmada', mesa_id: res.mesa_id ?? null };

  // Only re-assign if not already assigned
  if (!res.mesa_id) {
    // Get all reservations for the same day (excluding the one being approved)
    const resDate = res.fecha?.toDate ? res.fecha.toDate() : new Date(res.fecha);
    const dayStr  = resDate.toISOString().split('T')[0];
    const sameDayReservas = reservas.value.filter(r => {
      if (r.id === res.id) return false; // exclude self
      const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      return d.toISOString().split('T')[0] === dayStr;
    });

    const best = findBestTable(mesas.value, res.comensales, res.hora, sameDayReservas);
    if (best) update.mesa_id = best.id;
    else delete update.mesa_id;
  }

  await updateDoc(doc(db, 'reservas', res.id), update);
};

const saveNota = async (id) => {
  const nota = notasEdit.value[id];
  if (nota !== undefined) {
    await updateDoc(doc(db, 'reservas', id), { notas: nota });
  }
};

const toggleMesaEstado = async (mesa) => {
  const cycle = { libre: 'reservada', reservada: 'ocupada', ocupada: 'libre' };
  await updateDoc(doc(db, 'mesas', mesa.id), { estado: cycle[mesa.estado] ?? 'libre' });
};

// ─── Mapa editor actions ─────────────────────────────
const openAddMesa = (x, y) => {
  if (occupiedCells.value.has(`${x}-${y}`)) return;
  mesaModal.value = { show: true, isNew: true, id: '', nombre: '', pax_max: 4, x, y };
};

const openEditMesa = (mesa) => {
  mesaModal.value = {
    show: true, isNew: false, id: mesa.id,
    nombre: mesa.nombre, pax_max: mesa.pax_max,
    x: mesa.x ?? 0, y: mesa.y ?? 0,
  };
};

const saveMesa = async () => {
  const { isNew, id, nombre, pax_max, x, y } = mesaModal.value;
  if (!nombre.trim()) return;
  if (isNew) {
    await addDoc(collection(db, 'mesas'), {
      restaurant_id: currentRestaurantId.value,
      nombre: nombre.trim(),
      pax_max: Number(pax_max),
      x, y, estado: 'libre',
      creado_en: serverTimestamp(),
    });
  } else {
    await updateDoc(doc(db, 'mesas', id), {
      nombre: nombre.trim(),
      pax_max: Number(pax_max),
      x, y,
    });
  }
  mesaModal.value.show = false;
};

const confirmDeleteMesa = async (mesa) => {
  if (!confirm(`¿Eliminar "${mesa.nombre}"? Esta acción no se puede deshacer.`)) return;
  await deleteDoc(doc(db, 'mesas', mesa.id));
};

const startDragMesa = (e, mesa) => {
  dragMesaId.value = mesa.id;
  e.dataTransfer.effectAllowed = 'move';
};

const dropMesa = async (x, y) => {
  if (!dragMesaId.value) return;
  await updateDoc(doc(db, 'mesas', dragMesaId.value), { x, y });
  dragMesaId.value  = null;
  dragOverCell.value = null;
};

// ─── Restaurant (SaaS) actions ────────────────────────
const createRestaurant = async () => {
  const name = newRestaurantName.value.trim();
  if (!name) return;
  await addDoc(collection(db, 'restaurants'), {
    nombre: name, creado_en: serverTimestamp()
  });
  newRestaurantName.value  = '';
  showCreateModal.value    = false;
};

const openDeleteModal = (id, name) => {
  deleteModal.value = { show: true, id, name };
};

const execDelete = async () => {
  await deleteDoc(doc(db, 'restaurants', deleteModal.value.id));
  deleteModal.value = { show: false, id: '', name: '' };
};

// ─── Restaurant profile actions ───────────────────────
const DEFAULT_HORARIOS = {
  comida:    { inicio: '13:00', fin: '17:00' },
  cena:      { inicio: '20:00', fin: '00:00' },
  intervalo: 30,
};

const openProfile = async (restaurant) => {
  profileRestaurant.value = restaurant;
  const h = restaurant.horarios ?? {};
  profileForm.value = {
    nombre:    restaurant.nombre    || '',
    direccion: restaurant.direccion || '',
    telefono:  restaurant.telefono  || '',
    email:     restaurant.email     || '',
    web:       restaurant.web       || '',
    plan:      restaurant.plan      || 'basic',
    activo:    restaurant.activo    !== false,
    horarios: {
      comida:    { inicio: h.comida?.inicio ?? '13:00', fin: h.comida?.fin ?? '17:00' },
      cena:      { inicio: h.cena?.inicio   ?? '20:00', fin: h.cena?.fin   ?? '00:00' },
      intervalo: h.intervalo ?? 30,
    },
  };
  profileSaved.value = false;
  currentView.value  = 'restaurant-profile';
  await loadRestaurantUsers(restaurant.id);
};

const saveProfile = async () => {
  profileSaving.value = true;
  try {
    await updateDoc(doc(db, 'restaurants', profileRestaurant.value.id), {
      nombre:    profileForm.value.nombre.trim(),
      direccion: profileForm.value.direccion || '',
      telefono:  profileForm.value.telefono  || '',
      email:     profileForm.value.email     || '',
      web:       profileForm.value.web       || '',
      plan:      profileForm.value.plan      || 'basic',
      activo:    profileForm.value.activo    !== false,
      horarios:  profileForm.value.horarios  ?? DEFAULT_HORARIOS,
    });
    profileRestaurant.value = { ...profileRestaurant.value, ...profileForm.value };
    profileSaved.value = true;
    setTimeout(() => { profileSaved.value = false; }, 2500);
  } finally {
    profileSaving.value = false;
  }
};

const loadRestaurantUsers = async (rid) => {
  loadingUsers.value = true;
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('restaurant_id', '==', rid))
    );
    restaurantUsers.value = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } finally {
    loadingUsers.value = false;
  }
};

const BASE_URL = 'https://demo-restaurante.tanesolutions.com';
const copyUrl = async (type, rid) => {
  const urls = {
    booking: `${BASE_URL}/booking?id=${rid}`,
    widget:  `${BASE_URL}/booking-widget?id=${rid}`,
    admin:   `${BASE_URL}/admin/dashboard?id=${rid}`,
  };
  await navigator.clipboard.writeText(urls[type]);
  copiedUrl.value = type;
  setTimeout(() => { copiedUrl.value = ''; }, 1800);
};

const addUser = async () => {
  const { email, role } = addUserModal.value;
  if (!email.trim()) return;
  addUserModal.value.saving = true;
  addUserModal.value.result = null;

  // Generate a readable temp password: Tane-XXXX-YYYY!
  const rand    = Math.random().toString(36).slice(2, 6).toUpperCase();
  const tempPwd = `Tane-${rand}-${new Date().getFullYear()}!`;

  try {
    const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: tempPwd, returnSecureToken: false }),
      }
    );
    const data = await res.json();

    if (data.localId) {
      await setDoc(doc(db, 'users', data.localId), {
        email:         email.trim(),
        role,
        restaurant_id: profileRestaurant.value.id,
        creado_en:     serverTimestamp(),
      });
      restaurantUsers.value.push({
        uid: data.localId, email: email.trim(), role,
        restaurant_id: profileRestaurant.value.id,
      });
      addUserModal.value.result = { success: true, password: tempPwd };
    } else if (data.error?.message === 'EMAIL_EXISTS') {
      addUserModal.value.result = {
        success: false,
        message: 'Este email ya tiene una cuenta. Busca su UID en Firebase Console → Authentication y añade manualmente el documento users/{uid} con { email, role, restaurant_id }.',
      };
    } else {
      addUserModal.value.result = {
        success: false,
        message: data.error?.message || 'Error al crear el usuario.',
      };
    }
  } catch (e) {
    addUserModal.value.result = { success: false, message: 'Error de conexión.' };
  } finally {
    addUserModal.value.saving = false;
  }
};

const revokeAccess = async (user) => {
  if (!confirm(`¿Revocar acceso a ${user.email}?`)) return;
  await updateDoc(doc(db, 'users', user.uid), { restaurant_id: null, role: null });
  restaurantUsers.value = restaurantUsers.value.filter(u => u.uid !== user.uid);
};

const closeAddUserModal = () => {
  addUserModal.value = { show: false, email: '', role: 'admin', saving: false, result: null };
};
</script>

<style>
/* ════════════════════════════════════════════════════
   TANE ADMIN — Design System (Global, non-scoped)
   Hereda tokens de global.css donde sea posible
════════════════════════════════════════════════════ */

/* ── Auth Loader ─────────────────────────────────── */
.auth-loader {
  position: fixed; inset: 0;
  background: #fff;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1.5rem; z-index: 9999;
}
.pulse-ring {
  width: 48px; height: 48px;
  border: 2px solid #eee;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loader-label {
  font-size: 0.65rem; font-weight: 800;
  letter-spacing: 0.3em; color: #999;
}

/* ── Login Screen ────────────────────────────────── */
.login-screen {
  position: fixed; inset: 0;
  background: #0a0a0a;
  display: flex; align-items: center; justify-content: center;
}
.login-card {
  background: #fff;
  width: min(380px, 92vw);
  padding: 2.5rem;
  border-radius: 4px;
}
.login-brand h1 {
  font-size: 2rem; font-weight: 800;
  letter-spacing: 0.15em; margin: 0;
}
.login-brand p {
  font-size: 0.6rem; font-weight: 700;
  letter-spacing: 0.4em; color: #999;
  margin: 0.2rem 0 2rem;
}
.login-form { display: flex; flex-direction: column; gap: 1.25rem; }
.login-form .field { display: flex; flex-direction: column; gap: 0.4rem; }
.login-form label { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.login-form input {
  padding: 0.75rem 0.875rem;
  border: 1.5px solid #e0e0e0;
  border-radius: 4px; font-size: 0.9rem;
  outline: none; transition: border-color 0.2s;
}
.login-form input:focus { border-color: #000; }
.login-form input.has-error { border-color: #d90429; }
.login-error-msg {
  font-size: 0.75rem; color: #d90429;
  background: #fff5f5; padding: 0.625rem 0.875rem;
  border-radius: 4px; border-left: 3px solid #d90429;
}
.login-submit {
  display: flex; align-items: center; justify-content: center; gap: 0.5rem;
  background: #000; color: #fff;
  padding: 0.875rem; border: none;
  font-size: 0.75rem; font-weight: 800;
  letter-spacing: 0.2em; cursor: pointer;
  border-radius: 4px; transition: opacity 0.2s;
}
.login-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Dashboard Layout ────────────────────────────── */
.dashboard-wrap {
  display: flex; min-height: 100vh;
  font-family: 'Work Sans', system-ui, sans-serif;
  background: #f5f5f5;
}

/* ── Sidebar ─────────────────────────────────────── */
.sidebar {
  width: 240px; flex-shrink: 0;
  background: #0a0a0a; color: #fff;
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh;
  z-index: 200;
  transition: transform 0.3s cubic-bezier(0.25, 0, 0, 1);
}
.sidebar-head {
  padding: 1.75rem 1.5rem 1.5rem;
  border-bottom: 1px solid #1a1a1a;
  display: flex; justify-content: space-between; align-items: center;
}
.sidebar-logo { display: flex; align-items: baseline; gap: 0.5rem; }
.logo-word { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.1em; }
.logo-tag {
  font-size: 0.55rem; font-weight: 700;
  letter-spacing: 0.25em; color: #b5975a;
  border: 1px solid #b5975a;
  padding: 0.1em 0.4em; border-radius: 2px;
}
.sidebar-close {
  display: none; background: none; border: none;
  color: #777; cursor: pointer; font-size: 1rem; padding: 0.25rem;
}
.sidebar-nav { flex: 1; padding: 1.5rem 0; overflow-y: auto; }
.nav-section-label {
  font-size: 0.55rem; font-weight: 700;
  letter-spacing: 0.25em; color: #555;
  text-transform: uppercase;
  padding: 1rem 1.5rem 0.5rem;
}
.nav-btn {
  display: flex; align-items: center; gap: 0.625rem;
  width: 100%; text-align: left;
  padding: 0.875rem 1.5rem;
  background: transparent; border: none;
  color: #666; cursor: pointer;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  transition: color 0.15s, background 0.15s;
  position: relative;
}
.nav-btn:hover { color: #ccc; background: #111; }
.nav-btn--active { color: #fff; background: #111; }
.nav-btn--active::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 2px; background: #b5975a;
}
.nav-badge {
  margin-left: auto;
  background: #d90429; color: #fff;
  font-size: 0.6rem; font-weight: 800;
  padding: 0.15em 0.45em;
  border-radius: 100px; min-width: 1.4em; text-align: center;
}
.sidebar-foot {
  padding: 1.25rem 1.5rem 1.5rem;
  border-top: 1px solid #1a1a1a;
}
.user-email-tag {
  font-size: 0.65rem; color: #555;
  word-break: break-all; margin-bottom: 0.5rem;
}
.status-row { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.875rem; }
.status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #555; flex-shrink: 0;
}
.status-dot--connected { background: #22c55e; }
.status-dot--connecting { background: #f59e0b; }
.status-dot--error { background: #ef4444; }
.status-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; color: #555; }
.logout-btn {
  background: transparent; border: 1px solid #1f1f1f;
  color: #555; font-size: 0.65rem; font-weight: 700;
  letter-spacing: 0.1em; padding: 0.5rem 0.875rem;
  border-radius: 3px; cursor: pointer; transition: color 0.2s, border-color 0.2s;
}
.logout-btn:hover { color: #fff; border-color: #444; }

/* ── Sidebar overlay (mobile) ────────────────────── */
.sidebar-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 199;
  animation: fadeIn 0.2s ease;
}

/* ── Main content ────────────────────────────────── */
.main-area {
  flex: 1; display: flex; flex-direction: column;
  min-width: 0; background: #f5f5f5;
}

/* ── Top bar ─────────────────────────────────────── */
.topbar {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center;
  justify-content: space-between;
  background: #fff;
  padding: 0 1.5rem;
  height: 60px;
  border-bottom: 1px solid #eee;
  gap: 1rem;
}
.topbar-left { display: flex; align-items: center; gap: 1rem; }
.hamburger {
  display: none; flex-direction: column; gap: 4px;
  background: none; border: none; cursor: pointer; padding: 0.375rem;
}
.hamburger span {
  display: block; width: 20px; height: 1.5px; background: #000;
}
.topbar-title {
  font-size: 0.75rem; font-weight: 800;
  letter-spacing: 0.15em; text-transform: uppercase;
  margin: 0;
}
.res-switcher {
  font-size: 0.75rem; padding: 0.5rem 0.75rem;
  border: 1.5px solid #e0e0e0; border-radius: 4px;
  background: #fff; outline: none; cursor: pointer;
  transition: border-color 0.2s;
}
.res-switcher:focus { border-color: #000; }

/* ── View section ────────────────────────────────── */
.view-section { padding: 1.5rem; }
.view-header {
  display: flex; justify-content: space-between;
  align-items: flex-start; flex-wrap: wrap;
  gap: 1rem; margin-bottom: 1.5rem;
}
.view-heading {
  font-size: 1.125rem; font-weight: 700; margin: 0 0 0.25rem;
}
.view-sub { font-size: 0.75rem; color: #888; margin: 0; }
.view-actions { display: flex; gap: 0.75rem; align-items: center; }

/* ── KPI Strip ───────────────────────────────────── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.875rem;
  margin-bottom: 1.25rem;
}
.kpi-card {
  background: #fff; padding: 1.25rem 1rem;
  border-radius: 8px; border: 1px solid #eee;
  text-align: center;
}
.kpi-card--warn  { border-top: 3px solid #f59e0b; }
.kpi-card--success { border-top: 3px solid #22c55e; }
.kpi-num {
  font-size: 2rem; font-weight: 800; line-height: 1;
  margin: 0 0 0.375rem;
}
.kpi-lbl { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.2em; color: #999; margin: 0; }

/* ── Filters bar ─────────────────────────────────── */
.filters-bar {
  display: flex; flex-wrap: wrap; align-items: flex-end;
  gap: 0.875rem; margin-bottom: 1.25rem;
  background: #fff; padding: 1rem 1.25rem;
  border-radius: 8px; border: 1px solid #eee;
}
.filter-group { display: flex; flex-direction: column; gap: 0.3rem; }
.filter-label { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; color: #777; }
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #e0e0e0; border-radius: 4px;
  font-size: 0.8rem; outline: none;
  background: #fff; transition: border-color 0.2s;
}
.filter-input:focus { border-color: #000; }
.filter-search { min-width: 200px; }
.filter-search-wrap { flex: 1; min-width: 180px; }
.quick-date-btn {
  padding: 0.375rem 0.625rem; border: 1.5px solid #ddd; border-radius: 4px;
  background: #fff; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;
  cursor: pointer; white-space: nowrap; transition: all 0.15s;
}
.quick-date-btn:hover { border-color: #000; }
.quick-date-btn--active { background: #000; color: #fff; border-color: #000; }
.refresh-btn {
  width: 32px; height: 32px; border: 1.5px solid #ddd; border-radius: 4px;
  background: #fff; font-size: 1rem; cursor: pointer; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.refresh-btn:hover:not(:disabled) { border-color: #000; }
.refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.spin-icon { display: inline-block; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.tab-group { display: flex; flex-wrap: wrap; gap: 0.375rem; align-self: flex-end; }
.tab-pill {
  padding: 0.375rem 0.875rem;
  border: 1.5px solid #e0e0e0; border-radius: 100px;
  background: #fff; font-size: 0.7rem; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
}
.tab-pill:hover { border-color: #000; }
.tab-pill--active {
  background: #000; color: #fff; border-color: #000;
}

/* ── State feedback ──────────────────────────────── */
.state-feedback {
  display: flex; align-items: center; gap: 0.75rem;
  color: #888; font-size: 0.8rem;
  padding: 2rem; justify-content: center;
}
.mini-spinner {
  width: 18px; height: 18px;
  border: 2px solid #eee; border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.state-empty {
  text-align: center; padding: 4rem 1rem;
  color: #aaa;
}
.empty-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.empty-title { font-size: 1rem; font-weight: 700; color: #555; margin: 0 0 0.5rem; }
.empty-sub { font-size: 0.8rem; color: #aaa; margin: 0; }

/* ── Bookings list ───────────────────────────────── */
.bookings-list { display: flex; flex-direction: column; gap: 0.75rem; }
.booking-row {
  display: flex; gap: 0;
  background: #fff; border-radius: 8px;
  border: 1px solid #eee; overflow: hidden;
  transition: box-shadow 0.2s;
}
.booking-row:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.booking-bar { width: 4px; flex-shrink: 0; background: #e0e0e0; }
.booking-row--pendiente  .booking-bar { background: #f59e0b; }
.booking-row--confirmada .booking-bar { background: #22c55e; }
.booking-row--cancelada  .booking-bar { background: #ef4444; }
.booking-row--no-show    .booking-bar { background: #94a3b8; }
.booking-body { flex: 1; padding: 1rem 1.25rem; min-width: 0; }
.booking-top {
  display: flex; justify-content: space-between;
  align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;
  margin-bottom: 0.625rem;
}
.booking-identity { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
.booking-name { font-size: 0.9375rem; font-weight: 700; }
.booking-pax-pill {
  font-size: 0.65rem; font-weight: 700;
  background: #f0f0f0; padding: 0.2em 0.6em;
  border-radius: 100px; color: #444;
}
.estado-badge {
  font-size: 0.6rem; font-weight: 800;
  letter-spacing: 0.1em; padding: 0.2em 0.6em;
  border-radius: 100px;
}
.estado-badge--pendiente  { background: #fef9c3; color: #854d0e; }
.estado-badge--confirmada { background: #dcfce7; color: #166534; }
.estado-badge--cancelada  { background: #fee2e2; color: #991b1b; }
.estado-badge--no-show    { background: #f1f5f9; color: #64748b; }
.booking-time-block { text-align: right; flex-shrink: 0; }
.time-big { display: block; font-size: 1.125rem; font-weight: 800; line-height: 1; }
.date-small { font-size: 0.65rem; color: #888; }
.booking-meta-row {
  display: flex; flex-wrap: wrap; gap: 0.75rem;
  font-size: 0.75rem; color: #666;
  margin-bottom: 0.5rem;
}
.meta-item { display: flex; align-items: center; gap: 0.3rem; }
.meta-mesa { color: #b5975a; font-weight: 600; }
.booking-comment {
  font-size: 0.75rem; color: #555;
  font-style: italic; margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fafafa; border-radius: 4px;
}
.notes-wrap { margin-top: 0.5rem; }
.notes-textarea {
  width: 100%; min-height: 2rem;
  background: transparent; border: none;
  border-bottom: 1px dashed #ddd;
  font-size: 0.75rem; color: #666;
  padding: 0.25rem 0; resize: none;
  outline: none; font-family: inherit;
  transition: border-color 0.2s;
  overflow: hidden;
}
.notes-textarea:focus { border-bottom-color: #000; color: #000; }
.notes-textarea::placeholder { color: #bbb; }
.booking-actions {
  display: flex; flex-direction: column;
  gap: 0.5rem; padding: 1rem;
  justify-content: center; min-width: 100px;
  border-left: 1px solid #f0f0f0;
}
.act-btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.65rem; font-weight: 800;
  letter-spacing: 0.08em; border: none;
  border-radius: 4px; cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
  white-space: nowrap;
}
.act-btn:active { transform: scale(0.97); }
.act-btn--confirm  { background: #22c55e; color: #fff; }
.act-btn--cancel   { background: #fee2e2; color: #991b1b; }
.act-btn--noshow   { background: #f1f5f9; color: #475569; }
.act-btn--restore  { background: #f0f0f0; color: #333; }
.act-btn--sm       { font-size: 0.6rem; }

/* ── CRM Table ───────────────────────────────────── */
.table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #eee; }
.crm-table { width: 100%; border-collapse: collapse; background: #fff; }
.crm-table th {
  text-align: left; font-size: 0.65rem; font-weight: 800;
  letter-spacing: 0.1em; color: #888; text-transform: uppercase;
  padding: 0.875rem 1rem; border-bottom: 1.5px solid #f0f0f0;
  background: #fafafa; white-space: nowrap;
}
.crm-row td {
  padding: 1rem; font-size: 0.875rem;
  border-bottom: 1px solid #f5f5f5;
}
.crm-row:last-child td { border-bottom: none; }
.crm-row:hover td { background: #fafafa; }
.email-cell { color: #555; font-size: 0.8rem; }
.date-cell  { color: #888; font-size: 0.8rem; white-space: nowrap; }
.visit-pill {
  display: inline-block; background: #000; color: #fff;
  font-size: 0.7rem; font-weight: 700;
  padding: 0.15em 0.6em; border-radius: 100px;
}
.marketing-pill {
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em;
  padding: 0.2em 0.6em; border-radius: 100px;
}
.marketing-pill--yes { background: #dcfce7; color: #166534; }
.marketing-pill--no  { background: #f1f5f9; color: #94a3b8; }

/* ── Room map ────────────────────────────────────── */
.mapa-grid-wrap { overflow-x: auto; padding: 1rem 0; }
.mapa-grid {
  display: grid;
  grid-template-columns: repeat(13, 52px);
  grid-template-rows: repeat(13, 52px);
  gap: 4px; width: max-content;
  background: #f9f9f9; padding: 1rem;
  border-radius: 8px; border: 1px solid #eee;
}
.mesa-tile {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-radius: 6px; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: none; padding: 0;
}
.mesa-tile:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.mesa-tile--libre    { background: #dcfce7; color: #166534; }
.mesa-tile--reservada{ background: #fef9c3; color: #854d0e; }
.mesa-tile--ocupada  { background: #fee2e2; color: #991b1b; }
.mesa-name { font-size: 0.6rem; font-weight: 700; }
.mesa-cap  { font-size: 0.55rem; opacity: 0.7; }
.mapa-legend { display: flex; gap: 1rem; align-items: center; }
.legend-dot {
  display: flex; align-items: center; gap: 0.375rem;
  font-size: 0.7rem; font-weight: 600;
}
.legend-dot::before {
  content: ''; width: 10px; height: 10px;
  border-radius: 2px; display: block;
}
.legend-dot--libre::before    { background: #dcfce7; border: 1px solid #22c55e; }
.legend-dot--reservada::before{ background: #fef9c3; border: 1px solid #f59e0b; }
.legend-dot--ocupada::before  { background: #fee2e2; border: 1px solid #ef4444; }

/* ── Mapa editor ─────────────────────────────────── */
.mapa-header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.mapa-grid--editing  { background: #f0f4ff; border-color: #c7d2fe; }
.mapa-cell {
  border-radius: 4px; border: 1.5px dashed #d1d5db;
  cursor: cell; transition: background 0.1s, border-color 0.1s;
  min-height: 0; min-width: 0;
}
.mapa-cell:hover:not(.mapa-cell--occupied) { background: #e0e7ff; border-color: #818cf8; }
.mapa-cell--over     { background: #c7d2fe !important; border-color: #6366f1 !important; }
.mapa-cell--occupied { cursor: default; border-color: transparent; pointer-events: none; }
.mesa-tile--edit     { cursor: grab; position: relative; }
.mesa-tile--edit:active { cursor: grabbing; }
.mesa-tile--edit:hover  { z-index: 5; }
.mesa-del-btn {
  position: absolute; top: -6px; right: -6px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #ef4444; color: #fff; border: none;
  font-size: 0.55rem; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  line-height: 1; padding: 0; z-index: 10;
  transition: transform 0.15s;
}
.mesa-del-btn:hover { transform: scale(1.2); }
.mapa-empty-hint {
  grid-column: 1 / -1; grid-row: 1 / 4;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: #94a3b8; font-size: 0.75rem; font-weight: 500;
  text-align: center; padding: 2rem; pointer-events: none;
  gap: 0.25rem;
}
.btn-outline-sm {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.85rem; background: #fff; color: #000;
  border: 1.5px solid #000; font-size: 0.65rem; font-weight: 700;
  letter-spacing: 0.06em; border-radius: 4px; cursor: pointer;
  transition: background 0.15s, color 0.15s; white-space: nowrap;
}
.btn-outline-sm:hover { background: #000; color: #fff; }
.mesa-modal-pos {
  font-size: 0.7rem; color: #888;
  margin: -0.5rem 0 1.25rem;
}
.mesa-modal-pos strong { color: #000; }
.field-row { display: flex; gap: 0.75rem; }
.field-row .field { flex: 1; }
.field--narrow { flex: 0 0 120px !important; }

/* ── SaaS cards ──────────────────────────────────── */
.saas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.saas-card {
  background: #fff; border: 1px solid #eee;
  border-radius: 8px; padding: 1.25rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.saas-card:hover { border-color: #000; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.saas-card-head {
  display: flex; justify-content: space-between;
  align-items: flex-start; margin-bottom: 0.75rem;
}
.saas-name { font-size: 1rem; font-weight: 700; margin: 0; }
.saas-active-badge {
  font-size: 0.55rem; font-weight: 800; letter-spacing: 0.1em;
  background: #dcfce7; color: #166534;
  padding: 0.2em 0.6em; border-radius: 100px;
}
.saas-card-meta { margin-bottom: 1rem; }
.saas-id { font-size: 0.75rem; color: #888; margin: 0 0 0.25rem; }
.saas-id code {
  font-family: monospace; background: #f0f0f0;
  padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.8em;
}
.saas-date { font-size: 0.7rem; color: #aaa; margin: 0; }
.saas-card-footer { display: flex; gap: 0.625rem; }
.btn-manage {
  flex: 1; padding: 0.5rem 0.75rem;
  background: #000; color: #fff; border: none;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.05em; border-radius: 4px;
  cursor: pointer; transition: opacity 0.15s;
}
.btn-manage:hover { opacity: 0.85; }
.btn-delete {
  padding: 0.5rem 0.75rem;
  background: #fff; color: #ef4444;
  border: 1.5px solid #fee2e2;
  font-size: 0.7rem; font-weight: 700;
  border-radius: 4px; cursor: pointer;
  transition: background 0.15s;
}
.btn-delete:hover { background: #fee2e2; }

/* ── Buttons ─────────────────────────────────────── */
.btn-primary-sm {
  padding: 0.625rem 1.25rem;
  background: #000; color: #fff; border: none;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.1em; text-transform: uppercase;
  border-radius: 4px; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-primary-sm:hover { opacity: 0.85; }
.btn-primary-sm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost-sm {
  padding: 0.625rem 1.25rem;
  background: transparent; color: #555;
  border: 1.5px solid #e0e0e0;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  border-radius: 4px; cursor: pointer;
  transition: border-color 0.15s;
}
.btn-ghost-sm:hover { border-color: #000; color: #000; }
.btn-danger-sm {
  padding: 0.625rem 1.25rem;
  background: #ef4444; color: #fff; border: none;
  font-size: 0.7rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  border-radius: 4px; cursor: pointer;
  transition: opacity 0.15s;
}
.btn-danger-sm:hover { opacity: 0.85; }

/* ── Modals ──────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.15s ease;
}
.modal-box {
  background: #fff; width: min(440px, 96vw);
  padding: 2rem; border-radius: 8px;
  animation: slideUp 0.2s cubic-bezier(0.25,0,0,1);
}
.modal-box--danger { border-top: 3px solid #ef4444; }
.modal-title { font-size: 1.125rem; font-weight: 800; margin: 0 0 0.5rem; }
.modal-desc { font-size: 0.85rem; color: #666; margin: 0 0 1.5rem; line-height: 1.6; }
.modal-box .field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.5rem; }
.modal-box .field label { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #666; }
.modal-input {
  padding: 0.75rem; border: 1.5px solid #e0e0e0;
  border-radius: 4px; font-size: 0.9rem;
  outline: none; transition: border-color 0.2s;
}
.modal-input:focus { border-color: #000; }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }

/* ── Animations ──────────────────────────────────── */
@keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideUp { from { transform: translateY(12px); opacity: 0 } to { transform: none; opacity: 1 } }

/* ── Responsive ──────────────────────────────────── */
@media (max-width: 900px) {
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0;
    transform: translateX(-100%);
  }
  .sidebar--open { transform: translateX(0); }
  .sidebar-close { display: block; }
  .hamburger { display: flex; }
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .booking-row { flex-wrap: wrap; }
  .booking-actions {
    width: 100%; flex-direction: row;
    border-left: none; border-top: 1px solid #f0f0f0;
    padding: 0.75rem 1.25rem;
  }
}

@media (max-width: 600px) {
  .view-section { padding: 1rem; }
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .filters-bar { padding: 0.875rem 1rem; }
  .tab-group { gap: 0.25rem; }
  .tab-pill { padding: 0.3rem 0.625rem; font-size: 0.65rem; }
  .booking-top { flex-direction: column; }
  .saas-grid { grid-template-columns: 1fr; }
  .mapa-grid { grid-template-columns: repeat(13, 42px); grid-template-rows: repeat(13, 42px); }
}

/* ── Restaurant profile ──────────────────────────── */
.profile-id { font-family: monospace; font-size: 0.8em; background: #f0f0f0; padding: 0.15em 0.4em; border-radius: 3px; }
.profile-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; align-items: start; }
@media (max-width: 1100px) { .profile-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 700px)  { .profile-grid { grid-template-columns: 1fr; } }
.profile-section { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 1.25rem; }
.profile-section-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 1rem; display: flex; align-items: center; justify-content: space-between; }
.profile-form { display: flex; flex-direction: column; gap: 0.875rem; }
.profile-saved-msg { font-size: 0.7rem; color: #22c55e; font-weight: 700; margin: 0; }
.profile-loading { font-size: 0.75rem; color: #999; padding: 0.75rem 0; }
.horarios-hint { font-size: 0.65rem; color: #888; margin: 0; line-height: 1.5; }
.horarios-block { display: flex; flex-direction: column; gap: 0.4rem; }
.horarios-label { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #000; }
.field-input-sm { border: 1px solid #ddd; border-radius: 4px; padding: 0.4rem 0.5rem; font-size: 0.8rem; font-family: inherit; width: 100%; }
.profile-empty-users { font-size: 0.75rem; color: #aaa; font-style: italic; padding: 0.5rem 0; }
/* URL list */
.url-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem; }
.url-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: #f9f9f9; border-radius: 6px; padding: 0.625rem 0.75rem; }
.url-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.url-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
.url-value { font-size: 0.7rem; color: #333; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.copy-btn { flex-shrink: 0; padding: 0.35rem 0.75rem; background: #000; color: #fff; border: none; border-radius: 4px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; transition: background 0.15s, transform 0.1s; white-space: nowrap; }
.copy-btn:hover { background: #333; }
.copy-btn--copied { background: #22c55e; }
/* Users list */
.add-user-btn { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; background: #000; color: #fff; border: none; border-radius: 4px; padding: 0.3rem 0.65rem; cursor: pointer; }
.add-user-btn:hover { opacity: 0.8; }
.users-list { display: flex; flex-direction: column; gap: 0.5rem; }
.user-row { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: #f9f9f9; border-radius: 6px; }
.user-info { display: flex; align-items: center; gap: 0.625rem; min-width: 0; }
.user-email { font-size: 0.75rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role-badge { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.2em 0.6em; border-radius: 100px; flex-shrink: 0; }
.user-role-badge--admin { background: #dbeafe; color: #1e40af; }
.user-role-badge--staff { background: #f0fdf4; color: #166534; }
.revoke-btn { width: 24px; height: 24px; border-radius: 50%; background: #fee2e2; color: #ef4444; border: none; font-size: 0.6rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
.revoke-btn:hover { background: #fca5a5; }
/* Add user modal */
.add-user-success { text-align: center; padding: 1rem 0; }
.add-user-success-title { font-size: 1.1rem; font-weight: 700; color: #22c55e; margin: 0 0 0.5rem; }
.add-user-success-desc { font-size: 0.75rem; color: #555; margin: 0 0 1rem; }
.credentials-box { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 1rem; text-align: left; margin-bottom: 0.75rem; }
.credentials-box p { font-size: 0.8rem; margin: 0.25rem 0; }
.credentials-box code { background: #eee; padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.9em; }
.add-user-hint { font-size: 0.65rem; color: #999; margin: 0; }
.add-user-error { font-size: 0.8rem; color: #991b1b; background: #fff5f5; border: 1px solid #fca5a5; border-radius: 6px; padding: 1rem; }
/* Danger zone */
.danger-zone { margin-top: 1.5rem; background: #fff5f5; border: 1px solid #fca5a5; border-radius: 8px; padding: 1.25rem; }
.danger-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #991b1b; margin: 0 0 0.5rem; }
.danger-desc { font-size: 0.75rem; color: #555; margin: 0 0 1rem; }
/* Toggle switch */
.toggle-label { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding-top: 0.75rem; }
.toggle-input { display: none; }
.toggle-track { width: 36px; height: 20px; background: #d1d5db; border-radius: 100px; position: relative; transition: background 0.2s; flex-shrink: 0; }
.toggle-input:checked + .toggle-track { background: #000; }
.toggle-thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.toggle-input:checked + .toggle-track .toggle-thumb { transform: translateX(16px); }
.toggle-text { font-size: 0.75rem; font-weight: 600; color: #333; }
/* field-select */
.field-select { background: transparent; border: none; border-bottom: 2px solid #000; padding: 0.6rem 0; font-size: 0.875rem; color: #000; font-family: inherit; outline: none; width: 100%; cursor: pointer; }
/* nav back button */
.nav-btn--back { opacity: 0.6; font-size: 0.6rem; }
.nav-btn--back:hover { opacity: 1; background: transparent; color: #fff; }
</style>
