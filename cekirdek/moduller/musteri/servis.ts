// Müşteri kaydı, girişi ve hesabı (kart 0033, karar 0051). Oturum motoru cekirdek/moduller/oturum/.
// Müşterinin iki aşamalı girişi yoktur: şifreden geçen kişinin oturumu burada açılır.
import { and, eq, isNull } from "drizzle-orm";
import type { z } from "zod";
import { gunluk } from "../../izleme/gunluk.ts";
import { type MusteriOnayTuru, musteriOnayTurleri } from "../../kayitlar/musteri-onaylari.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { epostaGonder } from "../eposta/servis.ts";
import { sinirliSifreDogrula } from "../oturum/giris.ts";
import { type Anahtarlar, hesapAc, oturumAc, sifreDegismediyse } from "../oturum/servis.ts";
import { musteriler, musteriOnaylari } from "./model.ts";
import type { kayitFormuSemasi } from "./semalar.ts";

// Hesap, onaylar, hoş geldin e-postası ve oturum aynı işlemdedir: biri olmazsa hiçbiri olmaz. Kayıtlı
// e-posta "cakisma" döner (karar 0051: müşteriye söylenir).
export const musteriKaydet = (
  vt: Veritabani,
  girdi: z.output<typeof kayitFormuSemasi>,
  oturumSuresiSaniye: number,
): Promise<Anahtarlar> =>
  vt.transaction(async (islem) => {
    const { eposta, sifre, pazarlamaIzni } = girdi;
    const { hesapKimligi } = await hesapAc(islem, "musteri", { eposta, sifre });
    const verilenler: Record<MusteriOnayTuru, boolean> = {
      "uyelik-sozlesmesi": girdi.uyelikOnayi,
      "kvkk-aydinlatma": girdi.kvkkOnayi,
      pazarlama: pazarlamaIzni,
    };
    await islem.insert(musteriOnaylari).values(
      Object.entries(verilenler).map(([tur, verildi]) => ({
        musteri_kimligi: hesapKimligi,
        tur,
        verildi,
        metin_surumu: musteriOnayTurleri[tur as MusteriOnayTuru].metinSurumu,
      })),
    );
    await epostaGonder(islem, { kime: eposta, sablon: "hos-geldin" });
    const anahtarlar = await oturumAc(islem, "musteri", hesapKimligi, oturumSuresiSaniye);
    gunluk.bilgi("Müşteri hesabı açıldı.", { hesapTuru: "musteri", eposta });
    return anahtarlar;
  });

export const musteriGirisi = async (
  vt: Veritabani,
  girdi: { eposta: string; sifre: string },
  baglanti: string,
  oturumSuresiSaniye: number,
): Promise<Anahtarlar> => {
  const dogrulanan = await sinirliSifreDogrula(vt, "musteri", girdi, baglanti);
  return sifreDegismediyse(vt, "musteri", dogrulanan, (islem) =>
    oturumAc(islem, "musteri", dogrulanan.hesapKimligi, oturumSuresiSaniye),
  );
};

// Kimlik kapıdan gelir, girdiden alınmaz (karar 0040).
export const musteriHesabi = async (
  vt: Veritabani,
  hesapKimligi: string,
): Promise<{ eposta: string } | null> => {
  const [bulunan] = await vt
    .select({ eposta: musteriler.eposta })
    .from(musteriler)
    .where(and(eq(musteriler.kimlik, hesapKimligi), isNull(musteriler.silinme_zamani)));
  return bulunan ?? null;
};
