"use client";
// Bileşen deneme sahnesi (kart 0103): ortak kütüphanenin bütün parçaları bir arada. Yalnız geliştirmede
// açılan sayfa (app/gelistirme/bilesenler/page.deneme.tsx) bunu çizer; tarayıcı testi parçaları burada
// klavyeyle kullanır ve tarar. Her bölümün başlığı test için bölgeyi adlandırır.
import { type ReactNode, useState } from "react";
import { FormAlani } from "../../../bilesenler/form/form-alani";
import {
  AcilirMenu,
  AcilirMenuAyraci,
  AcilirMenuBasligi,
  AcilirMenuIcerigi,
  AcilirMenuOgesi,
  AcilirMenuOnayOgesi,
  AcilirMenuRadyoGrubu,
  AcilirMenuRadyoOgesi,
  AcilirMenuTetikleyici,
  AltMenu,
  AltMenuIcerigi,
  AltMenuTetikleyici,
} from "../../../bilesenler/parcalar/acilir-menu";
import {
  Akordeon,
  AkordeonBasligi,
  AkordeonIcerigi,
  AkordeonOgesi,
} from "../../../bilesenler/parcalar/akordeon";
import { BildirimAlani, bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme, IkonDugmesi } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Ipucu } from "../../../bilesenler/parcalar/ipucu";
import { IskeletGorunum } from "../../../bilesenler/parcalar/iskelet";
import {
  Kart,
  KartAciklamasi,
  KartAlti,
  KartBasligi,
  KartIcerigi,
  KartUstu,
} from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import {
  Pencere,
  PencereAciklamasi,
  PencereAlti,
  PencereBasligi,
  PencereIcerigi,
  PencereKapat,
  PencereTetikleyici,
  PencereUstu,
} from "../../../bilesenler/parcalar/pencere";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
import { Sekme, SekmeIcerigi, SekmeListesi, Sekmeler } from "../../../bilesenler/parcalar/sekmeler";
import {
  Serit,
  SeritDugmeleri,
  SeritIcerigi,
  SeritOgesi,
} from "../../../bilesenler/parcalar/serit";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereTetikleyici,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { YukleniyorGostergesi } from "../../../bilesenler/parcalar/yukleniyor";
import { useMetin } from "../../metinler/istemci-metni";
import type { MetinAnahtari } from "../../metinler/metin";

function Bolum({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <section aria-label={baslik} className="flex flex-col gap-4 border-t border-kenar pt-6">
      <h2>{baslik}</h2>
      {children}
    </section>
  );
}

