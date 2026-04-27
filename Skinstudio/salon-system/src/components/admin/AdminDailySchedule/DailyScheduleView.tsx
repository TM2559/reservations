import React, { useMemo } from 'react';
import { isPmuService } from '../../../utils/helpers';

export type ServiceType = 'PMU' | 'COSMETICS';

export interface Appointment {
  id: string;
  startTime: string; // ISO or HH:mm
  endTime: string;
  clientName: string;
  serviceType: ServiceType;
  details?: string;
}

export interface ShiftData {
  date: string;
  shiftStart: string; // e.g., '08:00'
  shiftEnd: string; // e.g., '16:00'
  appointments: Appointment[];
}

interface ShiftPeriod {
  start: string;
  end: string;
}

interface NormalizedShift {
  periods: ShiftPeriod[];
}

interface LiveReservation {
  id?: string;
  time?: string;
  duration?: number | string;
  name?: string;
  serviceName?: string;
  category?: string | null;
  serviceCategory?: string | null;
}

interface FreeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

interface PositionedBlock {
  top: number;
  height: number;
}

interface DailyScheduleViewProps {
  date: string;
  shift: NormalizedShift;
  reservations: LiveReservation[];
  minuteHeight?: number;
  onAppointmentClick?: (appointmentId: string) => void;
  onFreeSlotClick?: (slot: { startTime: string; endTime: string; duration: number }) => void;
}

interface TimelineGridProps {
  shiftStart: string;
  shiftEnd: string;
  minuteHeight: number;
}

interface AppointmentBlockProps {
  appointment: Appointment;
  style: React.CSSProperties;
  onClick?: (appointmentId: string) => void;
}

interface FreeSlotBlockProps {
  slot: FreeSlot;
  style: React.CSSProperties;
  onClick?: (slot: { startTime: string; endTime: string; duration: number }) => void;
}

function isValidTime(time: unknown): time is string {
  if (typeof time !== 'string') return false;
  if (time.includes('T')) return !Number.isNaN(new Date(time).getTime());
  return /^\d{1,2}:\d{2}$/.test(time);
}

