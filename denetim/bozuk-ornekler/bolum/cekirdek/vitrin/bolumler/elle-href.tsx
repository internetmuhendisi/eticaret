// Bölüm kodunda JSX özelliğine yazılmış bağlantı.
import { Baglanti } from "./baglanti";

export function Bolum({ ad }: { ad: string }) {
  return <Baglanti href="/kategori/seramik-kupa">{ad}</Baglanti>;
}
