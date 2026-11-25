// Ekip ekranlarının verisi (kart 0274, karar 0178), sunucuda: kullanıcılar, rollerin izin tablosu ve kullanıcının
// ayrıntısı. Kurallar ekip servisindedir; burada yalnız ekranın düğmelerini kapatacak durumlar (kendi hesabı, son
// mağaza sahibi) servisin okumasından çıkarılır, servis yine denetler.
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { modulIzinleri } from "../../kayitlar/izinler";
import { siteninBicimleyicisi } from "../../metinler/site-metni";
import { bekleyenDavetler } from "../../moduller/ekip/davet";
import { ekibiOku, rolleriOku } from "../../moduller/ekip/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";

export type EkipSatiri = {
  kimlik: string;
  eposta: string;
  // Davetle gelen yöneticinin adı (kart 0275); yoksa null.
  ad: string | null;
  roller: string[];
  ikiAsamaKurulu: boolean;
  // Biçimlenmiş; hiç girmediyse null.
  sonGiris: string | null;
  kendi: boolean;
};

export type EkipKisisi = EkipSatiri & {
  olusturulma: string;
  // Tam yetkili rolü olan son yönetici: tam yetkili rolü alınamaz, hesabı kapatılamaz.
  sonSahip: boolean;
};

export type RolSecenegi = { kod: string; tamYetki: boolean };

const bicim = () => siteninBicimleyicisi(calisanSite().ayarlar);

const okuVeKur = async (oturumKimligi: string) => {
  const vt = siteninVeritabani();
  const [uyeler, roller] = await Promise.all([ekibiOku(vt), rolleriOku(vt)]);
  const tamYetkili = new Set(roller.filter((rol) => rol.tamYetki).map((rol) => rol.kod));
  const sahipler = uyeler.filter((uye) => uye.roller.some((kod) => tamYetkili.has(kod)));
  const b = bicim();
  const satirlar = uyeler.map((uye) => ({
    kimlik: uye.kimlik,
    eposta: uye.eposta,
    ad: uye.ad,
    roller: uye.roller,
    ikiAsamaKurulu: uye.ikiAsamaKurulu,
    sonGiris: uye.sonGiris === null ? null : b.tarihSaat(uye.sonGiris),
    kendi: uye.kimlik === oturumKimligi,
    olusturulma: b.uzunTarih(uye.olusturulma),
    sonSahip: sahipler.length === 1 && sahipler[0]?.kimlik === uye.kimlik,
  }));
  return { satirlar, roller };
};

// Kullanıcılar listesi, e-postaya göre.
export const ekipListesiVerisi = async (oturumKimligi: string): Promise<EkipSatiri[]> =>
  (await okuVeKur(oturumKimligi)).satirlar.map(
    ({ olusturulma: _o, sonSahip: _s, ...satir }) => satir,
  );

// Kullanıcının ayrıntısı ve seçilebilecek roller; kullanıcı yoksa (kapatılmış, olmayan) undefined.
export const ekipKisiVerisi = async (
  kimlik: string,
  oturumKimligi: string,
): Promise<{ kisi: EkipKisisi; roller: RolSecenegi[] } | undefined> => {
  const { satirlar, roller } = await okuVeKur(oturumKimligi);
  const kisi = satirlar.find((satir) => satir.kimlik === kimlik);
  return kisi === undefined
    ? undefined
    : { kisi, roller: roller.map(({ kod, tamYetki }) => ({ kod, tamYetki })) };
};

// Bekleyen davetler (kart 0275): e-posta, roller ve son geçerli gün (sitenin biçimiyle).
export type DavetSatiri = { kimlik: string; eposta: string; roller: string[]; gecerlilik: string };

export const bekleyenDavetVerisi = async (): Promise<DavetSatiri[]> => {
  const b = bicim();
  return (await bekleyenDavetler(siteninVeritabani())).map((davet) => ({
    kimlik: davet.kimlik,
    eposta: davet.eposta,
    roller: davet.roller,
    gecerlilik: b.tarihSaat(davet.bitis),
  }));
};

// Davetle verilebilen roller: tam yetkili rol (mağaza sahibi) davetle verilmez (karar 0179), tanım sırasıyla.
export const davetRolleriVerisi = async (): Promise<string[]> =>
  (await rolleriOku(siteninVeritabani())).filter((rol) => !rol.tamYetki).map((rol) => rol.kod);

// İzin tablosunun grupları: modüllerin ekrandaki sırası (siparişten ayarlara). Kayıtta olup burada olmayan modül
// sona gelir: yeni modülün izni tablodan düşmez.
const grupSirasi = [
  "siparis",
  "musteri",
  "odeme-yontemi",
  "urun",
  "kategori",
  "marka",
  "etiket",
  "ozellik",
  "fiyat",
  "stok",
  "yorum",
  "dosya",
  "icerik",
  "duzen",
  "menu",
  "tema",
  "magaza-ayarlari",
  "vergi",
  "ekip",
];

export type IzinTablosu = {
  roller: RolSecenegi[];
  gruplar: { modul: string; izinler: { izin: string; roller: boolean[] }[] }[];
};

// Rollerin izin tablosu: her yönetici izni bir satır, modülüne göre gruplu; tam yetkili rol her izni taşır.
export const izinTablosuVerisi = async (): Promise<IzinTablosu> => {
  const roller = await rolleriOku(siteninVeritabani());
  const moduller = Object.keys(modulIzinleri).toSorted((a, b) => {
    const sira = (modul: string) => {
      const yer = grupSirasi.indexOf(modul);
      return yer === -1 ? grupSirasi.length : yer;
    };
    return sira(a) - sira(b) || a.localeCompare(b);
  });
  const gruplar = moduller
    .map((modul) => ({
      modul,
      izinler: Object.entries(modulIzinleri[modul as keyof typeof modulIzinleri])
        .filter(([, tanim]) => tanim.giris === "yonetici")
        .map(([izin]) => ({
          izin,
          roller: roller.map((rol) => rol.tamYetki || rol.izinler.includes(izin)),
        })),
    }))
    .filter((grup) => grup.izinler.length > 0);
  return { roller: roller.map(({ kod, tamYetki }) => ({ kod, tamYetki })), gruplar };
};
