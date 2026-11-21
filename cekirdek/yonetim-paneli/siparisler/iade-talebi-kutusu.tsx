"use client";
// Müşterinin iade talebi kutusu (kart 0239, karar 0151; kart 0233'ün taslağı): siparişin ayrıntısında en üstte durur.
// Bekleyen talepte ürünler, neden, açıklama ve iade kargosunun kimden olduğu; "Onayla" onay penceresiyle sorulur,
// "Reddet" yan pencerede müşteriye açıklama ister. Onay parayı geri ödemez: ürün gelince komut çubuğundaki "İade yap"
// talebin ürünleriyle seçili açılır. Düğmeler yalnız siparis.iade izni olana görünür; istek talebin kimliğini gönderir,
// arada karar verildiyse sayfa yenilenir ve bildirilir.
import { type FormEvent, useState } from "react";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Rozet } from "../../../bilesenler/parcalar/rozet";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { iadeTalebiSinirlari } from "../../kayitlar/siparis";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { talepDurumRozeti } from "./metinler";
import type { SiparisAyrintisiVerisi } from "./veri";

type Talep = SiparisAyrintisiVerisi["talepler"][number];

const hataMetni = (hata: PanelHatasi): MetinAnahtari => {
  if (hata.kod === "cakisma" || hata.kod === "bulunamadi") return "yonetim.iadeTalebi.hata.cakisma";
  if (hata.kod === "yetki") return "yonetim.siparis.hata.yetki";
  return "yonetim.siparis.hata.genel";
};

export function IadeTalebiKutusu({
  numara,
  talep,
  kararVerilebilir,
  iadeKargosu,
}: {
  numara: string;
  talep: Talep;
  kararVerilebilir: boolean;
  iadeKargosu: "magaza" | "musteri";
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [onay, setOnay] = useState(false);
  const [ret, setRet] = useState(false);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setRet(false));
  const bekliyor = talep.durum === "bekliyor";
  const rozet = talepDurumRozeti[talep.durum];
  return (
    <Kart
      aria-labelledby={`iade-talebi-${talep.kimlik}`}
      className="gap-3 border-2 border-birincil p-4 tablet:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id={`iade-talebi-${talep.kimlik}`}
          className="font-baslik text-baslik-4 font-baslik-kalinligi"
        >
          {metin("yonetim.iadeTalebi.baslik")}
        </h2>
        <Rozet tur={rozet.tur}>{metin(rozet.metin)}</Rozet>
      </div>
      <p className="flex flex-col gap-1">
        <span>
          {talep.kalemler
            .map((kalem) =>
              doldur(metin("yonetim.iade.liste.kalem"), { adet: String(kalem.adet), ad: kalem.ad }),
            )
            .join(" · ")}
          {" · "}
          <strong>{metin(`yonetim.iade.neden.${talep.neden}`)}</strong>
        </span>
        <span className="text-kucuk text-soluk-yazi">
          {doldur(metin("yonetim.iadeTalebi.ayrinti"), {
            zaman: talep.zaman,
            kargo: metin(
              iadeKargosu === "magaza"
                ? "yonetim.iadeTalebi.kargoMagaza"
                : "yonetim.iadeTalebi.kargoMusteri",
            ),
          })}
        </span>
      </p>
      {talep.aciklama === null ? (
        <p className="text-kucuk text-soluk-yazi">{metin("yonetim.iadeTalebi.aciklamaYok")}</p>
      ) : (
        <p className="rounded-orta bg-yuzey px-3 py-2 whitespace-pre-line wrap-anywhere">
          {talep.aciklama}
        </p>
      )}
      {bekliyor && kararVerilebilir ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Dugme onClick={() => setOnay(true)}>{metin("yonetim.iadeTalebi.onayla")}</Dugme>
            <Dugme tur="sade" onClick={() => setRet(true)}>
              {metin("yonetim.iadeTalebi.reddet")}
            </Dugme>
          </div>
          <p className="text-kucuk text-soluk-yazi">{metin("yonetim.iadeTalebi.onayAciklamasi")}</p>
        </>
      ) : null}
      {talep.durum === "onaylandi" ? (
        <p className="text-kucuk">{metin("yonetim.iadeTalebi.onaylandiAciklamasi")}</p>
      ) : null}
      <OnayPenceresi
        acik={onay}
        acikDegisince={setOnay}
        tur="birincil"
        baslik={metin("yonetim.iadeTalebi.onay.baslik")}
        aciklama={doldur(metin("yonetim.iadeTalebi.onay.metin"), { numara })}
        onayEtiketi={metin("yonetim.iadeTalebi.onayla")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          await islem(
            "iade-talebi-karari",
            { numara, talep: talep.kimlik, karar: "onayla" },
            "yonetim.iadeTalebi.basari.onaylandi",
          );
        }}
      />
      <YanPencere open={ret} onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}>
        {ret ? (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-form"
          >
            <YanPencereUstu>
              <YanPencereBasligi>{metin("yonetim.iadeTalebi.ret.baslik")}</YanPencereBasligi>
              <YanPencereAciklamasi>
                {metin("yonetim.iadeTalebi.ret.aciklama")}
              </YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <RetFormu
              numara={numara}
              talep={talep.kimlik}
              degisince={degisince}
              vazgec={kapatmayiIste}
              bitti={kapat}
            />
          </YanPencereIcerigi>
        ) : null}
      </YanPencere>
    </Kart>
  );
}

