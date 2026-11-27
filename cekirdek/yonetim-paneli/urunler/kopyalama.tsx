"use client";
// Ürün kopyalama (kart 0320, karar 0190; taslak: planlar/tasarim-yonu/panel-2.html, "Ürün kopyalama"). Ürün ekranının
// komut çubuğundaki "Kopyala" ve ürün listesinin satır menüsündeki "Kopyala" bu pencereyi açar. Pencere yalnız
// kopyanın adını sorar ve neyin kopyalanmadığını söyler (karar 0185); kopya kurulunca onun ürün ekranı açılır ve
// üstünde kopyanın taslak olduğu söylenir (`?kopya=1`, urunKopyaBilgisi). Hatalar ortak form yapısıyla.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { urunEkraniAdresi } from "../adresler";
import { EylemDugmesi } from "../eylem-dugmesi";
import { useDegisenFormVar } from "../form/cikis-korumasi";
import { KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { panelIstegi } from "../panel-istegi";

// Kopyanın ürün ekranının adresi: üstünde kopya bilgisi görünür.
export const kopyaAdresi = (kimlik: string) => `${urunEkraniAdresi(kimlik)}&kopya=1`;

const hataMetni = (kod: string, alan: string | undefined, alanKodu?: string): MetinAnahtari => {
  if (alan === "ad") {
    return alanKodu === "kayda-uygun-degil"
      ? "yonetim.urunKopyalama.hata.adKayit"
      : "yonetim.urunKopyalama.hata.ad";
  }
  if (kod === "bulunamadi") return "yonetim.urunKopyalama.hata.bulunamadi";
  if (kod === "yetki") return "yonetim.liste.sonuc.yetki";
  if (alan === "adres") return "yonetim.urunKopyalama.hata.video";
  if (alan === "vergiSinifi") return "yonetim.urunKopyalama.hata.vergiSinifi";
  return "yonetim.urunKopyalama.hata.genel";
};

export function UrunKopyalamaPenceresi({
  urun,
  kapat,
  fiyatIzni,
  kaydedilmemis = false,
}: {
  urun: { kimlik: string; ad: string } | null;
  kapat: () => void;
  // Fiyatı değiştirme izni yoksa fiyatlar kopyalanmaz (kullanıcı kararı); pencere bunu söyler.
  fiyatIzni: boolean;
  // Açıldığı sayfada kaydedilmemiş değişiklik var mı: kopya kaydedilmiş hâlden yapılır, değişiklik kaybolur.
  kaydedilmemis?: boolean;
}) {
  const metin = usePanelMetni();
  return (
    <YanPencere open={urun !== null} onOpenChange={(acik) => (acik ? undefined : kapat())}>
      {urun === null ? null : (
        <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} className="tablet:max-w-form">
          <YanPencereUstu>
            <YanPencereBasligi>{metin("yonetim.urunKopyalama.baslik")}</YanPencereBasligi>
            <YanPencereAciklamasi>
              {doldur(metin("yonetim.urunKopyalama.aciklama"), { ad: urun.ad })}
            </YanPencereAciklamasi>
          </YanPencereUstu>
          {kaydedilmemis ? (
            <Uyari tur="uyari">{metin("yonetim.urunKopyalama.kaydedilmemis")}</Uyari>
          ) : null}
          <KopyalamaFormu urun={urun} vazgec={kapat} fiyatIzni={fiyatIzni} />
        </YanPencereIcerigi>
      )}
    </YanPencere>
  );
}

function KopyalamaFormu({
  urun,
  vazgec,
  fiyatIzni,
}: {
  urun: { kimlik: string; ad: string };
  vazgec: () => void;
  fiyatIzni: boolean;
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const [ad, setAd] = useState(() =>
    doldur(metin("yonetim.urunKopyalama.varsayilanAd"), { ad: urun.ad }),
  );
  const pf = usePanelFormu();
  const gonder = async () => {
    if (ad.trim() === "") {
      pf.hatalariGoster({ ad: metin("yonetim.urunKopyalama.hata.ad") });
      return;
    }
    const sonuc = await pf.isle(() =>
      panelIstegi<{ kimlik: string }>("urun-kopyala", { kimlik: urun.kimlik, ad }),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      // Pencere kapanır: kopyanın ekranı aynı sayfa bileşeniyle açılır, pencerenin durumu kalırdı (tarayıcıda ölçüldü).
      vazgec();
      router.push(kopyaAdresi(sonuc.veri.kimlik));
      return;
    }
    const [ilk] = sonuc.ayrinti;
    if (ilk?.alan === "ad") {
      pf.hatalariGoster({ ad: metin(hataMetni(sonuc.kod, "ad", ilk.kod)) });
      return;
    }
    pf.hatalariGoster({}, [metin(hataMetni(sonuc.kod, ilk?.alan))]);
  };
  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      <PanelAlani ad="ad" etiket={metin("yonetim.urunKopyalama.ad")} zorunlu>
        {(baglanti) => (
          <GirisAlani
            {...baglanti}
            autoComplete="off"
            value={ad}
            onChange={(olay) => {
              setAd(olay.target.value);
              pf.alaniTemizle("ad");
            }}
          />
        )}
      </PanelAlani>
      <p className="m-0 text-kucuk text-soluk-yazi">
        {metin(
          fiyatIzni
            ? "yonetim.urunKopyalama.kopyalanan"
            : "yonetim.urunKopyalama.kopyalananFiyatsiz",
        )}
      </p>
      <Uyari tur="bilgi">
        {metin(
          fiyatIzni
            ? "yonetim.urunKopyalama.kopyalanmayan"
            : "yonetim.urunKopyalama.kopyalanmayanFiyatsiz",
        )}
      </Uyari>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.urunKopyalama.kopyala")} vazgec={vazgec} />
    </PanelFormu>
  );
}

// Ürün ekranının komut çubuğundaki "Kopyala".
// Ürün ekranının komut çubuğundaki "Kopyala". Açılırken sayfanın formunda kaydedilmemiş değişiklik olup olmadığı
// sorulur (çıkış koruması): kopya kaydedilmiş hâlden yapılır, pencere bunu söyler (bağımsız kontrolün bulgusu).
export function UrunKopyalaDugmesi({
  urun,
  fiyatIzni,
}: {
  urun: { kimlik: string; ad: string };
  fiyatIzni: boolean;
}) {
  const [acik, setAcik] = useState<{ kaydedilmemis: boolean } | null>(null);
  const degisenVar = useDegisenFormVar();
  return (
    <>
      <EylemDugmesi eylem="urun-kopyala" onClick={() => setAcik({ kaydedilmemis: degisenVar() })} />
      <UrunKopyalamaPenceresi
        urun={acik === null ? null : urun}
        kapat={() => setAcik(null)}
        fiyatIzni={fiyatIzni}
        kaydedilmemis={acik?.kaydedilmemis ?? false}
      />
    </>
  );
}
