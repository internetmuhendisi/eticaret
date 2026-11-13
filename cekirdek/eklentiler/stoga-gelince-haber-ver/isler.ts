// Stoğa gelince haber ver eklentisinin arka plan işleri (kart 0144, karar 0117); kaydı arka-plan-isleri/isler.ts'tedir.
// İşin girdisinde yalnız birimin kimliği vardır: e-posta adresi kuyruk tablosuna girmez. Eklentinin açık olup
// olmadığına servis bakar; kapalıyken iş bir şey göndermeden biter.
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { isEkle, isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import type { VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { stokBildirimiTalepleri } from "./model.ts";
import { stokBildirimiServisi } from "./servis.ts";

export const stokBildirimiGonderIsi = isTanimla({
  tur: "stok-bildirimi-gonder",
  sema: z.strictObject({ birim: kimlikSemasi }),
  calistir: async ({ birim }, { vt }) => {
    const gonderilen = await stokBildirimiServisi(calisanSite()).bekleyenleriGonder(vt, birim);
    gunluk.bilgi("stok bildirimleri gönderildi", { gonderilen });
  },
});

export const stokBildirimiTemizligiIsi = isTanimla({
  tur: "stok-bildirimi-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const silinen = await stokBildirimiServisi(calisanSite()).eskiTalepleriSil(vt);
    gunluk.bilgi("süresi dolan stok bildirimi talepleri silindi", { silinen });
  },
});

// Zamanlı tarama (bağımsız kontrolün bulgusu): bekleyen talebi olup şu an gönderilebilen birimlere gönderim işi
// koyar. Stoğun sıfırdan çıktığı anda gönderilemeyen talepler böylece kaybolmaz. Aynı birim için aynı anda iki iş
// talebi iki kez göndermez (servisin kuralı).
export const stokBildirimiTaramasiIsi = isTanimla({
  tur: "stok-bildirimi-taramasi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const birimler = await stokBildirimiServisi(calisanSite()).gonderilebilirBekleyenler(vt);
    for (const birim of birimler) await isEkle(vt, stokBildirimiGonderIsi, { birim });
    gunluk.bilgi("stok bildirimi taraması", { birim: birimler.length });
  },
});

// Stok kancası (cekirdek/eklentiler/stok-kancalari.ts): stoğu sıfırdan yukarı çıkan birimlerden bekleyen talebi
// olanlar için gönderim işi koyar. Stoğu değiştiren işlemin içinde çalışır: iş stokla birlikte girer ya da hiç
// girmez. Site bilgisi istemez; eklenti kapalıysa iş çalışınca bir şey göndermez.
export const stokGelinceIsKoy = async (
  islem: VeritabaniIslemi,
  birimler: readonly string[],
): Promise<void> => {
  if (birimler.length === 0) return;
  const bekleyenler = await islem
    .selectDistinct({ birim: stokBildirimiTalepleri.birim_kimligi })
    .from(stokBildirimiTalepleri)
    .where(
      and(
        inArray(stokBildirimiTalepleri.birim_kimligi, [...birimler]),
        eq(stokBildirimiTalepleri.durum, "bekliyor"),
      ),
    );
  for (const { birim } of bekleyenler) await isEkle(islem, stokBildirimiGonderIsi, { birim });
};
