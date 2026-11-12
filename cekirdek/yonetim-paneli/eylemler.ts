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
} as const satisfies Record<string, { ikon: IkonAdi; ad: MetinAnahtari }>;

export type PanelEylemi = keyof typeof panelEylemleri;
