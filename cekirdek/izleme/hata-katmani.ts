// Sunucunun ortak hata katmanı (kart 0014, karar 0025, .claude/rules/hata-izleme.md).
// Beklenmeyen her sunucu hatası buradan geçer: günlüğe yazılır ve bağlıysa hata izleme aracına
// gönderilir. Uç tanımı, Next.js'in istek hatası kancası (instrumentation.ts) ve veritabanı
// bağlantısı hatayı buraya verir.
import type { GunlukSeviyesi } from "../kayitlar/izleme.ts";
import { type GunlukAlanlari, gunluk } from "./gunluk.ts";
import { maskele } from "./maskele.ts";

// Hata izleme aracına giden kayıt. Hata ve bağlam maskelenmiş olarak gelir.
export type IzlenenHata = {
  seviye: Extract<GunlukSeviyesi, "hata" | "olumcul">;
  hata: unknown;
  baglam: unknown;
};

export type HataIzlemeAraci = (kayit: IzlenenHata) => void;

// Hata izleme aracının bağlandığı tek yer (kart 0022). Next.js açılışı, uçları ve ara katmanı ayrı
// paketlere derler, bu dosya süreçte üç kopya yüklenir (ölçüldü, kart 0049). Araç bu yüzden dosyanın
// içinde değil, sürecin ortak alanında tutulur; açılışta bağlanan aracı bütün paketler görür.
const anahtar = Symbol.for("cekirdek.hataIzlemeAraci");
const ortak = globalThis as { [anahtar]?: HataIzlemeAraci | undefined };

export const hataIzlemeAraciniBagla = (arac: HataIzlemeAraci | undefined): void => {
  ortak[anahtar] = arac;
};

export const hatayiKaydet = (
  hata: unknown,
  baglam: GunlukAlanlari = {},
  seviye: IzlenenHata["seviye"] = "hata",
): void => {
  gunluk[seviye]("beklenmeyen hata", { ...baglam, hata });
  const izlemeAraci = ortak[anahtar];
  if (izlemeAraci === undefined) return;
  try {
    izlemeAraci({ seviye, hata: maskele(hata), baglam: maskele(baglam) });
  } catch (aracHatasi) {
    gunluk.uyari("hata izleme aracı hatayı alamadı", { hata: aracHatasi });
  }
};

// Yakalanmamış süreç hatası ölümcül seviyede kaydedilir. İzleyici dinleyici (Monitor) sürecin
// davranışını değiştirmez: Next.js hatayı kendi de yazar ve sunucuyu ayakta tutar. Uygulama
// açılırken bir kez çağrılır (instrumentation.ts).
export const surecHatalariniBagla = (): void => {
  process.on("uncaughtExceptionMonitor", (hata, kaynak) => {
    hatayiKaydet(hata, { kaynak: "surec", tur: kaynak }, "olumcul");
  });
};
