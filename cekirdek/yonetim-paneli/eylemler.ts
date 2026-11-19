// Panel eylemlerinin tek kaydı (kart 0141, .claude/rules/yonetim-paneli.md): aynı eylem her sayfada aynı ikonla
// ve aynı adla durur. Komut çubuğu ve çerçeve eylemi yalnız koduyla ister (EylemDugmesi, EylemBaglantisi).
// "{ne}" taşıyan ad, eylemin nesnesini kullanan sayfadan alır: "Bölüm ekle", "Öğe ekle".
import type { IkonAdi } from "../../bilesenler/ikonlar/sozluk";
import type { MetinAnahtari } from "../metinler/metin";

export const panelEylemleri = {
  ekle: { ikon: "ekle", ad: "yonetim.eylem.ekle" },
  "onceki-hale-don": { ikon: "iade", ad: "yonetim.eylem.oncekiHaleDon" },
  "vitrine-git": { ikon: "yeni-sekme", ad: "yonetim.eylem.vitrineGit" },
  cikis: { ikon: "cikis", ad: "yonetim.cikis.dugme" },
  // Siparişin durum işlemleri (kart 0234): kodlar siparisIslemleri'ndekiyle aynıdır.
  "havale-onayla": { ikon: "havale", ad: "yonetim.eylem.havaleOnayla" },
  "hazirlamaya-al": { ikon: "paket", ad: "yonetim.eylem.hazirlamayaAl" },
  "kargoya-ver": { ikon: "kargo", ad: "yonetim.eylem.kargoyaVer" },
  "kargo-duzelt": { ikon: "duzenle", ad: "yonetim.eylem.kargoDuzelt" },
  "teslim-edildi": { ikon: "basari", ad: "yonetim.eylem.teslimEdildi" },
} as const satisfies Record<string, { ikon: IkonAdi; ad: MetinAnahtari }>;

export type PanelEylemi = keyof typeof panelEylemleri;
