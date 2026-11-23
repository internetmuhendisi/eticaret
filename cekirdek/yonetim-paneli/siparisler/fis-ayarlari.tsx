"use client";
// Sipariş ayarlarının "Sipariş fişi" bölümü (kart 0270, karar 0157): fişte fiyatların görünüp görünmediği. "Kaydet"
// ile kaydedilir, hemen geçerlidir; değişiklik kaydına girer. Değiştirme izni olmayan yönetici okur, anahtar kapalıdır.
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Kart } from "../../../bilesenler/parcalar/kart";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { KaydetCubugu, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.siparisAyarlari.hata.yetki"
    : "yonetim.siparisAyarlari.hata.genel";

export function FisAyarlari({
  baslangic,
  izinli,
}: {
  baslangic: { fisteFiyatlar: boolean };
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu(baslangic);
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem("fis-ayarlari", gonderilen, "yonetim.siparisAyarlari.fis.kaydedildi", {
        formda: true,
      }),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    pf.hatalariGoster({}, [metin(genelHataMetni(sonuc))]);
    return false;
  };

  return (
    <section aria-labelledby="siparis-fisi" className="max-w-metin">
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <Kart className="gap-5 p-4 tablet:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="siparis-fisi" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("yonetim.siparisAyarlari.fis.baslik")}
            </h2>
            <p className="text-kucuk text-soluk-yazi">
              {metin("yonetim.siparisAyarlari.fis.aciklama")}
            </p>
          </div>
          <Anahtar
            etiket={metin("yonetim.siparisAyarlari.fis.fiyatlar")}
            acikYazisi={metin("yonetim.siparisAyarlari.acik")}
            kapaliYazisi={metin("yonetim.siparisAyarlari.kapali")}
            checked={form.fisteFiyatlar}
            disabled={!izinli}
            onCheckedChange={(acik) => setForm({ fisteFiyatlar: acik })}
          />
          {izinli ? (
            <KaydetCubugu
              sayfada
              durumYazisi
              degisiklikGerekli
              kaydetEtiketi={metin("yonetim.siparisAyarlari.kaydet")}
              vazgec={() => {
                vazgec();
                pf.temizle();
              }}
            />
          ) : null}
        </Kart>
      </PanelFormu>
    </section>
  );
}
