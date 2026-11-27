"use client";
// Fiyat girişinin değişikliği (kart 0326, karar 0201): vergi ekranında fiyat girişinin yanındaki "Değiştir" yan
// pencereyi açar. Pencere açılınca önizleme istenir (hiçbir şey yazılmaz): çevrilecek fiyat sayısı, müşteriye 1 kuruş
// farklı görünecek fiyatlar (ilk satırlar ve bütün liste CSV'de), kargo ücreti ve sınırı, kuponlar. "Fiyat girişini
// değiştir" onay penceresinden sonra önizlemenin sürümüyle uygular; arada bir şey değiştiyse sunucu çakışma döner,
// pencere söyler ve önizlemeyi yeniden ister. Yalnız vergi ve fiyatı değiştirme izni olana görünür.
import { useRef, useState } from "react";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import { YukleniyorGostergesi } from "../../../bilesenler/parcalar/yukleniyor";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { type FiyatGirisiHatasi, fiyatGirisiHatalari } from "../../moduller/fiyat/giris-hatalari";
import type { FiyatGirisi } from "../../moduller/vergi/semalar";
import { usePanelIslemi } from "../panel-islemi";
import { type PanelHatasi, panelIstegi, yoneticiUcu } from "../panel-istegi";
import { type FiyatGirisiOnizlemesi, gosterilenEnCok } from "./fiyat-girisi-tanim";

const hataMetni = (hata: PanelHatasi): MetinAnahtari => {
  const kod = hata.ayrinti.find((sorun) =>
    (fiyatGirisiHatalari as readonly string[]).includes(sorun.kod),
  )?.kod as FiyatGirisiHatasi | undefined;
  if (kod !== undefined) return `yonetim.vergi.giris.hata.${kod}`;
  if (hata.kod === "cakisma") return "yonetim.vergi.giris.hata.cakisma";
  if (hata.kod === "yetki") return "yonetim.vergi.giris.hata.yetki";
  return "yonetim.vergi.giris.hata.genel";
};

type Durum =
  | { tur: "kapali" }
  | { tur: "yukleniyor" }
  | { tur: "hazir"; onizleme: FiyatGirisiOnizlemesi; hata?: MetinAnahtari }
  | { tur: "hata"; hata: MetinAnahtari };

