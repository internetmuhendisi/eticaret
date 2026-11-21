"use client";
// Kargo ekranı (kart 0212, karar 0135; kart 0211'in taslağı): teslimat bölgesinin kartında kargo ücreti, ücretsiz kargo
// sınırı, sınırın hangi tutara baktığı ve kargoya verme süresi. Tutarlar sitenin para biçimiyle yazılır, sunucuda
// okunur; okunamayan alan kendi hatasıyla döner, form değişmez. Kaydedilince hemen yayınlanır, değişen her ayar
// değişiklik kaydına girer. Değiştirme izni olmayan yönetici alanları okur, düğmeleri görmez.
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { type UcretsizKargoTutari, ucretsizKargoTutarlari } from "../../kayitlar/sepet";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { KargoEkraniVerisi, KargoFormu } from "./veri";

type Alan = keyof KargoFormu;

const alanHatasiMetni: Record<string, MetinAnahtari> = {
  "tutar-okunamadi": "yonetim.kargo.hata.tutarOkunamadi",
  "tutar-sinir-disi": "yonetim.kargo.hata.tutarSinirDisi",
  "gun-gecersiz": "yonetim.kargo.hata.gunGecersiz",
};

// Alana bağlanmayan hata (yetki, ağ, sunucu) formun başındaki özette yazılır.
const genelHataMetni = (hata: PanelHatasi): MetinAnahtari =>
  hata.kod === "yetki" ? "yonetim.kargo.hata.yetki" : "yonetim.kargo.hata.genel";

const sinirTutariAdlari: Record<UcretsizKargoTutari, MetinAnahtari> = {
  "indirimden-sonra": "yonetim.kargo.indirimdenSonra",
  "indirimden-once": "yonetim.kargo.indirimdenOnce",
};

export function KargoEkrani({ veri, izinli }: { veri: KargoEkraniVerisi; izinli: boolean }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(genelHataMetni);
  // Kayıttan sonra sayfa yenilenir: sunucunun yazdığı hâl (örneğin "60" yerine "60,00") kaydedilmemiş değişiklik
  // yoksa formun yeni başlangıcıdır; arada yazılan değer ezilmez (kart 0223).
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<KargoFormu>(veri.form);
  // Ortak form yapısı (kart 0259): hata, özet, odak, çıkarken soru.
  const pf = usePanelFormu({ degisti: izinli && degisti, kaydet: () => kaydet() });

  const degistir = (alan: Alan, deger: string) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }));

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem("kargo-ayarlari", gonderilen, "yonetim.kargo.kaydedildi", { formda: true }),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const alanlar = Object.fromEntries(
      sonuc.ayrinti.flatMap(({ alan, kod }) => {
        const anahtar = alanHatasiMetni[kod];
        return anahtar !== undefined && alan in veri.form ? [[alan, metin(anahtar)]] : [];
      }),
    );
    pf.hatalariGoster(
      alanlar,
      Object.keys(alanlar).length > 0 ? [] : [metin(genelHataMetni(sonuc))],
    );
    return false;
  };

  const tutarAlani = (
    alan: "kargoUcreti" | "ucretsizKargoSiniri",
    etiket: MetinAnahtari,
    aciklama: MetinAnahtari,
    zorunlu: boolean,
  ) => (
    <PanelAlani ad={alan} etiket={metin(etiket)} aciklama={metin(aciklama)} zorunlu={zorunlu}>
      {(baglanti) => (
        // Para simgesi alanın içinde, yazının önünde ya da sonunda (taslak); ekran okuyucu etiketi okur.
        <span className="relative flex items-center">
          <GirisAlani
            {...baglanti}
            name={alan}
            inputMode="decimal"
            autoComplete="off"
            value={form[alan]}
            disabled={!izinli}
            onChange={(olay) => degistir(alan, olay.target.value)}
            className={veri.simgeYeri === "basta" ? "pl-10" : "pr-10"}
          />
          <span
            aria-hidden="true"
            className={sinif(
              "pointer-events-none absolute text-soluk-yazi",
              veri.simgeYeri === "basta" ? "left-4" : "right-4",
            )}
          >
            {veri.simge}
          </span>
        </span>
      )}
    </PanelAlani>
  );

  return (
    <PanelFormu
      durum={pf}
      gonder={async () => {
        await kaydet();
      }}
      className="max-w-metin"
    >
      <Kart className="flex flex-col gap-5 p-4 tablet:p-6">
        <h2 className="font-baslik text-baslik-4 font-baslik-kalinligi">{veri.bolge}</h2>
        <div className="grid gap-5 tablet:grid-cols-2">
          {tutarAlani(
            "kargoUcreti",
            "yonetim.kargo.ucret",
            veri.fiyatGirisi === "vergi-dahil"
              ? "yonetim.kargo.ucretAciklamasi.dahil"
              : "yonetim.kargo.ucretAciklamasi.haric",
            true,
          )}
          {tutarAlani(
            "ucretsizKargoSiniri",
            "yonetim.kargo.sinir",
            "yonetim.kargo.sinirAciklamasi",
            false,
          )}
        </div>
        <AlanKabi ad="ucretsizKargoTutari" etiket={metin("yonetim.kargo.sinirTutari")}>
          <SecenekGrubu
            baslik={metin("yonetim.kargo.sinirTutari")}
            etiket={metin("yonetim.kargo.sinirTutari")}
            ogeler={ucretsizKargoTutarlari.map((deger) => ({
              deger,
              ad: metin(sinirTutariAdlari[deger]),
              ...(izinli ? {} : { secilemez: true }),
            }))}
            deger={form.ucretsizKargoTutari}
            onDegerDegisti={(deger) => {
              if (izinli) degistir("ucretsizKargoTutari", deger);
            }}
            secilemezEki=""
          />
        </AlanKabi>
        <PanelAlani
          ad="kargoyaVermeSuresi"
          etiket={metin("yonetim.kargo.sure")}
          aciklama={metin("yonetim.kargo.sureAciklamasi")}
          zorunlu
        >
          {(baglanti) => (
            <GirisAlani
              {...baglanti}
              name="kargoyaVermeSuresi"
              inputMode="numeric"
              autoComplete="off"
              value={form.kargoyaVermeSuresi}
              disabled={!izinli}
              onChange={(olay) => degistir("kargoyaVermeSuresi", olay.target.value)}
              className="tablet:max-w-form"
            />
          )}
        </PanelAlani>
        {izinli ? (
          <KaydetCubugu
            sayfada
            durumYazisi
            degisiklikGerekli
            kaydetEtiketi={metin("yonetim.kargo.kaydet")}
            vazgec={() => {
              vazgec();
              pf.temizle();
            }}
          />
        ) : null}
      </Kart>
    </PanelFormu>
  );
}
