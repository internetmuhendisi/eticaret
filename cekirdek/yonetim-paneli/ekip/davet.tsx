"use client";
// Ekibe davet (kart 0275, karar 0179; taslak: Ekip, "Davet penceresi" ve "Davet bağlantısı"). Komut çubuğunun asıl
// eylemi "Davet et" pencereyi açar: e-posta ve roller (mağaza sahibi rolü davetle verilmez). Gönderilince pencere
// "Davet hazır" olur ve bağlantıyı bir kez gösterir: sunucuda gerçek e-posta gönderimi yokken (kart 0060) mağaza sahibi
// onu kişiye kendisi iletir. Pencere kapanınca bağlantı bir daha gösterilmez.
//
// Bekleyen davetin satırındaki "Daveti geri al" onay penceresiyle sorulur; satır kalkınca odak "Davet et"e geçer.
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Etiket } from "../../../bilesenler/parcalar/etiket";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { KopyalaDugmesi } from "../../../bilesenler/parcalar/kopyala-dugmesi";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereAltCubugu,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { davetAyari } from "../../kayitlar/oturum";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { davetGonderSemasi } from "../../moduller/ekip/semalar";
import { EylemDugmesi } from "../eylem-dugmesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";

// Davetin servis kodları ve metinleri (cekirdek/moduller/ekip/davet.ts).
export const davetHataMetinleri = {
  "eposta-gecersiz": "yonetim.ekip.hata.eposta-gecersiz",
  "davet-var": "yonetim.ekip.hata.davet-var",
  ekipte: "yonetim.ekip.hata.ekipte",
  "davet-siniri": "yonetim.ekip.hata.davet-siniri",
  "tam-yetki": "yonetim.ekip.hata.tam-yetki",
  "adres-yok": "yonetim.ekip.hata.adres-yok",
  "rol-gerekli": "yonetim.ekip.hata.rol-gerekli",
  "rol-yok": "yonetim.ekip.hata.rol-yok",
} as const satisfies Record<string, MetinAnahtari>;
const hataMetni = kodluHataMetni({
  ...davetHataMetinleri,
  bulunamadi: "yonetim.ekip.hata.davet-yok",
});

// Satır kalkınca odağın geçeceği düğme.
const davetEtSecicisi = "[data-davet-et]";

type Hazir = { eposta: string; baglanti: string };

export function DavetEt({ roller }: { roller: string[] }) {
  const metin = usePanelMetni();
  const [acik, setAcik] = useState(false);
  const [hazir, setHazir] = useState<Hazir | null>(null);
  // Pencere kapanınca odak "Davet et"e döner: gönderimden sonra sayfa yenilendiği için Radix'in dönüşü gövdede
  // kalıyordu (tarayıcı testinde ölçüldü).
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => {
    setAcik(false);
    setHazir(null);
    window.setTimeout(() => document.querySelector<HTMLElement>(davetEtSecicisi)?.focus(), 0);
  });
  return (
    <>
      <EylemDugmesi eylem="davet-et" asil data-davet-et="" onClick={() => setAcik(true)} />
      <YanPencere open={acik} onOpenChange={(yeni) => (yeni ? setAcik(true) : kapatmayiIste())}>
        {acik ? (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-form"
          >
            {hazir === null ? (
              <>
                <YanPencereUstu>
                  <YanPencereBasligi>{metin("yonetim.ekip.davet.baslik")}</YanPencereBasligi>
                  <YanPencereAciklamasi>
                    {metin("yonetim.ekip.davet.aciklama")}
                  </YanPencereAciklamasi>
                </YanPencereUstu>
                {soru}
                <DavetFormu
                  roller={roller}
                  degisince={degisince}
                  vazgec={kapatmayiIste}
                  gonderildi={(yeni) => {
                    degisince(false);
                    setHazir(yeni);
                  }}
                />
              </>
            ) : (
              <DavetHazir hazir={hazir} kapat={kapat} />
            )}
          </YanPencereIcerigi>
        ) : null}
      </YanPencere>
    </>
  );
}

