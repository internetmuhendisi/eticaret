// Müşteri kaydı, girişi ve hesabı (kart 0033, karar 0051). Oturum motoru cekirdek/moduller/oturum/.
// Müşterinin iki aşamalı girişi yoktur: şifreden geçen kişinin oturumu burada açılır.
import { and, desc, eq, isNull } from "drizzle-orm";
import type { z } from "zod";
import { gunluk } from "../../izleme/gunluk.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type MusteriOnayTuru, musteriOnayTurleri } from "../../kayitlar/musteri-onaylari.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { epostaGonder } from "../eposta/servis.ts";
import { sinirliSifreDogrula } from "../oturum/giris.ts";
import { type Anahtarlar, hesapAc, oturumAc, sifreDegismediyse } from "../oturum/servis.ts";
import { sifreOzetle } from "../oturum/sifre.ts";
import { musteriler, musteriOnaylari, musteriOturumlari } from "./model.ts";
import type { kayitFormuSemasi } from "./semalar.ts";

// Hesap, onaylar, hoş geldin e-postası ve oturum aynı işlemdedir: biri olmazsa hiçbiri olmaz. Kayıtlı
// e-posta "cakisma" döner (karar 0051: müşteriye söylenir).
export const musteriKaydet = (
  vt: Veritabani,
  girdi: z.output<typeof kayitFormuSemasi>,
  oturumSuresiSaniye: number,
): Promise<Anahtarlar> =>
  vt.transaction(async (islem) => {
    const { anahtarlar } = await musteriHesabiAc(islem, girdi, oturumSuresiSaniye);
    return anahtarlar;
  });

// Çağıranın işleminde hesap, onaylar, hoş geldin e-postası ve oturum (ödemede hesap açma da kullanır, kart 0213).
export const musteriHesabiAc = async (
  islem: VeritabaniIslemi,
  girdi: z.output<typeof kayitFormuSemasi>,
  oturumSuresiSaniye: number,
): Promise<{ anahtarlar: Anahtarlar; musteri: string }> => {
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
  return { anahtarlar, musteri: hesapKimligi };
};

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

// Hesap bilgileri ekranı (kart 0237): e-posta ve kampanya izninin bugünkü hâli (en yeni onay satırı).
export const hesapBilgileri = async (
  vt: Veritabani,
  hesapKimligi: string,
): Promise<{ eposta: string; pazarlamaIzni: boolean } | null> => {
  const hesap = await musteriHesabi(vt, hesapKimligi);
  if (hesap === null) return null;
  return { eposta: hesap.eposta, pazarlamaIzni: await pazarlamaIzniVarMi(vt, hesapKimligi) };
};

const pazarlamaIzniVarMi = async (
  vt: Veritabani | VeritabaniIslemi,
  hesapKimligi: string,
): Promise<boolean> => {
  const [son] = await vt
    .select({ verildi: musteriOnaylari.verildi })
    .from(musteriOnaylari)
    .where(
      and(eq(musteriOnaylari.musteri_kimligi, hesapKimligi), eq(musteriOnaylari.tur, "pazarlama")),
    )
    .orderBy(desc(musteriOnaylari.zaman), desc(musteriOnaylari.kimlik))
    .limit(1);
  return son?.verildi === true;
};

// Kampanya iznini verir ya da geri alır: onaylar değiştirilemez, yeni satır yazılır (karar 0051). İzin zaten
// istenen hâldeyse satır yazılmaz. Müşterinin satırı kilitlenir: aynı anda iki değişiklik sırayla yazılır.
export const pazarlamaIzniniDegistir = (
  vt: Veritabani,
  hesapKimligi: string,
  verildi: boolean,
): Promise<void> =>
  vt.transaction(async (islem) => {
    await islem
      .select({ kimlik: musteriler.kimlik })
      .from(musteriler)
      .where(eq(musteriler.kimlik, hesapKimligi))
      .for("update");
    if ((await pazarlamaIzniVarMi(islem, hesapKimligi)) === verildi) return;
    await islem.insert(musteriOnaylari).values({
      musteri_kimligi: hesapKimligi,
      tur: "pazarlama",
      verildi,
      metin_surumu: musteriOnayTurleri.pazarlama.metinSurumu,
    });
  });

// Şifre değiştirme (kart 0237): şu anki şifre girişle aynı deneme sınırıyla doğrulanır. Yanlışsa alanın hatası
// ("sifre-yanlis"). Doğruysa şifre değişir, hesabın bütün oturumları kapanır ve bu cihaz için yeni oturum açılır
// (uç çerezi yazar); şifre sıfırlamayla aynı ilke: başka cihazda açık kalan oturum eski şifreyle açılmıştır.
// Müşteriye "şifreniz değişti" e-postası gider.
export const musteriSifreDegistir = async (
  vt: Veritabani,
  hesapKimligi: string,
  girdi: { mevcutSifre: string; yeniSifre: string },
  baglanti: string,
  oturumSuresiSaniye: number,
): Promise<Anahtarlar> => {
  const hesap = await musteriHesabi(vt, hesapKimligi);
  if (hesap === null) throw new BilinenHata("oturum-yok");
  let dogrulanan: Awaited<ReturnType<typeof sinirliSifreDogrula>>;
  try {
    dogrulanan = await sinirliSifreDogrula(
      vt,
      "musteri",
      { eposta: hesap.eposta, sifre: girdi.mevcutSifre },
      baglanti,
    );
  } catch (hata) {
    if (hata instanceof BilinenHata && hata.kod === "giris-hatasi") {
      throw new BilinenHata("dogrulama", [{ alan: "mevcutSifre", kod: "sifre-yanlis" }]);
    }
    throw hata;
  }
  if (dogrulanan.hesapKimligi !== hesapKimligi) throw new BilinenHata("oturum-yok");
  const yeniOzet = await sifreOzetle(girdi.yeniSifre);
  const anahtarlar = await sifreDegismediyse(vt, "musteri", dogrulanan, async (islem) => {
    const simdi = new Date();
    await islem
      .update(musteriler)
      .set({ sifre_ozeti: yeniOzet, guncellenme_zamani: simdi })
      .where(eq(musteriler.kimlik, hesapKimligi));
    await islem
      .update(musteriOturumlari)
      .set({ kapanma_zamani: simdi })
      .where(
        and(
          eq(musteriOturumlari.hesap_kimligi, hesapKimligi),
          isNull(musteriOturumlari.kapanma_zamani),
        ),
      );
    await epostaGonder(islem, { kime: hesap.eposta, sablon: "sifre-degisti" });
    return oturumAc(islem, "musteri", hesapKimligi, oturumSuresiSaniye);
  });
  gunluk.bilgi("Müşteri şifresini değiştirdi, oturumlar kapatıldı.", {
    hesapTuru: "musteri",
    eposta: hesap.eposta,
  });
  return anahtarlar;
};

// Kimlik kapıdan gelir, girdiden alınmaz (karar 0040).
export const musteriHesabi = async (
  vt: Veritabani | VeritabaniIslemi,
  hesapKimligi: string,
): Promise<{ eposta: string } | null> => {
  const [bulunan] = await vt
    .select({ eposta: musteriler.eposta })
    .from(musteriler)
    .where(and(eq(musteriler.kimlik, hesapKimligi), isNull(musteriler.silinme_zamani)));
  return bulunan ?? null;
};
