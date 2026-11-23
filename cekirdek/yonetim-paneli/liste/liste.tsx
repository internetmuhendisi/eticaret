"use client";
// Panelin ortak liste ekranı (kart 0258, .claude/rules/liste-motoru.md; taslak: planlar/tasarim-yonu/panel.html,
// "Ortak liste parçaları"). Bütün panel listeleri bu parçadan çıkar; listeye özgü olan yalnız tanım (tanim.ts),
// sütunların hücreleri, telefondaki kartın içi ve metinlerdir.
//
// - Durum adreste: sekme, süzgeç, sıralama, sayfa (ve adreste olan arama). Listenin içindeki bağlantılar ve menüler
//   adresi değiştirir; sunucu yeni sayfayı çizer. Geçiş sürerken satırların yerinde iskelet durur, tablo "yükleniyor"
//   olarak duyurulur.
// - Adreste olmayan arama (sipariş: kişisel bilgi) liste ucuna gider; sonuç aynı tabloda gösterilir, sekme, süzgeç,
//   sıralama ve sayfa değişince aranan metinle yeniden sorulur.
// - Satır seçimi tek tek ve sayfanın hepsi; seçim yalnız toplu işlemi olan ve izni olan yöneticide görünür. Seçim
//   varken toplu işlem çubuğu çıkar; işlem önce onay penceresiyle sorulur, sonuçta kaç satırın işlendiği ve
//   işlenemeyenlerin nedeni yazar, odak sonuca gider. Seçim sayısı ve sonuç ekran okuyucuya duyurulur.
// - Masaüstünde (tablet ve üstü) tablo, telefonda her satır bir kart.
// - Hâller: boş (hiç kayıt yok), sonuçsuz (süzgeç ya da aramayla eşleşen yok), yükleniyor, hata (okunamadı).
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { Form, GonderDugmesi } from "../../../bilesenler/form/form";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import type { IkonAdi } from "../../../bilesenler/ikonlar/sozluk";
import {
  AcilirMenu,
  AcilirMenuIcerigi,
  AcilirMenuOnayOgesi,
  AcilirMenuRadyoGrubu,
  AcilirMenuRadyoOgesi,
  AcilirMenuTetikleyici,
} from "../../../bilesenler/parcalar/acilir-menu";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { BosHal } from "../../../bilesenler/parcalar/bos-hal";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Ipucu } from "../../../bilesenler/parcalar/ipucu";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { Sayfalama } from "../../../bilesenler/parcalar/sayfalama";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { TabloSecimi } from "../../../bilesenler/parcalar/tablo-secimi";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import type { TopluSonuc } from "../../kayitlar/liste";
import { doldur } from "../../metinler/doldur";
import { usePanelMetni } from "../../metinler/panel-metni";
import { panelIstegi } from "../panel-istegi";
import {
  type ListeDurumu,
  type ListeTanimi,
  type ListeVerisi,
  listeAdresi,
  listeSorgusu,
  suzgecliMi,
  tarihDegeriniCoz,
} from "./tanim";
import { TarihSuzgeci } from "./tarih-suzgeci";

export type SutunTanimi<Satir> = {
  kod: string;
  baslik: string;
  // Tutar gibi sağa yaslı sütun.
  sag?: boolean;
  hucre: (satir: Satir) => ReactNode;
};

export type TopluIslemTanimi<Satir> = {
  kod: string;
  // Çubuktaki düğmenin yazısı: "Hazırlamaya al".
  ad: string;
  onay: (sayi: number) => { baslik: string; aciklama: string; onayEtiketi: string };
  // Kapıdaki uç (panelIstegi yolu) ve seçilen satırlardan gövdesi.
  uc: string;
  govde: (satirlar: Satir[]) => unknown;
  // Sonucun metinleri: işlenen sayısı ve işlenemeyenin nedeninin kodu.
  basari: (sayi: number) => string;
  neden: (kod: string) => string;
};

