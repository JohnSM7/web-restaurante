/**
 * TANE Reservation Utils
 * Shared logic for slot availability + best-fit table assignment.
 * Used by BookingForm.vue (frontend) and AdminTable.vue (admin panel).
 *
 * Algorithm based on OpenTable / Resy standards:
 *  - Turn time varies by party size (60-120 min)
 *  - 15-min buffer between seatings for table reset
 *  - Best-fit: smallest table that fits the party (minimize waste)
 *  - Blocks both 'confirmada' and 'pendiente' reservations to prevent double-booking
 */

// ─── Turn times (minutes) by party size ──────────────
// Source: industry standard (OpenTable, Resy, SevenRooms)
export const getTurnTime = (pax: number): number => {
  if (pax <= 2) return 60;   // couples / solo
  if (pax <= 4) return 75;   // small groups
  if (pax <= 6) return 90;   // medium groups
  return 120;                 // large groups (7+)
};

/** Buffer in minutes between consecutive seatings (table reset / cleaning) */
export const BUFFER_MIN = 15;

/** Convert "HH:MM" string to total minutes from midnight */
export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// ─── Types ───────────────────────────────────────────
export interface Mesa {
  id: string;
  pax_max: number;
  nombre: string;
  estado?: string;
  restaurant_id?: string;
}

export interface Reserva {
  id?: string;
  mesa_id?: string | null;
  hora: string;
  comensales: number;
  estado: string;
  restaurant_id?: string;
}

// ─── Core assignment algorithm ────────────────────────
/**
 * Find the best available table for a booking request.
 *
 * Strategy (matches OpenTable "Smart Assign"):
 *  1. Filter tables by minimum capacity (pax_max >= pax)
 *  2. Sort by capacity ascending (smallest fit first = minimize waste)
 *  3. For each candidate, check if it overlaps with any active booking
 *     during the window [start, start + turnTime + buffer]
 *  4. Return first candidate with no conflicts, or null if none available
 *
 * @param tables         - All mesas for the restaurant
 * @param pax            - Party size to seat
 * @param hora           - Requested time slot ("HH:MM")
 * @param reservations   - Existing reservations for that day
 * @returns Best Mesa or null
 */
export const findBestTable = (
  tables: Mesa[],
  pax: number,
  hora: string,
  reservations: Reserva[]
): Mesa | null => {
  const myStart = timeToMinutes(hora);
  const myEnd   = myStart + getTurnTime(pax) + BUFFER_MIN;

  // Step 1+2: eligible tables sorted by size (best fit first)
  const eligible = tables
    .filter(m => m.pax_max >= pax)
    .sort((a, b) => a.pax_max - b.pax_max);

  if (eligible.length === 0) return null;

  // Step 3: find tables occupied during our window
  // Include both 'confirmada' AND 'pendiente' to prevent double-booking
  const takenIds = new Set<string>(
    reservations
      .filter(r => ['confirmada', 'pendiente'].includes(r.estado) && r.mesa_id)
      .filter(r => {
        const resStart = timeToMinutes(r.hora);
        const resEnd   = resStart + getTurnTime(r.comensales) + BUFFER_MIN;
        // Intervals overlap if: myStart < resEnd AND myEnd > resStart
        return myStart < resEnd && myEnd > resStart;
      })
      .map(r => r.mesa_id as string)
  );

  // Step 4: return first eligible table not in takenIds
  return eligible.find(m => !takenIds.has(m.id)) ?? null;
};

/**
 * Count available tables for a given slot (used for "X mesas disponibles" display)
 */
export const countAvailableTables = (
  tables: Mesa[],
  pax: number,
  hora: string,
  reservations: Reserva[]
): number => {
  const myStart = timeToMinutes(hora);
  const myEnd   = myStart + getTurnTime(pax) + BUFFER_MIN;

  const eligible = tables.filter(m => m.pax_max >= pax);

  const takenIds = new Set<string>(
    reservations
      .filter(r => ['confirmada', 'pendiente'].includes(r.estado) && r.mesa_id)
      .filter(r => {
        const resStart = timeToMinutes(r.hora);
        const resEnd   = resStart + getTurnTime(r.comensales) + BUFFER_MIN;
        return myStart < resEnd && myEnd > resStart;
      })
      .map(r => r.mesa_id as string)
  );

  return eligible.filter(m => !takenIds.has(m.id)).length;
};