function RetFormu({
  numara,
  talep,
  degisince,
  vazgec,
  bitti,
}: {
  numara: string;
  talep: string;
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  bitti: () => void;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [yazildi, setYazildi] = useState(false);
  // Ortak form yapısı (kart 0259): hata, özet, odak; pencere kapatılırken soru useKapatmaSorusu'ndadır.
  const pf = usePanelFormu({ degisti: yazildi });

  const gonder = async (olay: FormEvent<HTMLFormElement>) => {
    const retAciklamasi = String(new FormData(olay.currentTarget).get("retAciklamasi") ?? "");
    if (retAciklamasi.trim() === "") {
      pf.hatalariGoster({ retAciklamasi: metin("yonetim.iadeTalebi.ret.gerekli") });
      return;
    }
    const yanit = await pf.isle(() =>
      islem(
        "iade-talebi-karari",
        { numara, talep, karar: "reddet", retAciklamasi },
        "yonetim.iadeTalebi.basari.reddedildi",
        { formda: true },
      ),
    );
    if (yanit === undefined) return;
    if (yanit.tamam) {
      bitti();
      return;
    }
    if (yanit.kod === "dogrulama") {
      pf.hatalariGoster({ retAciklamasi: metin("yonetim.iadeTalebi.ret.gecersiz") });
      return;
    }
    pf.hatalariGoster({}, [metin(hataMetni(yanit))]);
  };

  return (
    <PanelFormu durum={pf} gonder={gonder}>
      <PanelAlani
        ad="retAciklamasi"
        etiket={metin("yonetim.iadeTalebi.ret.alan")}
        aciklama={doldur(metin("yonetim.iadeTalebi.ret.alanAciklamasi"), {
          sinir: String(iadeTalebiSinirlari.retAciklamasiEnCok),
        })}
        zorunlu
      >
        {(ozellikler) => (
          <UzunMetinAlani
            {...ozellikler}
            name="retAciklamasi"
            rows={5}
            maxLength={iadeTalebiSinirlari.retAciklamasiEnCok}
            onChange={() => {
              setYazildi(true);
              degisince(true);
              pf.alaniTemizle("retAciklamasi");
            }}
          />
        )}
      </PanelAlani>
      <KaydetCubugu kaydetEtiketi={metin("yonetim.iadeTalebi.reddet")} vazgec={vazgec} />
    </PanelFormu>
  );
}