export type ListeOzellikleri<Satir> = {
  tanim: ListeTanimi;
  durum: ListeDurumu;
  // Okunamadıysa null (hata hâli).
  veri: ListeVerisi<Satir> | null;
  // Tablonun ve telefondaki listenin adı: "Siparişler".
  ad: string;
  sutunlar: readonly SutunTanimi<Satir>[];
  telefon: (satir: Satir) => ReactNode;
  anahtar: (satir: Satir) => string;
  // Seçim kutusunun ve sonuçtaki satırın adı.
  satirAdi: (satir: Satir) => string;
  suzgecAdlari: Readonly<Record<string, { ad: string; secenek: (deger: string) => string }>>;
  // Kayıt ve değer süzgeçlerinin seçenekleri (kart 0262, 0267): sunucunun verdiği sırayla. Seçili olup listede
  // olmayan kayıt (silinmiş) şeritte kaldırılabilir, adı "bilinmeyen kayıt" yazar; değer süzgecinde değerin kendisi.
  kayitSecenekleri?: Readonly<Record<string, readonly { deger: string; ad: string }[]>>;
  // Tarih süzgecindeki günlerin sitenin biçimiyle yazılışı (kart 0267): sunucu verir, tarayıcı biçimlemez.
  gunYazilari?: Readonly<Record<string, string>>;
  siralamaAdi: (kod: string) => string;
  arama?: { etiket: string; yerTutucu: string };
  bos: { ikon: IkonAdi; baslik: string; aciklama: string; eylem?: ReactNode };
  // Yöneticinin izni olan toplu işlemler (sunucu süzer).
  topluIslemler: readonly TopluIslemTanimi<Satir>[];
};

type Sonuc =
  | { tur: "bitti"; islem: string; sonuc: TopluSonuc; adlar: Record<string, string> }
  | { tur: "hata"; kod: string };

