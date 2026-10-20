import { activityPeriod, preferredPushPeriod, pushScheduleLabel } from './schedule';
const today = new Date('2026-10-20T12:00:00Z');
const activity=(date,period,registrations)=>({activity_date:date,period,registrations});
test('prioriza manhã quando há hábito matinal e cadastro isolado à tarde',()=>{
 expect(preferredPushPeriod([
  activity('2026-10-16','morning',9),activity('2026-10-17','morning',8),activity('2026-10-19','afternoon',1)
 ],'auto',today)).toBe('morning');
 expect(pushScheduleLabel('morning')).toBe('7h');
});
test('turno da tarde só domina quando cadastro à tarde é mais constante',()=>{
 expect(preferredPushPeriod([
  activity('2026-10-17','afternoon',3),activity('2026-10-18','afternoon',4),activity('2026-10-19','morning',1)
 ],'auto',today)).toBe('afternoon');
 expect(pushScheduleLabel('afternoon')).toBe('13h');
});
test('limite de cinco cadastros por dia impede pico artificial',()=>{
 expect(preferredPushPeriod([
  activity('2026-10-18','afternoon',500),activity('2026-10-15','morning',4),activity('2026-10-16','morning',3)
 ],'auto',today)).toBe('morning');
});
test('descarta histórico antigo e empate favorece 7 horas',()=>{
 expect(preferredPushPeriod([activity('2026-06-01','afternoon',500)],'auto',today)).toBe('morning');
 expect(preferredPushPeriod([],'auto',today)).toBe('morning');
});
test('preferência manual e períodos definidos',()=>{
 expect(preferredPushPeriod([activity('2026-10-19','afternoon',9)],'morning',today)).toBe('morning');
 expect(activityPeriod(7)).toBe('morning');
 expect(activityPeriod(13)).toBe('afternoon');
 expect(activityPeriod(22)).toBeNull();
});
