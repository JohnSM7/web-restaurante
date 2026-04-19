/**
 * Tane Booking — Reservation Utils (CommonJS)
 * Port of src/lib/reservationUtils.ts for use in Cloud Functions.
 */

const getTurnTime = (pax) => {
  if (pax <= 2) return 60;
  if (pax <= 4) return 75;
  if (pax <= 6) return 90;
  return 120;
};

const BUFFER_MIN = 15;

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Best-fit table assignment (mirrors frontend logic).
 * Finds the smallest available table for the requested slot.
 */
const findBestTable = (tables, pax, hora, reservations) => {
  const myStart = timeToMinutes(hora);
  const myEnd   = myStart + getTurnTime(pax) + BUFFER_MIN;

  const eligible = tables
    .filter(m => m.pax_max >= pax)
    .sort((a, b) => a.pax_max - b.pax_max);

  if (eligible.length === 0) return null;

  const takenIds = new Set(
    reservations
      .filter(r => ['confirmada', 'pendiente'].includes(r.estado) && r.mesa_id)
      .filter(r => {
        const resStart = timeToMinutes(r.hora);
        const resEnd   = resStart + getTurnTime(r.comensales) + BUFFER_MIN;
        return myStart < resEnd && myEnd > resStart;
      })
      .map(r => r.mesa_id)
  );

  return eligible.find(m => !takenIds.has(m.id)) ?? null;
};

module.exports = { getTurnTime, BUFFER_MIN, timeToMinutes, findBestTable };
