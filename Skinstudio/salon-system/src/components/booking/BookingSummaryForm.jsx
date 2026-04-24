import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Utils } from '../../utils/helpers';
import { BookingLegalText } from './BookingLegalText';

function calculateReservationTotal(service, upsells) {
  const base = service?.isStartingPrice ? 0 : (service?.price ?? 0);
  const overrides = (upsells || []).filter((u) => u.price_behavior === 'REPLACE');
  const additions = (upsells || []).filter((u) => u.price_behavior !== 'REPLACE');
  let total = overrides.length > 0 ? (overrides[overrides.length - 1].price ?? 0) : base;
  additions.forEach((u) => { total += (u.price ?? 0); });
  return total;
}

export { calculateReservationTotal };

export default function BookingSummaryForm({
  selectedService,
  selectedUpsells,
  selectedTime,
  activeDateStr,
  isDark,
  formData,
  setFormData,
  isSending,
  onSubmit,
  onOpenPrivacyModal,
}) {
  const valueClass = (bold = true) => `min-w-0 flex-1 text-right break-words pl-1 sm:pl-2 ${bold ? (isDark ? 'font-bold text-stone-100' : 'font-bold text-stone-900') : (isDark ? 'text-stone-300' : 'text-stone-800')}`;
  const priceCellClass = isDark ? 'font-bold text-stone-100' : 'font-bold text-stone-900';

  return (
    <div className={`w-full min-w-0 max-w-full p-4 sm:p-8 rounded-2xl border shadow-lg h-fit lg:sticky lg:top-4 ${isDark ? 'bg-stone-950 border-stone-800' : 'border-stone-100 bg-white'}`}>
      <h2 className={`text-lg font-display font-semibold mb-6 border-b pb-4 ${isDark ? 'text-[#daa59c] border-stone-800' : 'text-stone-800 border-stone-100'}`}>
        <Sparkles className={`inline-block mr-2 ${isDark ? 'text-[#daa59c]' : 'text-stone-400'}`} size={16} /> Rezervace
      </h2>

      <form onSubmit={onSubmit} className={`min-w-0 max-w-full space-y-4 ${!selectedTime ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className={`text-xs space-y-1 mb-4 border-b pb-4 font-medium min-w-0 max-w-full ${isDark ? 'border-stone-800 text-stone-400' : 'border-stone-100 text-stone-600'}`}>
          <div className="flex min-w-0 max-w-full gap-2 sm:gap-3">
            <span className="shrink-0">Služba:</span>
            <span className={valueClass(true)}>{selectedService?.name || '-'}</span>
          </div>
          <div className="flex min-w-0 max-w-full gap-2 sm:gap-3">
            <span className="shrink-0">Cena:</span>
            <span className={valueClass(true)}>{selectedService?.isStartingPrice ? '—' : (selectedService?.price != null ? `${selectedService.price} Kč` : '—')}</span>
          </div>
          {selectedUpsells.length > 0 && (
            <>
              {selectedUpsells.map((u) => (
                <div key={u.id} className="flex min-w-0 max-w-full gap-2 sm:gap-3 items-start">
                  <span className="min-w-0 flex-1 break-words pr-1">+ {u.name}:</span>
                  <span className={`shrink-0 tabular-nums text-right ${priceCellClass}`}>{u.price} Kč</span>
                </div>
              ))}
              <div className="flex min-w-0 max-w-full gap-2 sm:gap-3 font-medium items-start">
                <span className="min-w-0 flex-1 break-words pr-1">Celkem{selectedUpsells.some(ups => ups.price_behavior === 'REPLACE') ? '' : ' (+ doplňky)'}:</span>
                <span className={`shrink-0 tabular-nums text-right font-bold ${priceCellClass}`}>
                  {calculateReservationTotal(selectedService, selectedUpsells)} Kč
                </span>
              </div>
            </>
          )}
          <div className="flex min-w-0 max-w-full gap-2 sm:gap-3">
            <span className="shrink-0">Termín:</span>
            <span className={valueClass(true)}>{Utils.formatDateDisplay(activeDateStr)} v {selectedTime || '-'}</span>
          </div>
        </div>

        <input
          required
          type="text"
          placeholder="Vaše jméno"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className={`w-full min-w-0 max-w-full box-border p-3 rounded-lg border text-sm font-medium ${isDark ? 'bg-stone-900 border-stone-800 text-stone-200 placeholder-stone-500 focus:ring-[#daa59c]/50 focus:border-[#daa59c]' : 'input-focus border-stone-200 bg-white'}`}
        />
        <input
          required
          type="tel"
          placeholder="Telefon"
          value={formData.phone}
          onChange={e => setFormData({ ...formData, phone: e.target.value })}
          className={`w-full min-w-0 max-w-full box-border p-3 rounded-lg border text-sm font-medium ${isDark ? 'bg-stone-900 border-stone-800 text-stone-200 placeholder-stone-500 focus:ring-[#daa59c]/50 focus:border-[#daa59c]' : 'input-focus border-stone-200 bg-white'}`}
        />
        <input
          required
          type="email"
          placeholder="E-mail pro potvrzení"
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
          className={`w-full min-w-0 max-w-full box-border p-3 rounded-lg border text-sm font-medium ${isDark ? 'bg-stone-900 border-stone-800 text-stone-200 placeholder-stone-500 focus:ring-[#daa59c]/50 focus:border-[#daa59c]' : 'input-focus border-stone-200 bg-white'}`}
        />

        <button
          type="submit"
          disabled={isSending}
          className={`w-full py-4 rounded-full font-sans font-semibold text-xs uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${isDark ? 'bg-gradient-to-b from-[#B37E76] via-[#D49A91] to-[#B37E76] hover:brightness-95 border border-[#D49A91]/20 shadow-[0_4px_20px_rgba(179,126,118,0.3)] hover:shadow-[0_6px_25px_rgba(179,126,118,0.45)]' : 'bg-gradient-to-b from-[#dec89a] to-[#b08d55] hover:brightness-95 border-t border-white/25 shadow-[0_4px_20px_rgba(197,165,114,0.3)] hover:shadow-[0_6px_25px_rgba(197,165,114,0.5)]'}`}
        >
          {isSending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Odesílám...
            </span>
          ) : (
            'Potvrdit termín'
          )}
        </button>
        {onOpenPrivacyModal && (
          <BookingLegalText onOpenPrivacyModal={onOpenPrivacyModal} isDark={isDark} />
        )}
      </form>
    </div>
  );
}
