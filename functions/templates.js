/**
 * Plantillas de Email para Tane Booking
 */

const style = `
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #f0f0f0;
`;

const header = `
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">Tane <span style="font-style: italic; color: #777;">Restaurante</span></h1>
  </div>
`;

const footer = `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
    <p>Calle Ficticia 123, Barrio de Salamanca, Madrid</p>
    <p>Si tienes alguna duda, responde a este email o llámanos al +34 912 345 678</p>
  </div>
`;

module.exports = {
  // 1. SOLICITUD RECIBIDA (Pendiente)
  solicitudRecibida: (nombre, fecha, hora, pax) => `
    <div style="${style}">
      ${header}
      <h2>Hola ${nombre},</h2>
      <p>Hemos recibido tu solicitud de reserva. Estamos revisando nuestra disponibilidad y te confirmaremos en un momento.</p>
      <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Hora:</strong> ${hora}</p>
        <p><strong>Comensales:</strong> ${pax} personas</p>
      </div>
      <p>Este email es solo un acuse de recibo, <strong>espera a que confirmemos tu mesa</strong> antes de acudir al restaurante.</p>
      ${footer}
    </div>
  `,

  // 2. RESERVA CONFIRMADA
  reservaConfirmada: (nombre, fecha, hora, cancelLink) => `
    <div style="${style}">
      ${header}
      <h2 style="color: #2e7d32;">¡Tu mesa está confirmada!</h2>
      <p>Hola ${nombre}, nos alegra confirmarte que te esperamos en Tane Restaurante.</p>
      <div style="background: #e8f5e9; padding: 20px; margin: 20px 0; border-left: 4px solid #2e7d32;">
        <p><strong>${fecha} a las ${hora}</strong></p>
      </div>
      <p>Por favor, si vas a llegar más de 15 minutos tarde, llámanos para que podamos mantener tu mesa.</p>
      <div style="margin-top: 30px; text-align: center;">
        <p style="font-size: 12px; color: #777; margin-bottom: 10px;">¿Necesitas hacer cambios?</p>
        <a href="${cancelLink}" style="display: inline-block; padding: 10px 20px; background: #f5f5f5; color: #1a1a1a; text-decoration: none; font-size: 12px; border-radius: 4px; border: 1px solid #ddd;">Cancelar mi reserva</a>
      </div>
      ${footer}
    </div>
  `,

  // 3. RESERVA CANCELADA
  reservaCancelada: (nombre, fecha, hora) => `
    <div style="${style}">
      ${header}
      <h2 style="color: #c62828;">Reserva Cancelada</h2>
      <p>Hola ${nombre}, sentimos comunicarte que tu reserva para el ${fecha} a las ${hora} ha sido cancelada.</p>
      <p>Si crees que esto es un error o quieres reagendar, no dudes en contactarnos directamente.</p>
      ${footer}
    </div>
  `,

  // 4. RECORDATORIO (24h antes)
  recordatorio: (nombre, fecha, hora) => `
    <div style="${style}">
      ${header}
      <h2>Falta muy poco...</h2>
      <p>Hola ${nombre}, este es un recordatorio de tu reserva para mañana en Tane.</p>
      <div style="background: #fff8e1; padding: 20px; margin: 20px 0;">
        <p><strong>Mañana, ${fecha} a las ${hora}</strong></p>
      </div>
      <p>Si no puedes asistir, por fabor avísanos respondiendo a este email para que otra persona pueda disfrutar de la mesa.</p>
      ${footer}
    </div>
  `
};
