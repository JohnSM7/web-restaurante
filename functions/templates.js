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
  // 0. BIENVENIDA USUARIO (admin/staff)
  bienvenidaUsuario: (email, password, adminUrl, restaurante, role) => `
    <div style="${baseStyle}">
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase; margin:0;">
          TANE <span style="font-style: italic; color: #777;">Booking</span>
        </h1>
        <p style="font-size: 11px; color: #aaa; letter-spacing: 0.15em; margin-top: 4px;">PANEL DE GESTIÓN</p>
      </div>

      <h2 style="font-size: 20px; font-weight: 400; margin: 0 0 8px;">Bienvenido al panel de ${restaurante.nombre || 'tu restaurante'}</h2>
      <p style="color: #555; margin: 0 0 28px;">Se ha creado tu cuenta de acceso con el rol <strong>${role}</strong>. Aquí tienes todo lo que necesitas para empezar:</p>

      <div style="background: #f7f7f7; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
        <p style="margin: 0 0 12px; font-size: 13px;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 0 0 12px; font-size: 13px;"><strong>Contraseña temporal:</strong>
          <code style="background:#eee; padding: 3px 8px; border-radius: 4px; font-size: 13px; letter-spacing: 0.05em;">${password}</code>
        </p>
        <p style="margin: 0; font-size: 13px;"><strong>Restaurante:</strong> ${restaurante.nombre || '—'}</p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${adminUrl}"
          style="display: inline-block; background: #000; color: #fff; text-decoration: none;
                 font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
                 padding: 14px 32px; border-radius: 4px;">
          Acceder al panel →
        </a>
        <p style="font-size: 11px; color: #aaa; margin-top: 12px;">${adminUrl}</p>
      </div>

      <p style="font-size: 12px; color: #888; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; margin: 0;">
        ⚠️ Por seguridad, cambia tu contraseña en el primer acceso. Esta contraseña es temporal y solo debe usarse una vez.
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