export function FiyatGirisiDegisikligi({ fiyatGirisi }: { fiyatGirisi: FiyatGirisi }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const yeni: FiyatGirisi = fiyatGirisi === "vergi-dahil" ? "vergi-haric" : "vergi-dahil";
  const [durum, setDurum] = useState<Durum>({ tur: "kapali" });
  const [onay, setOnay] = useState(false);
  const istek = useRef(0);

  const onizle = async (hata?: MetinAnahtari) => {
    const sira = ++istek.current;
    setDurum({ tur: "yukleniyor" });
    const sonuc = await panelIstegi<FiyatGirisiOnizlemesi>("fiyat-girisi-onizle", { yeni });
    if (sira !== istek.current) return;
    setDurum(
      sonuc.tamam
        ? { tur: "hazir", onizleme: sonuc.veri, ...(hata === undefined ? {} : { hata }) }
        : { tur: "hata", hata: hataMetni(sonuc) },
    );
  };

  const uygula = async () => {
    if (durum.tur !== "hazir") return;
    const sonuc = await islem(
      "fiyat-girisi-degistir",
      { yeni, surum: durum.onizleme.surum },
      "yonetim.vergi.giris.tamam",
      { formda: true },
    );
    if (sonuc.tamam) {
      istek.current += 1;
      setDurum({ tur: "kapali" });
      return;
    }
    // Arada bir şey değiştiyse önizleme yenilenir, neden pencerede yazar.
    if (sonuc.kod === "cakisma") await onizle(hataMetni(sonuc));
    else setDurum({ ...durum, hata: hataMetni(sonuc) });
  };

  const yeniAdi = metin(`yonetim.vergi.fiyatGirisiDeger.${yeni}`);
  const onizleme = durum.tur === "hazir" ? durum.onizleme : null;
  const csvAdresi = `${yoneticiUcu("fiyat-girisi-csv")}?yeni=${yeni}`;

  return (
    <>
      {/* Görünen ad "Değiştir"; neyi değiştirdiği ekran okuyucuya alanın etiketinden söylenir (vergi ekranı). */}
      <Dugme
        tur="cerceveli"
        className="self-start"
        aria-describedby="vergi-fiyat-girisi"
        onClick={() => void onizle()}
      >
        {metin("yonetim.vergi.giris.degistir")}
      </Dugme>
      <YanPencere
        open={durum.tur !== "kapali"}
        onOpenChange={(acik) => {
          if (acik) return;
          istek.current += 1;
          setDurum({ tur: "kapali" });
        }}
      >
        <YanPencereIcerigi kapatEtiketi={metin("ortak.parca.kapat")} className="tablet:max-w-metin">
          <YanPencereUstu>
            <YanPencereBasligi>{metin("yonetim.vergi.giris.baslik")}</YanPencereBasligi>
            <YanPencereAciklamasi>{metin("yonetim.vergi.giris.aciklama")}</YanPencereAciklamasi>
          </YanPencereUstu>
          <p>{doldur(metin("yonetim.vergi.giris.yeni"), { giris: yeniAdi })}</p>
          {durum.tur === "yukleniyor" ? (
            <YukleniyorGostergesi etiket={metin("ortak.parca.yukleniyor")} />
          ) : null}
          {durum.tur === "hata" ? <Uyari tur="tehlike">{metin(durum.hata)}</Uyari> : null}
          {onizleme === null ? null : (
            <section aria-labelledby="fiyat-girisi-onizleme" className="flex flex-col gap-3">
              <h3 id="fiyat-girisi-onizleme" className="font-kalin">
                {metin("yonetim.vergi.giris.onizlemeBasligi")}
              </h3>
              {durum.tur === "hazir" && durum.hata !== undefined ? (
                <Uyari tur="tehlike">{metin(durum.hata)}</Uyari>
              ) : null}
              <ul className="flex list-disc flex-col gap-1 pl-5">
                <li>
                  {doldur(metin("yonetim.vergi.giris.fiyatSayisi"), {
                    sayi: String(onizleme.fiyatSayisi),
                  })}
                </li>
                <li>{doldur(metin("yonetim.vergi.giris.kargo"), onizleme.kargoUcreti)}</li>
                {onizleme.ucretsizKargoSiniri === null ? null : (
                  <li>
                    {doldur(metin("yonetim.vergi.giris.sinir"), onizleme.ucretsizKargoSiniri)}
                  </li>
                )}
                {onizleme.kuponSayisi === 0 ? null : (
                  <li>
                    {doldur(metin("yonetim.vergi.giris.kupon"), {
                      sayi: String(onizleme.kuponSayisi),
                    })}
                  </li>
                )}
                {onizleme.sepetSinifi === null ? null : (
                  <li>
                    {doldur(metin("yonetim.vergi.giris.sepetSinifi"), {
                      sinif: onizleme.sepetSinifi,
                    })}
                  </li>
                )}
              </ul>
              {onizleme.degisenSayisi === 0 ? (
                <p>{metin("yonetim.vergi.giris.degisenYok")}</p>
              ) : (
                <>
                  <p>
                    {doldur(metin("yonetim.vergi.giris.degisen"), {
                      sayi: String(onizleme.degisenSayisi),
                    })}
                  </p>
                  <div className="overflow-x-auto">
                    <Tablo>
                      <TabloBasligi className="sr-only">
                        {metin("yonetim.vergi.giris.tabloBasligi")}
                      </TabloBasligi>
                      <TabloUstu>
                        <TabloSatiri>
                          <TabloBasHucresi>{metin("yonetim.vergi.giris.urun")}</TabloBasHucresi>
                          <TabloBasHucresi className="text-right">
                            {metin("yonetim.vergi.giris.once")}
                          </TabloBasHucresi>
                          <TabloBasHucresi className="text-right">
                            {metin("yonetim.vergi.giris.sonra")}
                          </TabloBasHucresi>
                        </TabloSatiri>
                      </TabloUstu>
                      <TabloGovdesi>
                        {onizleme.degisenler.map((satir) => (
                          <TabloSatiri key={satir.birim}>
                            <TabloHucresi>{satir.ad}</TabloHucresi>
                            <TabloHucresi className="text-right">{satir.once}</TabloHucresi>
                            <TabloHucresi className="text-right">{satir.sonra}</TabloHucresi>
                          </TabloSatiri>
                        ))}
                      </TabloGovdesi>
                    </Tablo>
                  </div>
                  {onizleme.degisenSayisi > gosterilenEnCok ? (
                    <p className="text-kucuk text-soluk-yazi">
                      {doldur(metin("yonetim.vergi.giris.fazlasi"), {
                        gosterilen: String(gosterilenEnCok),
                      })}
                    </p>
                  ) : null}
                  <Baglanti href={csvAdresi} download className="self-start">
                    {metin("yonetim.vergi.giris.indir")}
                  </Baglanti>
                </>
              )}
              <Dugme className="self-start" onClick={() => setOnay(true)}>
                {metin("yonetim.vergi.giris.uygula")}
              </Dugme>
            </section>
          )}
        </YanPencereIcerigi>
      </YanPencere>
      <OnayPenceresi
        acik={onay}
        acikDegisince={setOnay}
        baslik={metin("yonetim.vergi.giris.onayBaslik")}
        aciklama={doldur(metin("yonetim.vergi.giris.onayAciklama"), { yeni: yeniAdi })}
        onayEtiketi={metin("yonetim.vergi.giris.onay")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={uygula}
      />
    </>
  );
}
