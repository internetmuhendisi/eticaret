"use client";
// Müşteri ayrıntısının notları (kart 0271, karar 0173): mağazanın müşteri hakkındaki notları, en yeni önce, yazanı ve
// zamanıyla. Notu yalnız panel görür, müşteriye gitmez. Not düzenlenmez; onay penceresiyle silinir. Ekleme ve silme
// yalnız musteri.not izni olana görünür (uç yine denetler). Form ortak form yapısıyladır (karar 0159): boş not
// sunucuya gitmeden alanın hatası olur, yazılmış ama eklenmemiş notla sayfadan çıkarken sorulur. Silmeden sonra odak
// sonraki notun silme düğmesine, not kalmadıysa not alanına gider.
import { useEffect, useRef, useState } from "react";
import { GonderDugmesi } from "../../../bilesenler/form/form";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import { musteriPanelSinirlari } from "../../kayitlar/musteri-paneli";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { PanelIkon } from "../panel-ikon";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import type { MusteriAyrintisiVerisi } from "./veri";

const hataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.musteri.notlar.yetki"
    : hata.kod === "bulunamadi"
      ? "yonetim.musteri.notlar.bulunamadi"
      : "yonetim.musteri.notlar.genel";

export function MusteriNotlari({
  musteri,
  notlar,
  degistirebilir,
}: {
  musteri: string;
  notlar: MusteriAyrintisiVerisi["notlar"];
  degistirebilir: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [yazi, setYazi] = useState("");
  const [silinecek, setSilinecek] = useState<string | null>(null);
  const yazildi = yazi.trim() !== "";
  const pf = usePanelFormu({ degisti: yazildi });
  const kok = useRef<HTMLDivElement>(null);
  // Silinen notun sırası: liste yenilenince odak o sıradaki (artık sonraki) nota ya da not alanına gider.
  const odakSirasi = useRef<number | null>(null);
  useEffect(() => {
    const sira = odakSirasi.current;
    if (sira === null) return;
    odakSirasi.current = null;
    const hedef = notlar[Math.min(sira, notlar.length - 1)];
    const dugme =
      hedef === undefined
        ? null
        : kok.current?.querySelector<HTMLElement>(`[data-not-sil="${hedef.kimlik}"]`);
    (dugme ?? kok.current?.querySelector<HTMLElement>('[name="musteri-notu"]'))?.focus();
  }, [notlar]);

  const ekle = async () => {
    if (!yazildi) {
      pf.hatalariGoster({ "musteri-notu": metin("yonetim.musteri.notlar.gerekli") });
      return;
    }
    const sonuc = await pf.isle(() =>
      islem("musteri-notu", { musteri, metin: yazi }, "yonetim.musteri.notlar.eklendi", {
        formda: true,
      }),
    );
    if (sonuc === undefined) return;
    if (sonuc.tamam) {
      setYazi("");
      pf.temizle();
      return;
    }
    if (sonuc.kod === "dogrulama") {
      pf.hatalariGoster({
        "musteri-notu": metin(
          sonuc.ayrinti.some((sorun) => sorun.kod === "too_big")
            ? "yonetim.musteri.notlar.uzun"
            : "yonetim.musteri.notlar.gecersiz",
        ),
      });
      return;
    }
    pf.hatalariGoster({}, [metin(hataMetni(sonuc))]);
  };

  const sil = async () => {
    if (silinecek === null) return;
    const sira = notlar.findIndex((not) => not.kimlik === silinecek);
    const sonuc = await islem(
      "musteri-notu-sil",
      { musteri, not: silinecek },
      "yonetim.musteri.notlar.silindi",
    );
    if (sonuc.tamam) odakSirasi.current = Math.max(sira, 0);
  };

  return (
    <div ref={kok} className="flex flex-col gap-4">
      {degistirebilir ? (
        <PanelFormu durum={pf} gonder={ekle} className="gap-3">
          <PanelAlani
            ad="musteri-notu"
            etiket={metin("yonetim.musteri.notlar.etiket")}
            aciklama={metin("yonetim.musteri.notlar.aciklama")}
          >
            {(alanOzellikleri) => (
              <UzunMetinAlani
                {...alanOzellikleri}
                name="musteri-notu"
                maxLength={musteriPanelSinirlari.notEnCok}
                value={yazi}
                onChange={(olay) => {
                  setYazi(olay.target.value);
                  pf.alaniTemizle("musteri-notu");
                }}
              />
            )}
          </PanelAlani>
          <GonderDugmesi tur="sade" className="w-fit" disabled={pf.gonderiliyor}>
            {metin("yonetim.musteri.notlar.kaydet")}
          </GonderDugmesi>
        </PanelFormu>
      ) : null}
      {notlar.length === 0 ? (
        <p className="text-soluk-yazi">{metin("yonetim.musteri.notlar.bos")}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {notlar.map((not) => (
            <li
              key={not.kimlik}
              className="flex flex-col gap-1 border-l-2 border-kenar pl-3 text-kucuk"
            >
              <span className="rounded-orta bg-uyari-zemin px-3 py-2 wrap-anywhere whitespace-pre-line">
                {not.metin}
              </span>
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-soluk-yazi">
                  {doldur(metin("yonetim.musteri.notlar.yazanZaman"), {
                    yazan: not.yazan,
                    zaman: not.zaman,
                  })}
                </span>
                {degistirebilir ? (
                  <Dugme
                    tur="sade"
                    data-not-sil={not.kimlik}
                    aria-label={doldur(metin("yonetim.musteri.notlar.silAdi"), {
                      zaman: not.zaman,
                    })}
                    onClick={() => setSilinecek(not.kimlik)}
                  >
                    <PanelIkon ad="sil" />
                    {metin("yonetim.musteri.notlar.sil")}
                  </Dugme>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      <OnayPenceresi
        acik={silinecek !== null}
        acikDegisince={(acik) => {
          if (!acik) setSilinecek(null);
        }}
        tur="tehlike"
        baslik={metin("yonetim.musteri.notlar.silOnay.baslik")}
        aciklama={metin("yonetim.musteri.notlar.silOnay.metin")}
        onayEtiketi={metin("yonetim.musteri.notlar.sil")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={sil}
      />
    </div>
  );
}
