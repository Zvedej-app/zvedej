import { CLUBS } from '../data/clubs';

const byId = new Map(CLUBS.map((c) => [c.id, c]));

export function getClub(id: number | null | undefined) {
  return id ? (byId.get(id) ?? null) : null;
}

export function clubName(id: number | null | undefined) {
  return getClub(id)?.name ?? null;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function searchClubs(q: string) {
  const nq = norm(q.trim());
  if (!nq) return CLUBS;
  return CLUBS.filter((c) => norm(`${c.name} ${c.city}`).includes(nq));
}
