// Panelin ekip uçları (kartlar 0274 ve 0053, karar 0178; uç belgesi cekirdek/kapi/uclar.md). Uç yalnız yönlendirir:
// kurallar (son mağaza sahibi, kendi hesabı, en az bir rol) ekip servisindedir (cekirdek/moduller/ekip/servis.ts).
import { eq } from "drizzle-orm";
import { z } from "zod";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import {
  ikiAsamaliGirisiSifirla,
  rolleriAyarla,
  yoneticiHesabiKapat,
} from "../../moduller/ekip/servis.ts";
import { yedekKodlariniYenile } from "../../moduller/oturum/iki-asamali-giris.ts";
import { sifreSifirlamaIste } from "../../moduller/oturum/sifre-sifirlama.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { sifreYenileAdresi } from "../../yonetim-paneli/adresler.ts";
import { istemciAdresi, sayacAdresi } from "../istek-siniri.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

export const ekipRolleriSemasi = z.strictObject({
  kimlik: kimlikSemasi,
  // Rol kodları; servis kayıtta olup olmadığını denetler.
  roller: z.array(z.string().max(100)).max(20),
});
export const ekipKimlikSemasi = z.strictObject({ kimlik: kimlikSemasi });
export const yedekKodSemasi = z.strictObject({ kod: z.string().trim().max(20) });

// POST /kapi/yonetici/ekip-rolleri: yöneticinin rollerini verilen listeye getirir.
export const ekipRolleriUcu = ucTanimla({
  giris: "yonetici",
  sema: ekipRolleriSemasi,
  izin: "ekip.rol-ata",
  sinir: "genel",
  isle: async ({ kimlik, roller }, _istek, _yanit, { hesapKimligi }) => {
    await rolleriAyarla(
      siteninVeritabani(),
      { yoneticiKimligi: kimlik, roller },
      yonetici(hesapKimligi),
    );
    return {};
  },
});

// POST /kapi/yonetici/ekip-hesap-kapat: yöneticinin hesabını kapatır; açık oturumu hemen düşer.
export const ekipHesapKapatUcu = ucTanimla({
  giris: "yonetici",
  sema: ekipKimlikSemasi,
  izin: "ekip.hesap-kapat",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    await yoneticiHesabiKapat(
      siteninVeritabani(),
      { yoneticiKimligi: kimlik },
      yonetici(hesapKimligi),
    );
    return {};
  },
});

// POST /kapi/yonetici/ekip-iki-asama-sifirla: yöneticinin iki aşamalı girişini ve şifresini sıfırlar (kart 0053, karar
// 0178); ardından yöneticinin e-postasına yeni şifre bağlantısı gider. Bağlantı gidemezse (sınır, sitenin adresi yok)
// sıfırlama yine geçerlidir, `baglanti: false` döner: yönetici giriş sayfasındaki "Şifremi unuttum"u kullanır.
export const ekipIkiAsamaSifirlaUcu = ucTanimla({
  giris: "yonetici",
  sema: ekipKimlikSemasi,
  izin: "ekip.iki-asama-sifirla",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    await ikiAsamaliGirisiSifirla(vt, { yoneticiKimligi: kimlik }, yonetici(hesapKimligi));
    const [hedef] = await vt
      .select({ eposta: yoneticiler.eposta })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, kimlik));
    const sonuc =
      hedef === undefined
        ? "hesap-yok"
        : await sifreSifirlamaIste(vt, "yonetici", { eposta: hedef.eposta }, sifreYenileAdresi);
    return { baglanti: sonuc === "gonderildi" };
  },
});

// POST /kapi/yonetici/yedek-kodlari-yenile: yönetici kendi yedek kodlarını telefonundaki kodla yeniler; yeni kodlar bir
// kez döner. Yanlış kod giriş koduyla aynı deneme sınırına sayılır.
export const yedekKodlariYenileUcu = ucTanimla({
  giris: "yonetici",
  sema: yedekKodSemasi,
  izin: "ekip.kendi-hesabi.degistir",
  sinir: "siki",
  isle: async ({ kod }, istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    const [hesap] = await vt
      .select({ eposta: yoneticiler.eposta })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, hesapKimligi));
    if (hesap === undefined) throw new BilinenHata("oturum-yok");
    const yedekKodlari = await yedekKodlariniYenile(vt, {
      hesapKimligi,
      eposta: hesap.eposta,
      kod,
      baglanti: sayacAdresi(istemciAdresi(istek)),
    });
    return { yedekKodlari };
  },
});