function timeToMinutes(time: unknown): number {
  if (!isValidTime(time)) return 0;

  if (time.includes('T')) {
    const date = new Date(time);
    return date.getHours() * 60 + date.getMinutes();
  }

  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${minutesToTime(timeToMinutes(startTime))} - ${minutesToTime(timeToMinutes(endTime))}`;
}

function calculatePosition(
  startTime: string,
  endTime: string,
  shiftStart: string,
  minuteHeight: number
): PositionedBlock {
  const shiftStartMinutes = timeToMinutes(shiftStart);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return {
    top: Math.max(0, (startMinutes - shiftStartMinutes) * minuteHeight),
    height: Math.max((endMinutes - startMinutes) * minuteHeight, 24),
  };
}

function getValidPeriods(shift: NormalizedShift): ShiftPeriod[] {
  return (Array.isArray(shift?.periods) ? shift.periods : [])
    .filter((period) => isValidTime(period?.start) && isValidTime(period?.end))
    .filter((period) => timeToMinutes(period.end) > timeToMinutes(period.start));
}

function getShiftBounds(periods: ShiftPeriod[]): Pick<ShiftData, 'shiftStart' | 'shiftEnd'> {
  const sortedPeriods = [...periods].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  return {
    shiftStart: sortedPeriods[0]?.start ?? '08:00',
    shiftEnd: sortedPeriods[sortedPeriods.length - 1]?.end ?? '18:00',
  };
}

function getReservationEndTime(reservation: LiveReservation): string {
  const start = timeToMinutes(reservation.time ?? '00:00');
  const duration = Number(reservation.duration);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 60;
  return minutesToTime(start + safeDuration);
}

function overlapsPeriod(startTime: string, endTime: string, period: ShiftPeriod): boolean {
  if (!isValidTime(startTime) || !isValidTime(endTime) || !isValidTime(period.start) || !isValidTime(period.end)) {
    return false;
  }

  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return start < timeToMinutes(period.end) && end > timeToMinutes(period.start);
}

function getServiceType(reservation: LiveReservation): ServiceType {
  const explicitCategory = reservation.serviceCategory ?? reservation.category;
  if (explicitCategory && String(explicitCategory).toUpperCase() === 'PMU') return 'PMU';
  if (isPmuService({ name: reservation.serviceName, category: explicitCategory })) return 'PMU';
  return 'COSMETICS';
}

function toShiftData(date: string, shift: NormalizedShift, reservations: LiveReservation[]): ShiftData {
  const periods = getValidPeriods(shift);
  const { shiftStart, shiftEnd } = getShiftBounds(periods);

  return {
    date,
    shiftStart,
    shiftEnd,
    appointments: (Array.isArray(reservations) ? reservations : [])
      .filter((reservation): reservation is LiveReservation & { time: string } => isValidTime(reservation?.time))
      .filter((reservation) => {
        const endTime = getReservationEndTime(reservation);
        return periods.some((period) => overlapsPeriod(reservation.time, endTime, period));
      })
      .map((reservation, index) => ({
        id: reservation.id ?? `${reservation.time}-${index}`,
        startTime: reservation.time,
        endTime: getReservationEndTime(reservation),
        clientName: reservation.name ?? 'Bez jmena',
        serviceType: getServiceType(reservation),
        details: reservation.serviceName,
      })),
  };
}

function calculateFreeSlots(shiftData: ShiftData, periods: ShiftPeriod[]): FreeSlot[] {
  const sortedAppointments = [...shiftData.appointments]
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const slots: FreeSlot[] = [];

  [...periods]
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
    .forEach((period) => {
      const periodStart = timeToMinutes(period.start);
      const periodEnd = timeToMinutes(period.end);
      let cursor = periodStart;

      sortedAppointments
        .filter((appointment) => overlapsPeriod(appointment.startTime, appointment.endTime, period))
        .forEach((appointment) => {
          const appointmentStart = Math.max(timeToMinutes(appointment.startTime), periodStart);
          const appointmentEnd = Math.min(timeToMinutes(appointment.endTime), periodEnd);

          if (appointmentStart > cursor) {
            slots.push({
              id: `free-${cursor}-${appointmentStart}`,
              startTime: minutesToTime(cursor),
              endTime: minutesToTime(appointmentStart),
            });
          }

          cursor = Math.max(cursor, appointmentEnd);
        });

      if (cursor < periodEnd) {
        slots.push({
          id: `free-${cursor}-${periodEnd}`,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(periodEnd),
        });
      }
    });

  return slots;
}

function getHourMarks(shiftStart: string, shiftEnd: string): number[] {
  const start = timeToMinutes(shiftStart);
  const end = timeToMinutes(shiftEnd);
  const firstHour = Math.ceil(start / 60) * 60;
  const marks: number[] = [];

  for (let minute = firstHour; minute <= end; minute += 60) {
    marks.push(minute);
  }

  return marks;
}

export function TimelineGrid({ shiftStart, shiftEnd, minuteHeight }: TimelineGridProps) {
  const shiftStartMinutes = timeToMinutes(shiftStart);
  const shiftEndMinutes = timeToMinutes(shiftEnd);
  const totalHeight = (shiftEndMinutes - shiftStartMinutes) * minuteHeight;
  const hourMarks = getHourMarks(shiftStart, shiftEnd);

  return (
    <div className="relative" style={{ height: totalHeight }}>
      {hourMarks.map((minute) => {
        const top = (minute - shiftStartMinutes) * minuteHeight;

        return (
          <div key={minute} className="absolute left-0 right-0" style={{ top }}>
            <div className="flex">
              <div className="w-16 pr-3 text-right text-xs text-slate-500">
                {minutesToTime(minute)}
              </div>
              <div className="flex-1 border-t border-slate-100" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AppointmentBlock({ appointment, style, onClick }: AppointmentBlockProps) {
  const serviceLabel = appointment.serviceType === 'PMU' ? 'PMU' : 'Kosmetika';
  const serviceClass =
    appointment.serviceType === 'PMU'
      ? 'bg-slate-50 border-l-4 border-slate-800 rounded-r-md p-3'
      : 'bg-slate-50 border-l-4 border-slate-400 rounded-r-md p-3';

  return (
    <button
      type="button"
      className={`absolute left-16 right-0 text-left overflow-hidden ${serviceClass}`}
      style={style}
      onClick={() => onClick?.(appointment.id)}
      aria-label={`${appointment.clientName}, ${serviceLabel}, ${formatTimeRange(
        appointment.startTime,
        appointment.endTime
      )}`}
    >
      <div className="text-sm font-medium text-slate-900">{appointment.clientName}</div>
      <div className="mt-1 text-xs text-slate-500">{serviceLabel}</div>
      <div className="text-xs text-slate-500">
        {formatTimeRange(appointment.startTime, appointment.endTime)}
      </div>
    </button>
  );
}

export function FreeSlotBlock({ slot, style, onClick }: FreeSlotBlockProps) {
  const duration = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);

  return (
    <button
      type="button"
      className="group absolute left-16 right-0 bg-transparent border border-dashed border-slate-200 rounded-md flex items-center justify-center hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150 ease-in-out cursor-pointer"
      style={style}
      onClick={() => onClick?.({ startTime: slot.startTime, endTime: slot.endTime, duration })}
      aria-label={`Pridat rezervaci ${slot.startTime} - ${slot.endTime}`}
    >
      <span className="text-sm font-medium text-slate-600 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity duration-150">
        + Pridat rezervaci {slot.startTime} - {slot.endTime}
      </span>
    </button>
  );
}

export default function DailyScheduleView({
  date,
  shift,
  reservations,
  minuteHeight = 2,
  onAppointmentClick,
  onFreeSlotClick,
}: DailyScheduleViewProps) {
  const shiftData = useMemo(
    () => toShiftData(date, shift, reservations),
    [date, shift, reservations]
  );
  const periods = useMemo(() => getValidPeriods(shift), [shift]);
  const shiftStartMinutes = timeToMinutes(shiftData.shiftStart);
  const shiftEndMinutes = timeToMinutes(shiftData.shiftEnd);
  const totalHeight = (shiftEndMinutes - shiftStartMinutes) * minuteHeight;
  const freeSlots = useMemo(() => calculateFreeSlots(shiftData, periods), [shiftData, periods]);

  if (periods.length === 0 || totalHeight <= 0) return null;

  return (
    <section className="w-full max-w-3xl" aria-label="Denni nahled smen">
      <div className="mb-4">
        <p className="text-xs text-slate-500">{shiftData.date}</p>
        <h2 className="text-sm font-medium text-slate-900">
          Denni smena {shiftData.shiftStart} - {shiftData.shiftEnd}
        </h2>
      </div>

      <div className="relative" style={{ height: totalHeight }}>
        <TimelineGrid
          shiftStart={shiftData.shiftStart}
          shiftEnd={shiftData.shiftEnd}
          minuteHeight={minuteHeight}
        />

        {freeSlots.map((slot) => (
          <FreeSlotBlock
            key={slot.id}
            slot={slot}
            style={calculatePosition(slot.startTime, slot.endTime, shiftData.shiftStart, minuteHeight)}
            onClick={onFreeSlotClick}
          />
        ))}

        {shiftData.appointments.map((appointment) => (
          <AppointmentBlock
            key={appointment.id}
            appointment={appointment}
            style={calculatePosition(
              appointment.startTime,
              appointment.endTime,
              shiftData.shiftStart,
              minuteHeight
            )}
            onClick={onAppointmentClick}
          />
        ))}
      </div>
    </section>
  );
}
