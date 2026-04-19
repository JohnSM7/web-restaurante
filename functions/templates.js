/**
 * Plantillas de Email para Tane Booking
 * Todas las funciones reciben un objeto `restaurante` con:
 *   { nombre, direccion, telefono, email, web }
 */

const baseStyle = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #f0f0f0;
`;

const makeHeader = (restaurante) => `
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">
      ${restaurante.nombre || 'Restaurante'}
    </h1>
  </div>
`;

const makeFooter = (restaurante) => {
  const lines = [];
  if (restaurante.direccion) lines.push(`<p>${restaurante.direccion}</p>`);
  if (restaurante.telefono)  lines.push(`<p>Tel: ${restaurante.telefono}</p>`);
  if (restaurante.email)     lines.push(`<p>Contacto: <a href="mailto:${restaurante.email}" style="color:#555;">${restaurante.email}</a></p>`);
  if (restaurante.web)       lines.push(`<p><a href="${restaurante.web}" style="color:#555;">${restaurante.web}</a></p>`);
  if (!lines.length)         lines.push(`<p>Gracias por confiar en nosotros.</p>`);

  return `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
      ${lines.join('\n      ')}
      <p style="margin-top:8px;">Si tienes alguna duda, responde a este email o contáctanos directamente.</p>
    </div>
  `;
};

// ─── Shared Tane system footer (no restaurant branding) ──────────────────────
const taneFooter = `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
    <p>Este email fue generado automáticamente por <strong>Tane Booking Platform</strong>.</p>
    <p>Si no esperabas este mensaje, ignóralo o contacta con <a href="mailto:admin@tanesolutions.com" style="color:#555;">admin@tanesolutions.com</a>.</p>
  </div>
