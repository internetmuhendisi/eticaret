"use client";
// Blog ekranının "Blog vitrinde" bölümü (kart 0272, karar 0176): blogun vitrinde açık olması (mağaza ayarı blogAcik).
// Kapalıyken yazılar vitrinde görünmez, /blog bulunamadı verir, ana sayfanın blog bölümü çizilmez; panelde yazılar
// yazılmaya devam eder. "Kaydet" ile kaydedilir. Değiştirme izni (magaza-ayarlari.degistir) olmayan yönetici okur.
import { useMemo } from "react";
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { Kart } from "../../../bilesenler/parcalar/kart";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { KaydetCubugu, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki" ? "yonetim.blog.hata.yetki" : "yonetim.blog.hata.genel";

export function BlogAyari({ blogAcik, izinli }: { blogAcik: boolean; izinli: boolean }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  // Formun başlangıcı yalnız sunucunun değeri değişince yeni nesnedir: her çizimde yeni nesne sonsuz yeniden çizim
  // yapardı (sunucu formu yeni veriyi forma geçirir).
  const baslangic = useMemo(() => ({ blogAcik }), [blogAcik]);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu(baslangic);
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem("blog-ayari", gonderilen, "yonetim.blog.ayarKaydedildi", { formda: true }),
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
    <section aria-labelledby="blog-vitrinde">
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <Kart className="gap-4 p-4 tablet:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="blog-vitrinde" className="font-baslik text-baslik-4 font-baslik-kalinligi">
              {metin("yonetim.blog.ayar.baslik")}
            </h2>
            <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.blog.ayar.aciklama")}</p>
          </div>
          <Anahtar
            etiket={metin("yonetim.blog.ayar.anahtar")}
            acikYazisi={metin("yonetim.siparisAyarlari.acik")}
            kapaliYazisi={metin("yonetim.siparisAyarlari.kapali")}
            checked={form.blogAcik}
            disabled={!izinli}
            onCheckedChange={(acik) => setForm({ blogAcik: acik })}
          />
          {izinli ? (
            <KaydetCubugu
              sayfada
              durumYazisi
              degisiklikGerekli
              kaydetEtiketi={metin("ortak.islem.kaydet")}
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
