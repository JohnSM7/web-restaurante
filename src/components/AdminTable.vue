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

      <!-- ── Modo: iniciar sesión ── -->
      <form v-if="!forgotMode" @submit.prevent="login" class="login-form" novalidate>
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
        <button type="button" @click="forgotMode = true; forgotEmail = loginEmail; forgotSent = false; forgotError = ''" class="forgot-link">
          ¿Olvidaste tu contraseña?
        </button>
      </form>

      <!-- ── Modo: recuperar contraseña ── -->
      <div v-else class="login-form">
        <!-- Éxito -->
        <div v-if="forgotSent" class="forgot-success">
          <p class="forgot-success-icon">✉️</p>
          <p class="forgot-success-title">Email enviado</p>
          <p class="forgot-success-desc">
            Si <strong>{{ forgotEmail }}</strong> tiene una cuenta activa, recibirás un enlace para restablecer tu contraseña en unos minutos.
          </p>
          <button @click="forgotMode = false; forgotSent = false" class="login-submit" style="margin-top:0.5rem">
            Volver al inicio de sesión
          </button>
        </div>

        <!-- Formulario -->
        <template v-else>
          <div>
            <p class="forgot-title">Recuperar contraseña</p>
            <p class="forgot-desc">Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
          </div>
          <div class="field">
            <label for="forgot-email">Email</label>
            <input id="forgot-email" v-model="forgotEmail" type="email" required
              autocomplete="email" placeholder="admin@empresa.com"
              :class="forgotError ? 'has-error' : ''"
              @keyup.enter="sendForgotPassword">
          </div>
          <div v-if="forgotError" class="login-error-msg" role="alert">{{ forgotError }}</div>
          <button @click="sendForgotPassword" :disabled="forgotSending || !forgotEmail.trim()" class="login-submit">
            <span v-if="forgotSending" class="btn-spinner"></span>
            {{ forgotSending ? 'ENVIANDO…' : 'ENVIAR ENLACE' }}
          </button>
          <button type="button" @click="forgotMode = false; forgotError = ''" class="forgot-link">
            ← Volver al inicio de sesión
          </button>
        </template>
      </div>

    </div>
  </div>

  <!-- 3. Main dashboard -->
  <div v-else class="dashboard-wrap">

    <!-- SIDEBAR -->
    <aside :class="['sidebar', sidebarOpen ? 'sidebar--open' : '']" role="navigation">
      <div class="sidebar-head">
        <div class="sidebar-logo">
          <span class="logo-word">TANE</span>
          <span class="logo-tag">{{ isSuperAdmin ? 'SUPREME' : isStaff ? 'STAFF' : 'ADMIN' }}</span>
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
          <button v-if="!isStaff" @click="nav('customers')"
            :class="['nav-btn', currentView === 'customers' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            CRM CLIENTES
          </button>
          <button v-if="!isStaff" @click="nav('mapa')"
            :class="['nav-btn', currentView === 'mapa' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
            MAPA SALA
          </button>
          <!-- Configuración: visible para admin (no superadmin, no staff) -->
          <button v-if="!isStaff && !isSuperAdmin" @click="openOwnProfile()"
            :class="['nav-btn', currentView === 'restaurant-profile' && 'nav-btn--active']">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            CONFIGURACIÓN
          </button>
        </template>
      </nav>

      <div class="sidebar-foot">
        <p class="user-email-tag">{{ user.email }}</p>
        <div class="status-row">
          <span :class="['status-dot', `status-dot--${status}`]"></span>
          <span class="status-label">{{ statusMsg }}</span>
        </div>
        <button @click="requestOwnPasswordReset" class="change-pwd-btn"
          :disabled="ownPwdReset.loading">
          <span v-if="ownPwdReset.loading">Enviando…</span>
          <span v-else-if="ownPwdReset.sent" style="color:#22c55e;">✓ Email enviado</span>
          <span v-else-if="ownPwdReset.error" style="color:#ef4444;">Error, reintentar</span>
          <span v-else>Cambiar contraseña</span>
        </button>
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
            <button v-if="!editingMapa && !isStaff" @click="editingMapa = true" class="btn-outline-sm">
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
      <section v-else-if="currentView === 'restaurant-profile' && profileRestaurant" class="view-section prof-view">

        <!-- ── Hero ── -->
        <div class="prof-hero">
          <div class="prof-hero-body">
            <div class="prof-hero-top">
              <div class="prof-hero-badges">
                <span :class="['prof-status-pill', profileForm.activo ? 'prof-status-pill--on' : 'prof-status-pill--off']">
                  <span class="prof-status-dot"></span>
                  {{ profileForm.activo ? 'Activo' : 'Inactivo' }}
                </span>
                <span :class="['prof-plan-pill', `prof-plan-pill--${profileForm.plan}`]">{{ profileForm.plan }}</span>
              </div>
              <button @click="selectAndGo(profileRestaurant.id)" class="btn-outline-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>
                VER RESERVAS
              </button>
            </div>
            <h2 class="prof-hero-name">{{ profileRestaurant.nombre }}</h2>
            <p class="prof-hero-meta">
              <code class="prof-id-code">{{ profileRestaurant.id }}</code>
              <span v-if="profileRestaurant.direccion" class="prof-meta-sep">·</span>
              <span v-if="profileRestaurant.direccion">{{ profileRestaurant.direccion }}</span>
            </p>
          </div>

          <!-- Stats strip inside hero -->
          <div class="prof-stats">
            <div class="prof-stat">
              <span class="prof-stat-num">{{ profileStats.reservas ?? '…' }}</span>
              <span class="prof-stat-lbl">Reservas</span>
            </div>
            <div class="prof-stat">
              <span class="prof-stat-num">{{ profileStats.mesas ?? '…' }}</span>
              <span class="prof-stat-lbl">Mesas</span>
            </div>
            <div class="prof-stat">
              <span class="prof-stat-num">{{ restaurantUsers.length }}</span>
              <span class="prof-stat-lbl">Usuarios</span>
            </div>
            <div class="prof-stat" v-if="profileRestaurant.creado_en">
              <span class="prof-stat-num prof-stat-num--sm">{{ formatDate(profileRestaurant.creado_en) }}</span>
              <span class="prof-stat-lbl">Alta</span>
            </div>
          </div>
        </div>

        <!-- ── Main 2-col layout ── -->
        <div class="prof-main">

          <!-- LEFT: forms -->
          <div class="prof-col-left">

            <!-- Datos del restaurante -->
            <div class="prof-card">
              <h4 class="prof-card-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Datos del restaurante
              </h4>
              <div class="profile-form">
                <div class="field"><label>Nombre</label><input v-model="profileForm.nombre" type="text" placeholder="Nombre del restaurante"></div>
                <div class="field"><label>Dirección</label><input v-model="profileForm.direccion" type="text" placeholder="Calle, número, ciudad"></div>
                <div class="field-row">
                  <div class="field"><label>Teléfono</label><input v-model="profileForm.telefono" type="tel" placeholder="+34 600 000 000"></div>
                  <div class="field"><label>Email contacto</label><input v-model="profileForm.email" type="email" placeholder="info@restaurante.com"></div>
                </div>
                <div class="field"><label>Sitio web</label><input v-model="profileForm.web" type="url" placeholder="https://restaurante.com"></div>
                <!-- Plan y estado activo: solo superadmin puede cambiarlos -->
                <div v-if="isSuperAdmin" class="field-row">
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
                <div class="field">
                  <label>Confirmación de reservas</label>
                  <select v-model="profileForm.modo_confirmacion" class="field-select">
                    <option value="auto">Automática — confirma si hay mesa disponible</option>
                    <option value="manual">Manual — el admin confirma siempre</option>
                  </select>
                </div>
                <div class="prof-form-footer">
                  <button @click="saveProfile" :disabled="profileSaving" class="btn-primary-sm">
                    <span v-if="profileSaving">Guardando…</span>
                    <span v-else>Guardar cambios</span>
                  </button>
                  <p v-if="profileSaved" class="profile-saved-msg">✓ Guardado</p>
                </div>
              </div>
            </div>

            <!-- Horarios -->
            <div class="prof-card">
              <h4 class="prof-card-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Horarios de reservas
              </h4>
              <p class="horarios-hint" style="margin-bottom:1rem">Los turnos configurados aquí generan automáticamente las franjas horarias del formulario de reservas.</p>
              <div class="prof-horarios">
                <div class="prof-turno-card">
                  <span class="prof-turno-label">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    Comida
                  </span>
                  <div class="prof-time-row">
                    <input v-model="profileForm.horarios.comida.inicio" type="time" class="prof-time-input">
                    <span class="prof-time-sep">→</span>
                    <input v-model="profileForm.horarios.comida.fin" type="time" class="prof-time-input">
                  </div>
                </div>
                <div class="prof-turno-card">
                  <span class="prof-turno-label">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    Cena
                  </span>
                  <div class="prof-time-row">
                    <input v-model="profileForm.horarios.cena.inicio" type="time" class="prof-time-input">
                    <span class="prof-time-sep">→</span>
                    <input v-model="profileForm.horarios.cena.fin" type="time" class="prof-time-input">
                  </div>
                </div>
              </div>
              <div class="field" style="margin-top:1rem">
                <label>Intervalo entre franjas</label>
                <select v-model.number="profileForm.horarios.intervalo" class="field-select">
                  <option :value="15">15 minutos</option>
                  <option :value="30">30 minutos</option>
                  <option :value="60">60 minutos (cada hora)</option>
                </select>
              </div>
              <div class="prof-form-footer" style="margin-top:1.25rem">
                <button @click="saveProfile" :disabled="profileSaving" class="btn-primary-sm">
                  <span v-if="profileSaving">Guardando…</span>
                  <span v-else>Guardar horarios</span>
                </button>
                <p v-if="profileSaved" class="profile-saved-msg">✓ Guardado</p>
              </div>
            </div>

          </div>

          <!-- RIGHT: Plan + URLs + Usuarios -->
          <div class="prof-col-right">

            <!-- ── Plan actual y uso ── -->
            <div class="prof-card plan-card">
              <h4 class="prof-card-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Plan actual
              </h4>

              <div v-if="planUsage" class="plan-body">
                <!-- Plan badge + precio -->
                <div class="plan-header-row">
                  <span :class="['plan-badge', `plan-badge--${planUsage.plan}`]">{{ planUsage.plan }}</span>
                  <span class="plan-price">
                    {{ planUsage.plan === 'trial' ? 'Gratis' : planUsage.plan === 'basic' ? '29€/mes' : '59€/mes' }}
                  </span>
                </div>

                <!-- Usage bars -->
                <div class="plan-meters">
                  <div class="plan-meter">
                    <div class="plan-meter-labels">
                      <span>Reservas este mes</span>
                      <span class="plan-meter-count">
                        {{ planUsage.uso.reservas_mes }}
                        <template v-if="planUsage.planData.reservas_mes"> / {{ planUsage.planData.reservas_mes }}</template>
                        <template v-else> / ∞</template>
                      </span>
                    </div>
                    <div class="plan-meter-bar">
                      <div class="plan-meter-fill"
                        :class="{ 'plan-meter-fill--warn': planMeterRatio('reservas') >= 0.8, 'plan-meter-fill--over': planMeterRatio('reservas') > 1 }"
                        :style="{ width: Math.min(planMeterRatio('reservas') * 100, 100) + '%' }">
                      </div>
                    </div>
                  </div>

                  <div class="plan-meter">
                    <div class="plan-meter-labels">
                      <span>Mesas</span>
                      <span class="plan-meter-count">
                        {{ planUsage.uso.mesas }}
                        <template v-if="planUsage.planData.mesas"> / {{ planUsage.planData.mesas }}</template>
                        <template v-else> / ∞</template>
                      </span>
                    </div>
                    <div class="plan-meter-bar">
                      <div class="plan-meter-fill"
                        :class="{ 'plan-meter-fill--warn': planMeterRatio('mesas') >= 0.8, 'plan-meter-fill--over': planMeterRatio('mesas') > 1 }"
                        :style="{ width: Math.min(planMeterRatio('mesas') * 100, 100) + '%' }">
                      </div>
                    </div>
                  </div>

                  <div class="plan-meter">
                    <div class="plan-meter-labels">
                      <span>Usuarios</span>
                      <span class="plan-meter-count">
                        {{ planUsage.uso.usuarios }}
                        <template v-if="planUsage.planData.usuarios"> / {{ planUsage.planData.usuarios }}</template>
                        <template v-else> / ∞</template>
                      </span>
                    </div>
                    <div class="plan-meter-bar">
                      <div class="plan-meter-fill"
                        :class="{ 'plan-meter-fill--warn': planMeterRatio('usuarios') >= 0.8, 'plan-meter-fill--over': planMeterRatio('usuarios') > 1 }"
                        :style="{ width: Math.min(planMeterRatio('usuarios') * 100, 100) + '%' }">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Features list -->
                <div class="plan-features">
                  <span :class="['plan-feat', planUsage.planData.emails     ? 'plan-feat--on' : 'plan-feat--off']">Emails al cliente</span>
                  <span :class="['plan-feat', planUsage.planData.crm        ? 'plan-feat--on' : 'plan-feat--off']">CRM</span>
                  <span :class="['plan-feat', planUsage.planData.widget     ? 'plan-feat--on' : 'plan-feat--off']">Widget embebible</span>
                  <span :class="['plan-feat', planUsage.planData.recordatorio ? 'plan-feat--on' : 'plan-feat--off']">Recordatorio 24h</span>
                </div>

                <!-- Upgrade buttons: solo superadmin puede gestionar la facturación -->
                <template v-if="isSuperAdmin">
                  <div v-if="planUsage.plan !== 'pro'" class="plan-upgrade-row">
                    <button v-if="planUsage.plan === 'trial' || planUsage.plan === 'basic'"
                      @click="startCheckout('basic')" :disabled="planUpgrading || planUsage.plan === 'basic'"
                      class="plan-upgrade-btn plan-upgrade-btn--basic">
                      <span v-if="planUpgrading === 'basic'">Redirigiendo…</span>
                      <span v-else-if="planUsage.plan === 'basic'">Plan actual</span>
                      <span v-else>Basic · 29€/mes</span>
                    </button>
                    <button @click="startCheckout('pro')" :disabled="planUpgrading"
                      class="plan-upgrade-btn plan-upgrade-btn--pro">
                      <span v-if="planUpgrading === 'pro'">Redirigiendo…</span>
                      <span v-else>Pro · 59€/mes ✦</span>
                    </button>
                  </div>
                  <p v-else class="plan-pro-msg">Estás en el plan máximo. ¡Gracias!</p>
                </template>
                <p v-else-if="planUsage.plan !== 'pro'" class="plan-upgrade-contact">
                  Para actualizar el plan contacta con
                  <a href="mailto:admin@tanesolutions.com">admin@tanesolutions.com</a>
                </p>
              </div>

              <div v-else-if="planUsageLoading" class="profile-loading">Cargando uso del plan…</div>
              <div v-else-if="planUsageError" class="profile-loading profile-loading--error">
                No se pudo cargar el plan.
                <button @click="fetchPlanUsage(profileRestaurant.id)" class="retry-btn">Reintentar</button>
              </div>
              <div v-else class="profile-loading">Cargando uso del plan…</div>
            </div>

            <!-- URLs del sistema -->
            <div class="prof-card">
              <h4 class="prof-card-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                URLs del sistema
              </h4>
              <div class="url-list">
                <div class="url-item">
                  <div class="url-info">
                    <span class="url-label">Formulario de reservas</span>
                    <code class="url-value">/booking?id={{ profileRestaurant.id }}</code>
                  </div>
                  <button @click="copyUrl('booking', profileRestaurant.id)" class="copy-btn" :class="{ 'copy-btn--copied': copiedUrl === 'booking' }">
                    {{ copiedUrl === 'booking' ? '✓' : 'Copiar' }}
                  </button>
                </div>
                <div class="url-item">
                  <div class="url-info">
                    <span class="url-label">Widget embebible</span>
                    <code class="url-value">/booking-widget?id={{ profileRestaurant.id }}</code>
                  </div>
                  <button @click="copyUrl('widget', profileRestaurant.id)" class="copy-btn" :class="{ 'copy-btn--copied': copiedUrl === 'widget' }">
                    {{ copiedUrl === 'widget' ? '✓' : 'Copiar' }}
                  </button>
                </div>
                <div class="url-item">
                  <div class="url-info">
                    <span class="url-label">Panel admin</span>
                    <code class="url-value">/admin/dashboard?id={{ profileRestaurant.id }}</code>
                  </div>
                  <button @click="copyUrl('admin', profileRestaurant.id)" class="copy-btn" :class="{ 'copy-btn--copied': copiedUrl === 'admin' }">
                    {{ copiedUrl === 'admin' ? '✓' : 'Copiar' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Accesos y usuarios -->
            <div class="prof-card">
              <h4 class="prof-card-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Accesos
                <button @click="openAddUserModal" class="add-user-btn">+ Añadir</button>
              </h4>
              <div v-if="loadingUsers" class="profile-loading">Cargando…</div>
              <div v-else-if="restaurantUsers.length === 0" class="profile-empty-users">
                Sin usuarios asignados aún.
              </div>
              <div v-else class="users-list">
                <div v-for="u in restaurantUsers" :key="u.uid" class="user-row">
                  <div class="user-avatar">{{ u.email[0].toUpperCase() }}</div>
                  <div class="user-info">
                    <span class="user-email">{{ u.email }}</span>
                    <span :class="['user-role-badge', `user-role-badge--${u.role}`]">{{ u.role }}</span>
                  </div>
                  <div class="user-actions">
                    <button
                      @click="resetPassword(u)"
                      :disabled="!!resettingPwd[u.uid]"
                      :title="`Enviar email de restablecimiento a ${u.email}`"
                      :class="['reset-pwd-btn', resettingPwd[u.uid] === 'done' ? 'reset-pwd-btn--done' : resettingPwd[u.uid] === 'error' ? 'reset-pwd-btn--error' : '']">
                      <span v-if="resettingPwd[u.uid] === 'sending'">…</span>
                      <span v-else-if="resettingPwd[u.uid] === 'done'">✓</span>
                      <span v-else-if="resettingPwd[u.uid] === 'error'">!</span>
                      <span v-else>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </span>
                    </button>
                    <button @click="revokeAccess(u)" class="revoke-btn" title="Revocar acceso">✕</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Danger zone — solo superadmin ── -->
        <div v-if="isSuperAdmin" class="danger-zone">
          <div class="danger-inner">
            <div>
              <h4 class="danger-title">Zona de peligro</h4>
              <p class="danger-desc">Dar de baja eliminará el perfil del restaurante de la plataforma. Las reservas existentes NO se borrarán.</p>
            </div>
            <button @click="openDeleteModal(profileRestaurant.id, profileRestaurant.nombre)" class="btn-danger-sm">
              Dar de baja
            </button>
          </div>
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

        <!-- Result: success (new user) -->
        <div v-if="addUserModal.result?.success && addUserModal.result?.isNewUser" class="add-user-success">
          <p class="add-user-success-title">✓ Cuenta creada</p>
          <p class="add-user-success-desc">Se ha enviado un email de activación a:</p>
          <div class="credentials-box">
            <p><strong>Email:</strong> {{ addUserModal.email }}</p>
            <p><strong>Rol:</strong> <code>{{ addUserModal.role }}</code></p>
          </div>
          <p class="add-user-hint">El usuario recibirá un enlace para establecer su propia contraseña. El enlace caduca en 1 hora — si no lo usa a tiempo, puedes reenviar un nuevo enlace desde el botón 🔒 en la sección Accesos.</p>
          <div class="modal-footer">
            <button @click="closeAddUserModal" class="btn-primary-sm">Cerrar</button>
          </div>
        </div>

        <!-- Result: success (existing user, role updated) -->
        <div v-else-if="addUserModal.result?.success && !addUserModal.result?.isNewUser" class="add-user-success">
          <p class="add-user-success-title">✓ Acceso actualizado</p>
          <p class="add-user-success-desc">Este email ya tenía cuenta. Se ha actualizado su rol y restaurante asignado.</p>
          <div class="credentials-box">
            <p><strong>Email:</strong> {{ addUserModal.email }}</p>
            <p><strong>Nuevo rol:</strong> <code>{{ addUserModal.role }}</code></p>
          </div>
          <p class="add-user-hint">El usuario puede acceder con su contraseña existente.</p>
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
                <option v-if="isSuperAdmin" value="admin">Admin</option>
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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  collection, query, where, orderBy,
  onSnapshot, updateDoc, doc, deleteDoc,
  setDoc, addDoc, getDoc, getDocs, getCountFromServer, serverTimestamp
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, fns } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
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

// ─── Forgot password ─────────────────────────────────
const forgotMode    = ref(false);   // toggle login ↔ recuperar contraseña
const forgotEmail   = ref('');
const forgotSending = ref(false);
const forgotSent    = ref(false);
const forgotError   = ref('');

// ─── UI State ───────────────────────────────────────
const isSuperAdmin      = ref(false);
const isStaff           = computed(() => !isSuperAdmin.value && userProfile.value?.role === 'staff');
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
let unsubs    = [];   // listeners de datos (reservas, mesas, restaurants) — se limpian en syncData
let unsubAuth = null; // listener de auth — NUNCA se limpia en syncData, solo en onUnmounted

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
const profileStats      = ref({ reservas: null, mesas: null });
const planUsage         = ref(null);
const planUsageLoading  = ref(false);
const planUsageError    = ref(false);
const planUpgrading     = ref(null);
const restaurantUsers   = ref([]);
const loadingUsers      = ref(false);
const copiedUrl         = ref('');
const addUserModal      = ref({ show: false, email: '', role: 'admin', saving: false, result: null });
const resettingPwd  = reactive({}); // uid → 'sending' | 'done' | 'error'
const ownPwdReset   = ref({ loading: false, sent: false, error: false });

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
  unsubAuth = onAuthStateChanged(auth, async (u) => {
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
  // unsubAuth se guarda aparte — syncData limpia `unsubs` pero NO debe tocar el listener de auth
});

onUnmounted(() => {
  unsubs.forEach(u => u());
  if (unsubAuth) unsubAuth();
});

// ─── Navigation ──────────────────────────────────────
const STAFF_ALLOWED_VIEWS = ['reservas'];
const nav = (view) => {
  if (isStaff.value && !STAFF_ALLOWED_VIEWS.includes(view)) return;
  currentView.value = view;
  sidebarOpen.value = false;
};

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

const sendForgotPassword = async () => {
  const email = forgotEmail.value.trim();
  if (!email) return;
  forgotSending.value = true;
  forgotError.value   = '';
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/admin/dashboard`,
    });
    forgotSent.value = true;
  } catch (e) {
    // Por seguridad no revelamos si el email existe o no
    // Solo mostramos error en casos técnicos (email mal formado, etc.)
    if (e.code === 'auth/invalid-email') {
      forgotError.value = 'El formato del email no es válido.';
    } else if (e.code === 'auth/too-many-requests') {
      forgotError.value = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    } else {
      // Para user-not-found también mostramos éxito (no revelar si existe)
      forgotSent.value = true;
    }
  } finally {
    forgotSending.value = false;
  }
};

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
  const estadoActual = mesa.estado ?? 'libre';
  const nuevoEstado  = cycle[estadoActual] ?? 'libre';

  // Actualización optimista — el UI responde al instante sin esperar al onSnapshot
  const idx = mesas.value.findIndex(m => m.id === mesa.id);
  if (idx !== -1) mesas.value[idx] = { ...mesas.value[idx], estado: nuevoEstado };

  try {
    await updateDoc(doc(db, 'mesas', mesa.id), { estado: nuevoEstado });
  } catch (e) {
    console.error('[toggleMesaEstado] Error al actualizar mesa:', e.code, e.message);
    // Revertir el cambio optimista si Firestore falla
    if (idx !== -1) mesas.value[idx] = { ...mesas.value[idx], estado: estadoActual };
    alert(`No se pudo cambiar el estado: ${e.message}`);
  }
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

// Admin abre su propio perfil de restaurante desde el sidebar
const openOwnProfile = async () => {
  const rid = currentRestaurantId.value;
  if (!rid) return;
  sidebarOpen.value = false;   // cerrar sidebar igual que nav()
  try {
    const snap = await getDoc(doc(db, 'restaurants', rid));
    if (!snap.exists()) return;
    await openProfile({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error('[openOwnProfile]', e);
  }
};

const openProfile = async (restaurant) => {
  profileRestaurant.value = restaurant;
  profileStats.value = { reservas: null, mesas: null };
  planUsage.value    = null;
  const h = restaurant.horarios ?? {};
  profileForm.value = {
    nombre:    restaurant.nombre    || '',
    direccion: restaurant.direccion || '',
    telefono:  restaurant.telefono  || '',
    email:     restaurant.email     || '',
    web:       restaurant.web       || '',
    plan:               restaurant.plan              || 'basic',
    activo:             restaurant.activo            !== false,
    modo_confirmacion:  restaurant.modo_confirmacion || 'auto',
    horarios: {
      comida:    { inicio: h.comida?.inicio ?? '13:00', fin: h.comida?.fin ?? '17:00' },
      cena:      { inicio: h.cena?.inicio   ?? '20:00', fin: h.cena?.fin   ?? '00:00' },
      intervalo: h.intervalo ?? 30,
    },
  };
  profileSaved.value = false;
  currentView.value  = 'restaurant-profile';
  await Promise.all([
    loadRestaurantUsers(restaurant.id),
    fetchProfileStats(restaurant.id),
    fetchPlanUsage(restaurant.id),
  ]);
};

const fetchPlanUsage = async (rid) => {
  planUsageLoading.value = true;
  planUsageError.value   = false;
  planUsage.value        = null;
  try {
    const fn  = httpsCallable(fns, 'getPlanUsage');
    const res = await fn({ restaurant_id: rid });
    planUsage.value = res.data;
  } catch (e) {
    console.error('[plan] getPlanUsage falló:', e?.code, e?.message, e);
    planUsageError.value = true;
  } finally {
    planUsageLoading.value = false;
  }
};

const planMeterRatio = (metric) => {
  if (!planUsage.value) return 0;
  const uso    = planUsage.value.uso[metric === 'reservas' ? 'reservas_mes' : metric];
  const limite = planUsage.value.planData[metric === 'reservas' ? 'reservas_mes' : metric];
  if (!limite) return 0; // unlimited
  return uso / limite;
};

const startCheckout = async (plan) => {
  planUpgrading.value = plan;
  try {
    const fn  = httpsCallable(fns, 'createCheckoutSession');
    const res = await fn({ restaurant_id: profileRestaurant.value.id, plan });
    window.location.href = res.data.url;
  } catch (e) {
    alert('Error al iniciar el pago: ' + (e?.message || e));
    planUpgrading.value = null;
  }
};

const fetchProfileStats = async (rid) => {
  try {
    const [resSnap, mesasSnap] = await Promise.all([
      getCountFromServer(query(collection(db, 'reservas'), where('restaurant_id', '==', rid))),
      getCountFromServer(query(collection(db, 'mesas'),    where('restaurant_id', '==', rid))),
    ]);
    profileStats.value = { reservas: resSnap.data().count, mesas: mesasSnap.data().count };
  } catch {
    profileStats.value = { reservas: '—', mesas: '—' };
  }
};

const saveProfile = async () => {
  profileSaving.value = true;
  try {
    const data = {
      nombre:            profileForm.value.nombre.trim(),
      direccion:         profileForm.value.direccion || '',
      telefono:          profileForm.value.telefono  || '',
      email:             profileForm.value.email     || '',
      web:               profileForm.value.web       || '',
      modo_confirmacion: profileForm.value.modo_confirmacion || 'auto',
      horarios:          profileForm.value.horarios          ?? DEFAULT_HORARIOS,
    };
    // Plan y estado activo: solo superadmin puede modificarlos
    if (isSuperAdmin.value) {
      data.plan   = profileForm.value.plan   || 'basic';
      data.activo = profileForm.value.activo !== false;
    }
    await updateDoc(doc(db, 'restaurants', profileRestaurant.value.id), data);
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

  try {
    const fn   = httpsCallable(fns, 'createStaffUser');
    const res  = await fn({
      email:         email.trim(),
      role,
      restaurant_id: profileRestaurant.value.id,
    });
    const { uid, isNewUser, tempPassword } = res.data;

    // Update local list
    const idx = restaurantUsers.value.findIndex(u => u.uid === uid);
    const entry = { uid, email: email.trim(), role, restaurant_id: profileRestaurant.value.id };
    if (idx >= 0) restaurantUsers.value[idx] = entry;
    else          restaurantUsers.value.push(entry);

    addUserModal.value.result = { success: true, isNewUser, password: tempPassword };
  } catch (e) {
    const msg = e?.message || 'Error al crear el usuario. Inténtalo de nuevo.';
    addUserModal.value.result = { success: false, message: msg };
  } finally {
    addUserModal.value.saving = false;
  }
};

const revokeAccess = async (user) => {
  if (!confirm(`¿Revocar acceso a ${user.email}?`)) return;
  try {
    const fn = httpsCallable(fns, 'revokeStaffUser');
    await fn({ uid: user.uid });
    restaurantUsers.value = restaurantUsers.value.filter(u => u.uid !== user.uid);
  } catch (e) {
    alert('Error al revocar acceso: ' + (e?.message || e));
  }
};

const resetPassword = async (u) => {
  resettingPwd[u.uid] = 'sending';
  try {
    const fn = httpsCallable(fns, 'resetStaffPassword');
    await fn({ uid: u.uid });
    resettingPwd[u.uid] = 'done';
    setTimeout(() => { delete resettingPwd[u.uid]; }, 3000);
  } catch (e) {
    resettingPwd[u.uid] = 'error';
    setTimeout(() => { delete resettingPwd[u.uid]; }, 3000);
    console.error('[resetPassword]', e);
  }
};

const openAddUserModal = () => {
  // Admin solo puede crear staff; superadmin puede elegir admin o staff
  addUserModal.value = { show: true, email: '', role: isSuperAdmin.value ? 'admin' : 'staff', saving: false, result: null };
};

const closeAddUserModal = () => {
  addUserModal.value = { show: false, email: '', role: 'admin', saving: false, result: null };
};

// ─── Password reset (own account) ────────────────────
const requestOwnPasswordReset = async () => {
  if (!user.value?.uid) return;
  ownPwdReset.value = { loading: true, sent: false, error: false };
  try {
    const fn = httpsCallable(fns, 'resetStaffPassword');
    await fn({ uid: user.value.uid });
    ownPwdReset.value = { loading: false, sent: true, error: false };
    // Reset label after 5 s
    setTimeout(() => { ownPwdReset.value = { loading: false, sent: false, error: false }; }, 5000);
  } catch (e) {
    console.error('[requestOwnPasswordReset]', e);
    ownPwdReset.value = { loading: false, sent: false, error: true };
    setTimeout(() => { ownPwdReset.value = { loading: false, sent: false, error: false }; }, 4000);
  }
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
.forgot-link {
  background: none; border: none; cursor: pointer;
  font-size: 0.7rem; color: #888; text-align: center;
  padding: 0; text-decoration: underline; text-underline-offset: 3px;
  transition: color 0.15s;
}
.forgot-link:hover { color: #000; }
.forgot-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.375rem; }
.forgot-desc  { font-size: 0.75rem; color: #666; margin: 0; line-height: 1.5; }
.forgot-success { text-align: center; display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
.forgot-success-icon  { font-size: 2.5rem; margin: 0; line-height: 1; }
.forgot-success-title { font-size: 1.1rem; font-weight: 700; margin: 0; }
.forgot-success-desc  { font-size: 0.78rem; color: #555; margin: 0; line-height: 1.6; }
.btn-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* ── Dashboard Layout ────────────────────────────── */
.dashboard-wrap {
  display: flex;
  height: 100vh;       /* lock wrapper to viewport */
  overflow: hidden;    /* children scroll internally */
  font-family: 'Work Sans', system-ui, sans-serif;
  background: #f5f5f5;
}

/* ── Sidebar ─────────────────────────────────────── */
.sidebar {
  width: 240px; flex-shrink: 0;
  background: #0a0a0a; color: #fff;
  display: flex; flex-direction: column;
  height: 100%;        /* fill the locked wrapper */
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
.change-pwd-btn {
  display: block; width: 100%; text-align: left;
  background: transparent; border: none;
  color: #555; font-size: 0.65rem; font-weight: 600;
  letter-spacing: 0.06em; padding: 0.375rem 0;
  margin-bottom: 0.625rem; cursor: pointer;
  transition: color 0.2s;
}
.change-pwd-btn:hover:not(:disabled) { color: #fff; }
.change-pwd-btn:disabled { cursor: default; }
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
  overflow-y: auto;    /* main content scrolls here */
  overflow-x: hidden;  /* prevent horizontal bleed (CSS spec: setting one axis forces the other) */
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
.view-section { padding: 1.5rem; padding-bottom: 2.5rem; }
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
.filter-search { min-width: 160px; }
.filter-search-wrap { flex: 1; min-width: 160px; }
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
  justify-content: center;
  border-left: 1px solid #f0f0f0;
  flex-shrink: 0;
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
.mapa-grid-wrap { overflow-x: auto; padding: 1rem 0; max-width: 100%; }
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

/* Tablet / sidebar drawer */
@media (max-width: 900px) {
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0; height: 100%;
    transform: translateX(-100%);
  }
  .sidebar--open { transform: translateX(0); }
  .sidebar-close { display: block; }
  .hamburger { display: flex; }
  /* KPI: 2×2 */
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  /* Booking actions: move below content */
  .booking-row { flex-wrap: wrap; overflow: hidden; }
  .booking-actions {
    flex: 0 0 100%; max-width: 100%; flex-direction: row;
    border-left: none; border-top: 1px solid #f0f0f0;
    padding: 0.75rem 1rem; gap: 0.5rem;
    box-sizing: border-box;
  }
  .act-btn { flex: 1; }
  /* Profile: single column */
  .prof-main { grid-template-columns: 1fr; }
  /* Horarios: always single column below 900px */
  .prof-horarios { grid-template-columns: 1fr; }
  /* Stats strip: 2×2 grid */
  .prof-stats { flex-wrap: wrap; }
  .prof-stat  { flex: 1 1 50%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .prof-stat:nth-child(odd)  { border-right: 1px solid rgba(255,255,255,0.08); }
  .prof-stat:last-child, .prof-stat:nth-last-child(2):nth-child(odd) { border-bottom: none; }
  /* Hero */
  .prof-hero-top { flex-direction: column; gap: 0.75rem; }
  .prof-hero-name { font-size: 1.5rem; }
}

/* Mobile (≤ 600px) */
@media (max-width: 600px) {
  /* Layout */
  .view-section { padding: 0.875rem; }
  .topbar { padding: 0 0.875rem; gap: 0.5rem; }
  .topbar-title { font-size: 0.65rem; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .res-switcher { font-size: 0.7rem; max-width: 130px; }

  /* KPIs */
  .kpi-strip { grid-template-columns: repeat(2, 1fr); gap: 0.625rem; }
  .kpi-card  { padding: 1rem 0.75rem; }
  .kpi-num   { font-size: 1.75rem; }

  /* Filters: each group full width */
  .filters-bar { padding: 0.875rem; gap: 0.5rem; }
  .filter-group { width: 100%; min-width: 0; }
  .filter-search-wrap { width: 100%; min-width: 0; flex: none; }
  .filter-search { min-width: 0 !important; width: 100%; }
  /* Tabs: horizontal scroll — hide scrollbar visually */
  .tab-group {
    gap: 0.25rem; overflow-x: auto; flex-wrap: nowrap;
    width: 100%; min-width: 0;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  .tab-group::-webkit-scrollbar { display: none; } /* Chrome/Safari/iOS */
  .tab-pill { padding: 0.3rem 0.625rem; font-size: 0.65rem; white-space: nowrap; }

  /* Booking rows */
  .booking-top  { flex-direction: column; }
  .booking-body { padding: 0.875rem 1rem; }
  .act-btn { min-height: 40px; padding: 0.5rem 0.625rem; }

  /* Hide secondary info */
  .booking-row .col-date,
  .booking-row .col-phone { display: none; }

  /* SaaS grid: single column */
  .saas-grid { grid-template-columns: 1fr; }

  /* Mapa: smaller cells */
  .mapa-grid {
    grid-template-columns: repeat(13, 42px);
    grid-template-rows:    repeat(13, 42px);
  }

  /* Profile hero */
  .prof-hero { padding: 1.25rem 1.25rem 0; border-radius: 10px; }
  .prof-hero-name { font-size: 1.375rem; }
  .prof-stats { margin: 0 -1.25rem; } /* match reduced hero padding */
  .prof-horarios { grid-template-columns: 1fr; }

  /* Danger zone */
  .danger-inner { flex-direction: column; align-items: flex-start; gap: 1rem; }

  /* Modal */
  .modal-box { padding: 1.5rem; }
}

/* Small phones (≤ 480px — iPhone SE, Galaxy A) */
@media (max-width: 480px) {
  /* View padding */
  .view-section { padding: 0.75rem; }

  /* KPI numbers */
  .kpi-num { font-size: 1.5rem; }

  /* Form rows: always stack */
  .field-row { flex-direction: column; }
  .field--narrow { flex: 1 !important; }

  /* Action buttons: bigger touch target */
  .act-btn { min-height: 44px; font-size: 0.75rem; }

  /* View header: stack title + button */
  .view-header { flex-direction: column; align-items: stretch; }
  .btn-primary-sm { text-align: center; }

  /* URL items: stack label + copy button */
  .url-item { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  .url-info { width: 100%; }
  .url-value { white-space: normal; word-break: break-all; }
  .copy-btn { width: 100%; text-align: center; }

  /* Modal footer: full-width stacked buttons */
  .modal-footer { flex-direction: column-reverse; gap: 0.5rem; }
  .modal-footer .btn-primary-sm,
  .modal-footer .btn-ghost-sm,
  .modal-footer .btn-danger-sm { width: 100%; text-align: center; justify-content: center; }

  /* Topbar: hide title text, more room for switcher */
  .topbar-title { display: none; }
  .res-switcher  { max-width: 200px; }

  /* Prof hero stats: 2×2 with reduced text */
  .prof-stat-num { font-size: 1.125rem; }
}

/* ── Restaurant profile ──────────────────────────── */
/* ── Profile view ─────────────────────────────────── */
.prof-view { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; min-width: 0; }

/* Hero */
.prof-hero {
  background: #000;
  border-radius: 12px;
  padding: 1.75rem 2rem 0;
  color: #fff;
  overflow: hidden;
}
.prof-hero-body { margin-bottom: 1.75rem; }
.prof-hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.875rem; }
.prof-hero-badges { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.prof-status-pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.3em 0.75em; border-radius: 100px;
}
.prof-status-pill--on  { background: rgba(34,197,94,0.2); color: #4ade80; }
.prof-status-pill--off { background: rgba(255,255,255,0.1); color: #aaa; }
.prof-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.prof-plan-pill {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.3em 0.75em; border-radius: 100px; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.7);
}
.prof-plan-pill--pro   { border-color: #a78bfa; color: #c4b5fd; }
.prof-plan-pill--basic { border-color: rgba(255,255,255,0.25); }
.prof-plan-pill--trial { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.5); }
.prof-hero-name {
  font-size: 2rem; font-weight: 300; letter-spacing: 0.04em;
  margin: 0 0 0.5rem; line-height: 1.1;
}
.prof-hero-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.75rem; color: rgba(255,255,255,0.5); margin: 0; max-width: 100%; overflow: hidden; }
.prof-id-code { font-family: monospace; background: rgba(255,255,255,0.1); padding: 0.15em 0.5em; border-radius: 4px; font-size: 0.85em; color: rgba(255,255,255,0.6); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle; }
.prof-meta-sep { color: rgba(255,255,255,0.25); }
/* Stats strip at bottom of hero */
.prof-stats {
  display: flex;
  border-top: 1px solid rgba(255,255,255,0.1);
  margin: 0 -2rem;
}
.prof-stat {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding: 1rem 0.5rem;
  border-right: 1px solid rgba(255,255,255,0.08);
}
.prof-stat:last-child { border-right: none; }
.prof-stat-num { font-size: 1.375rem; font-weight: 700; color: #fff; line-height: 1; margin-bottom: 0.25rem; }
.prof-stat-num--sm { font-size: 0.85rem; font-weight: 500; }
.prof-stat-lbl { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.4); }

/* Main 2-col layout */
.prof-main { display: grid; grid-template-columns: 1fr 380px; gap: 1.25rem; align-items: start; }
@media (max-width: 1050px) { .prof-main { grid-template-columns: 1fr; } }
@media (max-width: 900px)  { .prof-main { grid-template-columns: 1fr; } }
.prof-col-left  { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; max-width: 100%; }
.prof-col-right { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; max-width: 100%; }

/* Cards */
.prof-card { background: #fff; border: 1px solid #e8e8e8; border-radius: 10px; padding: 1.375rem; overflow: hidden; width: 100%; box-sizing: border-box; }
.prof-card-title {
  font-size: 0.65rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  margin: 0 0 1.25rem; display: flex; align-items: center; gap: 0.5rem;
  color: #111;
}
.prof-card-title svg { opacity: 0.5; flex-shrink: 0; }

.profile-form { display: flex; flex-direction: column; gap: 0.875rem; }
.profile-form .field { display: flex; flex-direction: column; gap: 0.4rem; }
.profile-form .field label { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #666; }
.profile-form input[type="text"],
.profile-form input[type="email"],
.profile-form input[type="tel"],
.profile-form input[type="url"] {
  padding: 0.6rem 0.75rem;
  border: 1.5px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
  font-family: inherit;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.profile-form input:focus { border-color: #000; }
.profile-saved-msg { font-size: 0.7rem; color: #22c55e; font-weight: 700; margin: 0; }
.profile-loading { font-size: 0.75rem; color: #999; padding: 0.5rem 0; }
.profile-loading--error { color: #ef4444; display: flex; align-items: center; gap: 0.75rem; }
.retry-btn { font-size: 0.7rem; padding: 0.25rem 0.75rem; border: 1px solid #ef4444; color: #ef4444; background: transparent; border-radius: 4px; cursor: pointer; }
.retry-btn:hover { background: #fef2f2; }
.prof-form-footer { display: flex; align-items: center; gap: 1rem; margin-top: 0.25rem; }

/* Horarios */
.horarios-hint { font-size: 0.7rem; color: #888; margin: 0; line-height: 1.6; }
.prof-horarios { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.prof-turno-card { background: #f7f7f7; border-radius: 8px; padding: 0.875rem 1rem; display: flex; flex-direction: column; gap: 0.625rem; }
.prof-turno-label { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #555; display: flex; align-items: center; gap: 0.4rem; }
.prof-turno-label svg { opacity: 0.6; }
.prof-time-row { display: flex; align-items: center; gap: 0.5rem; }
.prof-time-input { flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 0.4rem 0.5rem; font-size: 0.8rem; font-family: inherit; background: #fff; min-width: 0; }
.prof-time-sep { font-size: 0.75rem; color: #aaa; flex-shrink: 0; }
.field-input-sm { border: 1px solid #ddd; border-radius: 4px; padding: 0.4rem 0.5rem; font-size: 0.8rem; font-family: inherit; width: 100%; }

/* URL list */
.url-list { display: flex; flex-direction: column; gap: 0.5rem; }
.url-item { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: #f7f7f7; border-radius: 8px; padding: 0.75rem; max-width: 100%; overflow: hidden; }
.url-info { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; overflow: hidden; }
.url-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
.url-value { font-size: 0.7rem; color: #222; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%; }
.copy-btn { flex-shrink: 0; padding: 0.35rem 0.75rem; background: #000; color: #fff; border: none; border-radius: 5px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
.copy-btn:hover { background: #333; }
.copy-btn--copied { background: #22c55e; }

/* Users list */
.add-user-btn { margin-left: auto; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; background: #000; color: #fff; border: none; border-radius: 4px; padding: 0.3rem 0.65rem; cursor: pointer; }
.add-user-btn:hover { opacity: 0.75; }
.profile-empty-users { font-size: 0.75rem; color: #bbb; font-style: italic; padding: 0.5rem 0; }
.users-list { display: flex; flex-direction: column; gap: 0.5rem; }
.user-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; background: #f7f7f7; border-radius: 8px; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: #111; color: #fff; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; flex: 1; }
.user-email { font-size: 0.75rem; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role-badge { font-size: 0.55rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.2em 0.6em; border-radius: 100px; align-self: flex-start; }
.user-role-badge--admin { background: #dbeafe; color: #1e40af; }
.user-role-badge--staff { background: #f0fdf4; color: #166534; }
.revoke-btn { width: 24px; height: 24px; border-radius: 50%; background: #fee2e2; color: #ef4444; border: none; font-size: 0.6rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; flex-shrink: 0; }
.revoke-btn:hover { background: #fca5a5; }
.user-actions { display: flex; align-items: center; gap: 0.375rem; flex-shrink: 0; }
.reset-pwd-btn {
  width: 24px; height: 24px; border-radius: 50%;
  background: #e0f2fe; color: #0369a1;
  border: none; font-size: 0.65rem; font-weight: 800;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.15s; flex-shrink: 0;
}
.reset-pwd-btn:hover:not(:disabled) { background: #bae6fd; }
.reset-pwd-btn:disabled { opacity: 0.6; cursor: default; }
.reset-pwd-btn--done  { background: #dcfce7; color: #166534; }
.reset-pwd-btn--error { background: #fee2e2; color: #991b1b; }

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
.danger-zone { background: #fff; border: 1px solid #fca5a5; border-radius: 10px; padding: 1.25rem 1.375rem; width: 100%; max-width: 100%; box-sizing: border-box; }
.danger-inner { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
.danger-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #991b1b; margin: 0 0 0.35rem; }
.danger-desc { font-size: 0.75rem; color: #777; margin: 0; }
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

/* ── Plan card ───────────────────────────────────── */
.plan-body { display: flex; flex-direction: column; gap: 1.25rem; }
.plan-header-row { display: flex; align-items: center; justify-content: space-between; }
.plan-badge {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
  padding: 0.3em 0.8em; border-radius: 100px;
}
.plan-badge--trial  { background: #f3f4f6; color: #6b7280; }
.plan-badge--basic  { background: #dbeafe; color: #1e40af; }
.plan-badge--pro    { background: #000; color: #fff; }
.plan-price { font-size: 0.85rem; font-weight: 700; color: #111; }

/* Usage meters */
.plan-meters { display: flex; flex-direction: column; gap: 0.875rem; }
.plan-meter {}
.plan-meter-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: #555; margin-bottom: 0.3rem; }
.plan-meter-count  { font-weight: 700; color: #111; }
.plan-meter-bar    { height: 5px; background: #eee; border-radius: 100px; overflow: hidden; }
.plan-meter-fill   { height: 100%; background: #000; border-radius: 100px; transition: width 0.4s ease; min-width: 2px; }
.plan-meter-fill--warn { background: #f59e0b; }
.plan-meter-fill--over { background: #ef4444; }

/* Features */
.plan-features { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.plan-feat {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em;
  padding: 0.25em 0.6em; border-radius: 100px; border: 1px solid;
}
.plan-feat--on  { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
.plan-feat--off { background: #f9fafb; color: #9ca3af; border-color: #e5e7eb; }

/* Upgrade buttons */
.plan-upgrade-row { display: flex; gap: 0.5rem; flex-direction: column; }
.plan-upgrade-btn {
  width: 100%; padding: 0.65rem 1rem; border: none; border-radius: 6px;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  cursor: pointer; transition: opacity 0.15s, transform 0.1s;
}
.plan-upgrade-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.plan-upgrade-btn:disabled { opacity: 0.5; cursor: default; transform: none; }
.plan-upgrade-btn--basic { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
.plan-upgrade-btn--pro   { background: #000; color: #fff; }
.plan-pro-msg { font-size: 0.72rem; color: #22c55e; font-weight: 600; text-align: center; margin: 0; }
.plan-upgrade-contact { font-size: 0.72rem; color: #6b7280; text-align: center; margin: 0.5rem 0 0; }
.plan-upgrade-contact a { color: #1e40af; }

/* ── Responsive overrides — must be LAST so they win over base rules ── */
@media (max-width: 900px) {
  /* Columnas de perfil: una sola columna, sin desbordamiento */
  .prof-main      { grid-template-columns: 1fr !important; }
  .prof-col-left,
  .prof-col-right { min-width: 0; max-width: 100%; width: 100%; }
  .prof-card      { width: 100%; max-width: 100%; box-sizing: border-box; }
  /* Hero */
  .prof-hero-top  { flex-direction: column; gap: 0.75rem; }
  .prof-hero-name { font-size: 1.5rem; }
  /* Stats 2×2 */
  .prof-stats     { flex-wrap: wrap; }
  .prof-stat      { flex: 1 1 50%; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .prof-stat:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.08); }
  .prof-stat:last-child,
  .prof-stat:nth-last-child(2):nth-child(odd) { border-bottom: none; }
  /* Horarios y danger */
  .prof-horarios  { grid-template-columns: 1fr; }
  .danger-inner   { flex-direction: column; align-items: flex-start; gap: 1rem; }
  /* Formulario: filas de campos en columna desde 900px en perfil */
  .profile-form .field-row { flex-direction: column; }
}
@media (max-width: 600px) {
  .prof-hero      { padding: 1.25rem 1.25rem 0; border-radius: 10px; }
  .prof-hero-name { font-size: 1.375rem; }
  .prof-stats     { margin: 0 -1.25rem; }
  /* Padding reducido en tarjetas */
  .prof-card      { padding: 1rem; }
}
@media (max-width: 480px) {
  /* Cards: padding mínimo */
  .prof-card      { padding: 0.875rem; }
  /* URLs: stack vertical */
  .url-item  { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  .url-info  { width: 100%; }
  .url-value { white-space: normal; word-break: break-all; }
  .copy-btn  { width: 100%; text-align: center; }
  /* Tiempo: aún en fila pero reducido */
  .prof-time-input { font-size: 0.75rem; padding: 0.35rem 0.4rem; }
}
</style>
