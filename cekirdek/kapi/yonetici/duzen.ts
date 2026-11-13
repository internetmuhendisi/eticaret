// Düzen uçları (kart 0142, uç belgesi: cekirdek/kapi/uclar.md). Uç yalnız yönlendirir: kuralların hepsi düzen
// servisindedir (cekirdek/moduller/duzen/servis.ts). Değişikliği yapan yönetici kapıdan gelir. Her değişiklik
// düzenin yeni bir sürümüdür ve hemen yayınlanır (karar 0080).
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { gorselBoyutunuOku } from "../../moduller/dosya/gorsel-boyutu.ts";
import { dosyaKlasoru } from "../../moduller/dosya/servis.ts";
import { duzenSecenekleri } from "../../moduller/duzen/secenekler.ts";
import {
  bolumDegisikligiSemasi,
  bolumEklemeSemasi,
  bolumGorunurluguSemasi,
  bolumSilmeSemasi,
  bolumSiralamaSemasi,
  duzenDurumuSemasi,
  duzenGeriDonusSemasi,
  panelGorseliSemasi,
} from "../../moduller/duzen/semalar.ts";
import { duzenServisi } from "../../moduller/duzen/servis.ts";
import { siteninVeritabani } from "../../veritabani/baglanti.ts";
import { ucTanimla } from "../uc.ts";
import { BilinenHata, DosyaYaniti } from "../zarf.ts";

const servis = () => duzenServisi(calisanSite);
const yonetici = (hesapKimligi: string) => ({ tur: "yonetici" as const, kimlik: hesapKimligi });

// GET /kapi/yonetici/duzen: üç alanın bölümleri sırasıyla, çizilmeme nedenleriyle; sürümün sırası ve formun
// seçenekleri (gerçek kayıtlar).
export const duzenDurumuUcu = ucTanimla({
  giris: "yonetici",
  sema: duzenDurumuSemasi,
  izin: "duzen.gor",
  sinir: "genel",
  isle: async () => {
    const vt = siteninVeritabani();
    const [durum, secenekler] = await Promise.all([
      servis().panelDuzenDurumu(vt),
      duzenSecenekleri(vt),
    ]);
    return { ...durum, secenekler };
  },
});

// POST /kapi/yonetici/duzen-bolum-ekle
export const bolumEklemeUcu = ucTanimla({
  giris: "yonetici",
  sema: bolumEklemeSemasi,
  izin: "duzen.degistir",
  sinir: "genel",
  isle: async ({ alan, sira, ...girdi }, _istek, _yanit, { hesapKimligi }) => ({
    kimlik: await servis().bolumEkle(
      siteninVeritabani(),
      yonetici(hesapKimligi),
      alan,
      girdi,
      sira,
    ),
  }),
});

// POST /kapi/yonetici/duzen-bolum-degistir
export const bolumDegisikligiUcu = ucTanimla({
  giris: "yonetici",
  sema: bolumDegisikligiSemasi,
  izin: "duzen.degistir",
  sinir: "genel",
  isle: async ({ kimlik, ...girdi }, _istek, _yanit, { hesapKimligi }) => {
    await servis().bolumDegistir(siteninVeritabani(), yonetici(hesapKimligi), kimlik, girdi);
    return {};
  },
});

// POST /kapi/yonetici/duzen-bolum-gorunurlugu
export const bolumGorunurluguUcu = ucTanimla({
  giris: "yonetici",
  sema: bolumGorunurluguSemasi,
  izin: "duzen.degistir",
  sinir: "genel",
  isle: async ({ kimlik, gizli }, _istek, _yanit, { hesapKimligi }) => {
    await servis().bolumGorunurlugu(siteninVeritabani(), yonetici(hesapKimligi), kimlik, gizli);
    return {};
  },
});

// POST /kapi/yonetici/duzen-bolum-sil
export const bolumSilmeUcu = ucTanimla({
  giris: "yonetici",
  sema: bolumSilmeSemasi,
  izin: "duzen.degistir",
  sinir: "genel",
  isle: async ({ kimlik }, _istek, _yanit, { hesapKimligi }) => ({
    sira: await servis().bolumSil(siteninVeritabani(), yonetici(hesapKimligi), kimlik),
  }),
});

// POST /kapi/yonetici/duzen-sirala
export const bolumSiralamaUcu = ucTanimla({
  giris: "yonetici",
  sema: bolumSiralamaSemasi,
  izin: "duzen.degistir",
  sinir: "genel",
  isle: async ({ alan, kimlikler }, _istek, _yanit, { hesapKimligi }) => {
    await servis().bolumleriSirala(siteninVeritabani(), yonetici(hesapKimligi), alan, kimlikler);
    return {};
  },
});

// POST /kapi/yonetici/duzen-geri-don: düzenin önceki hâline döner.
export const duzenGeriDonusUcu = ucTanimla({
  giris: "yonetici",
  sema: duzenGeriDonusSemasi,
  izin: "duzen.degistir",
  sinir: "genel",
  isle: async ({ son }, _istek, _yanit, { hesapKimligi }) => ({
    sira: await servis().oncekiHaleDon(siteninVeritabani(), yonetici(hesapKimligi), son),
  }),
});

// GET /kapi/yonetici/panel-gorseli: paneldeki görsel önizlemesi. Vitrin görseli ucu yalnız vitrinde
// kullanılan görseli verir; panel henüz seçilmemiş görseli de gösterir. Yalnız kayıttaki boyutlar verilir,
// özgün görsel ve boyut dosyasının kendisi verilmez.
export const panelGorseliUcu = ucTanimla({
  giris: "yonetici",
  sema: panelGorseliSemasi,
  izin: "duzen.gor",
  sinir: "gorsel",
  isle: async ({ d, b }) => {
    const gorsel = await gorselBoyutunuOku(siteninVeritabani(), d, b, dosyaKlasoru());
    if (gorsel === undefined) throw new BilinenHata("bulunamadi");
    return new DosyaYaniti(gorsel.icerik, gorsel.mime, gorsel.etiket, "ozel");
  },
});
