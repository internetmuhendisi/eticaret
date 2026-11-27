// E-posta metinleri ve gönderen bilgileri uçları (kart 0279, karar 0197; uç belgesi: cekirdek/kapi/uclar.md). Uçlar
// yalnız yönlendirir: kurallar e-posta modülündedir (metin-servisi.ts, onizleme.ts). Mağaza ayarıdır: görmek
// `magaza-ayarlari.gor`, değiştirmek `magaza-ayarlari.degistir`.
import { eq } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { yoneticiler } from "../../moduller/ekip/model.ts";
import type { EpostaMetinBirimKodu } from "../../moduller/eposta/metin-birimleri.ts";
import {
  epostaGondereniniKaydet,
  epostaMetniServisi,
} from "../../moduller/eposta/metin-servisi.ts";
import { denemeEpostasiGonder, epostaOnizlemesi } from "../../moduller/eposta/onizleme.ts";
import {
  epostaGondereniSemasi,
  epostaMetniSemasi,
  epostaOnizlemeSemasi,
  epostaVarsayilaniSemasi,
} from "../../moduller/eposta/semalar.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

const yonetici = (kimlik: string) => ({ tur: "yonetici" as const, kimlik });

// POST /kapi/yonetici/eposta-metni: bir e-postanın konusu, giriş ve kapanış metni; ekranın gördüğü sürümle.
export const epostaMetniUcu = ucTanimla({
  giris: "yonetici",
  sema: epostaMetniSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    epostaMetniServisi(calisanSite()).kaydet(siteninVeritabani(), yonetici(hesapKimligi), {
      ...girdi,
      kod: girdi.kod as EpostaMetinBirimKodu,
    }),
});

// POST /kapi/yonetici/eposta-metni-varsayilan: e-postanın metinlerini çekirdeğin varsayılanına döndürür.
export const epostaMetniVarsayilanUcu = ucTanimla({
  giris: "yonetici",
  sema: epostaVarsayilaniSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: (girdi, _istek, _yanit, { hesapKimligi }) =>
    epostaMetniServisi(calisanSite()).varsayilanaDon(siteninVeritabani(), yonetici(hesapKimligi), {
      ...girdi,
      kod: girdi.kod as EpostaMetinBirimKodu,
    }),
});

// POST /kapi/yonetici/eposta-onizleme: formun metinleriyle örnek siparişin e-postası (konu ve HTML).
export const epostaOnizlemeUcu = ucTanimla({
  giris: "yonetici",
  sema: epostaOnizlemeSemasi,
  izin: "magaza-ayarlari.gor",
  sinir: "genel",
  isle: (girdi) =>
    epostaOnizlemesi(siteninVeritabani(), calisanSite(), {
      ...girdi,
      kod: girdi.kod as EpostaMetinBirimKodu,
    }),
});

// POST /kapi/yonetici/eposta-denemesi: formun metinleriyle örnek siparişin e-postası yöneticinin kendi adresine.
export const epostaDenemesiUcu = ucTanimla({
  giris: "yonetici",
  sema: epostaOnizlemeSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "siki",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    const vt = siteninVeritabani();
    const [hesap] = await vt
      .select({ eposta: yoneticiler.eposta })
      .from(yoneticiler)
      .where(eq(yoneticiler.kimlik, hesapKimligi));
    if (hesap === undefined) throw new BilinenHata("oturum-yok");
    await denemeEpostasiGonder(vt, calisanSite(), hesap.eposta, {
      ...girdi,
      kod: girdi.kod as EpostaMetinBirimKodu,
    });
    return {};
  },
});

// POST /kapi/yonetici/eposta-gonderen: gönderen adı, yanıt adresi ve alt bilgiye ek.
export const epostaGonderenUcu = ucTanimla({
  giris: "yonetici",
  sema: epostaGondereniSemasi,
  izin: "magaza-ayarlari.degistir",
  sinir: "genel",
  isle: async (girdi, _istek, _yanit, { hesapKimligi }) => {
    await epostaGondereniniKaydet(
      siteninVeritabani(),
      calisanSite(),
      yonetici(hesapKimligi),
      girdi,
    );
    return {};
  },
});