`;

module.exports = {
  // 0. ACTIVACIÓN DE CUENTA (nuevo usuario — enlace para establecer contraseña)
  activacionCuenta: (email, setPwdLink, adminUrl, restaurante, role) => `
    <div style="${baseStyle}">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin:0;">
          TANE <span style="font-style: italic; color: #777;">Booking</span>
        </h1>
        <p style="font-size: 11px; color: #aaa; letter-spacing: 0.15em; margin-top: 4px;">PANEL DE GESTIÓN</p>
      </div>

      <h2 style="font-size: 20px; font-weight: 400; margin: 0 0 8px;">Bienvenido a ${restaurante.nombre || 'el panel de gestión'}</h2>
      <p style="color: #555; margin: 0 0 28px;">
        Se ha creado tu cuenta con el rol <strong>${role}</strong>.
        Para acceder por primera vez establece tu contraseña usando el botón de abajo.
      </p>

      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
        <p style="margin: 0 0 4px; font-size: 13px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0; font-size: 13px; color: #888;">Restaurante: ${restaurante.nombre || '—'}</p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${setPwdLink}"
          style="display: inline-block; background: #000; color: #fff; text-decoration: none;
                 font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
                 padding: 14px 32px; border-radius: 4px;">
          Establecer mi contraseña →
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 12px;">
          O copia: <a href="${setPwdLink}" style="color:#555; word-break:break-all;">${setPwdLink}</a>
        </p>
      </div>

      <p style="font-size: 12px; color: #888; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; margin: 0;">
        ⏱️ Este enlace caduca en <strong>1 hora</strong>. Si expiró, pide al administrador que te envíe uno nuevo desde el panel de accesos.
      </p>

      ${taneFooter}
    </div>
  `,

  // ALERTA: límite de reservas superado (para superadmin)
  alertaLimiteSuperado: (restaurante, plan, reservasMes, limite, upgradeUrl) => `
    <div style="${baseStyle}">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-size:20px; font-weight:300; letter-spacing:2px; text-transform:uppercase; margin:0;">
          TANE <span style="font-style:italic; color:#777;">Booking</span>
        </h1>
      </div>

      <div style="background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:20px; margin-bottom:24px;">
        <p style="margin:0; font-size:14px; font-weight:700; color:#856404;">
          ⚠️ ${restaurante.nombre} ha superado su límite mensual de reservas
        </p>
      </div>

      <p style="color:#555;">El restaurante <strong>${restaurante.nombre}</strong> lleva <strong>${reservasMes} reservas este mes</strong> y su plan <strong>${plan.toUpperCase()}</strong> incluye un máximo de <strong>${limite}</strong>.</p>
      <p style="color:#555;">Las reservas siguen aceptándose (límite soft), pero deberías contactar con el cliente para ofrecerle un upgrade.</p>

      <div style="background:#f7f7f7; border-radius:8px; padding:16px; margin:20px 0; font-size:13px;">
        <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${restaurante.nombre}</p>
        <p style="margin:0 0 6px;"><strong>Plan actual:</strong> ${plan}</p>
        <p style="margin:0 0 6px;"><strong>Reservas este mes:</strong> ${reservasMes}</p>
        <p style="margin:0;"><strong>Límite del plan:</strong> ${limite}</p>
      </div>

      ${upgradeUrl ? `
      <div style="text-align:center; margin:28px 0;">
        <a href="${upgradeUrl}" style="display:inline-block; background:#000; color:#fff; text-decoration:none;
           font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
           padding:14px 32px; border-radius:4px;">
          Ver perfil del restaurante →
        </a>
      </div>` : ''}

      ${taneFooter}
    </div>
  `,

  // ALERTA: acercándose al límite (80%)
  alertaLimiteCercano: (restaurante, plan, reservasMes, limite, upgradeUrl) => `
    <div style="${baseStyle}">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-size:20px; font-weight:300; letter-spacing:2px; text-transform:uppercase; margin:0;">
          TANE <span style="font-style:italic; color:#777;">Booking</span>
        </h1>
      </div>

      <div style="background:#e8f4fd; border:1px solid #90cdf4; border-radius:8px; padding:20px; margin-bottom:24px;">
        <p style="margin:0; font-size:14px; font-weight:700; color:#2b6cb0;">
          ℹ️ ${restaurante.nombre} se acerca a su límite mensual
        </p>
      </div>

      <p style="color:#555;">El restaurante <strong>${restaurante.nombre}</strong> lleva <strong>${reservasMes} de ${limite} reservas</strong> este mes (${Math.round(reservasMes/limite*100)}%).</p>
      <p style="color:#555;">Es un buen momento para ofrecerle un upgrade antes de que llegue al límite.</p>

      <div style="background:#f7f7f7; border-radius:8px; padding:16px; margin:20px 0; font-size:13px;">
        <p style="margin:0 0 6px;"><strong>Restaurante:</strong> ${restaurante.nombre}</p>
        <p style="margin:0 0 6px;"><strong>Plan actual:</strong> ${plan}</p>
        <p style="margin:0;"><strong>Uso:</strong> ${reservasMes} / ${limite} reservas</p>
      </div>

      ${upgradeUrl ? `
      <div style="text-align:center; margin:28px 0;">
        <a href="${upgradeUrl}" style="display:inline-block; background:#000; color:#fff; text-decoration:none;
           font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
           padding:14px 32px; border-radius:4px;">
          Ver perfil del restaurante →
        </a>
      </div>` : ''}

      ${taneFooter}
    </div>
  `,

  // 1. SOLICITUD RECIBIDA (Pendiente)
  solicitudRecibida: (nombre, fecha, hora, pax, restaurante) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <h2>Hola ${nombre},</h2>
      <p>Hemos recibido tu solicitud de reserva en <strong>${restaurante.nombre || 'nuestro restaurante'}</strong>. Estamos revisando nuestra disponibilidad y te confirmaremos en breve.</p>
      <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p><strong>Comensales:</strong> ${pax} personas</p>
      </div>
      <p>Este email es solo un acuse de recibo. <strong>Espera a que confirmemos tu mesa</strong> antes de acudir al restaurante.</p>
      ${makeFooter(restaurante)}
    </div>
  `,

  // 2. RESERVA CONFIRMADA
  reservaConfirmada: (nombre, fecha, hora, cancelLink, restaurante) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <h2 style="color: #2e7d32;">¡Tu mesa está confirmada!</h2>
      <p>Hola ${nombre}, nos alegra confirmarte que te esperamos en <strong>${restaurante.nombre || 'nuestro restaurante'}</strong>.</p>
      <div style="background: #e8f5e9; padding: 20px; margin: 20px 0; border-left: 4px solid #2e7d32;">
        <p><strong>${fecha} a las ${hora}</strong></p>
      </div>
      <p>Por favor, si vas a llegar más de 15 minutos tarde, avísanos para que podamos mantener tu mesa.</p>
      <div style="margin-top: 30px; text-align: center;">
        <p style="font-size: 12px; color: #777; margin-bottom: 10px;">¿Necesitas hacer cambios?</p>
        <a href="${cancelLink}" style="display: inline-block; padding: 10px 20px; background: #f5f5f5; color: #1a1a1a; text-decoration: none; font-size: 12px; border-radius: 4px; border: 1px solid #ddd;">Cancelar mi reserva</a>
      </div>
      ${makeFooter(restaurante)}
    </div>
  `,

  // 3. RESERVA CANCELADA
  reservaCancelada: (nombre, fecha, hora, restaurante) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <h2 style="color: #c62828;">Reserva Cancelada</h2>
      <p>Hola ${nombre}, sentimos comunicarte que tu reserva para el ${fecha} a las ${hora} en <strong>${restaurante.nombre || 'nuestro restaurante'}</strong> ha sido cancelada.</p>
      <p>Si crees que esto es un error o quieres reagendar, no dudes en contactarnos directamente.</p>
      ${makeFooter(restaurante)}
    </div>
  `,

  // 4. RECORDATORIO (24h antes)
  recordatorio: (nombre, fecha, hora, restaurante) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <h2>Falta muy poco...</h2>
      <p>Hola ${nombre}, este es un recordatorio de tu reserva para mañana en <strong>${restaurante.nombre || 'nuestro restaurante'}</strong>.</p>
      <div style="background: #fff8e1; padding: 20px; margin: 20px 0;">
        <p><strong>Mañana, ${fecha} a las ${hora}</strong></p>
      </div>
      <p>Si no puedes asistir, por favor avísanos respondiendo a este email para que otra persona pueda disfrutar de la mesa.</p>
      ${makeFooter(restaurante)}
    </div>
  `,

  // 5b. BIENVENIDA AUTO-REGISTRO (nuevo restaurante self-serve)
  bienvenidaRegistro: (email, nombreRestaurante, dashboardUrl) => `
    <div style="${baseStyle}">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin:0;">
          TANE <span style="font-style: italic; color: #777;">Booking</span>
        </h1>
        <p style="font-size: 11px; color: #aaa; letter-spacing: 0.15em; margin-top: 4px;">PLATAFORMA DE RESERVAS</p>
      </div>

      <h2 style="font-size: 20px; font-weight: 400; margin: 0 0 8px;">¡Bienvenido a Tane Booking!</h2>
      <p style="color: #555; margin: 0 0 20px;">
        Tu cuenta para <strong>${nombreRestaurante}</strong> ya está activa. Tienes <strong>14 días de prueba gratuita</strong> para explorar todas las funcionalidades.
      </p>

      <div style="background: #f7f7f7; border-radius: 8px; padding: 20px; margin: 0 0 28px;">
        <p style="margin: 0 0 6px; font-size: 13px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0 0 6px; font-size: 13px;"><strong>Restaurante:</strong> ${nombreRestaurante}</p>
        <p style="margin: 0; font-size: 13px; color: #22c55e;"><strong>Plan Trial:</strong> 14 días gratuitos · sin tarjeta</p>
      </div>

      <p style="color: #555; margin: 0 0 20px;">Estos son tus próximos pasos para empezar a recibir reservas:</p>
      <ol style="color: #555; padding-left: 20px; margin: 0 0 28px; line-height: 2;">
        <li>Configura tu restaurante (horarios, contacto)</li>
        <li>Añade tus mesas en el mapa de sala</li>
        <li>Comparte tu enlace de reservas con tus clientes</li>
      </ol>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}"
          style="display: inline-block; background: #000; color: #fff; text-decoration: none;
                 font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
                 padding: 14px 32px; border-radius: 4px;">
          Ir al panel de gestión →
        </a>
      </div>

      ${taneFooter}
    </div>
  `,

  // ── TRIAL EXPIRY FUNNEL ──────────────────────────────────────────────────────

  trialExpiry7Days: (nombreRestaurante, email, upgradeUrl) => `
    <div style="${baseStyle}">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:20px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin:0;">
          TANE <span style="font-style:italic;color:#777;">Booking</span>
        </h1>
      </div>
      <h2 style="font-size:18px;font-weight:400;margin:0 0 12px;">Tu prueba gratuita termina en 7 días</h2>
      <p style="color:#555;">Hola, quedan <strong>7 días</strong> para que finalice el periodo de prueba de <strong>${nombreRestaurante}</strong> en Tane Booking.</p>
      <p style="color:#555;">¿Qué pasa cuando termine el trial? El acceso al panel se pausará hasta que elijas un plan. <strong>Tus datos siempre se conservan</strong>.</p>
      <div style="background:#f7f7f7;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:700;">Planes disponibles:</p>
        <p style="margin:0 0 4px;font-size:13px;">· Basic — <strong>€29/mes</strong> · Hasta 10 usuarios, reservas ilimitadas</p>
        <p style="margin:0;font-size:13px;">· Pro — <strong>€59/mes</strong> · Multi-restaurante, usuarios ilimitados</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${upgradeUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;
           font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
           padding:14px 32px;border-radius:4px;">Elegir mi plan →</a>
      </div>
      ${taneFooter}
    </div>
  `,

  trialExpiry3Days: (nombreRestaurante, email, upgradeUrl) => `
    <div style="${baseStyle}">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:20px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin:0;">
          TANE <span style="font-style:italic;color:#777;">Booking</span>
        </h1>
      </div>
      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-weight:700;color:#856404;">⏱ Solo quedan 3 días de prueba en ${nombreRestaurante}</p>
      </div>
      <p style="color:#555;">Tu periodo de prueba gratuita termina el próximo <strong>miércoles</strong>. Para no perder el acceso al panel, activa tu plan ahora.</p>
      <p style="color:#555;">Hasta ahora has podido usar: reservas online, confirmaciones automáticas, mapa de sala, CRM y analytics.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${upgradeUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;
           font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
           padding:14px 32px;border-radius:4px;">Activar mi plan — desde €29/mes →</a>
      </div>
      <p style="font-size:12px;color:#888;text-align:center;">Sin permanencia · Cancela cuando quieras</p>
      ${taneFooter}
    </div>
  `,

  trialExpiry1Day: (nombreRestaurante, email, upgradeUrl) => `
    <div style="${baseStyle}">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:20px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin:0;">
          TANE <span style="font-style:italic;color:#777;">Booking</span>
        </h1>
      </div>
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-weight:700;color:#991b1b;">🔴 Tu prueba termina mañana</p>
      </div>
      <p style="color:#555;"><strong>${nombreRestaurante}</strong>, mañana finaliza tu periodo de prueba gratuita en Tane Booking.</p>
      <p style="color:#555;">Si no activas un plan, el panel quedará pausado y <strong>dejarás de recibir reservas online</strong>.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${upgradeUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;
           font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
           padding:14px 32px;border-radius:4px;">Activar plan ahora →</a>
      </div>
      <p style="font-size:12px;color:#888;text-align:center;">¿Tienes dudas? Escríbenos a <a href="mailto:admin@tanesolutions.com" style="color:#555;">admin@tanesolutions.com</a></p>
      ${taneFooter}
    </div>
  `,

  trialExpired: (nombreRestaurante, email, upgradeUrl) => `
    <div style="${baseStyle}">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="font-size:20px;font-weight:300;letter-spacing:2px;text-transform:uppercase;margin:0;">
          TANE <span style="font-style:italic;color:#777;">Booking</span>
        </h1>
      </div>
      <h2 style="font-size:18px;font-weight:400;margin:0 0 12px;">Tu periodo de prueba ha finalizado</h2>
      <p style="color:#555;">El trial de <strong>${nombreRestaurante}</strong> ha expirado. Tu panel está pausado y el formulario de reservas ya no acepta nuevas solicitudes.</p>
      <p style="color:#555;"><strong>Tus datos están seguros</strong> y se conservan durante 30 días. Activa un plan para retomar desde donde lo dejaste.</p>
      <div style="background:#f7f7f7;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:13px;">· Basic — <strong>€29/mes</strong></p>
        <p style="margin:0;font-size:13px;">· Pro — <strong>€59/mes</strong></p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${upgradeUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;
           font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
           padding:14px 32px;border-radius:4px;">Reactivar mi cuenta →</a>
      </div>
      ${taneFooter}
    </div>
  `,

  // ── REVIEW REQUEST (post-visita) ─────────────────────────────────────────────
  reviewRequest: (nombre, restaurante, googleMapsUrl) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <h2 style="font-size:20px;font-weight:400;margin:0 0 12px;">¿Qué te pareció tu visita?</h2>
      <p style="color:#555;">Hola <strong>${nombre}</strong>, esperamos que hayas disfrutado de tu visita a <strong>${restaurante.nombre}</strong>.</p>
      <p style="color:#555;">Si tu experiencia fue positiva, nos ayudaría mucho que dejaras una reseña en Google. Solo te llevará 1 minuto y ayuda a otros comensales a encontrarnos.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${googleMapsUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;
           font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
           padding:14px 32px;border-radius:4px;">⭐ Dejar reseña en Google →</a>
      </div>
      <p style="font-size:12px;color:#aaa;text-align:center;">Si algo no fue bien, responde a este email y lo solucionamos.</p>
      ${makeFooter(restaurante)}
    </div>
  `,

  // ── LISTA DE ESPERA ─────────────────────────────────────────────────────────
  waitlistConfirmation: (nombre, fecha, hora, restaurante) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <h2 style="font-size:18px;font-weight:400;margin:0 0 12px;">Estás en la lista de espera</h2>
      <p style="color:#555;">Hola <strong>${nombre}</strong>, te hemos añadido a la lista de espera para el <strong>${fecha}</strong> a las <strong>${hora}</strong> en ${restaurante.nombre}.</p>
      <p style="color:#555;">Si se libera una mesa, te avisaremos inmediatamente por email. No necesitas hacer nada más.</p>
      <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;padding:16px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#0c4a6e;">💡 Si consigues mesa en otro lugar, no hace falta que nos avises. Tu puesto se liberará automáticamente si no confirmas en 1 hora.</p>
      </div>
      ${makeFooter(restaurante)}
    </div>
  `,

  waitlistNotification: (nombre, fecha, hora, bookingUrl, restaurante) => `
    <div style="${baseStyle}">
      ${makeHeader(restaurante)}
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-weight:700;color:#166534;">🎉 ¡Se ha liberado una mesa!</p>
      </div>
      <p style="color:#555;">Hola <strong>${nombre}</strong>, ha habido una cancelación para el <strong>${fecha}</strong> a las <strong>${hora}</strong> en ${restaurante.nombre}.</p>
      <p style="color:#555;"><strong>Tienes 1 hora</strong> para confirmar tu reserva. Después, se ofrecerá al siguiente en la lista.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${bookingUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;
           font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
           padding:14px 32px;border-radius:4px;">Confirmar mi mesa →</a>
      </div>
      ${makeFooter(restaurante)}
    </div>
  `,

  // 5. RESTABLECIMIENTO DE CONTRASEÑA (staff/admin)
  restablecimientoContrasena: (email, resetLink, restaurante) => `
    <div style="${baseStyle}">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin:0;">
          TANE <span style="font-style: italic; color: #777;">Booking</span>
        </h1>
        <p style="font-size: 11px; color: #aaa; letter-spacing: 0.15em; margin-top: 4px;">PANEL DE GESTIÓN</p>
      </div>

      <h2 style="font-size: 20px; font-weight: 400; margin: 0 0 16px;">Restablece tu contraseña</h2>
      <p style="color: #555; margin: 0 0 24px;">Alguien ha solicitado el restablecimiento de contraseña para la cuenta <strong>${email}</strong> en <strong>${restaurante.nombre || 'Tane Booking'}</strong>.</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetLink}"
          style="display: inline-block; background: #000; color: #fff; text-decoration: none;
                 font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
                 padding: 14px 32px; border-radius: 4px;">
          Restablecer contraseña →
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 12px; word-break: break-all;">${resetLink}</p>
      </div>

      <p style="font-size: 12px; color: #888; background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 12px 16px; margin: 0;">
        Este enlace caduca en 1 hora. Si no solicitaste este cambio, ignora este email.
      </p>

      ${taneFooter}
    </div>
  `
};
