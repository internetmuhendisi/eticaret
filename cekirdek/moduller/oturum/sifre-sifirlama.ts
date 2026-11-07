// Şifre sıfırlama (kart 0034, karar 0052, .claude/rules/guvenlik.md). Yönetici ve müşteri aynı motoru kendi
// tablolarıyla kullanır. Anahtar rastgele üretilir, veritabanında yalnız özeti durur, tek kullanımlıktır.
// Sıfırlama iki aşamalı girişe dokunmaz: yönetici yeni şifreyle yine kod girer ya da kurulum ekranına düşer.
import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { siteAdresi } from "../../ayar-semasi/site-adresi.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { BilinenHata } from "../../kapi/zarf.ts";
import { type HesapTuru, sifreSifirlamaAyari } from "../../kayitlar/oturum.ts";
import type { Veritabani } from "../../veritabani/baglanti.ts";
import { degisikligiKaydet } from "../degisiklik-kaydi/servis.ts";
import {
  yoneticiGirisAdimlari,
  yoneticiler,
  yoneticiOturumlari,
  yoneticiSifreSifirlamalari,
} from "../ekip/model.ts";
import { epostaGonder } from "../eposta/servis.ts";
import { musteriler, musteriOturumlari, musteriSifreSifirlamalari } from "../musteri/model.ts";
import { denemeyiAyir } from "./deneme-siniri.ts";
import { epostaSemasi } from "./semalar.ts";
import { anahtarOzeti } from "./servis.ts";
import { anahtarParametresi } from "./sifirlama-adresleri.ts";
import { sifreOzetle } from "./sifre.ts";

const tablolar = {
  yonetici: {
    hesap: yoneticiler,
    oturum: yoneticiOturumlari,
    sifirlama: yoneticiSifreSifirlamalari,
  },
  musteri: { hesap: musteriler, oturum: musteriOturumlari, sifirlama: musteriSifreSifirlamalari },
} as const;

// Anahtar adresin # sonrasındadır: tarayıcı onu sunucuya göndermez, kayıtlara ve Referer'a düşmez, e-posta
// programının bağlantıyı önceden açması anahtarı harcamaz.
// Hesap yoksa, kapalıysa ya da hesabın e-posta sınırı dolmuşsa sessizce hiçbir şey yapmaz: çağıran her
// durumda aynı cevabı verir. Bir hesabın eski bağlantıları yenisiyle geçersiz olur.
export const sifreSifirlamaIste = async (
  vt: Veritabani,
  tur: HesapTuru,
  girdi: { eposta: string },
  yenilemeYolu: string,
): Promise<void> => {
  const eposta = epostaSemasi.parse(girdi.eposta);
  const { gecerlilikSaniye, hesap: sinir } = sifreSifirlamaAyari;
  const dolu = denemeyiAyir([{ anahtar: `${tur} sifirlama ${eposta}`, ...sinir }]);
  if (dolu !== null) {
    gunluk.uyari("Şifre sıfırlama sınırı doldu.", { hesapTuru: tur, eposta });
    return;
  }
  const { hesap, sifirlama } = tablolar[tur];
  const [bulunan] = await vt
    .select({ kimlik: hesap.kimlik })
    .from(hesap)
    .where(and(eq(hesap.eposta, eposta), isNull(hesap.silinme_zamani)));
  if (bulunan === undefined) return;

  const adres = siteAdresi(calisanSite().kimlik);
  if (adres === undefined) {
    hatayiKaydet(new Error("Sitenin adresi yok, şifre sıfırlama bağlantısı üretilemedi."), {
      kaynak: "sifre-sifirlama",
    });
    return;
  }
  const anahtar = randomBytes(32).toString("base64url");
  await vt.transaction(async (islem) => {
    await islem.delete(sifirlama).where(eq(sifirlama.hesap_kimligi, bulunan.kimlik));
    await islem.insert(sifirlama).values({
      hesap_kimligi: bulunan.kimlik,
      anahtar_ozeti: anahtarOzeti(anahtar),
      bitis: new Date(Date.now() + gecerlilikSaniye * 1000),
    });
    await epostaGonder(islem, {
      kime: eposta,
      sablon: "sifre-sifirlama",
      degiskenler: {
        baglanti: `${adres}${yenilemeYolu}#${anahtarParametresi}=${anahtar}`,
        dakika: String(gecerlilikSaniye / 60),
      },
    });
  });
  gunluk.bilgi("Şifre sıfırlama bağlantısı istendi.", { hesapTuru: tur, eposta });
};

// Bağlantı aynı işlemde harcanır: aynı anda giden iki istekten biri geçer. Geçersiz, kullanılmış ya da süresi
// dolmuş bağlantı "is-kurali" döner. Bütün açık oturumlar kapanır. Yöneticinin yarım giriş adımları da silinir:
// eski şifreyle şifre aşamasını geçmiş biri kod ekranında kalmasın.
export const sifreYenile = async (
  vt: Veritabani,
  tur: HesapTuru,
  girdi: { anahtar: string; sifre: string },
): Promise<void> => {
  const { hesap, oturum, sifirlama } = tablolar[tur];
  const sifreOzeti = await sifreOzetle(girdi.sifre);
  const eposta = await vt.transaction(async (islem) => {
    const simdi = new Date();
    const [harcanan] = await islem
      .update(sifirlama)
      .set({ kullanilma_zamani: simdi })
      .where(
        and(
          eq(sifirlama.anahtar_ozeti, anahtarOzeti(girdi.anahtar)),
          isNull(sifirlama.kullanilma_zamani),
          gt(sifirlama.bitis, simdi),
        ),
      )
      .returning({ hesapKimligi: sifirlama.hesap_kimligi });
    if (harcanan === undefined) throw new BilinenHata("is-kurali");
    const { hesapKimligi } = harcanan;

    const [guncellenen] = await islem
      .update(hesap)
      .set({ sifre_ozeti: sifreOzeti, guncellenme_zamani: simdi })
      .where(and(eq(hesap.kimlik, hesapKimligi), isNull(hesap.silinme_zamani)))
      .returning({ eposta: hesap.eposta });
    if (guncellenen === undefined) throw new BilinenHata("is-kurali");

    await islem
      .update(oturum)
      .set({ kapanma_zamani: simdi })
      .where(and(eq(oturum.hesap_kimligi, hesapKimligi), isNull(oturum.kapanma_zamani)));
    if (tur === "yonetici") {
      await islem
        .delete(yoneticiGirisAdimlari)
        .where(eq(yoneticiGirisAdimlari.yonetici_kimligi, hesapKimligi));
      await degisikligiKaydet(islem, {
        kim: { tur: "yonetici", kimlik: hesapKimligi },
        islem: "yonetici.sifre-sifirlandi",
        kayit: { tur: "yonetici", kimlik: hesapKimligi },
        eski: null,
        yeni: null,
      });
    }
    await epostaGonder(islem, { kime: guncellenen.eposta, sablon: "sifre-degisti" });
    return guncellenen.eposta;
  });
  gunluk.bilgi("Şifre sıfırlandı, oturumlar kapatıldı.", { hesapTuru: tur, eposta });
};
