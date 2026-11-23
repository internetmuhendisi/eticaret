"use client";
// Sipariş ayrıntısında faturanın düğmeleri ve penceresi (kart 0268, karar 0170; taslak: planlar/tasarim-yonu/panel.html,
// "Fatura ekle"). Fatura yokken "Fatura ekle", varken "Düzenle" ve "Faturayı kaldır". Yan pencerede numara, tarih,
// isteğe bağlı PDF ve "Faturanız hazır" e-postası (varsayılan işaretli, kullanıcı kararı). PDF seçilince hemen
// fatura-yukle ucuyla yüklenir (ilerleme ve iptalle), formda kimliğiyle durur; fatura "Kaydet"le siparis-fatura ucuna
// gider. Ekran gördüğü faturayı gönderir: arada değiştiyse sunucu çakışma verir, sayfa yenilenir. Hatalar ortak form
// yapısıyla (karar 0159): alanın altında, tek hatada odak alanda.
import { useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { DosyaYukleme } from "../../../bilesenler/parcalar/dosya-yukleme";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { belgeSinirlari, yuklenebilenBelgeTurleri } from "../../kayitlar/dosya";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { dosyaHatasiMetni, useDosyaYuklemesi } from "../dosya-yuklemesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import type { SiparisAyrintisiVerisi } from "./veri";

type Fatura = NonNullable<SiparisAyrintisiVerisi["faturaBelgesi"]>;
// Formdaki dosya: kayıtlı ya da yeni yüklenen; ad yalnız yeni yüklenende (seçilen dosyanın adı).
type FormDosyasi = { kimlik: string; yazi: string } | null;
type FormDegeri = { numara: string; tarih: string; dosya: FormDosyasi; eposta: boolean };

const hataMetni = (hata: PanelHatasi): MetinAnahtari => {
  if (hata.kod === "cakisma") return "yonetim.siparis.fatura.hata.cakisma";
  if (hata.kod === "yetki") return "yonetim.siparis.hata.yetki";
  return "yonetim.siparis.hata.genel";
};

const gorulen = (fatura: Fatura | null) =>
  fatura === null
    ? null
    : { numara: fatura.numara, tarih: fatura.tarih, dosya: fatura.dosya?.kimlik ?? null };

export function FaturaIslemleri({
  numara,
  fatura,
  dosyaEklenebilir,
  belge,
  bugun,
}: {
  numara: string;
  fatura: Fatura | null;
  dosyaEklenebilir: boolean;
  belge: SiparisAyrintisiVerisi["belge"];
  // Sitenin saat dilimindeki bugün: yeni faturanın tarih alanının başlangıcı.
  bugun: string;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [acik, setAcik] = useState(false);
  const [kaldirSorusu, setKaldirSorusu] = useState(false);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setAcik(false));
  return (
    <div className="flex flex-wrap gap-2">
      <Dugme tur="sade" onClick={() => setAcik(true)}>
        <Ikon ad={fatura === null ? "ekle" : "duzenle"} />
        {metin(fatura === null ? "yonetim.siparis.fatura.ekle" : "yonetim.siparis.fatura.duzenle")}
      </Dugme>
      {fatura === null ? null : (
        <Dugme tur="sade" onClick={() => setKaldirSorusu(true)}>
          {metin("yonetim.siparis.fatura.kaldir")}
        </Dugme>
      )}
      <YanPencere open={acik} onOpenChange={(yeni) => (yeni ? undefined : kapatmayiIste())}>
        {acik ? (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-form"
          >
            <YanPencereUstu>
              <YanPencereBasligi>
                {metin(
                  fatura === null
                    ? "yonetim.siparis.fatura.pencere.ekleBaslik"
                    : "yonetim.siparis.fatura.pencere.duzenleBaslik",
                )}
              </YanPencereBasligi>
              <YanPencereAciklamasi>
                {metin("yonetim.siparis.fatura.pencere.aciklama")}
              </YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <FaturaFormu
              ilk={{
                numara: fatura?.numara ?? "",
                tarih: fatura?.tarih ?? bugun,
                dosya:
                  fatura?.dosya === null || fatura?.dosya === undefined
                    ? null
                    : {
                        kimlik: fatura.dosya.kimlik,
                        yazi: doldur(metin("yonetim.siparis.fatura.pencere.dosyaAdi"), {
                          ad: doldur(metin("yonetim.siparis.fatura.indir"), { numara }),
                          boyut: fatura.dosya.boyut,
                        }),
                      },
                eposta: true,
              }}
              dosyaEklenebilir={dosyaEklenebilir}
              belge={belge}
              degisince={degisince}
              vazgec={kapatmayiIste}
              gonder={async (form) => {
                const sonuc = await islem(
                  "siparis-fatura",
                  {
                    numara,
                    gorulen: gorulen(fatura),
                    fatura: {
                      numara: form.numara,
                      tarih: form.tarih,
                      dosya: form.dosya?.kimlik ?? null,
                    },
                    eposta: form.eposta,
                  },
                  "yonetim.siparis.fatura.basari.kaydedildi",
                  { formda: true },
                );
                if (sonuc.tamam) kapat();
                return sonuc;
              }}
            />
          </YanPencereIcerigi>
        ) : null}
      </YanPencere>
      {fatura === null ? null : (
        <OnayPenceresi
          acik={kaldirSorusu}
          acikDegisince={setKaldirSorusu}
          baslik={metin("yonetim.siparis.fatura.kaldirOnay.baslik")}
          aciklama={doldur(metin("yonetim.siparis.fatura.kaldirOnay.metin"), {
            numara: fatura.numara,
          })}
          onayEtiketi={metin("yonetim.siparis.fatura.kaldirOnay.dugme")}
          vazgecEtiketi={metin("ortak.islem.vazgec")}
          onayla={async () => {
            await islem(
              "siparis-fatura-kaldir",
              { numara, gorulen: gorulen(fatura) },
              "yonetim.siparis.fatura.basari.kaldirildi",
            );
          }}
        />
      )}
    </div>
  );
}

function FaturaFormu({
  ilk,
  dosyaEklenebilir,
  belge,
  degisince,
  vazgec,
  gonder,
}: {
  ilk: FormDegeri;
  dosyaEklenebilir: boolean;
  belge: SiparisAyrintisiVerisi["belge"];
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  gonder: (form: FormDegeri) => Promise<{ tamam: true } | ({ tamam: false } & PanelHatasi)>;
}) {
  const metin = usePanelMetni();
  const [form, setForm] = useState(ilk);
  const { yukleme, yukle, iptalEt } = useDosyaYuklemesi(belgeSinirlari.enCokBayt);
  const farkli = (deger: FormDegeri) =>
    deger.numara !== ilk.numara ||
    deger.tarih !== ilk.tarih ||
    (deger.dosya?.kimlik ?? null) !== (ilk.dosya?.kimlik ?? null);
  const pf = usePanelFormu({ degisti: farkli(form) });
  const degistir = (yeni: Partial<FormDegeri>, alan?: string) => {
    const sonraki = { ...form, ...yeni };
    setForm(sonraki);
    if (alan !== undefined) pf.alaniTemizle(alan);
    degisince(farkli(sonraki));
  };
  const dosyaHatasi = (sonuc: PanelHatasi) =>
    doldur(metin(dosyaHatasiMetni(sonuc, "belge")), {
      boyut: belge.enCokBoyut,
      turler: belge.turler,
    });

  const dosyaSecildi = async (dosya: File) => {
    pf.alaniTemizle("fatura-dosyasi");
    const sonuc = await yukle<{ dosya: string; boyut: number }>("fatura-yukle", dosya);
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      degistir({
        dosya: {
          kimlik: sonuc.veri.dosya,
          yazi: doldur(metin("yonetim.siparis.fatura.pencere.yuklendi"), { ad: dosya.name }),
        },
      });
      return;
    }
    if (sonuc.kod === "iptal") return;
    pf.hatalariGoster({ "fatura-dosyasi": dosyaHatasi(sonuc) });
  };

  const kaydet = async () => {
    const hatalar: Record<string, string> = {};
    if (form.numara.trim() === "")
      hatalar["fatura-numarasi"] = metin("yonetim.siparis.fatura.hata.numara");
    if (form.tarih === "") hatalar["fatura-tarihi"] = metin("yonetim.siparis.fatura.hata.tarih");
    if (Object.keys(hatalar).length > 0) {
      pf.hatalariGoster(hatalar);
      return;
    }
    const sonuc = await pf.isle(() => gonder(form));
    if (sonuc === undefined || sonuc.tamam) return;
    const alanlar: Record<string, string> = {};
    for (const sorun of sonuc.ayrinti) {
      if (sorun.alan.startsWith("fatura.numara")) {
        alanlar["fatura-numarasi"] = metin("yonetim.siparis.fatura.hata.numaraBicimi");
      } else if (sorun.alan.startsWith("fatura.tarih")) {
        alanlar["fatura-tarihi"] = metin("yonetim.siparis.fatura.hata.tarih");
      } else if (sorun.alan.startsWith("fatura.dosya")) {
        alanlar["fatura-dosyasi"] = metin(
          sorun.kod === "dosya-kullanimda"
            ? "yonetim.siparis.fatura.hata.dosyaKullanimda"
            : sorun.kod === "kisisel-veri-silindi"
              ? "yonetim.siparis.fatura.hata.kisiselSilindi"
              : "yonetim.siparis.fatura.hata.dosyaYok",
        );
      }
    }
    if (Object.keys(alanlar).length > 0 && sonuc.kod !== "cakisma") {
      pf.hatalariGoster(alanlar);
      return;
    }
    pf.hatalariGoster({}, [metin(hataMetni(sonuc))]);
  };

  const dosyaHataMetni = pf.hata("fatura-dosyasi");
  const dosyaHataKimligi = "fatura-dosyasi-hata";
  const dosyaAciklamaKimligi = "fatura-dosyasi-aciklama";
  return (
    <PanelFormu durum={pf} gonder={kaydet} className="gap-4">
      <PanelAlani
        ad="fatura-numarasi"
        etiket={metin("yonetim.siparis.fatura.pencere.numara")}
        zorunlu
      >
        {(alan) => (
          <GirisAlani
            {...alan}
            name="fatura-numarasi"
            autoComplete="off"
            spellCheck={false}
            value={form.numara}
            onChange={(olay) => degistir({ numara: olay.target.value }, "fatura-numarasi")}
          />
        )}
      </PanelAlani>
      <PanelAlani ad="fatura-tarihi" etiket={metin("yonetim.siparis.fatura.pencere.tarih")} zorunlu>
        {(alan) => (
          <GirisAlani
            {...alan}
            type="date"
            name="fatura-tarihi"
            value={form.tarih}
            onChange={(olay) => degistir({ tarih: olay.target.value }, "fatura-tarihi")}
          />
        )}
      </PanelAlani>
      <AlanKabi ad="fatura-dosyasi" etiket={metin("yonetim.siparis.fatura.pencere.dosya")}>
        <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend className="mb-1 p-0 font-kalin">
            {metin("yonetim.siparis.fatura.pencere.dosya")}{" "}
            <span className="font-normal text-soluk-yazi">{metin("yonetim.form.istegeBagli")}</span>
          </legend>
          {dosyaEklenebilir ? (
            <>
              {form.dosya === null ? null : <p className="m-0 text-kucuk">{form.dosya.yazi}</p>}
              <DosyaYukleme
                secEtiketi={metin(
                  form.dosya === null
                    ? "yonetim.siparis.fatura.pencere.dosyaSec"
                    : "yonetim.siparis.fatura.pencere.dosyaDegistir",
                )}
                ikon="yukle"
                tur="cerceveli"
                kabul={yuklenebilenBelgeTurleri}
                onSecildi={([dosya]) => {
                  if (dosya !== undefined) void dosyaSecildi(dosya);
                }}
                yukleme={yukleme}
                ilerlemeEtiketi={doldur(metin("yonetim.dosya.ilerleme"), {
                  ad: metin("yonetim.siparis.fatura.pencere.dosya"),
                })}
                iptalEtiketi={metin("yonetim.dosya.iptal")}
                onIptal={iptalEt}
                aria-describedby={
                  dosyaHataMetni === undefined
                    ? dosyaAciklamaKimligi
                    : `${dosyaAciklamaKimligi} ${dosyaHataKimligi}`
                }
                {...(dosyaHataMetni === undefined ? {} : { "aria-invalid": true })}
              >
                {form.dosya === null || yukleme !== null ? null : (
                  <Dugme tur="sade" onClick={() => degistir({ dosya: null }, "fatura-dosyasi")}>
                    {metin("yonetim.siparis.fatura.pencere.dosyaKaldir")}
                  </Dugme>
                )}
              </DosyaYukleme>
              <p id={dosyaAciklamaKimligi} className="m-0 text-kucuk text-soluk-yazi">
                {doldur(metin("yonetim.siparis.fatura.pencere.dosyaAciklama"), {
                  turler: belge.turler,
                  boyut: belge.enCokBoyut,
                })}
              </p>
              {dosyaHataMetni === undefined ? null : (
                <p id={dosyaHataKimligi} className="m-0 font-kalin text-tehlike-yazi">
                  {dosyaHataMetni}
                </p>
              )}
            </>
          ) : (
            <Uyari tur="bilgi">{metin("yonetim.siparis.fatura.pencere.dosyaEklenemez")}</Uyari>
          )}
        </fieldset>
      </AlanKabi>
      <OnayKutusu
        etiket={metin("yonetim.siparis.fatura.pencere.eposta")}
        checked={form.eposta}
        onCheckedChange={(isaretli) => setForm({ ...form, eposta: isaretli === true })}
      />
      <KaydetCubugu
        kaydetEtiketi={metin("yonetim.siparis.fatura.pencere.kaydet")}
        vazgec={vazgec}
      />
    </PanelFormu>
  );
}
