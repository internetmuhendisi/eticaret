"use client";
// Siparişin teslimat ve fatura bilgilerini düzeltme (kart 0269, karar 0180; taslak: "Teslimat adresini düzelt").
// Ayrıntının Teslimat bölümündeki "Düzelt" yan pencereyi açar: teslimat (ad, soyad, telefon, adres) ve fatura (tür,
// kurumsal bilgiler, adres) ödeme adımının alanları ve şemasıyla (cekirdek/vitrin/odeme/alanlar.tsx, elle siparişle
// aynı). "Müşteriye e-posta gönder" kutusu varsayılan işaretlidir (taslak), e-posta gidemezken yoktur.
//
// Kayıt pencerenin açıldığı andaki hâlin özetini (surum) gönderir: arada değişen siparişi ezmez. Vergiyi değiştirecek
// düzeltmeyi sunucu reddeder, nedeni adres alanının altında yazar.
import { type FormEvent, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
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
import { siparisAdresiSemasi } from "../../moduller/siparis/semalar";
import {
  type Adres,
  AdresAlanlari,
  type AlanKimlikleri,
  adresGirdisi,
  type HataHaritasi,
  hataMetni,
  MetinAlani,
} from "../../vitrin/odeme/alanlar";
import { AlanKabi, KaydetCubugu, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import type { SiparisAyrintisiVerisi } from "./veri";

type Veri = NonNullable<SiparisAyrintisiVerisi["adresDuzeltme"]>;

// Alanı olmayan hataların metni (özette).
const genelHatalar: Record<string, MetinAnahtari> = {
  "adres-degisti": "yonetim.siparis.adres.hata.cakisma",
  "adres-duzeltilemez": "yonetim.siparis.adres.hata.duzeltilemez",
  "kisisel-veri-silindi": "yonetim.siparis.adres.hata.kisiselVeri",
};

const islemHataMetni = (hata: PanelHatasi): MetinAnahtari => {
  const genel = hata.ayrinti.map((sorun) => genelHatalar[sorun.kod]).find((k) => k !== undefined);
  if (genel !== undefined) return genel;
  if (hata.kod === "yetki") return "yonetim.siparis.hata.yetki";
  return "yonetim.siparis.hata.genel";
};

// Saklanan adresin form hâli.
const formAdresi = (adres: Veri["teslimat"]["adres"]): Adres => ({
  ulke: adres.ulke,
  il: adres.il ?? "",
  ilce: adres.ilce ?? "",
  adres: adres.adres,
  postaKodu: adres.postaKodu ?? "",
});

export function AdresDuzeltme({ numara, veri }: { numara: string; veri: Veri }) {
  const metin = usePanelMetni();
  const [acik, setAcik] = useState(false);
  // Pencerenin açıldığında gördüğü hâl: çakışmadan sonra sayfa yenilense de değişmez, arada yazılanı ezmez.
  const [acilistaGorulen, setAcilistaGorulen] = useState(veri.surum);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setAcik(false));
  return (
    <>
      <Dugme
        tur="sade"
        className="self-start"
        onClick={() => {
          setAcilistaGorulen(veri.surum);
          setAcik(true);
        }}
      >
        <Ikon ad="duzenle" />
        {metin("yonetim.siparis.adres.duzelt")}
      </Dugme>
      <YanPencere open={acik} onOpenChange={(yeni) => (yeni ? undefined : kapatmayiIste())}>
        {acik ? (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-metin"
          >
            <YanPencereUstu>
              <YanPencereBasligi>{metin("yonetim.siparis.adres.baslik")}</YanPencereBasligi>
              <YanPencereAciklamasi>{metin("yonetim.siparis.adres.aciklama")}</YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <AdresFormu
              numara={numara}
              veri={veri}
              surum={acilistaGorulen}
              degisince={degisince}
              vazgec={kapatmayiIste}
              bitti={kapat}
            />
          </YanPencereIcerigi>
        ) : null}
      </YanPencere>
    </>
  );
}

function AdresFormu({
  numara,
  veri,
  surum,
  degisince,
  vazgec,
  bitti,
}: {
  numara: string;
  veri: Veri;
  surum: string;
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  bitti: () => void;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(islemHataMetni);
  const { teslimat: t, fatura: f } = veri;
  const [kisi, setKisi] = useState({ ad: t.ad, soyad: t.soyad, telefon: t.telefon ?? "" });
  const [teslimat, setTeslimat] = useState<Adres>(formAdresi(t.adres));
  const [faturaTuru, setFaturaTuru] = useState<"bireysel" | "kurumsal">(f.tur);
  const [kurumsal, setKurumsal] = useState(
    f.tur === "kurumsal"
      ? { firma: f.firma, vergiDairesi: f.vergiDairesi, vergiNumarasi: f.vergiNumarasi }
      : { firma: "", vergiDairesi: "", vergiNumarasi: "" },
  );
  const [faturaAyni, setFaturaAyni] = useState(f.adresAyni);
  const [faturaAdresi, setFaturaAdresi] = useState<Adres>(
    f.adres === undefined ? formAdresi(t.adres) : formAdresi(f.adres),
  );
  const [eposta, setEposta] = useState(veri.epostaGidebilir);
  const [degisti, setDegisti] = useState(false);
  const kimlikler: AlanKimlikleri = useState<AlanKimlikleri>({})[0];
  const pf = usePanelFormu({ degisti });
  const hatalar = pf.hatalar;
  // Her alan değişikliği formu değişmiş sayar ve kapatma sorusuna çizimi beklemeden bildirir.
  const degistir =
    <T,>(ayarla: (deger: T) => void) =>
    (deger: T) => {
      ayarla(deger);
      setDegisti(true);
      degisince(true);
    };

  const girdiKur = () => ({
    numara,
    surum,
    teslimat: { ...kisi, adres: adresGirdisi(teslimat) },
    fatura:
      faturaTuru === "kurumsal"
        ? {
            tur: "kurumsal" as const,
            ...kurumsal,
            adresAyni: faturaAyni,
            ...(faturaAyni ? {} : { adres: adresGirdisi(faturaAdresi) }),
          }
        : {
            tur: "bireysel" as const,
            adresAyni: faturaAyni,
            ...(faturaAyni ? {} : { adres: adresGirdisi(faturaAdresi) }),
          },
    eposta: veri.epostaGidebilir && eposta,
  });

  const gonder = async (_olay: FormEvent<HTMLFormElement>) => {
    const girdi = siparisAdresiSemasi.safeParse(girdiKur());
    const yeni: HataHaritasi = {};
    if (veri.telefonZorunlu && kisi.telefon.trim() === "") {
      yeni["teslimat.telefon"] = metin("vitrin.odeme.hata.gerekli");
    }
    if (!girdi.success) {
      for (const sorun of girdi.error.issues) {
        const alan = sorun.path.join(".");
        if (yeni[alan] !== undefined) continue;
        yeni[alan] = hataMetni(
          metin,
          alan,
          sorun.code === "custom" ? sorun.message : sorun.code,
          0,
        );
      }
    }
    if (!girdi.success || Object.keys(yeni).length > 0) {
      pf.hatalariGoster(yeni);
      return;
    }
    const sonuc = await pf.isle(() =>
      islem<{ degisti: boolean }>("siparis-adresi", girdi.data, "yonetim.siparis.adres.basari", {
        formda: true,
        // Aynı bilgiler bir şey yazmaz: başarı denmez, pencere kapanır.
        bildirim: (veri) =>
          veri.degisti ? { tur: "basari", metin: "yonetim.siparis.adres.basari" } : null,
      }),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      pf.temizle();
      bitti();
      return;
    }
    // Alanın hatası alanda (vergi bölgesi değişen ülke, il ya da posta kodunda), alanı olmayan hata özette.
    const alanHatalari: HataHaritasi = {};
    for (const sorun of sonuc.ayrinti) {
      if (genelHatalar[sorun.kod] !== undefined || sorun.alan === "" || sorun.alan === "siparis") {
        continue;
      }
      if (sorun.kod === "vergi-bolgesi-degisir") {
        alanHatalari[sorun.alan] = metin("yonetim.siparis.adres.hata.vergiBolgesi");
        continue;
      }
      alanHatalari[sorun.alan] = hataMetni(metin, sorun.alan, sorun.kod, 0);
    }
    if (Object.keys(alanHatalari).length > 0) {
      pf.hatalariGoster(alanHatalari);
      return;
    }
    pf.hatalariGoster({}, [metin(islemHataMetni(sonuc))]);
  };

  return (
    <PanelFormu durum={pf} gonder={gonder} className="gap-4">
      <Uyari tur="bilgi">{metin("yonetim.siparis.adres.bilgi")}</Uyari>
      <h3 className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.siparis.adres.teslimat")}
      </h3>
      <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
        <MetinAlani
          ad="teslimat.ad"
          etiket={metin("vitrin.odeme.ad")}
          autoComplete="off"
          deger={kisi.ad}
          onDegisti={degistir((ad: string) => setKisi((onceki) => ({ ...onceki, ad })))}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
        <MetinAlani
          ad="teslimat.soyad"
          etiket={metin("vitrin.odeme.soyad")}
          autoComplete="off"
          deger={kisi.soyad}
          onDegisti={degistir((soyad: string) => setKisi((onceki) => ({ ...onceki, soyad })))}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
        <MetinAlani
          ad="teslimat.telefon"
          etiket={metin(
            veri.telefonZorunlu ? "vitrin.odeme.telefon" : "vitrin.odeme.telefonIstegeBagli",
          )}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          deger={kisi.telefon}
          onDegisti={degistir((telefon: string) => setKisi((onceki) => ({ ...onceki, telefon })))}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
      </div>
      <AdresAlanlari
        onEk="teslimat.adres"
        adres={teslimat}
        degistir={degistir(setTeslimat)}
        ulkeler={veri.ulkeler}
        hatalar={hatalar}
        kimlikler={kimlikler}
      />
      {/* Taslaktaki ipucu: açık adres değişince önceki yazılışı görünür. */}
      {teslimat.adres === t.adres.adres ? null : (
        <p className="m-0 -mt-2 text-kucuk text-soluk-yazi wrap-anywhere">
          {doldur(metin("yonetim.siparis.adres.oncekiAdres"), { adres: t.adres.adres })}
        </p>
      )}

      <h3 className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.siparis.adres.fatura")}
      </h3>
      <AlanKabi ad="fatura.tur" etiket={metin("vitrin.odeme.faturaTuru")}>
        <SecenekGrubu
          baslik={metin("vitrin.odeme.faturaTuru")}
          etiket={metin("vitrin.odeme.faturaTuru")}
          secilemezEki=""
          ogeler={[
            { deger: "bireysel", ad: metin("vitrin.odeme.bireysel") },
            { deger: "kurumsal", ad: metin("vitrin.odeme.kurumsal") },
          ]}
          deger={faturaTuru}
          onDegerDegisti={degistir((deger: string) =>
            setFaturaTuru(deger === "kurumsal" ? "kurumsal" : "bireysel"),
          )}
        />
      </AlanKabi>
      {faturaTuru === "kurumsal" ? (
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <MetinAlani
            ad="fatura.firma"
            etiket={metin("vitrin.odeme.firma")}
            autoComplete="off"
            deger={kurumsal.firma}
            onDegisti={degistir((firma: string) => setKurumsal((onceki) => ({ ...onceki, firma })))}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <MetinAlani
            ad="fatura.vergiDairesi"
            etiket={metin("vitrin.odeme.vergiDairesi")}
            autoComplete="off"
            deger={kurumsal.vergiDairesi}
            onDegisti={degistir((vergiDairesi: string) =>
              setKurumsal((onceki) => ({ ...onceki, vergiDairesi })),
            )}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
          <MetinAlani
            ad="fatura.vergiNumarasi"
            etiket={metin("vitrin.odeme.vergiNumarasi")}
            inputMode="numeric"
            autoComplete="off"
            deger={kurumsal.vergiNumarasi}
            onDegisti={degistir((vergiNumarasi: string) =>
              setKurumsal((onceki) => ({ ...onceki, vergiNumarasi })),
            )}
            hatalar={hatalar}
            kimlikler={kimlikler}
          />
        </div>
      ) : null}
      <OnayKutusu
        etiket={metin("vitrin.odeme.faturaAdresiAyni")}
        checked={faturaAyni}
        onCheckedChange={degistir((isaretli: boolean | "indeterminate") =>
          setFaturaAyni(isaretli === true),
        )}
      />
      {faturaAyni ? null : (
        <AdresAlanlari
          onEk="fatura.adres"
          adres={faturaAdresi}
          degistir={degistir(setFaturaAdresi)}
          ulkeler={veri.ulkeler}
          hatalar={hatalar}
          kimlikler={kimlikler}
        />
      )}
      {veri.epostaGidebilir ? (
        <OnayKutusu
          etiket={metin("yonetim.siparis.adres.eposta")}
          checked={eposta}
          onCheckedChange={(isaretli) => setEposta(isaretli === true)}
        />
      ) : null}
      <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.siparis.adres.ipucu")}</p>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.siparis.adres.kaydet")} vazgec={vazgec} />
    </PanelFormu>
  );
}
