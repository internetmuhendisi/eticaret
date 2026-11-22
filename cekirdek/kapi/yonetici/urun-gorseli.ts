// Ürün görselinin yükleme ucu (kart 0266, karar 0073 ve 0165, uç belgesi: cekirdek/kapi/uclar.md). Görsel boyutlarıyla
// kaydedilir (gorselKaydet), galeriye bağlanmaz: bağlama ürünün "Kaydet"iyle, ürünle aynı işlemde yapılır (dosya kaydı
// bir veritabanı işleminin içinde çağrılamaz). Kaydedilip galeriye bağlanmayan görselin temizliği kart 0093'tedir.
// Dosyanın reddi alanın koduyla döner (dosyaHatalari); metni ekran çözer.
import { dosyaGovdesiSemasi } from "../../moduller/dosya/semalar.ts";
import { gorselKaydet } from "../../moduller/dosya/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata } from "../zarf.ts";

// POST /kapi/yonetici/urun-gorseli-yukle: gövdedeki görseli kaydeder; dosyanın kimliğini ve ölçüsünü döner.
export const urunGorseliYuklemeUcu = ucTanimla({
  giris: "yonetici",
  govde: "dosya",
  sema: dosyaGovdesiSemasi,
  izin: "urun.degistir",
  sinir: "yukleme",
  isle: async ({ dosya }) => {
    const sonuc = await gorselKaydet(siteninVeritabani(), dosya);
    if (!sonuc.tamam) throw new BilinenHata("dogrulama", [{ alan: "dosya", kod: sonuc.hata }]);
    const { kimlik, genislik, yukseklik } = sonuc.dosya;
    return { dosya: kimlik, genislik, yukseklik };
  },
});
