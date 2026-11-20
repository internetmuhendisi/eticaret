// Yönetici bildiriminin kuyruğa yazılması (kart 0241, karar 0154): olayla aynı işlemde, olayın kalıcı kaydının
// kimliğiyle (anahtar). Aynı anahtarla ikinci iş girmez; işlem geri alınırsa bildirim de yoktur.
import { isEkle } from "../../arka-plan-isleri/kuyruk.ts";
import type { StokUyarisiTuru, YoneticiBildirimi } from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { stokUyarisiIsi, yoneticiBildirimiIsi } from "./isler.ts";
import { stokUyarisiSatiriYaz } from "./stok-uyarisi.ts";
import type { YoneticiBildirimVerisi } from "./veri.ts";

export const yoneticiBildirimiYaz = async <B extends YoneticiBildirimi>(
  vt: Veritabani | VeritabaniIslemi,
  g: { bildirim: B; anahtar: string; veri: YoneticiBildirimVerisi[B] },
): Promise<void> => {
  await isEkle(
    vt,
    yoneticiBildirimiIsi,
    { bildirim: g.bildirim, anahtar: g.anahtar, veri: g.veri as Record<string, unknown> },
    { tekillikAnahtari: `yonetici-bildirimi:${g.anahtar}` },
  );
};

// Stok uyarısı: satır ve gönderim işi stok düşürmeyle aynı işlemde (stok servisi çağırır).
export const stokUyarisiYaz = async (
  islem: VeritabaniIslemi,
  g: { birim: string; tur: StokUyarisiTuru; miktar: number },
): Promise<void> => {
  await stokUyarisiSatiriYaz(islem, g);
  await isEkle(islem, stokUyarisiIsi, {});
};
