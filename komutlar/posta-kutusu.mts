// Yerel posta kutusunun (Mailpit) aranması (kart 0323). Yerel ortam denemesinin bütün e-posta ölçümleri bunu
// kullanır:
// - Kutunun hata cevabı (HTTP hatası, JSON olmayan gövde, ileti listesi olmayan cevap, bağlantı hatası, süre
//   aşımı) "ileti yok" sayılmaz; nedeni metin olarak döner. Eskiden hata cevabı "0 e-posta" diye okunuyordu ve
//   "göndermiyor" ölçümünü yanlışlıkla geçirebilirdi.
// - Bulunması beklenen ileti süre dolana kadar yeniden aranır; yokluğu ölçen yol tek arama yapar (postaKutusunuSor).

export type PostaIletisi = { ID: string; Subject?: string; From?: { Address?: string } };
export type PostaCevabi = { iletiler: PostaIletisi[] } | { hata: string };
type Sorucu = (adres: string, sinyal: AbortSignal) => Promise<Response>;

export const postaIstegiSuresiMs = 10_000;
export const postaBeklemeSuresiMs = 30_000;
export const postaAramaAraligiMs = 1000;

const hataMetni = (hata: unknown): string => (hata instanceof Error ? hata.message : String(hata));

// Mailpit'in arama cevabı: { messages: [...] }. Hata cevabının ilk 200 harfi nedene yazılır.
export const postaKutusunuSor = async (
  kutu: string,
  alici: string,
  sor: Sorucu = (adres, sinyal) => fetch(adres, { signal: sinyal }),
  istekSuresiMs = postaIstegiSuresiMs,
): Promise<PostaCevabi> => {
  let govde: string;
  try {
    const sinyal = AbortSignal.timeout(istekSuresiMs);
    const yanit = await sor(
      `${kutu}/api/v1/search?query=${encodeURIComponent(`to:"${alici}"`)}`,
      sinyal,
    );
    govde = await yanit.text();
    if (!yanit.ok) return { hata: `HTTP ${yanit.status}: ${govde.slice(0, 200)}` };
  } catch (hata) {
    return { hata: `bağlantı: ${hataMetni(hata)}` };
  }
  let veri: unknown;
  try {
    veri = JSON.parse(govde);
  } catch {
    return { hata: `JSON değil: ${govde.slice(0, 200)}` };
  }
  const iletiler = (veri as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(iletiler)) return { hata: `ileti listesi yok: ${govde.slice(0, 200)}` };
  return { iletiler: iletiler as PostaIletisi[] };
};

// Koşul sağlanana ya da süre dolana kadar arar. Koşul sağlanınca bir aralık sonra bir kez daha sorulur ve o
// cevap döner: ilk iletinin arkasından gelen kopya da sayılır ("tam 1 e-posta" ölçümü). Koşulun kendi hatası
// (ör. iletinin metni okunamadı) koşul sağlanmadı sayılır. Koşul hiç sağlanmadıysa `sonHata` görülen son hatayı
// taşır (ölçümün ayrıntısına yazılır).
export const postaKutusunuBekle = async (
  kutu: string,
  alici: string,
  {
    tamam = (iletiler) => iletiler.length > 0,
    sureMs = postaBeklemeSuresiMs,
    aralikMs = postaAramaAraligiMs,
    sor,
    istekSuresiMs,
  }: {
    tamam?: (iletiler: PostaIletisi[]) => boolean | Promise<boolean>;
    sureMs?: number;
    aralikMs?: number;
    sor?: Sorucu;
    istekSuresiMs?: number;
  } = {},
): Promise<{ iletiler: PostaIletisi[]; tamam: boolean; sonHata?: string }> => {
  const bitis = Date.now() + sureMs;
  const bekle = () => new Promise((coz) => setTimeout(coz, aralikMs));
  let iletiler: PostaIletisi[] = [];
  let sonHata: string | undefined;
  const dene = async (): Promise<boolean> => {
    const cevap = await postaKutusunuSor(kutu, alici, sor, istekSuresiMs);
    if ("hata" in cevap) {
      sonHata = cevap.hata;
      return false;
    }
    iletiler = cevap.iletiler;
    try {
      return await tamam(iletiler);
    } catch (hata) {
      sonHata = `koşul: ${hataMetni(hata)}`;
      return false;
    }
  };
  for (;;) {
    if (await dene()) {
      await bekle();
      if (await dene()) return { iletiler, tamam: true };
    }
    if (Date.now() + aralikMs > bitis) {
      return { iletiler, tamam: false, ...(sonHata === undefined ? {} : { sonHata }) };
    }
    await bekle();
  }
};
