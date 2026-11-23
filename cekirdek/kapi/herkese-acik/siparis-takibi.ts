// POST /kapi/herkese-acik/siparis-takibi (kart 0238, karar 0150; uç belgesi: cekirdek/kapi/uclar.md). Üye olmayan
// müşteri siparişini numara ve siparişteki e-postayla bulur. Eşleşirse takip çerezi yazılır, takip sayfası siparişi
// 30 dakika bu çerezle gösterir. Eşleşmezse bulunamadı (siparişin var olup olmadığı belli olmaz). Robot korumalı ve
// sıkı sınırlıdır. Uç yalnız yönlendirir: kurallar sipariş servisindedir (musteri.ts). Tema demosunda kapalıdır.
//
// DELETE /kapi/herkese-acik/siparis-takibi: takibi kapatır (ortak bilgisayar, bağımsız kontrolün bulgusu). Çerezdeki
// anahtarın satırı silinir, çerez silinir. Anahtar yoksa da başarılıdır.
//
// POST /kapi/herkese-acik/siparis-takibi/iade-talebi ve /iptal (kart 0239, karar 0151): üye olmayan müşteri takip
// ettiği siparişte iade talebi açar ya da siparişini kendisi iptal eder. Sipariş yalnız takip anahtarıyla bulunur
// (çerez bu yolun altına da yazılır); başka numara bulunamadıdır. Robot korumalı ve sıkı sınırlıdır.
//
// GET /kapi/herkese-acik/siparis-takibi/fatura?numara= (kart 0268, karar 0170): takip edilen siparişin faturası,
// indirilecek dosya olarak. Sipariş yalnız takip anahtarıyla bulunur; başka numara, dosyasız ve süresi dolmuş takip
// bulunamadıdır. Robot sorusu yoktur: anahtar numara ve e-postayla robot korumalı uçtan alınmıştır.
import { z } from "zod";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { siparisTakipCerezi } from "../../kayitlar/siparis.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { siparisFaturaServisi } from "../../moduller/siparis/fatura.ts";
import { iadeTalebiServisi } from "../../moduller/siparis/iade-talebi.ts";
import {
  takipIadeTalebiGirdisi,
  takipIptaliGirdisi,
} from "../../moduller/siparis/iade-talebi-semalari.ts";
import { musteriSiparisleri } from "../../moduller/siparis/musteri.ts";
import { siparisAyrintisiSemasi } from "../../moduller/siparis/semalar.ts";
import { siparisTakibiGirdisi } from "../../moduller/siparis/takip-semalari.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { cerezOku } from "../oturum-cerezi.ts";
import { siparisTakipCereziSil, siparisTakipCereziYaz } from "../siparis-cerezi.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

export const siparisTakibiUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: siparisTakibiGirdisi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ robotCevabi, numara, eposta }, _istek, yanit) => {
    // Veritabanına bakmadan önce: robot numara ve e-posta eşleşmesini deneyemesin.
    await robotCevabiniDogrula(robotCevabi);
    const { anahtar } = await musteriSiparisleri().takipBaslat(siteninVeritabani(), {
      numara,
      eposta,
    });
    yanit.cerezYaz(...siparisTakipCereziYaz(anahtar));
    return { numara };
  },
});

export const siparisTakibiKapatUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: z.strictObject({}),
  izin: herkeseAcik,
  sinir: "genel",
  isle: async (_girdi, istek, yanit) => {
    // Önce çerez: veritabanı kapalıyken de ortak bilgisayarda takip tarayıcıda kalmasın.
    yanit.cerezYaz(...siparisTakipCereziSil());
    await musteriSiparisleri().takipKapat(
      siteninVeritabani(),
      cerezOku(istek, siparisTakipCerezi.ad),
    );
    return {};
  },
});

// Takip anahtarının siparişi; anahtar yoksa ya da süresi dolduysa bulunamadı (sayfa yeniden numara ve e-posta ister).
const takipSahibi = async (istek: Request) => {
  const siparis = await musteriSiparisleri().takipSiparisi(
    siteninVeritabani(),
    cerezOku(istek, siparisTakipCerezi.ad),
  );
  if (siparis === null) throw new BilinenHata("bulunamadi");
  return { tur: "takip" as const, siparis: siparis.kimlik };
};

export const takipIadeTalebiUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: takipIadeTalebiGirdisi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ robotCevabi, ...girdi }, istek) => {
    await robotCevabiniDogrula(robotCevabi);
    return iadeTalebiServisi(calisanSite()).talepAc(
      siteninVeritabani(),
      await takipSahibi(istek),
      girdi,
    );
  },
});

export const takipIptaliUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: takipIptaliGirdisi,
  izin: herkeseAcik,
  sinir: "siki",
  isle: async ({ robotCevabi, ...girdi }, istek) => {
    await robotCevabiniDogrula(robotCevabi);
    return iadeTalebiServisi(calisanSite()).musteriIptali(
      siteninVeritabani(),
      await takipSahibi(istek),
      girdi,
    );
  },
});

export const takipFaturaDosyasiUcu = ucTanimla({
  giris: "herkese-acik",
  temaDemosunda: "kapali",
  sema: siparisAyrintisiSemasi,
  izin: herkeseAcik,
  sinir: "genel",
  isle: async ({ numara }, istek) => {
    const { siparis } = await takipSahibi(istek);
    const belge = await siparisFaturaServisi(calisanSite()).dosyaOku(siteninVeritabani(), {
      numara,
      kimlik: siparis,
    });
    if (belge === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(
      belge.icerik,
      belge.mime,
      belge.ozet,
      "ozel",
      `fatura-${belge.siparis}.pdf`,
    );
  },
});