export function BilesenSahnesi() {
  const metin = useMetin();
  const m = (anahtar: string) => metin(`gelistirme.sahne.${anahtar}` as MetinAnahtari);
  const [basildi, setBasildi] = useState(false);
  const [eylem, setEylem] = useState<string | null>(null);
  const [ayrintilar, setAyrintilar] = useState(true);
  const [gorunum, setGorunum] = useState("liste");

  return (
    <main className="mx-auto flex w-full max-w-metin flex-col gap-6 p-4">
      <h1>{m("baslik")}</h1>
      <p>{m("aciklama")}</p>
      <BildirimAlani
        alanEtiketi={metin("ortak.parca.bildirimler")}
        kapatEtiketi={metin("ortak.parca.bildirimiKapat")}
      />

      <Bolum baslik={m("dugmeler")}>
        <div className="flex flex-wrap gap-2">
          <Dugme onClick={() => setBasildi(true)}>{m("birincil")}</Dugme>
          <Dugme tur="ikincil">{m("ikincil")}</Dugme>
          <Dugme tur="cerceveli">{m("cerceveli")}</Dugme>
          <Dugme tur="sade">{m("sade")}</Dugme>
          <Dugme tur="tehlike">{m("tehlike")}</Dugme>
          <Dugme tur="baglanti">{m("baglantiGorunumlu")}</Dugme>
          <Dugme disabled>{m("kapali")}</Dugme>
          <IkonDugmesi ikon="bilgi" etiket={m("ikonDugmesi")} tur="cerceveli" />
        </div>
        {basildi ? <p role="status">{m("basildi")}</p> : null}
      </Bolum>

      <Bolum baslik={m("form")}>
        <FormAlani etiket={m("ad")} aciklama={m("adAciklama")}>
          {(alan) => <GirisAlani {...alan} name="ad" autoComplete="name" />}
        </FormAlani>
        <FormAlani etiket={m("soyad")} hata={m("soyadHata")}>
          {(alan) => <GirisAlani {...alan} name="soyad" autoComplete="family-name" />}
        </FormAlani>
        <FormAlani etiket={m("zaman")}>
          {(alan) => (
            <SecimKutusu name="zaman">
              <SecimTetikleyici {...alan}>
                <SecimDegeri placeholder={m("zamanSec")} />
              </SecimTetikleyici>
              <SecimListesi>
                <SecimOgesi value="sabah">{m("sabah")}</SecimOgesi>
                <SecimOgesi value="ogle">{m("ogle")}</SecimOgesi>
                <SecimOgesi value="aksam">{m("aksam")}</SecimOgesi>
              </SecimListesi>
            </SecimKutusu>
          )}
        </FormAlani>
        <OnayKutusu name="kampanya" etiket={m("onay")} />
      </Bolum>

      <Bolum baslik={m("menu")}>
        <div className="flex flex-wrap items-center gap-4">
          <AcilirMenu>
            <AcilirMenuTetikleyici asChild>
              <Dugme tur="cerceveli">{m("eylemler")}</Dugme>
            </AcilirMenuTetikleyici>
            <AcilirMenuIcerigi align="start">
              <AcilirMenuOgesi onSelect={() => setEylem(m("duzenle"))}>
                {m("duzenle")}
              </AcilirMenuOgesi>
              <AcilirMenuOgesi onSelect={() => setEylem(m("kopyala"))}>
                {m("kopyala")}
              </AcilirMenuOgesi>
              <AltMenu>
                <AltMenuTetikleyici>{m("paylas")}</AltMenuTetikleyici>
                <AltMenuIcerigi>
                  <AcilirMenuOgesi onSelect={() => setEylem(m("epostaIle"))}>
                    {m("epostaIle")}
                  </AcilirMenuOgesi>
                  <AcilirMenuOgesi onSelect={() => setEylem(m("baglantiyiKopyala"))}>
                    {m("baglantiyiKopyala")}
                  </AcilirMenuOgesi>
                </AltMenuIcerigi>
              </AltMenu>
              <AcilirMenuAyraci />
              <AcilirMenuBasligi>{m("gorunum")}</AcilirMenuBasligi>
              <AcilirMenuOnayOgesi
                checked={ayrintilar}
                onCheckedChange={(deger) => setAyrintilar(deger === true)}
              >
                {m("ayrintilar")}
              </AcilirMenuOnayOgesi>
              <AcilirMenuRadyoGrubu value={gorunum} onValueChange={setGorunum}>
                <AcilirMenuRadyoOgesi value="liste">{m("liste")}</AcilirMenuRadyoOgesi>
                <AcilirMenuRadyoOgesi value="izgara">{m("izgara")}</AcilirMenuRadyoOgesi>
              </AcilirMenuRadyoGrubu>
              <AcilirMenuAyraci />
              <AcilirMenuOgesi tur="tehlike" onSelect={() => setEylem(m("sil"))}>
                {m("sil")}
              </AcilirMenuOgesi>
            </AcilirMenuIcerigi>
          </AcilirMenu>
          {eylem === null ? null : (
            <p role="status" className="flex gap-2">
              <span>{m("secilenEylem")}</span>
              <span>{eylem}</span>
            </p>
          )}
        </div>
      </Bolum>

      <Bolum baslik={m("pencereler")}>
        <div className="flex flex-wrap gap-2">
          <Pencere>
            <PencereTetikleyici asChild>
              <Dugme tur="cerceveli">{m("pencereyiAc")}</Dugme>
            </PencereTetikleyici>
            <PencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")}>
              <PencereUstu>
                <PencereBasligi>{m("pencereBasligi")}</PencereBasligi>
                <PencereAciklamasi>{m("pencereAciklamasi")}</PencereAciklamasi>
              </PencereUstu>
              {/* Pencerenin içinde açılan liste ve pencereden verilen bildirim (katman ve inert denemesi). */}
              <FormAlani etiket={m("zaman")}>
                {(alan) => (
                  <SecimKutusu name="penceredeZaman">
                    <SecimTetikleyici {...alan}>
                      <SecimDegeri placeholder={m("zamanSec")} />
                    </SecimTetikleyici>
                    <SecimListesi>
                      <SecimOgesi value="sabah">{m("sabah")}</SecimOgesi>
                      <SecimOgesi value="ogle">{m("ogle")}</SecimOgesi>
                      <SecimOgesi value="aksam">{m("aksam")}</SecimOgesi>
                    </SecimListesi>
                  </SecimKutusu>
                )}
              </FormAlani>
              <div>
                <Dugme tur="ikincil" onClick={() => bildirimGoster("basari", m("bildirimMetni"))}>
                  {m("bildirimGoster")}
                </Dugme>
              </div>
              <PencereAlti>
                <PencereKapat asChild>
                  <Dugme tur="cerceveli">{metin("ortak.islem.vazgec")}</Dugme>
                </PencereKapat>
                <PencereKapat asChild>
                  <Dugme>{metin("ortak.islem.kaydet")}</Dugme>
                </PencereKapat>
              </PencereAlti>
            </PencereIcerigi>
          </Pencere>
          <YanPencere>
            <YanPencereTetikleyici asChild>
              <Dugme tur="cerceveli">{m("yanPencereyiAc")}</Dugme>
            </YanPencereTetikleyici>
            <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")}>
              <YanPencereUstu>
                <YanPencereBasligi>{m("yanPencereBasligi")}</YanPencereBasligi>
                <YanPencereAciklamasi>{m("yanPencereAciklamasi")}</YanPencereAciklamasi>
              </YanPencereUstu>
              <OnayKutusu name="suzgec" etiket={m("stokta")} />
            </YanPencereIcerigi>
          </YanPencere>
        </div>
      </Bolum>

      <Bolum baslik={m("sekmeler")}>
        <Sekmeler defaultValue="aciklama">
          <SekmeListesi>
            <Sekme value="aciklama">{m("aciklamaSekmesi")}</Sekme>
            <Sekme value="ozellikler">{m("ozelliklerSekmesi")}</Sekme>
            <Sekme value="yorumlar">{m("yorumlarSekmesi")}</Sekme>
          </SekmeListesi>
          <SekmeIcerigi value="aciklama">{m("aciklamaIcerigi")}</SekmeIcerigi>
          <SekmeIcerigi value="ozellikler">{m("ozelliklerIcerigi")}</SekmeIcerigi>
          <SekmeIcerigi value="yorumlar">{m("yorumlarIcerigi")}</SekmeIcerigi>
        </Sekmeler>
      </Bolum>

      <Bolum baslik={m("kartlar")}>
        <Kart>
          <KartUstu>
            <KartBasligi duzey={3}>{m("kartBasligi")}</KartBasligi>
            <Rozet tur="basari">{m("stokta")}</Rozet>
          </KartUstu>
          <KartAciklamasi>{m("kartAciklamasi")}</KartAciklamasi>
          <KartIcerigi>{m("kartIcerigi")}</KartIcerigi>
          <KartAlti>
            <Dugme>{m("birincil")}</Dugme>
          </KartAlti>
        </Kart>
        <div className="flex flex-wrap gap-2">
          <Rozet>{m("yeni")}</Rozet>
          <Rozet tur="ikincil">{m("kargoBedava")}</Rozet>
          <Rozet tur="cerceveli">{m("cerceveliRozet")}</Rozet>
          <Rozet tur="tehlike">{m("tukendi")}</Rozet>
          <Rozet tur="basari">{m("stokta")}</Rozet>
          <Rozet tur="uyari">{m("sonUrunler")}</Rozet>
        </div>
      </Bolum>

      <Bolum baslik={m("uyarilar")}>
        <Uyari tur="tehlike" baslik={m("uyariBasligi")}>
          {m("tehlikeUyari")}
        </Uyari>
        <Uyari tur="uyari">{m("uyariUyari")}</Uyari>
        <Uyari tur="basari">{m("basariUyari")}</Uyari>
        <Uyari tur="bilgi">{m("bilgiUyari")}</Uyari>
        <div>
          <Dugme tur="cerceveli" onClick={() => bildirimGoster("basari", m("bildirimMetni"))}>
            {m("bildirimGoster")}
          </Dugme>
        </div>
      </Bolum>

      <Bolum baslik={m("ipuclari")}>
        <div className="flex flex-wrap items-center gap-4">
          <Ipucu metin={m("kargoIpucu")}>
            <Dugme tur="sade">{m("kargoHakkinda")}</Dugme>
          </Ipucu>
          <YukleniyorGostergesi etiket={m("urunlerYukleniyor")} />
        </div>
        <div className="flex flex-col gap-2">
          <IskeletGorunum className="h-6 w-1/2" />
          <IskeletGorunum className="h-20 w-full" />
        </div>
      </Bolum>

      <Bolum baslik={m("seritler")}>
        <Serit
          metinler={{
            etiket: m("seritEtiketi"),
            seritTanimi: metin("ortak.parca.seritTanimi"),
            ogeTanimi: metin("ortak.parca.seritOgesi"),
            onceki: metin("ortak.parca.onceki"),
            sonraki: metin("ortak.parca.sonraki"),
          }}
        >
          <SeritIcerigi>
            {(["ogeBir", "ogeIki", "ogeUc", "ogeDort"] as const).map((anahtar) => (
              <SeritOgesi key={anahtar} className="tablet:basis-1/2">
                <Kart className="min-h-20 justify-center">{m(anahtar)}</Kart>
              </SeritOgesi>
            ))}
          </SeritIcerigi>
          {/* Şeridin içindeki alan ok tuşlarını kendisi kullanır, şerit kaymaz. */}
          <FormAlani etiket={m("seritNotu")}>
            {(alan) => <GirisAlani {...alan} name="seritNotu" />}
          </FormAlani>
          <SeritDugmeleri />
        </Serit>
      </Bolum>

      <Bolum baslik={m("akordeonlar")}>
        <Akordeon type="single" collapsible>
          {(["Bir", "Iki", "Uc"] as const).map((sira) => (
            <AkordeonOgesi key={sira} value={sira}>
              <AkordeonBasligi duzey={3}>{m(`soru${sira}`)}</AkordeonBasligi>
              <AkordeonIcerigi>{m(`cevap${sira}`)}</AkordeonIcerigi>
            </AkordeonOgesi>
          ))}
        </Akordeon>
      </Bolum>
    </main>
  );
}
