// Identifica o turno habitual de cadastro (não o turno de um lote isolado).
// Cada dia contribui no máximo com 5 cadastros por turno nos últimos 30 dias.
export function activityPeriod(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return null;
}

export function preferredPushPeriod(activity = [], override = 'auto', today = new Date()) {
  if (override === 'morning' || override === 'afternoon') return override;
  const floor = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const scores = { morning: 0, afternoon: 0 };
  for (const event of activity) {
    if (event.activity_date >= floor && event.period in scores) {
      scores[event.period] += Math.min(Math.max(0, Number(event.registrations) || 0), 5);
    }
  }
  // Empate ou histórico insuficiente: 7h (nunca um último cadastro isolado).
  return scores.afternoon > scores.morning ? 'afternoon' : 'morning';
}
export function pushScheduleLabel(period) {
  return period === 'afternoon' ? '13h' : '7h';
}
