// Yönetici bildiriminin yazılması (kart 0241, karar 0154): olayla aynı işlemde, olayın kalıcı kaydının
// kimliğiyle (anahtar). Aynı anahtarla ikinci iş girmez; işlem geri alınırsa bildirim de yoktur. Aynı anda panelin
// içindeki bildirim de yazılır (kart 0280, karar 0198): e-posta kapalı olsa da.
import { isEkle } from "../../arka-plan-isleri/kuyruk.ts";
import type { StokUyarisiTuru, YoneticiBildirimi } from "../../kayitlar/yonetici-bildirimi.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { stokUyarisiIsi, yoneticiBildirimiIsi } from "./isler.ts";
import { type PanelBildirimOzeti, panelBildirimiYaz } from "./panel.ts";
import { stokUyarisiSatiriYaz } from "./stok-uyarisi.ts";
import type { YoneticiBildirimVerisi } from "./veri.ts";

// E-postanın verisinden panel bildiriminin kişisel olmayan özeti: ad, metin ve adres panel satırına girmez.
const panelOzetleri: {
  [B in Exclude<YoneticiBildirimi, "stok">]: (
    veri: YoneticiBildirimVerisi[B],
  ) => PanelBildirimOzeti[B];
} = {
  "yeni-siparis": () => ({}),
  "havale-bildirimi": (veri) => ({ tutar: veri.tutar }),
  "iade-talebi": (veri) => ({ adet: veri.kalemler.reduce((toplam, k) => toplam + k.adet, 0) }),
  iptal: (veri) => ({ neden: veri.neden }),
  yorum: (veri) => ({ puan: veri.puan }),
  "kartla-odeme-uyusmazligi": (veri) => ({ gun: veri.gun, sayi: veri.sayi }),
  "bekleyen-iade": (veri) => ({ neden: veri.neden }),
};

// kayit: panel bildiriminin ilgili kaydı (sipariş ya da yorum; karşılaştırmada yok).
export const yoneticiBildirimiYaz = async <B extends Exclude<YoneticiBildirimi, "stok">>(
  vt: Veritabani | VeritabaniIslemi,
  g: { bildirim: B; anahtar: string; kayit: string | null; veri: YoneticiBildirimVerisi[B] },
): Promise<void> => {
  // İş ve panel satırları birlikte yazılır: çağıran işlem vermediyse (kartla ödemenin taramaları) kendi işlemi açılır,
  // verdiyse iç kayıt noktasıdır.
  await vt.transaction(async (islem) => {
    await isEkle(
      islem,
      yoneticiBildirimiIsi,
      { bildirim: g.bildirim, anahtar: g.anahtar, veri: g.veri as Record<string, unknown> },
      { tekillikAnahtari: `yonetici-bildirimi:${g.anahtar}` },
    );
    await panelBildirimiYaz(islem, {
      bildirim: g.bildirim,
      anahtar: g.anahtar,
      kayit: g.kayit,
      ozet: panelOzetleri[g.bildirim](g.veri),
    });
  });
};

// Stok uyarısı: satır ve gönderim işi stok düşürmeyle aynı işlemde (stok servisi çağırır). E-posta uyarıları toplar
// (saatte en çok bir); panel bildirimi her uyarıda hemen yazılır.
export const stokUyarisiYaz = async (
  islem: VeritabaniIslemi,
  g: { birim: string; tur: StokUyarisiTuru; miktar: number },
): Promise<void> => {
  const satir = await stokUyarisiSatiriYaz(islem, g);
  await isEkle(islem, stokUyarisiIsi, {});
  await panelBildirimiYaz(islem, {
    bildirim: "stok",
    anahtar: `stok-uyarisi:${satir}`,
    kayit: g.birim,
    ozet: { tur: g.tur, miktar: g.miktar },
  });
};
