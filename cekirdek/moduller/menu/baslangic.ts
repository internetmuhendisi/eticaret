// Sitenin başlangıç menülerini (baslangic/menuler.json, kart 0107) bir kez yazar.
//
// - Ne zaman: arka plan süreci açılırken, başlangıç kataloğundan sonra (arka-plan-isleri/surec.ts). Menüler
//   hiç kurulmamışsa (menü tablosunda, silinmiş bile olsa, tek satır yoksa) dosya yazılır. Sonra dosya
//   kullanılmaz: mağaza sahibinin sildiği menü geri gelmez.
// - Nasıl: yalnız servislerle, tek işlemde; değişiklik kaydında yazan "baslangic-menu" adlı sistem işlemidir.
//   İşlem önce menü kilidini alır: aynı anda açılan iki süreç menüleri iki kez yazmaz.
// - Kilit sırası: menü, kategori, sonra bağlanılan satırlar (paylaşımlı). Kurulum birden çok kategori satırını
//   kilitler; kategori silme de üstü ve altlarını sırayla günceller. Kategori kilidi olmasa ikisi satırları ters
//   sırayla bekleyip kilitlenebilirdi (kart 0107 kontrolü). Kategori kilidini alan işler menü kilidini almaz.
//   Bağlanılan satırlar adres adından okunurken kilitlenir: okumayla bağlama arasında silinemez.
// - Kayıtlı hedef dosyada adres adıyla yazılır, silinmemiş kayda çevrilir. Site doğrulaması adres adının
//   başlangıç kataloğunda (sayfada başlangıç sayfalarında, kart 0273) olduğunu denetler; kurulumdan önce mağaza sahibi kaydı silmişse ya da adres adını
//   değiştirmişse öğe altlarıyla yazılmaz, hata bir kez kaydedilir, öteki öğeler yazılır.
import { and, inArray, isNull } from "drizzle-orm";
import type { Site } from "../../ayar-semasi/site-klasoru.ts";
import { hatayiKaydet } from "../../izleme/hata-katmani.ts";
import { sistemIslemi } from "../../kayitlar/degisiklik-islemleri.ts";
import type { Veritabani, VeritabaniIslemi } from "../../veritabani/baglanti.ts";
import { sabitSayfalar } from "../icerik/model.ts";
import { kategoriler } from "../kategori/model.ts";
import { kategoriKilidiAl } from "../kategori/servis.ts";
import { markalar } from "../marka/model.ts";
import { urunler } from "../urun/model.ts";
import { menuler } from "./model.ts";
import type {
  BaslangicKayitHedefi,
  BaslangicOgesi,
  MenuBaslangici,
  MenuHedefiGirdisi,
} from "./semalar.ts";
import { menuEkle, menuKilidiAl, ogeEkle } from "./servis.ts";

export const baslangicMenuYazari = sistemIslemi("baslangic-menu");

const tablolar = {
  kategori: kategoriler,
  marka: markalar,
  urun: urunler,
  sayfa: sabitSayfalar,
} as const satisfies Record<BaslangicKayitHedefi, unknown>;

// Dosyadaki adres adlarının silinmemiş kayıtları: türe göre adres adından kimliğe.
const kimlikleriBul = async (islem: VeritabaniIslemi, menuler: MenuBaslangici) => {
  const adlar: Record<BaslangicKayitHedefi, Set<string>> = {
    kategori: new Set(),
    marka: new Set(),
    urun: new Set(),
    sayfa: new Set(),
  };
  const topla = (ogeler: BaslangicOgesi[]) => {
    for (const oge of ogeler) {
      if ("adresAdi" in oge.hedef) adlar[oge.hedef.tur].add(oge.hedef.adresAdi);
      topla(oge.altlar);
    }
  };
  for (const menu of menuler) topla(menu.ogeler);
  const sonuc = {} as Record<BaslangicKayitHedefi, Map<string, string>>;
  for (const tur of Object.keys(tablolar) as BaslangicKayitHedefi[]) {
    const tablo = tablolar[tur];
    const aranan = [...adlar[tur]];
    const satirlar =
      aranan.length === 0
        ? []
        : await islem
            .select({ kimlik: tablo.kimlik, adresAdi: tablo.adres_adi })
            .from(tablo)
            .where(and(inArray(tablo.adres_adi, aranan), isNull(tablo.silinme_zamani)))
            .orderBy(tablo.kimlik)
            .for("share");
    sonuc[tur] = new Map(satirlar.map((satir) => [satir.adresAdi, satir.kimlik]));
  }
  return sonuc;
};

// Menüler yazıldıysa true; dosya boşsa ya da menüler kuruluysa false.
export const menuBaslangiciniKur = async (vt: Veritabani, site: Site): Promise<boolean> => {
  if (site.menuBaslangici.length === 0) return false;
  const bulunamayanlar: string[] = [];
  const yazildi = await vt.transaction(async (islem) => {
    await menuKilidiAl(islem);
    await kategoriKilidiAl(islem);
    const kurulu = await islem.select({ kimlik: menuler.kimlik }).from(menuler).limit(1);
    if (kurulu.length > 0) return false;
    const kimlikler = await kimlikleriBul(islem, site.menuBaslangici);
    for (const menu of site.menuBaslangici) {
      const menuKimligi = await menuEkle(islem, baslangicMenuYazari, {
        kod: menu.kod,
        ad: menu.ad,
        tur: menu.tur,
      });
      const yaz = async (ogeler: BaslangicOgesi[], ust: string | null) => {
        for (const oge of ogeler) {
          let hedef: MenuHedefiGirdisi;
          if ("adresAdi" in oge.hedef) {
            const kimlik = kimlikler[oge.hedef.tur].get(oge.hedef.adresAdi);
            if (kimlik === undefined) {
              bulunamayanlar.push(`${menu.kod}: ${oge.hedef.tur} ${oge.hedef.adresAdi}`);
              continue;
            }
            hedef = { tur: oge.hedef.tur, kimlik };
          } else {
            hedef = oge.hedef;
          }
          const kimlik = await ogeEkle(islem, baslangicMenuYazari, menuKimligi, {
            metin: oge.metin ?? null,
            hedef,
            ust,
          });
          await yaz(oge.altlar, kimlik);
        }
      };
      await yaz(menu.ogeler, null);
    }
    return true;
  });
  if (yazildi && bulunamayanlar.length > 0) {
    hatayiKaydet(
      new Error(
        `Başlangıç menülerinde bağlanılan kayıt bulunamadı, öğe yazılmadı: ${bulunamayanlar.join(", ")}.`,
      ),
      { kaynak: "menu-baslangici" },
    );
  }
  return yazildi;
};
