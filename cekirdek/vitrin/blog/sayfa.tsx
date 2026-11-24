// Blog sayfaları (kart 0272, karar 0176): liste (/blog) ve yazı (/blog/<adres adı>). Sunucuda çizilir, tarayıcıya kod
// eklemez. Blog kapalıysa ya da yazı vitrinde değilse "bulunamadı"dır. Yazının içeriği aciklamayiTemizle'den geçmiş
// biçimli metindir, ürün açıklamasıyla aynı stille (bicimli-metin) çizilir. Kartın başlığının bağlantısı kartın tamamına
// yayılır (kartBaglantisi).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { SayfaBasligi } from "../../../bilesenler/parcalar/sayfa-basligi";
import { SayfaYolu } from "../../../bilesenler/parcalar/sayfa-yolu";
import { Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { calisanSite } from "../../ayar-semasi/calisan-site";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { kayitAdresiniCoz } from "../../moduller/gorunurluk/adres";
import {
  aciklamaKisalt,
  bulunamadiSayfaBilgisi,
  kayitSayfaBilgisi,
  sayfaBasligi,
} from "../../moduller/gorunurluk/sayfa-bilgisi";
import { magazaninAdi } from "../../moduller/magaza-ayarlari/servis";
import { siteninVeritabani } from "../../veritabani/baglanti";
import { blogListesiAdresi, kayitAdresleri, vitrinAdresleri } from "../adresler";
import { VitrinGorseli } from "../bolum-kutuphanesi/gorsel";
import { kartBaglantisi } from "../bolumler/ortak/kart-baglantisi";
import type { AdresParametreleri, SorguParametreleri } from "../kayit-sayfasi";
import { sorguMetni } from "../kayit-sayfasi";
import { type BlogKartiVerisi, blogAcikMi, blogListesiVerisi, blogYazisiVerisi } from "./veri";

const tekDeger = (deger: string | string[] | undefined): string | undefined =>
  Array.isArray(deger) ? deger[0] : deger;

const sayfaNumarasi = (deger: string | undefined): number =>
  deger !== undefined && /^\d{1,6}$/.test(deger) ? Number(deger) : 1;

const sayfaYoluMetinleri = () => ({
  etiket: metin("ortak.parca.sayfaYolu"),
  ayrac: metin("ortak.parca.sayfaYoluAyraci"),
});

// --- Liste ---

const listeVerisi = cache(async (kategori: string | undefined, sayfa: number) =>
  blogListesiVerisi(siteninVeritabani(), calisanSite(), { kategori, sayfa }),
);

const listeGirdisi = async (sorgu: SorguParametreleri) => {
  const degerler = await sorgu;
  return {
    kategori: tekDeger(degerler["kategori"]),
    sayfa: sayfaNumarasi(tekDeger(degerler["sayfa"])),
  };
};

export const blogListesiBilgisi = async (sorgu: SorguParametreleri): Promise<Metadata> => {
  const { kategori, sayfa } = await listeGirdisi(sorgu);
  const veri = await listeVerisi(kategori, sayfa);
  if (veri === null) return bulunamadiSayfaBilgisi();
  const baslik =
    veri.seciliKategori === undefined
      ? metin("vitrin.blog.baslik")
      : doldur(metin("vitrin.blog.kategoriBasligi"), { kategori: veri.seciliKategori.ad });
  return {
    title: await sayfaBasligi(baslik),
    description: aciklamaKisalt(
      doldur(metin("vitrin.sayfaBilgisi.aciklama.blog"), { magaza: await magazaninAdi() }),
    ),
    // Kategori ve sayfa seçili listenin kanonik adresi kendisidir; bilinmeyen kategori bütün listeye düşer.
    alternates: {
      canonical: blogListesiAdresi({
        kategori: veri.seciliKategori?.adresAdi,
        sayfa: veri.sayfa,
      }),
    },
  };
};

function BlogKarti({ yazi, oncelikli }: { yazi: BlogKartiVerisi; oncelikli: boolean }) {
  return (
    <article className="relative flex min-w-0 flex-col gap-2">
      <div className="flex aspect-16/10 items-center justify-center overflow-hidden rounded-orta bg-yuzey">
        {yazi.kapak === null ? null : (
          <VitrinGorseli
            gorsel={yazi.kapak.gorsel}
            alt=""
            genislik="ucteBir"
            oncelikli={oncelikli}
            className="size-full object-cover"
          />
        )}
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-kucuk text-soluk-yazi">
        {yazi.kategori === null ? null : <span>{yazi.kategori.ad}</span>}
        <time dateTime={yazi.tarih.makine}>{yazi.tarih.yazili}</time>
      </p>
      <h2 className="font-baslik text-buyuk font-baslik-kalinligi wrap-anywhere">
        <Link href={yazi.adres} className={kartBaglantisi}>
          {yazi.baslik}
        </Link>
      </h2>
      {yazi.ozet === null ? null : <p className="text-soluk-yazi wrap-anywhere">{yazi.ozet}</p>}
    </article>
  );
}

// Listede ilk satırdaki kartların kapağı öncelikli yüklenir (ilk ekranda görünür).
const oncelikliKapakSayisi = 3;

export async function BlogListesiSayfasi({ sorgu }: { sorgu: SorguParametreleri }) {
  const { kategori, sayfa } = await listeGirdisi(sorgu);
  const veri = await listeVerisi(kategori, sayfa);
  if (veri === null) notFound();
  const secili = veri.seciliKategori?.adresAdi;
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col gap-2 px-4 pt-5 pb-12 tablet:px-6">
      <SayfaYolu
        {...sayfaYoluMetinleri()}
        adimlar={[
          { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
          { ad: metin("vitrin.blog.baslik"), adres: vitrinAdresleri.blog },
        ]}
      />
      <SayfaBasligi baslik={metin("vitrin.blog.baslik")} className="mb-3" />
      {veri.kategoriler.length === 0 ? null : (
        <nav aria-label={metin("vitrin.blog.kategoriler")} className="mb-4">
          <ul className="flex flex-wrap gap-2">
            {[{ ad: metin("vitrin.blog.hepsi"), adresAdi: undefined }, ...veri.kategoriler].map(
              (k) => (
                <li key={k.adresAdi ?? ""}>
                  <Baglanti
                    href={blogListesiAdresi({ kategori: k.adresAdi })}
                    gorunum={k.adresAdi === secili ? "ikincil" : "cerceveli"}
                    {...(k.adresAdi === secili ? { "aria-current": "page" as const } : {})}
                  >
                    {k.ad}
                  </Baglanti>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
      {veri.yazilar.length === 0 ? (
        <BosHal
          ikon="yazi"
          baslik={metin("vitrin.blog.bos.baslik")}
          aciklama={metin("vitrin.blog.bos.aciklama")}
        >
          <Baglanti href={vitrinAdresleri.anasayfa} gorunum="cerceveli">
            {metin("vitrin.blog.bos.anasayfa")}
          </Baglanti>
        </BosHal>
      ) : (
        <ul className="grid grid-cols-1 gap-6 tablet:grid-cols-2 masaustu:grid-cols-3">
          {veri.yazilar.map((yazi, sira) => (
            <li key={yazi.kimlik} className="flex">
              <BlogKarti yazi={yazi} oncelikli={sayfa === 1 && sira < oncelikliKapakSayisi} />
            </li>
          ))}
        </ul>
      )}
      <Sayfalama
        className="mt-8"
        sayfa={veri.sayfa}
        toplamSayfa={veri.sayfaSayisi}
        adres={(hedef) => blogListesiAdresi({ kategori: secili, sayfa: hedef })}
        metinler={{
          etiket: metin("ortak.parca.sayfalar"),
          onceki: metin("ortak.parca.oncekiSayfa"),
          sonraki: metin("ortak.parca.sonrakiSayfa"),
          sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
          bosluk: metin("ortak.parca.atlananSayfalar"),
        }}
      />
    </main>
  );
}

// --- Yazı ---

// Adres adının çözümü ve yazının verisi istek başına bir kez (sayfa bilgisi ve sayfa aynı sonucu kullanır).
const yaziCozumu = cache(async (adresAdi: string) => {
  const vt = siteninVeritabani();
  // Blog kapalıyken eski adres de yönlenmez: bulunamadı.
  if (!(await blogAcikMi(vt, calisanSite()))) return { sonuc: "yok" as const };
  const sonuc = await kayitAdresiniCoz(vt, "blog-yazisi", adresAdi);
  if (sonuc.sonuc !== "kayit") return sonuc;
  const yazi = await blogYazisiVerisi(vt, calisanSite(), sonuc.kayit.kimlik);
  return yazi === null
    ? { sonuc: "yok" as const }
    : { sonuc: "kayit" as const, kayit: sonuc.kayit, yazi };
});

const sayfaninYazisi = async (parametreler: AdresParametreleri, sorgu: SorguParametreleri) => {
  const sonuc = await yaziCozumu((await parametreler).adresAdi);
  if (sonuc.sonuc === "yok") notFound();
  if (sonuc.sonuc === "yonlendir") {
    permanentRedirect(`${kayitAdresleri["blog-yazisi"](sonuc.adresAdi)}${sorguMetni(await sorgu)}`);
  }
  return sonuc;
};

export const blogYazisiBilgisi = async (
  parametreler: AdresParametreleri,
  sorgu: SorguParametreleri,
): Promise<Metadata> => {
  const sonuc = await yaziCozumu((await parametreler).adresAdi);
  if (sonuc.sonuc === "yok") return bulunamadiSayfaBilgisi();
  const { kayit } = await sayfaninYazisi(parametreler, sorgu);
  return kayitSayfaBilgisi("blog-yazisi", kayit);
};

export async function BlogYazisiSayfasi({
  parametreler,
  sorgu,
}: {
  parametreler: AdresParametreleri;
  sorgu: SorguParametreleri;
}) {
  const { yazi } = await sayfaninYazisi(parametreler, sorgu);
  const yazar = yazi.yazar ?? (await magazaninAdi());
  return (
    <main className="mx-auto flex w-full max-w-icerik flex-col px-4 pt-5 pb-12 tablet:px-6">
      <article className="mx-auto flex w-full max-w-metin min-w-0 flex-col gap-4">
        <SayfaYolu
          {...sayfaYoluMetinleri()}
          adimlar={[
            { ad: metin("vitrin.sayfa.anasayfa"), adres: vitrinAdresleri.anasayfa },
            { ad: metin("vitrin.blog.baslik"), adres: vitrinAdresleri.blog },
            { ad: yazi.baslik, adres: yazi.adres },
          ]}
        />
        <p className="flex flex-wrap items-center gap-x-3 text-kucuk text-soluk-yazi">
          {yazi.kategori === null ? null : (
            <Baglanti
              href={blogListesiAdresi({ kategori: yazi.kategori.adresAdi })}
              className="min-h-11 text-kucuk font-normal text-soluk-yazi"
            >
              {yazi.kategori.ad}
            </Baglanti>
          )}
          <time dateTime={yazi.tarih.makine}>{yazi.tarih.yazili}</time>
          <span>{yazar}</span>
        </p>
        <SayfaBasligi baslik={yazi.baslik} />
        {yazi.kapak === null ? null : (
          <VitrinGorseli
            gorsel={yazi.kapak.gorsel}
            alt={yazi.kapak.metin}
            genislik="tam"
            oncelikli
            className="aspect-16/10 w-full rounded-orta object-cover"
          />
        )}
        {yazi.icerik === undefined ? null : (
          <div
            data-slot="bicimli-metin"
            className="bicimli-metin text-govde wrap-anywhere"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: içerik aciklamayiTemizle'den geçmiştir (karar 0108, 0176).
            dangerouslySetInnerHTML={{ __html: yazi.icerik }}
          />
        )}
        <Baglanti href={vitrinAdresleri.blog} gorunum="sade" className="self-start">
          <Ikon ad="onceki" />
          {metin("vitrin.blog.butunYazilar")}
        </Baglanti>
      </article>
    </main>
  );
}
