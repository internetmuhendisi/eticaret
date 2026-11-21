"use client";
// Sipariş ayarlarının "Yönetici bildirimleri" bölümü (kart 0241, karar 0154; kart 0233'ün taslağı): bildirimlerin
// gideceği adresler (virgülle, en çok 5; boşsa mağaza sahibi rolündeki yöneticiler) ve her bildirimin anahtarı.
// Birlikte "Kaydet" ile kaydedilir; değişiklik kaydına girer (adreslerin değeri yazılmaz). Değiştirme izni olmayan
// yönetici okur, düğmeleri görmez. Adresler sunucuda doğrulanır; hata alanın altında yazar.
import { Anahtar } from "../../../bilesenler/parcalar/anahtar";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import {
  type YoneticiBildirimi,
  yoneticiBildirimSinirlari,
} from "../../kayitlar/yonetici-bildirimi";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";

export type YoneticiBildirimleriFormu = { alicilar: string; kapalilar: YoneticiBildirimi[] };

const bildirimAdlari: Record<YoneticiBildirimi, MetinAnahtari> = {
  "yeni-siparis": "yonetim.siparisAyarlari.bildirim.yeni-siparis",
  "havale-bildirimi": "yonetim.siparisAyarlari.bildirim.havale-bildirimi",
  "iade-talebi": "yonetim.siparisAyarlari.bildirim.iade-talebi",
  iptal: "yonetim.siparisAyarlari.bildirim.iptal",
  stok: "yonetim.siparisAyarlari.bildirim.stok",
  yorum: "yonetim.siparisAyarlari.bildirim.yorum",
  "kartla-odeme-uyusmazligi": "yonetim.siparisAyarlari.bildirim.kartla-odeme-uyusmazligi",
  "bekleyen-iade": "yonetim.siparisAyarlari.bildirim.bekleyen-iade",
};
const aliciHatalari: Record<string, MetinAnahtari> = {
  "alici-siniri": "yonetim.siparisAyarlari.alicilar.hata.sinir",
  "eposta-gecersiz": "yonetim.siparisAyarlari.alicilar.hata.eposta",
  "alici-tekrari": "yonetim.siparisAyarlari.alicilar.hata.tekrar",
};

const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki"
    ? "yonetim.siparisAyarlari.hata.yetki"
    : "yonetim.siparisAyarlari.hata.genel";

export function YoneticiBildirimleriAyarlari({
  baslangic,
  gorunenler,
  izinli,
}: {
  baslangic: YoneticiBildirimleriFormu;
  gorunenler: YoneticiBildirimi[];
  izinli: boolean;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu(baslangic);
  // Ortak form yapısı (kart 0259): hata, özet, odak, çıkarken soru.
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });
  const sinir = { sayi: String(yoneticiBildirimSinirlari.aliciEnCok) };

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem(
        "yonetici-bildirim-ayarlari",
        gonderilen,
        "yonetim.siparisAyarlari.bildirimlerKaydedildi",
        { formda: true },
      ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const alan =
      sonuc.kod === "dogrulama"
        ? sonuc.ayrinti.find(({ alan: ad }) => ad === "alicilar")
        : undefined;
    if (alan !== undefined) {
      pf.hatalariGoster({
        alicilar: doldur(
          metin(aliciHatalari[alan.kod] ?? "yonetim.siparisAyarlari.alicilar.hata.eposta"),
          sinir,
        ),
      });
      return false;
    }
    pf.hatalariGoster({}, [metin(genelHataMetni(sonuc))]);
    return false;
  };

  const degistir = (bildirim: YoneticiBildirimi, acik: boolean) =>
    setForm((onceki) => ({
      ...onceki,
      kapalilar: acik
        ? onceki.kapalilar.filter((kapali) => kapali !== bildirim)
        : [...onceki.kapalilar, bildirim],
    }));

  return (
    <section aria-labelledby="yonetici-bildirimleri" className="max-w-metin">
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <Kart className="gap-5 p-4 tablet:p-6">
          <div className="flex flex-col gap-1">
            <h2
              id="yonetici-bildirimleri"
              className="font-baslik text-baslik-4 font-baslik-kalinligi"
            >
              {metin("yonetim.siparisAyarlari.bildirimler")}
            </h2>
            <p className="text-kucuk text-soluk-yazi">
              {metin("yonetim.siparisAyarlari.bildirimlerAciklamasi")}
            </p>
          </div>
          <PanelAlani
            ad="alicilar"
            etiket={metin("yonetim.siparisAyarlari.alicilar.ad")}
            aciklama={doldur(metin("yonetim.siparisAyarlari.alicilar.aciklama"), sinir)}
            zorunlu={false}
          >
            {(baglanti) => (
              <GirisAlani
                {...baglanti}
                name="alicilar"
                inputMode="email"
                autoComplete="off"
                value={form.alicilar}
                disabled={!izinli}
                onChange={(olay) => {
                  const deger = olay.target.value;
                  setForm((onceki) => ({ ...onceki, alicilar: deger }));
                  pf.alaniTemizle("alicilar");
                }}
              />
            )}
          </PanelAlani>
          <ul className="flex flex-col divide-y divide-kenar">
            {gorunenler.map((bildirim) => (
              <li
                key={bildirim}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span>{metin(bildirimAdlari[bildirim])}</span>
                <Anahtar
                  etiket={metin(bildirimAdlari[bildirim])}
                  acikYazisi={metin("yonetim.siparisAyarlari.acik")}
                  kapaliYazisi={metin("yonetim.siparisAyarlari.kapali")}
                  checked={!form.kapalilar.includes(bildirim)}
                  disabled={!izinli}
                  onCheckedChange={(acik) => degistir(bildirim, acik)}
                />
              </li>
            ))}
          </ul>
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
