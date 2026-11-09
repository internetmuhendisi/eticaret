// Bölüm kodunda JSX özelliğine yazılmış görsel adresi.
import { Gorsel } from "./gorsel";

export function Bolum({ ad }: { ad: string }) {
  return <Gorsel src="https://cdn.ornek.test/kupa.webp" alt={ad} />;
}
