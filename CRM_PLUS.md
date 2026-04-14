# Tane Solutions - CRM PLUS & Reserva Inteligente 🚀

Este documento detalla la arquitectura y funcionalidades de alto rendimiento implementadas en el módulo de gestión de reservas de Tane Solutions.

## 💎 Características ELITE Implementadas

### 1. Mapa de Sala Interactivo 2.0 (Editor Visual)
- **Drag & Drop Nativo**: Sistema de arrastrar y soltar con el ratón sobre una cuadrícula técnica de 12x12.
- **Capa de Rejilla Técnica**: Visualización de celdas nítidas para un posicionamiento de precisión milimétrica.
- **Persistencia en Tiempo Real**: Las coordenadas (X, Y) se guardan automáticamente en Firestore al soltar la mesa.
- **Modo Diseño Seguro**: Botón dedicado para activar/desactivar el movimiento accidental durante el servicio.
- **Iconografía Inteligente**: Micro-diseño que muestra ID de mesa, PAX (capacidad), estado y zona en un formato compacto y legible.

### 2. Motor de Disponibilidad "Time Windows"
- **Duración Dinámica**: 
  - Grupos de **1-4 personas**: Ventana de **90 minutos**.
  - Grupos de **>4 personas**: Ventana de **120 minutos**.
- **Algoritmo de No-Solapamiento**: El sistema garantiza que una mesa solo se reserve si está libre durante toda la duración estimada, protegiendo la rotación y la sobremesa.
- **Prevención de Overbooking**: El formulario público (`BookingForm.vue`) cruza la capacidad de las mesas físicas con las ventanas de ocupación en tiempo real.

### 3. Escudo de Protección en Sala (Check-in Safety)
- **Validación Anti-Conflictos**: Impide marcar una mesa como "Ocupada" manualmente si existe una reserva confirmada asignada en los próximos **60 minutos**.
- **Alerta Operativa**: Notificación inmediata al staff para evitar sentar a clientes espontáneos en mesas que están a punto de ser ocupadas por clientes con reserva.

### 4. Gestión de Datos y Marketing (RGPD Compliance)
- **Consentimiento Explícito**: Checkbox de marketing marcado por defecto con registro de autorización en base de datos.
- **Panel de Cliente**: Visualización de clientes recurrentes y exportación a CSV para campañas de fidelización.
- **Edición de Identidad**: Herramienta de edición directa en el mapa para renombrar mesas y ajustar capacidades al instante.

## 🛠️ Stack Tecnológico
- **Frontend**: Astro + Vue 3 (Composition API).
- **Backend**: Firebase Firestore (Real-time DB).
- **Seguridad**: Firebase Auth (Admin Dashboard Protection).

## 📋 Próximos Pasos (Hoja de Ruta)
1.  **Analíticas de Ocupación**: Mapa de calor para identificar las zonas más rentables.
2.  **IA de Predicción**: Estimación de carga de trabajo basada en históricos de festivos y clima.
3.  **Integración de Pagos**: Sistema de prepago o fianza para grupos grandes (No-Show Protection).

---
*Configuración mantenida por Antigravity para Tane Solutions.*
