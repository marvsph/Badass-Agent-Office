// A decorative routine only. This actor never becomes an observed session.
// The seat anchor is the hidden foot position under the desktop. Keeping the
// same anchor for a standing actor prevents his head from jumping on departure.
const seat = { x: 890, y: 530 };
const deskApproach = [seat, {x:890,y:410}, {x:1020,y:410}, {x:1020,y:270}, {x:1050,y:250}];
const walk = (progress, points) => {
  const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
  const distance = progress * lengths.reduce((sum, value) => sum + value, 0);
  let remaining = distance;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const a = points[i], b = points[i + 1], t = lengths[i] ? remaining / lengths[i] : 1;
      return { mode: 'walking', activity: 'Making the rounds', x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, direction: Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?b.x>a.x?'right':'left':b.y>a.y?'front':'back', distance };
    }
    remaining -= lengths[i];
  }
};

export function bossAnimation(time = 0, reduced = false) {
  const t = reduced ? 0 : Math.max(0, time) % 110000;
  if (t < 28000) return { ...seat, mode: 'seated', activity: t < 18000 ? 'Writing reports' : 'Reading reports', frame: t < 18000 ? 3 : 6 };
  if (t < 34000) return walk((t-28000)/6000, deskApproach);
  if (t < 46000) return { mode: 'standing', activity: 'Cigar break', cigar: true, x: 1050, y: 250, direction: 'front' };
  if (t < 58000) return walk((t-46000)/12000, [{x:1050,y:250},{x:400,y:250}]);
  if (t < 66000) return { mode: 'standing', activity: 'At the reference shelf', x:400, y:250, direction:'front' };
  if (t < 80000) return walk((t-66000)/14000, [{x:400,y:250},{x:450,y:270},{x:450,y:780},{x:650,y:780}]);
  if (t < 87000) return { mode: 'standing', activity: 'Surveying the office', x:650, y:780, direction:'front' };
  return walk((t-87000)/23000, [{x:650,y:780},{x:450,y:780},{x:450,y:270},{x:1020,y:270},{x:1020,y:410},{x:890,y:410},seat]);
}
