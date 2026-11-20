// Vitrin bölümleri ekranında bir bölümün adı, kısa özeti ve türlerin açıklaması (kart 0142). Ad bölüm tarifinin
// adıdır: kayan afiş panelde "Slider"dır (karar 0101, metin tek yerde). Özet görünümün adı, bölümün ilk dolu metin
// alanı ve liste alanlarının öğe sayısıdır: "İki yana · Kargo bedava" , "Görsel arkada · Slaytlar: 3".

import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { bolumKutuphanesi } from "../../vitrin/bolum-kutuphanesi/kutuphane";
import type { BolumTarifi } from "../../vitrin/bolum-kutuphanesi/tarif";
import type { EkranBolumu } from "./veri";

type Metin = (anahtar: MetinAnahtari) => string;

// Bölüm ekle penceresinde türün altındaki açıklama. Kütüphanedeki her türün açıklaması vardır (test).
export const turAciklamalari: Readonly<Record<string, MetinAnahtari>> = {
  "duyuru-seridi": "yonetim.bolumler.turAciklamasi.duyuru-seridi",
  "ust-satir": "yonetim.bolumler.turAciklamasi.ust-satir",
  "menu-satiri": "yonetim.bolumler.turAciklamasi.menu-satiri",
  "baglanti-sutunlari": "yonetim.bolumler.turAciklamasi.baglanti-sutunlari",
  "iletisim-bilgileri": "yonetim.bolumler.turAciklamasi.iletisim-bilgileri",
  "sosyal-hesaplar": "yonetim.bolumler.turAciklamasi.sosyal-hesaplar",
  "odeme-isaretleri": "yonetim.bolumler.turAciklamasi.odeme-isaretleri",
  "telif-satiri": "yonetim.bolumler.turAciklamasi.telif-satiri",
  "kayan-afis": "yonetim.bolumler.turAciklamasi.kayan-afis",
  "guven-seridi": "yonetim.bolumler.turAciklamasi.guven-seridi",
  "kampanya-afisleri": "yonetim.bolumler.turAciklamasi.kampanya-afisleri",
  "genis-afis": "yonetim.bolumler.turAciklamasi.genis-afis",
  "kategori-kutulari": "yonetim.bolumler.turAciklamasi.kategori-kutulari",
  "urun-vitrini": "yonetim.bolumler.turAciklamasi.urun-vitrini",
  "sekmeli-vitrin": "yonetim.bolumler.turAciklamasi.sekmeli-vitrin",
  firsatlar: "yonetim.bolumler.turAciklamasi.firsatlar",
  "marka-logolari": "yonetim.bolumler.turAciklamasi.marka-logolari",
  "musteri-yorumlari": "yonetim.bolumler.turAciklamasi.musteri-yorumlari",
  "blog-yazilari": "yonetim.bolumler.turAciklamasi.blog-yazilari",
  "bulten-kaydi": "yonetim.bolumler.turAciklamasi.bulten-kaydi",
};

export const bolumunAdi = (metin: Metin, tur: string): string =>
  Object.hasOwn(bolumKutuphanesi, tur)
    ? metin((bolumKutuphanesi[tur] as BolumTarifi).ad)
    : metin("yonetim.bolumler.tanimsizTur");

export const bolumOzeti = (
  metin: Metin,
  bolum: EkranBolumu,
  tarif: BolumTarifi | undefined,
): string => {
  if (tarif === undefined) return bolum.tur;
  const parcalar: string[] = [];
  const gorunum = tarif.gorunumler.find((secenek) => secenek.kod === bolum.gorunum);
  if (gorunum !== undefined && tarif.gorunumler.length > 1) parcalar.push(metin(gorunum.ad));
  // Bölümü tanıtan kısa yazı: tarifteki ilk dolu metin alanı (başlık, duyuru). Aynı türden iki bölüm ayırt edilir.
  const tanitan = Object.entries(tarif.alanlar).find(
    ([kod, alan]) => alan.tur === "metin" && typeof bolum.degerler[kod] === "string",
  );
  if (tanitan !== undefined) parcalar.push(String(bolum.degerler[tanitan[0]]));
  for (const [kod, alan] of Object.entries(tarif.alanlar)) {
    const deger = bolum.degerler[kod];
    if (alan.tur !== "liste" || !Array.isArray(deger)) continue;
    parcalar.push(
      doldur(metin("yonetim.bolumler.ogeSayisi"), {
        ad: metin(alan.ad),
        sayi: String(deger.length),
      }),
    );
  }
  return parcalar.join(" · ");
};
