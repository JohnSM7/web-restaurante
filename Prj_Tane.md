# 🚀 CONTEXTO DE PROYECTO: Tane Booking & CRM Boilerplate

**Rol del Asistente:** Actúa como un desarrollador Senior Full-Stack especializado en Astro, Vue 3, y Firebase. Estamos construyendo el "Boilerplate" estandarizado del sistema de reservas y CRM para la agencia Tane Solutions.

## 1. STACK TECNOLÓGICO Y ARQUITECTURA

* **Framework Principal:** Astro (priorizando generación estática para SEO y 100/100 en Core Web Vitals).
* **Interactividad (Islands):** Vue 3 (Composition API) cargado estratégicamente.
* **Backend & BaaS:** Firebase.
  * *Hosting:* Despliegue multi-sitio bajo el proyecto `tanesolutions-d86dc`.
  * *Base de Datos:* Firestore (NoSQL) con escucha en tiempo real.
  * *Autenticación:* Firebase Auth (Email/Password) habilitado para el panel administrativo.
  * *Cloud Functions:* V2 (Node.js) integradas con **Resend**. Flujo optimizado para ahorro de cuota (solo se envía mail al confirmar).
* **Estilos:** Tailwind CSS + Vanilla CSS para componentes de alta carga estética.

## 2. ESTADO ACTUAL (ABRIL 2026) -> "Fase de Lanzamiento Terminada"

El sistema ha sido optimizado para producción con un enfoque especial en **UX Móvil** y **Seguridad**.

### A. Vista de Cliente (Booking Platform)
- **Motor de Reservas Inteligente**: El selector de horas filtra automáticamente turnos pasados del mismo día y aplica un margen de 60 minutos.
- **Validación de Fechas**: Bloqueo de fechas pasadas nativo.
- **Peticiones Especiales**: Campo de comentarios para intolerancias, alergias o solicitudes VIP.
- **Responsividad Crítica**: Formulario totalmente adaptativo que aprovecha el 100% del ancho en dispositivos móviles.

### B. Vista de Administración (Dashboard Premium)
- **Seguridad**: Pantalla de Login obligatoria mediante Firebase Auth. Solo personal autorizado accede a los datos.
- **Interfaz de Gestión Pro**: Sidebar persistente, vista de escritorio y móvil optimizada con tarjetas táctiles.
- **Gestión Dual de Notas**: 
    - **Peticiones del Cliente**: Visualizadas en rojo destacado para evitar errores de servicio (alergias).
    - **Notas Internas**: Campo editable para el personal (asignación de mesas, anotaciones VIP).
- **Herramientas de Operación**:
    - **Exportación CSV**: Descarga instantánea de la lista de reservas para uso físico en sala.
    - **Estadísticas Dinámicas**: Contadores de Pax confirmados para el día actual y solicitudes pendientes.
    - **Filtros Avanzados**: Por estado (Pendiente/Confirmada/Todas), por fecha (calendario) y buscador por texto.

## 3. ESQUEMA DE BASE DE DATOS (FIRESTORE)

Colección: `reservas`

```json
{
  "nombre_cliente": "string",
  "email": "string",
  "telefono": "string",
  "fecha": "timestamp",
  "hora": "string",
  "comensales": "number",
  "estado": "string (pendiente | confirmada | cancelada)",
  "comentarios": "string (cliente)",
  "notas": "string (personal)",
  "creado_en": "timestamp"
}
```

## 4. PRÓXIMOS PASOS
1. **Cron Jobs**: Implementar recordatorios automáticos de reserva 24h antes.
2. **Dashboard de Analítica**: Gráficos de ocupación semanal.
3. **Módulo de Turnos**: Configuración dinámica de aforos máximos por franja horaria.
