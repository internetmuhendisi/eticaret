"use client";
// Kayan afişin tarayıcıda çalışan kısmı (kart 0110, karar 0087). Slaytların içeriği sunucuda çizilir, burada
// yalnız hangisinin görüneceği seçilir. WAI-ARIA'nın "carousel" kalıbı:
// - Bölüm "kayan afiş", her slayt "slayt" rol tanımıyla ve "2 / 3" adıyla okunur; yalnız etkin slayt görünür.
// - Kendiliğinden geçerken yeni slayt duyurulmaz (aria-live off); durunca duyurulur (polite).
// - Durdurma düğmesi klavye sırasında afişin ilk denetimidir: kodda slaytın düğmesinden önce gelir, ekranda
//   onun sağındadır (order-first). Denetimler zeminin yazı rengindedir.
// - Kendiliğinden geçen afişte durdurma düğmesi her zaman vardır. Fare afişin üstündeyken ya da klavye odağı içindeyken geçiş
//   bekler; kullanıcı durdurduysa bir daha kendiliğinden geçmez.
// - Hareket azaltma tercihinde kendiliğinden geçmez; kullanıcı başlat düğmesiyle isterse geçer.
// - Önceki, sonraki ve nokta düğmeleri klavyeyle kullanılır; etkin noktanın aria-current'ı vardır.
// Geçişte hareket yoktur: slayt yer değiştirir, kaymaz. Metinler sunucudan gelir.
import { type ReactNode, useEffect, useState } from "react";
import { Dugme, IkonDugmesi } from "../../../../bilesenler/parcalar/dugme";
import { useHareketAzaltma } from "../../../../bilesenler/parcalar/hareket-azaltma";
import { sinif } from "../../../../bilesenler/parcalar/sinif";

export type KaydiriciSlayti = {
  kimlik: string;
  yazi: ReactNode;
  dugme: ReactNode;
  gorsel: ReactNode;
};

export type KaydiriciMetinleri = {
  etiket: string;
  rolTanimi: string;
  slaytTanimi: string;
  // Her slaytın adı ("2 / 3") ve noktasının adı ("2. slaytı göster"), sırayla.
  slaytAdlari: readonly string[];
  noktaAdlari: readonly string[];
  onceki: string;
  sonraki: string;
  durdur: string;
  baslat: string;
};

export function Kaydirici({
  slaytlar,
  sure,
  metinler,
  gorunum,
}: {
  slaytlar: readonly KaydiriciSlayti[];
  // Kendiliğinden geçme süresi, milisaniye; yoksa geçmez.
  sure: number | undefined;
  metinler: KaydiriciMetinleri;
  gorunum: "yazi-solda" | "gorsel-arkada";
}) {
  const sayi = slaytlar.length;
  const [etkin, setEtkin] = useState(0);
  // Kullanıcının tercihi: durdurdu ya da (hareket azaltmada) başlattı.
  const [kullanici, setKullanici] = useState<"durdurdu" | "baslatti" | undefined>(undefined);
  const [askida, setAskida] = useState({ fare: false, odak: false });
  const hareketAzalt = useHareketAzaltma();

  const geciyor =
    sure !== undefined &&
    sayi > 1 &&
    (kullanici === "baslatti" || (kullanici === undefined && !hareketAzalt));
  const bekliyor = askida.fare || askida.odak;

  useEffect(() => {
    if (!geciyor || bekliyor) return;
    const zamanlayici = window.setInterval(() => setEtkin((sira) => (sira + 1) % sayi), sure);
    return () => window.clearInterval(zamanlayici);
  }, [geciyor, bekliyor, sure, sayi]);

  const git = (sira: number) => setEtkin((sira + sayi) % sayi);
  const slayt = slaytlar[etkin] ?? slaytlar[0];
  if (slayt === undefined) return null;

  const denetimler =
    sayi < 2 ? null : (
      <div className="flex flex-wrap items-center gap-1">
        {sure === undefined ? null : (
          <IkonDugmesi
            ikon={geciyor ? "durdur" : "baslat"}
            etiket={geciyor ? metinler.durdur : metinler.baslat}
            tur="sade"
            onClick={() => setKullanici(geciyor ? "durdurdu" : "baslatti")}
          />
        )}
        <IkonDugmesi
          ikon="onceki"
          etiket={metinler.onceki}
          tur="cerceveli"
          className="border-current text-current"
          onClick={() => git(etkin - 1)}
        />
        <div className="flex">
          {slaytlar.map((oge, sira) => (
            <Dugme
              key={oge.kimlik}
              tur="sade"
              aria-label={metinler.noktaAdlari[sira]}
              aria-current={sira === etkin ? "true" : undefined}
              className="w-8 px-0"
              onClick={() => git(sira)}
            >
              <span
                className={sinif(
                  "size-3 rounded-dugme border-2 border-current",
                  sira === etkin && "bg-current",
                )}
              />
            </Dugme>
          ))}
        </div>
        <IkonDugmesi
          ikon="sonraki"
          etiket={metinler.sonraki}
          tur="cerceveli"
          className="border-current text-current"
          onClick={() => git(etkin + 1)}
        />
      </div>
    );

  return (
    <section
      aria-roledescription={metinler.rolTanimi}
      aria-label={metinler.etiket}
      onMouseEnter={() => setAskida((onceki) => ({ ...onceki, fare: true }))}
      onMouseLeave={() => setAskida((onceki) => ({ ...onceki, fare: false }))}
      onFocus={() => setAskida((onceki) => ({ ...onceki, odak: true }))}
      onBlur={(olay) => {
        if (!olay.currentTarget.contains(olay.relatedTarget)) {
          setAskida((onceki) => ({ ...onceki, odak: false }));
        }
      }}
    >
      <div aria-live={geciyor && !bekliyor ? "off" : "polite"}>
        {/* Slayt değişince kap yeniden kurulmaz: içindeki denetimler yerinde kalır, klavye odağı kaybolmaz
            (kart 0110'un tarayıcı testi). */}
        {/* biome-ignore lint/a11y/useSemanticElements: WAI-ARIA'nın kayan afiş kalıbında slayt bir gruptur; fieldset form içindir. */}
        <div
          role="group"
          aria-roledescription={metinler.slaytTanimi}
          aria-label={metinler.slaytAdlari[etkin]}
          className={
            gorunum === "yazi-solda"
              ? "grid items-center gap-6 tablet:grid-cols-2"
              : "relative grid items-end"
          }
        >
          {gorunum === "yazi-solda" ? (
            <>
              <div className="flex min-w-0 flex-col gap-4">
                {slayt.yazi}
                <div className="flex flex-wrap items-center gap-3">
                  {denetimler}
                  {slayt.dugme === null ? null : <div className="order-first">{slayt.dugme}</div>}
                </div>
              </div>
              <div className="flex min-w-0 justify-center">{slayt.gorsel}</div>
            </>
          ) : (
            <>
              <div className="col-start-1 row-start-1 min-w-0">{slayt.gorsel}</div>
              {/* Telefonda yazı görselin altında, daha geniş ekranda görselin üstündedir. */}
              <div className="col-start-1 row-start-2 mt-4 flex max-w-form min-w-0 flex-col gap-4 rounded-orta bg-zemin p-6 text-yazi tablet:row-start-1 tablet:m-8">
                {slayt.yazi}
                <div className="flex flex-wrap items-center gap-3">
                  {denetimler}
                  {slayt.dugme === null ? null : <div className="order-first">{slayt.dugme}</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
