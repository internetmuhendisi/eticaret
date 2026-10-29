// Sunucunun seviyeli günlüğü (kart 0014, karar 0025, .claude/rules/hata-izleme.md).
// Her satır tek satırlık JSON'dur: zaman, seviye, site kod adı, çekirdek sürümü, mesaj ve
// isteğe bağlı alanlar. Alanlar yazılmadan önce maskelenir (maskele.ts). Bilgi ve uyarı standart çıktıya,
// hata ve ölümcül standart hataya gider. Günlük hiçbir zaman hata fırlatmaz.
import { calisanSite } from "../ayar-semasi/calisan-site.ts";
import type { GunlukSeviyesi } from "../kayitlar/izleme.ts";
import { cekirdekSurumu } from "../surum.ts";
import { maskele, metniMaskele } from "./maskele.ts";

export type GunlukAlanlari = Record<string, unknown>;

export type Gunluk = Record<GunlukSeviyesi, (mesaj: string, alanlar?: GunlukAlanlari) => void>;

export type GunlukSecenekleri = {
  // Sitenin kod adı. Site okunamıyorsa (komut ya da test) null yazılır.
  site?: () => string | null;
  yaz?: (satir: string, seviye: GunlukSeviyesi) => void;
};

const calisanSiteninKodAdi = (): string | null => {
  try {
    return calisanSite().kimlik.kodAdi;
  } catch {
    return null;
  }
};

const agirSeviyeler = new Set<GunlukSeviyesi>(["hata", "olumcul"]);

const standartCikti = (satir: string, seviye: GunlukSeviyesi): void => {
  (agirSeviyeler.has(seviye) ? process.stderr : process.stdout).write(`${satir}\n`);
};

export const gunlukOlustur = ({
  site = calisanSiteninKodAdi,
  yaz = standartCikti,
}: GunlukSecenekleri = {}): Gunluk => {
  const satirYaz =
    (seviye: GunlukSeviyesi) =>
    (mesaj: string, alanlar: GunlukAlanlari = {}): void => {
      try {
        yaz(
          JSON.stringify({
            zaman: new Date().toISOString(),
            seviye,
            site: site(),
            cekirdekSurumu,
            mesaj: metniMaskele(mesaj),
            // Alanlar ayrı bir dalda durur; sabit alanların (zaman, seviye) üzerine yazamaz.
            ...(Object.keys(alanlar).length === 0 ? {} : { alanlar: maskele(alanlar) }),
          }),
          seviye,
        );
      } catch {
        // Günlüğe yazılamadıysa uygulama yine çalışmaya devam eder.
      }
    };
  return {
    bilgi: satirYaz("bilgi"),
    uyari: satirYaz("uyari"),
    hata: satirYaz("hata"),
    olumcul: satirYaz("olumcul"),
  };
};

// Uygulamanın günlüğü. Bütün sunucu kodu günlüğe yalnız bununla yazar.
export const gunluk = gunlukOlustur();
