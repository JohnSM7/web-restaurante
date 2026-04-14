const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { Resend } = require("resend");
const templates = require("./templates");

// process.env.RESEND_API_KEY
const resend = new Resend(process.env.RESEND_API_KEY || "re_your_test_key");

exports.onReservaCreate = onDocumentCreated("reservas/{reservaId}", async (event) => {
  const data = event.data.data();
  if (!data || !data.email) return;

  // COMENTADO PARA AHORRAR CUOTA DE RESEND - ACTIVAR SOLO SI ES NECESARIO
  /*
  const { nombre_cliente, email, fecha, hora, comensales } = data;
  const dateObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
  const dateStr = dateObj.toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' });

  try {
    await resend.emails.send({
      from: "Tane Booking <reservas@tanesolutions.com>",
      to: [email],
      subject: `¡Mesa solicitada para el ${dateStr}!`,
      html: templates.solicitudRecibida(nombre_cliente, dateStr, hora, comensales)
    });
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
  */
});

exports.onReservaUpdate = onDocumentUpdated("reservas/{reservaId}", async (event) => {
  const dataBefore = event.data.before.data();
  const dataAfter = event.data.after.data();

  // Si el estado no ha cambiado, no hacemos nada
  if (dataBefore.estado === dataAfter.estado) return;

  const { nombre_cliente, email, fecha, hora } = dataAfter;
  const dateObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
  const dateStr = dateObj.toLocaleDateString("es-ES", { day: '2-digit', month: 'short', year: 'numeric' });

  let subject = "";
  let html = "";

  if (dataAfter.estado === "confirmada") {
    const cancelLink = `https://tane-restaurante-app.web.app/cancel?id=${event.params.reservaId}`;
    subject = "¡Tu mesa está confirmada!";
    html = templates.reservaConfirmada(nombre_cliente, dateStr, hora, cancelLink);
  } else if (dataAfter.estado === "cancelada" || dataAfter.estado === "no-show") {
    subject = "Actualización de tu reserva";
    html = templates.reservaCancelada(nombre_cliente, dateStr, hora);
  } else {
    return;
  }

  try {
    await resend.emails.send({
      from: "Tane Booking <reservas@tanesolutions.com>",
      to: [email],
      subject: subject,
      html: html
    });
  } catch (error) {
    console.error("Error sending update email:", error);
  }
});
