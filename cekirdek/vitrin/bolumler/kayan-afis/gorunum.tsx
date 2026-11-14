// Kayan afişin (Slider) görünüşü (kart 0110; Canlı Çarşı taslağı). Slaytların içeriği burada, alan
// değerlerinden ve bağlamdaki görsellerden kurulur; hangi slaytın görüneceğini kaydirici.tsx seçer.
// - Yazı solda: rozet (üst yazı), başlık, metin, düğme ve gezinme solda; görsel sağda. Telefonda alt alta.
// - Görsel arkada: görsel bütün genişlikte, yazı onun üstünde zemin renginde bir kutuda.
// Başlık h2'dir: sayfanın h1'i ana sayfanın kendisindedir. Bağlantısı olmayan slaytta düğme yoktur; düğme yazısı
// verilmeyen slaytta da yoktur.
import { Baglanti } from "../../../../bilesenler/parcalar/baglanti";
import { Rozet } from "../../../../bilesenler/parcalar/rozet";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import { metin } from "../../../metinler/site-metni";
import { doldur } from "../../../moduller/eposta/sablon";
import { BolumGorseli } from "../../bolum-kutuphanesi/gorsel";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { secimDegeri } from "../../bolum-kutuphanesi/tarif";
import { baglantiMi, metinMi } from "../ortak/deger";
import { yeniSekmeOzellikleri } from "../ortak/menu";
import { zeminSiniflari } from "../ortak/zemin";
import { Kaydirici, type KaydiriciSlayti } from "./kaydirici";
import { gecisSureleri, kayanAfis } from "./tarif";

type Slayt = {
  gorsel?: unknown;
  darEkranGorseli?: unknown;
  gorselMetni?: unknown;
  ustYazi?: unknown;
  baslik?: unknown;
  metin?: unknown;
  dugmeYazisi?: unknown;
  baglanti?: unknown;
};

export function KayanAfisGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as { slaytlar?: unknown; gecis?: unknown; zemin?: unknown };
  const slaytlar = (Array.isArray(degerler.slaytlar) ? (degerler.slaytlar as Slayt[]) : []).filter(
    (slayt) => metinMi(slayt.baslik),
  );
  if (slaytlar.length === 0) return null;
  const arkada = gorunum === "gorsel-arkada";
  const gecis = secimDegeri(kayanAfis.alanlar.gecis, degerler.gecis);
  const sure = gecis === "kapali" ? undefined : gecisSureleri[gecis as keyof typeof gecisSureleri];
  const toplam = String(slaytlar.length);

  const kurulanlar: KaydiriciSlayti[] = slaytlar.map((slayt, sira) => {
    const baglanti = baglantiMi(slayt.baglanti) ? slayt.baglanti : undefined;
    return {
      kimlik: String(sira),
      yazi: (
        <>
          {metinMi(slayt.ustYazi) ? (
            <Rozet className="whitespace-normal">{slayt.ustYazi}</Rozet>
          ) : null}
          <h2 className="min-w-0 font-baslik text-baslik-1 font-baslik-kalinligi wrap-anywhere masaustu:text-afis-basligi">
            {slayt.baslik as string}
          </h2>
          {metinMi(slayt.metin) ? (
            <p className="max-w-form text-buyuk whitespace-pre-line">{slayt.metin}</p>
          ) : null}
        </>
      ),
      dugme:
        baglanti === undefined || !metinMi(slayt.dugmeYazisi) ? null : (
          <Baglanti
            href={baglanti.adres}
            gorunum="afis"
            className="no-underline"
            {...yeniSekmeOzellikleri(baglanti.yeniSekme)}
          >
            {slayt.dugmeYazisi}
          </Baglanti>
        ),
      gorsel: (
        <BolumGorseli
          baglam={baglam}
          gorsel={slayt.gorsel}
          telefonGorseli={slayt.darEkranGorseli}
          alternatifMetin={slayt.gorselMetni}
          genislik={arkada ? "tam" : "yarim"}
          oncelikli={sira === 0}
          className={
            arkada
              ? "aspect-4/3 w-full rounded-orta object-cover tablet:aspect-2/1"
              : "aspect-square w-full max-w-form object-contain"
          }
        />
      ),
    };
  });

  return (
    <div className={zeminSiniflari(degerler.zemin, "afis")}>
      <div
        className={sinif("mx-auto w-full max-w-icerik px-4 tablet:px-6", arkada ? "py-6" : "py-10")}
      >
        <Kaydirici
          slaytlar={kurulanlar}
          sure={sure}
          gorunum={arkada ? "gorsel-arkada" : "yazi-solda"}
          metinler={{
            etiket: metin("vitrin.bolum.kayanAfis.etiket"),
            rolTanimi: metin("vitrin.bolum.kayanAfis.rolTanimi"),
            slaytTanimi: metin("vitrin.bolum.kayanAfis.slaytTanimi"),
            slaytAdlari: kurulanlar.map((_, sira) =>
              doldur(metin("vitrin.bolum.kayanAfis.slaytAdi"), {
                sira: String(sira + 1),
                toplam,
              }),
            ),
            noktaAdlari: kurulanlar.map((_, sira) =>
              doldur(metin("vitrin.bolum.kayanAfis.slaytaGit"), { sira: String(sira + 1) }),
            ),
            onceki: metin("vitrin.bolum.kayanAfis.onceki"),
            sonraki: metin("vitrin.bolum.kayanAfis.sonraki"),
            durdur: metin("vitrin.bolum.kayanAfis.durdur"),
            baslat: metin("vitrin.bolum.kayanAfis.baslat"),
          }}
        />
      </div>
    </div>
  );
}