export function Liste<Satir>({
  tanim,
  durum,
  veri,
  ad,
  sutunlar,
  telefon,
  anahtar,
  satirAdi,
  suzgecAdlari,
  siralamaAdi,
  arama,
  bos,
  topluIslemler,
  kayitSecenekleri = {},
  gunYazilari = {},
}: ListeOzellikleri<Satir>) {
  const metin = usePanelMetni();
  const router = useRouter();
  const kimlik = useId();
  const [gecisSuruyor, gecisiBaslat] = useTransition();

  // Adreste olmayan arama: aranan metin ve ucun sonucu. Aynı anda iki istekte yalnız sonuncunun cevabı yazılır.
  const aramaAdreste = tanim.arama?.adreste === true;
  // Adreste olan aramada aranan metin adresinkidir; kutu adres değişince (geri, ileri, temizle) onunla eşitlenir.
  const [gizliAranan, setGizliAranan] = useState("");
  const aranan = aramaAdreste ? durum.ara : gizliAranan;
  const [yazilan, setYazilan] = useState(aramaAdreste ? durum.ara : "");
  const [adresinAramasi, setAdresinAramasi] = useState(durum.ara);
  if (aramaAdreste && adresinAramasi !== durum.ara) {
    setAdresinAramasi(durum.ara);
    setYazilan(durum.ara);
  }
  const [aramaVerisi, setAramaVerisi] = useState<ListeVerisi<Satir> | null | undefined>(undefined);
  const [aramaSuruyor, setAramaSuruyor] = useState(false);
  const [yenile, setYenile] = useState(0);
  const istekSirasi = useRef(0);
  const durumSorgusu = listeSorgusu(tanim, durum).toString();

  useEffect(() => {
    if (aramaAdreste || aranan === "") return;
    void yenile;
    const sira = ++istekSirasi.current;
    setAramaSuruyor(true);
    const sorgu = new URLSearchParams(durumSorgusu);
    sorgu.set("ara", aranan);
    void panelIstegi<ListeVerisi<Satir>>(`${tanim.kod}?${sorgu.toString()}`).then((yanit) => {
      if (sira !== istekSirasi.current) return;
      setAramaVerisi(yanit.tamam ? yanit.veri : null);
      setAramaSuruyor(false);
    });
  }, [aramaAdreste, aranan, durumSorgusu, tanim.kod, yenile]);

  const aramada = !aramaAdreste && aranan !== "";
  const gosterilen = aramada ? aramaVerisi : veri;
  const yukleniyor = gecisSuruyor || (aramada && (aramaSuruyor || aramaVerisi === undefined));

  // Seçim: yalnız gösterilen sayfanın satırları. Sayfa, süzgeç, sıralama ya da arama değişince seçim bırakılır.
  const [secilen, setSecilen] = useState<ReadonlySet<string>>(new Set());
  const secimAnahtari = `${durumSorgusu}|${aranan}`;
  const [oncekiSecimAnahtari, setOncekiSecimAnahtari] = useState(secimAnahtari);
  if (oncekiSecimAnahtari !== secimAnahtari) {
    setOncekiSecimAnahtari(secimAnahtari);
    setSecilen(new Set());
  }
  const satirlar = gosterilen?.satirlar ?? [];
  const anahtarlar = satirlar.map(anahtar);
  const seciliAnahtarlar = anahtarlar.filter((a) => secilen.has(a));
  const secimVar = topluIslemler.length > 0;
  const sayfaninHepsi =
    seciliAnahtarlar.length === 0
      ? false
      : seciliAnahtarlar.length === anahtarlar.length
        ? true
        : ("kismen" as const);
  const sec = (a: string, isaretli: boolean) =>
    setSecilen((onceki) => {
      const yeni = new Set(onceki);
      if (isaretli) yeni.add(a);
      else yeni.delete(a);
      return yeni;
    });

  // Toplu işlem: onay penceresi, istek, sonuç. Sonuç gelince odak sonuca gider.
  const [bekleyen, setBekleyen] = useState<TopluIslemTanimi<Satir> | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const sonucKutusu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sonuc !== null) sonucKutusu.current?.focus();
  }, [sonuc]);

  // Listenin içindeki bağlantılar (sekme, sayfa, süzgeç şeridi, sütun başlığı) geçişle açılır: geçiş sürerken
  // iskelet görünür. Yeni sekmede açma ve başka sayfaya giden bağlantı tarayıcıya bırakılır.
  const git = (adres: string) => {
    setSonuc(null);
    gecisiBaslat(() => router.push(adres, { scroll: false }));
  };
  const tiklamayiYakala = (olay: MouseEvent<HTMLDivElement>) => {
    if (olay.defaultPrevented || olay.button !== 0) return;
    if (olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey) return;
    const bag = (olay.target as HTMLElement).closest("a[href]");
    if (!(bag instanceof HTMLAnchorElement) || bag.target !== "") return;
    const hedef = new URL(bag.href, window.location.href);
    if (hedef.origin !== window.location.origin || hedef.pathname !== tanim.adres) return;
    olay.preventDefault();
    git(`${hedef.pathname}${hedef.search}`);
  };

  const ara = (olay: FormEvent<HTMLFormElement>) => {
    olay.preventDefault();
    const metni = Array.from(yazilan.trim())
      .slice(0, tanim.arama?.enCok ?? 0)
      .join("");
    setSonuc(null);
    if (aramaAdreste) {
      git(listeAdresi(tanim, durum, { ara: metni }));
      return;
    }
    // Aynı metin yeniden gönderilince de sorulur (sayaç).
    setGizliAranan(metni);
    setYenile((sayi) => sayi + 1);
    if (durum.sayfa > 1) git(listeAdresi(tanim, durum, {}));
  };
  const aramayiTemizle = () => {
    setYazilan("");
    setSonuc(null);
    if (aramaAdreste) {
      git(listeAdresi(tanim, durum, { ara: "" }));
      return;
    }
    setGizliAranan("");
    setAramaVerisi(undefined);
  };

  const topluIslemYap = async (islem: TopluIslemTanimi<Satir>) => {
    const seciliSatirlar = satirlar.filter((satir) => secilen.has(anahtar(satir)));
    const adlar = Object.fromEntries(
      seciliSatirlar.map((satir) => [anahtar(satir), satirAdi(satir)]),
    );
    const yanit = await panelIstegi<TopluSonuc>(islem.uc, islem.govde(seciliSatirlar));
    setSecilen(new Set());
    setSonuc(
      yanit.tamam
        ? { tur: "bitti", islem: islem.kod, sonuc: yanit.veri, adlar }
        : { tur: "hata", kod: yanit.kod },
    );
    router.refresh();
    if (aramada) setYenile((sayi) => sayi + 1);
  };

  const sekme = tanim.suzgecler.find((suzgec) => suzgec.tur === "sekme");
  // Şeritteki süzgeçler, tanımın sırasıyla: açılır menüde tanımdaki seçenekler ya da sunucunun verdiği kayıtlar ve
  // değerler; tarih süzgeci kendi panelinde (TarihSuzgeci).
  const secenekSuzgecleri = tanim.suzgecler.filter((suzgec) => suzgec.tur !== "sekme");
  const sunucununMu = (suzgec: (typeof tanim.suzgecler)[number]) =>
    suzgec.tur === "kayit" || suzgec.tur === "deger";
  const suzgecSecenekleri = (suzgec: (typeof tanim.suzgecler)[number]) =>
    sunucununMu(suzgec)
      ? (kayitSecenekleri[suzgec.kod] ?? [])
      : suzgec.secenekler.map((deger) => ({
          deger,
          ad: suzgecAdlari[suzgec.kod]?.secenek(deger) ?? deger,
        }));
  // Tarih süzgecinin şeritteki yazısı: hazır aralığın adı ya da sitenin biçimiyle günler.
  const tarihYazisi = (deger: string) => {
    const cozulen = tarihDegeriniCoz(deger);
    if (cozulen === undefined) return deger;
    if (cozulen.tur === "hazir") return metin(`yonetim.liste.tarih.hazir.${cozulen.kod}`);
    const gun = (gunu: string | null) => (gunu === null ? "" : (gunYazilari[gunu] ?? gunu));
    if (cozulen.baslangic === null) {
      return doldur(metin("yonetim.liste.tarih.bitiseKadar"), { son: gun(cozulen.bitis) });
    }
    if (cozulen.bitis === null) {
      return doldur(metin("yonetim.liste.tarih.baslangictan"), { bas: gun(cozulen.baslangic) });
    }
    return doldur(metin("yonetim.liste.tarih.araligi"), {
      bas: gun(cozulen.baslangic),
      son: gun(cozulen.bitis),
    });
  };
  const degerAdi = (suzgec: (typeof tanim.suzgecler)[number], deger: string) =>
    suzgec.tur === "tarih"
      ? tarihYazisi(deger)
      : sunucununMu(suzgec)
        ? (kayitSecenekleri[suzgec.kod]?.find((secenek) => secenek.deger === deger)?.ad ??
          (suzgec.tur === "deger" ? deger : metin("yonetim.liste.bilinmeyenKayit")))
        : (suzgecAdlari[suzgec.kod]?.secenek(deger) ?? deger);
  const seciliCipler = tanim.suzgecler.flatMap((suzgec) =>
    (durum.suzgecler[suzgec.kod] ?? []).map((deger) => ({ suzgec, deger })),
  );
  const suzgecDegeri = (kod: string, degerler: string[]) => ({
    suzgecler: { ...durum.suzgecler, [kod]: degerler },
  });

  const sekmeSeridi =
    sekme === undefined ? null : (
      <nav
        aria-label={suzgecAdlari[sekme.kod]?.ad}
        className="overflow-x-auto border-b border-kenar"
      >
        <ul className="flex gap-1">
          {[null, ...sekme.secenekler]
            .filter(
              (deger) =>
                deger === null ||
                (gosterilen?.sekmeSayilari[deger] ?? 0) > 0 ||
                durum.suzgecler[sekme.kod]?.[0] === deger,
            )
            .map((deger) => {
              const secili = (durum.suzgecler[sekme.kod]?.[0] ?? null) === deger;
              return (
                <li key={deger ?? ""} className="shrink-0">
                  <Baglanti
                    href={listeAdresi(
                      tanim,
                      durum,
                      suzgecDegeri(sekme.kod, deger === null ? [] : [deger]),
                    )}
                    prefetch={false}
                    aria-current={secili ? "page" : undefined}
                    className={sinif(
                      "min-h-11 gap-2 rounded-none border-b-2 px-3 text-kucuk whitespace-nowrap no-underline",
                      secili ? "border-yazi text-yazi" : "border-transparent text-soluk-yazi",
                    )}
                  >
                    {deger === null
                      ? metin("yonetim.liste.tumu")
                      : (suzgecAdlari[sekme.kod]?.secenek(deger) ?? deger)}
                    <Rozet tur="ikincil">{gosterilen?.sekmeSayilari[deger ?? ""] ?? 0}</Rozet>
                  </Baglanti>
                </li>
              );
            })}
        </ul>
      </nav>
    );

  const aracSeridi = (
    <div className="flex flex-wrap items-end gap-2">
      {tanim.arama === null || arama === undefined ? null : (
        <Form
          kodGerekliMetni={metin("ortak.form.kodGerekli")}
          yukleniyorMetni={metin("ortak.form.yukleniyor")}
          onSubmit={ara}
          role="search"
          aria-label={arama.etiket}
          className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2 tablet:max-w-form tablet:basis-auto"
        >
          {/* Taslaktaki gibi tek kutu: alan ve içinde ikonlu gönder düğmesi. */}
          <span className="flex min-h-11 min-w-0 flex-1 items-center overflow-hidden rounded-dugme border border-alan-kenari bg-zemin">
            <GirisAlani
              type="search"
              autoComplete="off"
              aria-label={arama.etiket}
              maxLength={tanim.arama.enCok}
              placeholder={arama.yerTutucu}
              value={yazilan}
              onChange={(olay) => setYazilan(olay.target.value)}
              className="min-w-0 flex-1 rounded-none border-0 bg-transparent"
            />
            <Ipucu metin={metin("yonetim.liste.ara")}>
              <GonderDugmesi
                tur="sade"
                aria-label={metin("yonetim.liste.ara")}
                className="size-11 shrink-0 rounded-none px-0"
              >
                <Ikon ad="arama" />
              </GonderDugmesi>
            </Ipucu>
          </span>
          {aranan === "" ? null : (
            <Dugme tur="sade" onClick={aramayiTemizle}>
              {metin("yonetim.liste.aramayiTemizle")}
            </Dugme>
          )}
        </Form>
      )}
      {secenekSuzgecleri.map((suzgec) => {
        const secili = durum.suzgecler[suzgec.kod] ?? [];
        const adi = suzgecAdlari[suzgec.kod];
        if (suzgec.tur === "tarih") {
          return (
            <TarihSuzgeci
              key={suzgec.kod}
              ad={adi?.ad ?? suzgec.kod}
              hazirlar={suzgec.secenekler}
              secili={secili[0]}
              degistir={(deger) =>
                git(
                  listeAdresi(
                    tanim,
                    durum,
                    suzgecDegeri(suzgec.kod, deger === null ? [] : [deger]),
                  ),
                )
              }
            />
          );
        }
        return (
          <AcilirMenu key={suzgec.kod}>
            <AcilirMenuTetikleyici asChild>
              <Dugme tur="cerceveli" className="px-3">
                {adi?.ad}
                {secili.length === 0 ? null : <Rozet tur="ikincil">{secili.length}</Rozet>}
                <Ikon ad="asagi" />
              </Dugme>
            </AcilirMenuTetikleyici>
            <AcilirMenuIcerigi align="start">
              {suzgecSecenekleri(suzgec).map(({ deger, ad: secenekAdi }) => (
                <AcilirMenuOnayOgesi
                  key={deger}
                  checked={secili.includes(deger)}
                  // Menü açık kalır: birden çok değer art arda seçilir, her seçim adrese yazılır.
                  onSelect={(olay) => olay.preventDefault()}
                  onCheckedChange={(isaretli) =>
                    git(
                      listeAdresi(
                        tanim,
                        durum,
                        suzgecDegeri(
                          suzgec.kod,
                          isaretli === true
                            ? [...secili, deger]
                            : secili.filter((oge) => oge !== deger),
                        ),
                      ),
                    )
                  }
                >
                  {secenekAdi}
                </AcilirMenuOnayOgesi>
              ))}
            </AcilirMenuIcerigi>
          </AcilirMenu>
        );
      })}
      {tanim.siralamalar.length < 2 ? null : (
        <AcilirMenu>
          <AcilirMenuTetikleyici asChild>
            <Dugme tur="cerceveli" className="px-3 tablet:ml-auto">
              {doldur(metin("yonetim.liste.siralama"), { ad: siralamaAdi(durum.siralama) })}
              <Ikon ad="asagi" />
            </Dugme>
          </AcilirMenuTetikleyici>
          <AcilirMenuIcerigi align="end">
            <AcilirMenuRadyoGrubu
              value={durum.siralama}
              onValueChange={(siralama) => git(listeAdresi(tanim, durum, { siralama }))}
            >
              {tanim.siralamalar.map((kod) => (
                <AcilirMenuRadyoOgesi key={kod} value={kod}>
                  {siralamaAdi(kod)}
                </AcilirMenuRadyoOgesi>
              ))}
            </AcilirMenuRadyoGrubu>
          </AcilirMenuIcerigi>
        </AcilirMenu>
      )}
    </div>
  );

  const ciplerSeridi =
    seciliCipler.filter(({ suzgec }) => suzgec.tur !== "sekme").length === 0 ? null : (
      <ul aria-label={metin("yonetim.liste.seciliSuzgecler")} className="flex flex-wrap gap-2">
        {seciliCipler
          .filter(({ suzgec }) => suzgec.tur !== "sekme")
          .map(({ suzgec, deger }) => {
            const yazi = `${suzgecAdlari[suzgec.kod]?.ad}: ${degerAdi(suzgec, deger)}`;
            return (
              <li key={`${suzgec.kod}-${deger}`}>
                <Baglanti
                  href={listeAdresi(
                    tanim,
                    durum,
                    suzgecDegeri(
                      suzgec.kod,
                      (durum.suzgecler[suzgec.kod] ?? []).filter((oge) => oge !== deger),
                    ),
                  )}
                  prefetch={false}
                  gorunum="cerceveli"
                  aria-label={doldur(metin("yonetim.liste.suzgeciKaldir"), { ad: yazi })}
                  className="gap-1 rounded-full px-3 text-kucuk font-normal no-underline"
                >
                  {yazi}
                  <Ikon ad="kapat" />
                </Baglanti>
              </li>
            );
          })}
        <li>
          <Baglanti
            href={listeAdresi(tanim, { ...durum, suzgecler: {} }, {})}
            prefetch={false}
            className="text-kucuk"
          >
            {metin("yonetim.liste.suzgecleriTemizle")}
          </Baglanti>
        </li>
      </ul>
    );

  const sonucKutusuIcerigi =
    sonuc === null ? null : sonuc.tur === "hata" ? (
      <Uyari tur="tehlike">
        {metin(sonuc.kod === "yetki" ? "yonetim.liste.sonuc.yetki" : "yonetim.liste.sonuc.hata")}
      </Uyari>
    ) : (
      (() => {
        const islem = topluIslemler.find((oge) => oge.kod === sonuc.islem);
        const { islenen, islenemeyen } = sonuc.sonuc;
        return (
          <Uyari tur={islenemeyen.length === 0 ? "basari" : "uyari"}>
            <span className="flex flex-col gap-1">
              {islenen.length === 0 ? null : <span>{islem?.basari(islenen.length)}</span>}
              {islenemeyen.length === 0 ? null : (
                <>
                  <span>
                    {doldur(metin("yonetim.liste.sonuc.islenemedi"), {
                      sayi: String(islenemeyen.length),
                    })}
                  </span>
                  <ul className="list-disc pl-5">
                    {islenemeyen.map((oge) => (
                      <li key={oge.anahtar}>
                        {doldur(metin("yonetim.liste.sonuc.satir"), {
                          ad: sonuc.adlar[oge.anahtar] ?? oge.anahtar,
                          neden: islem?.neden(oge.kod) ?? oge.kod,
                        })}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </span>
          </Uyari>
        );
      })()
    );

  const topluCubuk =
    !secimVar || seciliAnahtarlar.length === 0 ? null : (
      <section
        data-slot="toplu-islem-cubugu"
        aria-label={metin("yonetim.liste.topluIslem")}
        className="odak-yazi-renginde sticky top-0 z-taban flex flex-wrap items-center gap-2 rounded-orta bg-yazi px-3 py-2 text-zemin"
      >
        <span className="mr-1 font-kalin">
          {doldur(metin("yonetim.liste.seciliSayisi"), {
            sayi: String(seciliAnahtarlar.length),
          })}
        </span>
        {topluIslemler.map((islem) => (
          <Dugme
            key={islem.kod}
            tur="cerceveli"
            className="border-zemin px-3 text-zemin hover:bg-yazi"
            onClick={() => setBekleyen(islem)}
          >
            {islem.ad}
          </Dugme>
        ))}
        <Dugme
          tur="baglanti"
          className="text-zemin tablet:ml-auto"
          onClick={() => setSecilen(new Set())}
        >
          {metin("yonetim.liste.secimiKaldir")}
        </Dugme>
      </section>
    );

  const iskeletSatirlari = Array.from({ length: Math.min(Math.max(satirlar.length, 3), 5) });
  const baslik = (
    <TabloBasligi className="sr-only">
      {yukleniyor ? doldur(metin("yonetim.liste.yukleniyor"), { ad }) : ad}
    </TabloBasligi>
  );

  const tablo = (
    <Kart className="hidden overflow-hidden p-0 tablet:flex tablet:p-0">
      <Tablo className="text-kucuk">
        {baslik}
        <TabloUstu>
          <TabloSatiri className="text-soluk-yazi">
            {secimVar ? (
              <TabloBasHucresi scope="col" className="w-11 px-1">
                <TabloSecimi
                  etiket={metin("yonetim.liste.sayfayiSec")}
                  isaretli={sayfaninHepsi}
                  degisince={(isaretli) => setSecilen(new Set(isaretli ? anahtarlar : []))}
                />
              </TabloBasHucresi>
            ) : null}
            {sutunlar.map((sutun) => {
              const sirala = tanim.siralanabilirSutunlar[sutun.kod];
              const yon =
                sirala === undefined
                  ? undefined
                  : durum.siralama === sirala.azalan
                    ? ("descending" as const)
                    : durum.siralama === sirala.artan
                      ? ("ascending" as const)
                      : undefined;
              return (
                <TabloBasHucresi
                  key={sutun.kod}
                  scope="col"
                  aria-sort={yon}
                  className={sinif("px-3 py-2 font-normal", sutun.sag && "text-right")}
                >
                  {sirala === undefined ? (
                    sutun.baslik
                  ) : (
                    <Baglanti
                      href={listeAdresi(tanim, durum, {
                        siralama: yon === "descending" ? sirala.artan : sirala.azalan,
                      })}
                      prefetch={false}
                      className={sinif(
                        "min-h-11 gap-1 font-normal text-soluk-yazi no-underline hover:underline",
                        sutun.sag && "justify-end",
                      )}
                    >
                      {sutun.baslik}
                      <Ikon
                        ad={
                          yon === "ascending"
                            ? "sirala-artan"
                            : yon === "descending"
                              ? "sirala-azalan"
                              : "asagi"
                        }
                      />
                    </Baglanti>
                  )}
                </TabloBasHucresi>
              );
            })}
          </TabloSatiri>
        </TabloUstu>
        <TabloGovdesi aria-busy={yukleniyor ? true : undefined}>
          {yukleniyor
            ? iskeletSatirlari.map((_, sira) => (
                // Iskeletin sırası anahtardır: satırların kimliği yoktur.
                // biome-ignore lint/suspicious/noArrayIndexKey: iskelet satırları
                <TabloSatiri key={sira} className="last:border-b-0">
                  {secimVar ? <TabloHucresi className="px-1 py-3" /> : null}
                  {sutunlar.map((sutun) => (
                    <TabloHucresi key={sutun.kod} className="px-3 py-3">
                      <IskeletGorunum className="h-4 w-3/4" />
                    </TabloHucresi>
                  ))}
                </TabloSatiri>
              ))
            : satirlar.map((satir) => {
                const a = anahtar(satir);
                return (
                  <TabloSatiri
                    key={a}
                    className={sinif("last:border-b-0", secilen.has(a) && "bg-yuzey")}
                  >
                    {secimVar ? (
                      <TabloHucresi className="px-1 py-1 align-middle">
                        <TabloSecimi
                          etiket={doldur(metin("yonetim.liste.satiriSec"), { ad: satirAdi(satir) })}
                          isaretli={secilen.has(a)}
                          degisince={(isaretli) => sec(a, isaretli)}
                        />
                      </TabloHucresi>
                    ) : null}
                    {sutunlar.map((sutun) => (
                      <TabloHucresi
                        key={sutun.kod}
                        className={sinif(
                          "px-3 py-3 align-middle",
                          sutun.sag && "text-right font-kalin whitespace-nowrap",
                        )}
                      >
                        {sutun.hucre(satir)}
                      </TabloHucresi>
                    ))}
                  </TabloSatiri>
                );
              })}
        </TabloGovdesi>
      </Tablo>
    </Kart>
  );

  const telefonListesi = (
    <>
      {secimVar && !yukleniyor && satirlar.length > 0 ? (
        // Telefonda sayfanın hepsini seçen kutu listenin üstündedir (tablo başlığı telefonda yok).
        <div className="flex items-center gap-1 tablet:hidden">
          <TabloSecimi
            etiket={metin("yonetim.liste.sayfayiSec")}
            isaretli={sayfaninHepsi}
            degisince={(isaretli) => setSecilen(new Set(isaretli ? anahtarlar : []))}
          />
          <span aria-hidden="true" className="text-kucuk">
            {metin("yonetim.liste.sayfayiSec")}
          </span>
        </div>
      ) : null}
      <ul
        aria-label={yukleniyor ? doldur(metin("yonetim.liste.yukleniyor"), { ad }) : ad}
        aria-busy={yukleniyor ? true : undefined}
        className="flex flex-col gap-2 tablet:hidden"
      >
        {yukleniyor
          ? iskeletSatirlari.map((_, sira) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: iskelet satırları
              <li key={sira}>
                <Kart className="gap-2 p-4 tablet:p-4">
                  <IskeletGorunum className="h-4 w-1/2" />
                  <IskeletGorunum className="h-4 w-3/4" />
                </Kart>
              </li>
            ))
          : satirlar.map((satir) => {
              const a = anahtar(satir);
              return (
                <li key={a}>
                  <Kart
                    className={sinif(
                      "flex-row items-start gap-1 p-2 tablet:p-2",
                      secilen.has(a) && "bg-yuzey",
                    )}
                  >
                    {secimVar ? (
                      <TabloSecimi
                        etiket={doldur(metin("yonetim.liste.satiriSec"), { ad: satirAdi(satir) })}
                        isaretli={secilen.has(a)}
                        degisince={(isaretli) => sec(a, isaretli)}
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col gap-2 p-2">{telefon(satir)}</div>
                  </Kart>
                </li>
              );
            })}
      </ul>
    </>
  );

  let govde: ReactNode;
  if (gosterilen === null) {
    govde = (
      <BosHal
        ikon="hata"
        baslik={metin("yonetim.liste.hata.baslik")}
        aciklama={metin("yonetim.liste.hata.metin")}
      >
        <Dugme
          tur="sade"
          onClick={() => {
            if (aramada) setYenile((sayi) => sayi + 1);
            else gecisiBaslat(() => router.refresh());
          }}
        >
          <Ikon ad="yenile" />
          {metin("yonetim.liste.hata.yenidenDene")}
        </Dugme>
      </BosHal>
    );
  } else if (!yukleniyor && gosterilen !== undefined && gosterilen.toplam === 0) {
    govde = aramada ? (
      <BosHal
        ikon="arama"
        baslik={doldur(metin("yonetim.liste.aramaSonucsuz.baslik"), { aranan })}
        aciklama={metin("yonetim.liste.aramaSonucsuz.metin")}
      >
        <Dugme tur="sade" onClick={aramayiTemizle}>
          {metin("yonetim.liste.aramayiTemizle")}
        </Dugme>
      </BosHal>
    ) : suzgecliMi(durum) ? (
      <BosHal
        ikon="arama"
        baslik={metin("yonetim.liste.sonucsuz.baslik")}
        aciklama={metin("yonetim.liste.sonucsuz.metin")}
      >
        <Baglanti href={tanim.adres} prefetch={false} gorunum="sade">
          {metin("yonetim.liste.suzgecleriTemizle")}
        </Baglanti>
      </BosHal>
    ) : (
      <BosHal ikon={bos.ikon} baslik={bos.baslik} aciklama={bos.aciklama}>
        {bos.eylem}
      </BosHal>
    );
  } else {
    const bas = gosterilen === undefined ? 0 : (gosterilen.sayfa - 1) * gosterilen.sayfaBoyu + 1;
    const son = gosterilen === undefined ? 0 : bas + satirlar.length - 1;
    govde = (
      <>
        {tablo}
        {telefonListesi}
        {gosterilen === undefined || !tanim.sayfali ? null : (
          <div className="flex flex-col items-center gap-2 text-kucuk text-soluk-yazi tablet:flex-row tablet:justify-between">
            <span>
              {doldur(metin("yonetim.liste.aralik"), {
                bas: String(bas),
                son: String(son),
                toplam: String(gosterilen.toplam),
              })}
            </span>
            <Sayfalama
              sayfa={gosterilen.sayfa}
              toplamSayfa={gosterilen.sayfaSayisi}
              adres={(sayfa) => listeAdresi(tanim, durum, { sayfa })}
              metinler={{
                etiket: metin("ortak.parca.sayfalar"),
                onceki: metin("ortak.parca.oncekiSayfa"),
                sonraki: metin("ortak.parca.sonrakiSayfa"),
                sayfaAdi: (sira) => doldur(metin("ortak.parca.sayfaAdi"), { sira: String(sira) }),
                bosluk: metin("ortak.parca.atlananSayfalar"),
              }}
            />
            <span>
              {doldur(metin("yonetim.liste.sayfaBasina"), { sayi: String(gosterilen.sayfaBoyu) })}
            </span>
          </div>
        )}
      </>
    );
  }

  // Bu listenin hiç kaydı yoksa (boş hâl) arama ve süzgeç gösterilmez.
  const hicKayitYok =
    !aramada && gosterilen !== null && gosterilen?.toplam === 0 && !suzgecliMi(durum);

  return (
    // Tıklama yakalayıcı yalnız listenin kendi bağlantılarını geçişle açar; klavyeyle Enter da tıklama olayıdır.
    <div className="flex flex-col gap-4" onClickCapture={tiklamayiYakala}>
      {sekmeSeridi}
      {hicKayitYok ? null : aracSeridi}
      {ciplerSeridi}
      <div aria-live="polite" className="sr-only">
        {aramada && gosterilen !== undefined && gosterilen !== null && !yukleniyor
          ? doldur(metin("yonetim.liste.aramaSonucu"), {
              aranan,
              sayi: String(gosterilen.toplam),
            })
          : ""}
        {secimVar && seciliAnahtarlar.length > 0
          ? ` ${doldur(metin("yonetim.liste.seciliSayisi"), { sayi: String(seciliAnahtarlar.length) })}`
          : ""}
      </div>
      {sonucKutusuIcerigi === null ? null : (
        <div ref={sonucKutusu} tabIndex={-1} id={`${kimlik}-sonuc`} className="outline-none">
          {sonucKutusuIcerigi}
        </div>
      )}
      {topluCubuk}
      {govde}
      {bekleyen === null ? null : (
        <OnayPenceresi
          acik
          acikDegisince={(acik) => {
            if (!acik) setBekleyen(null);
          }}
          {...bekleyen.onay(seciliAnahtarlar.length)}
          vazgecEtiketi={metin("ortak.islem.vazgec")}
          tur="birincil"
          onayla={() => topluIslemYap(bekleyen)}
        />
      )}
    </div>
  );
}
