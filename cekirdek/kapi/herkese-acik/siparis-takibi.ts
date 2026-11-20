// POST /kapi/herkese-acik/siparis-takibi (kart 0238, karar 0150; uç belgesi: cekirdek/kapi/uclar.md). Üye olmayan
// müşteri siparişini numara ve siparişteki e-postayla bulur. Eşleşirse takip çerezi yazılır, takip sayfası siparişi
// 30 dakika bu çerezle gösterir. Eşleşmezse bulunamadı (siparişin var olup olmadığı belli olmaz). Robot korumalı ve
// sıkı sınırlıdır. Uç yalnız yönlendirir: kurallar sipariş servisindedir (musteri.ts). Tema demosunda kapalıdır.
//
// DELETE /kapi/herkese-acik/siparis-takibi: takibi kapatır (ortak bilgisayar, bağımsız kontrolün bulgusu). Çerezdeki
// anahtarın satırı silinir, çerez silinir. Anahtar yoksa da başarılıdır.
import { z } from "zod";
import { herkeseAcik } from "../../kayitlar/izinler.ts";
import { siparisTakipCerezi } from "../../kayitlar/siparis.ts";
import { robotCevabiniDogrula } from "../../moduller/robot-korumasi/servis.ts";
import { musteriSiparisleri } from "../../moduller/siparis/musteri.ts";
import { siparisTakibiGirdisi } from "../../moduller/siparis/takip-semalari.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { cerezOku } from "../oturum-cerezi.ts";
import { siparisTakipCereziSil, siparisTakipCereziYaz } from "../siparis-cerezi.ts";
import { ucTanimla } from "../uc.ts";

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
    yanit.cerezYaz(siparisTakipCereziYaz(anahtar));
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
    yanit.cerezYaz(siparisTakipCereziSil());
    await musteriSiparisleri().takipKapat(
      siteninVeritabani(),
      cerezOku(istek, siparisTakipCerezi.ad),
    );
    return {};
  },
});
