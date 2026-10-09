export function seatsLabel(seatsLeft: number): string {
  if (seatsLeft <= 0) return "No seats left";
  return seatsLeft === 1 ? "1 seat left" : `${seatsLeft} seats left`;
}