function DavetFormu({
  roller,
  degisince,
  vazgec,
  gonderildi,
}: {
  roller: string[];
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  gonderildi: (hazir: Hazir) => void;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [eposta, setEposta] = useState("");
  // Taslaktaki gibi ilk rol (görevli) seçili gelir.
  const [secili, setSecili] = useState<string[]>(roller.slice(0, 1));
  // Rolleri değiştirmek de değişikliktir (bağımsız kontrolün bulgusu): Vazgeç sorar. Kapatma sorusuna değişiklik
  // anında, çizimi beklemeden bildirilir (useKapatmaSorusu).
  const degistiMi = (yeniEposta: string, yeniRoller: string[]) =>
    yeniEposta !== "" || yeniRoller.length !== 1 || yeniRoller[0] !== roller[0];
  const degisti = degistiMi(eposta, secili);
  const pf = usePanelFormu({ degisti });

  const alanlar = ["eposta", "roller"] as const;

  const gonder = async (_olay: FormEvent<HTMLFormElement>) => {
    const girdi = davetGonderSemasi.safeParse({ eposta, roller: secili });
    if (!girdi.success) {
      const yollar = new Set(girdi.error.issues.map((sorun) => String(sorun.path[0])));
      pf.hatalariGoster({
        ...(yollar.has("eposta") ? { eposta: metin(davetHataMetinleri["eposta-gecersiz"]) } : {}),
        ...(yollar.has("roller") ? { roller: metin(davetHataMetinleri["rol-gerekli"]) } : {}),
      });
      return;
    }
    const sonuc = await pf.isle(() =>
      islem<{ baglanti: string }>("ekip-davet", girdi.data, "yonetim.ekip.davet.gonderildi", {
        formda: true,
        // Sonucu "Davet hazır" penceresi söyler; ayrıca bildirim aynı şeyi ikinci kez duyurur.
        bildirim: () => null,
      }),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      pf.temizle();
      gonderildi({ eposta: girdi.data.eposta, baglanti: sonuc.veri.baglanti });
      return;
    }
    const alanHatalari = kodluAlanHatalari(davetHataMetinleri, sonuc, alanlar);
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [alan, metin(anahtar)]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [metin(hataMetni(sonuc))],
    );
  };

  const rollerHatasi = pf.hata("roller");
  return (
    <PanelFormu durum={pf} gonder={gonder}>
      <PanelAlani ad="eposta" etiket={metin("yonetim.ekip.davet.eposta")} zorunlu>
        {(alan) => (
          <GirisAlani
            {...alan}
            name="eposta"
            type="email"
            autoComplete="off"
            value={eposta}
            onChange={(olay) => {
              setEposta(olay.target.value);
              degisince(degistiMi(olay.target.value, secili));
              pf.alaniTemizle("eposta");
            }}
          />
        )}
      </PanelAlani>
      <AlanKabi ad="roller" etiket={metin("yonetim.ekip.davet.roller")}>
        <fieldset
          aria-describedby={rollerHatasi === undefined ? undefined : "davet-roller-hata"}
          className="m-0 flex flex-col border-0 p-0"
        >
          <legend className="font-kalin">{metin("yonetim.ekip.davet.roller")}</legend>
          {roller.map((kod, sira) => (
            <OnayKutusu
              key={kod}
              etiket={metin(`yonetim.rol.${kod}` as MetinAnahtari)}
              ek={
                <span className="-mt-3 pl-8 text-kucuk text-soluk-yazi">
                  {metin(`yonetim.rolAciklamasi.${kod}` as MetinAnahtari)}
                </span>
              }
              checked={secili.includes(kod)}
              onCheckedChange={(isaretli) => {
                const yeni =
                  isaretli === true
                    ? roller.filter((rol) => rol === kod || secili.includes(rol))
                    : secili.filter((rol) => rol !== kod);
                setSecili(yeni);
                degisince(degistiMi(eposta, yeni));
                pf.alaniTemizle("roller");
              }}
              {...(sira === 0 ? { "data-hata-odagi": "" } : {})}
            />
          ))}
        </fieldset>
        {rollerHatasi === undefined ? null : (
          <p id="davet-roller-hata" className="m-0 mt-2 font-kalin text-tehlike-yazi">
            {rollerHatasi}
          </p>
        )}
      </AlanKabi>
      <p className="m-0 text-kucuk text-soluk-yazi">
        {doldur(metin("yonetim.ekip.davet.ipucu"), { gun: String(davetAyari.gecerlilikGun) })}
      </p>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.ekip.davet.gonder")} vazgec={vazgec} />
    </PanelFormu>
  );
}

// Bağlantı bir kez gösterilir; pencerenin içeriği değişince odak bağlantının alanına geçer ve bağlantı seçilir.
function DavetHazir({ hazir, kapat }: { hazir: Hazir; kapat: () => void }) {
  const metin = usePanelMetni();
  return (
    <>
      <YanPencereUstu>
        <YanPencereBasligi>{metin("yonetim.ekip.davet.hazirBaslik")}</YanPencereBasligi>
      </YanPencereUstu>
      {/* Taslaktaki gibi başarı kutusu; pencerenin açıklaması da odur. */}
      <YanPencereAciklamasi asChild>
        <div>
          <Uyari tur="basari">
            {doldur(metin("yonetim.ekip.davet.hazir"), { eposta: hazir.eposta })}
          </Uyari>
        </div>
      </YanPencereAciklamasi>
      <div className="flex flex-col gap-2">
        <Etiket htmlFor="davet-baglantisi">{metin("yonetim.ekip.davet.baglanti")}</Etiket>
        <div className="flex flex-col gap-2 tablet:flex-row">
          <GirisAlani
            // Pencerenin içeriği değişti: odak bağlantıya geçmezse gövdeye düşer.
            autoFocus
            id="davet-baglantisi"
            readOnly
            value={hazir.baglanti}
            aria-describedby="davet-baglantisi-ipucu"
            className="font-kod"
            onFocus={(olay) => olay.currentTarget.select()}
          />
          <KopyalaDugmesi
            deger={hazir.baglanti}
            etiket={metin("yonetim.ekip.davet.kopyala")}
            kopyalandiMetni={metin("yonetim.ekip.davet.kopyalandi")}
            kopyalanamadiMetni={metin("yonetim.ekip.davet.kopyalanamadi")}
            className="shrink-0"
          />
        </div>
        <p id="davet-baglantisi-ipucu" className="m-0 text-kucuk text-soluk-yazi">
          {metin("yonetim.ekip.davet.baglantiIpucu")}
        </p>
      </div>
      <YanPencereAltCubugu className="justify-end">
        <Dugme tur="birincil" onClick={kapat}>
          {metin("yonetim.ekip.davet.tamam")}
        </Dugme>
      </YanPencereAltCubugu>
    </>
  );
}

// Bekleyen davetin "Daveti geri al"ı. Geri alınan satır sayfa yenilenince kalkar; kalkarken odak "Davet et"e geçer.
export function DavetiGeriAl({ kimlik, eposta }: { kimlik: string; eposta: string }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [acik, setAcik] = useState(false);
  const alindi = useRef(false);
  useEffect(
    () => () => {
      if (alindi.current) document.querySelector<HTMLElement>(davetEtSecicisi)?.focus();
    },
    [],
  );
  return (
    <>
      <Dugme
        tur="sade"
        aria-label={doldur(metin("yonetim.ekip.davet.geriAlAdi"), { eposta })}
        onClick={() => setAcik(true)}
      >
        {metin("yonetim.ekip.davet.geriAl")}
      </Dugme>
      <OnayPenceresi
        acik={acik}
        acikDegisince={setAcik}
        baslik={doldur(metin("yonetim.ekip.davet.geriAlOnay.baslik"), { eposta })}
        aciklama={metin("yonetim.ekip.davet.geriAlOnay.aciklama")}
        onayEtiketi={metin("yonetim.ekip.davet.geriAlOnay.onay")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          const sonuc = await islem(
            "ekip-davet-geri-al",
            { kimlik },
            "yonetim.ekip.davet.geriAlindi",
          );
          if (sonuc.tamam) alindi.current = true;
        }}
        tur="tehlike"
      />
    </>
  );
}
