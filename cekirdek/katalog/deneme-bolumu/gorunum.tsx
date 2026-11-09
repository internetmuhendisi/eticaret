// Deneme bölümlerinin görünüşleri (kart 0106). İçerik yalnız alan değerlerinden gelir; bölüm kodunda elle
// yazılmış metin, fiyat ya da görsel adresi yoktur (denetim/kurallar/bolum-icerigi.grit bu klasörü de tarar).
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart, KartAciklamasi, KartBasligi, KartIcerigi } from "../../../bilesenler/parcalar/kart";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import type {
  BolumGorunumleri,
  BolumGorunumuOzellikleri,
} from "../../vitrin/bolum-kutuphanesi/gorunumler";

// Temanın renklerinden seçilen zeminin sınıfı: sınıf adı parçalardan birleştirilmez, her renk ayrı yazılır.
const zeminSiniflari: Record<string, string> = {
  "kutu-1": "bg-kutu-1",
  "kutu-2": "bg-kutu-2",
  "kutu-3": "bg-kutu-3",
};

type Baglantisi = { adres: string; yeniSekme: boolean };
type Madde = { metin: string; baglanti?: Baglantisi };

const metinMi = (deger: unknown): deger is string => typeof deger === "string";

// Değerler şemadan geçmiştir (cekirdek/vitrin/bolum-kutuphanesi/tarif.ts); türleri tarifteki alanlardır.
type DenemeBolumuDegerleri = {
  baslik?: unknown;
  aciklama?: unknown;
  zemin?: unknown;
  maddeler?: Madde[];
};

function DenemeBolumuGorunumu({ gorunum, degerler: ham }: BolumGorunumuOzellikleri) {
  const degerler = ham as DenemeBolumuDegerleri;
  // Tarif en çok üç madde verir; görünüş yine de kendi sınırını korur.
  const maddeler = (degerler.maddeler ?? []).slice(0, 8);
  const zemin = metinMi(degerler.zemin) ? zeminSiniflari[degerler.zemin] : undefined;
  return (
    <Kart className={sinif(zemin, gorunum === "dar" && "max-w-form")}>
      <KartBasligi duzey={2}>{metinMi(degerler.baslik) ? degerler.baslik : null}</KartBasligi>
      {metinMi(degerler.aciklama) ? <KartAciklamasi>{degerler.aciklama}</KartAciklamasi> : null}
      {maddeler.length === 0 ? null : (
        <KartIcerigi>
          <ul className="flex flex-col gap-2">
            {maddeler.map((madde, sira) => (
              // Maddelerin kimliği yoktur; aynı metinli iki madde olabilir.
              // biome-ignore lint/suspicious/noArrayIndexKey: madde sırasıyla tanınır.
              <li key={sira}>
                {madde.baglanti === undefined ? (
                  madde.metin
                ) : (
                  <Baglanti
                    href={madde.baglanti.adres}
                    {...(madde.baglanti.yeniSekme
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {madde.metin}
                  </Baglanti>
                )}
              </li>
            ))}
          </ul>
        </KartIcerigi>
      )}
    </Kart>
  );
}

function DenemeSeridiGorunumu({ degerler: ham }: BolumGorunumuOzellikleri) {
  const degerler = ham as { metin?: unknown };
  return (
    <p className="bg-yuzey p-2 text-center">{metinMi(degerler.metin) ? degerler.metin : null}</p>
  );
}

function DenemeYorumlariGorunumu({ degerler: ham }: BolumGorunumuOzellikleri) {
  const degerler = ham as { baslik?: unknown };
  return <h2>{metinMi(degerler.baslik) ? degerler.baslik : null}</h2>;
}

export const denemeGorunumleri: BolumGorunumleri = {
  "deneme-bolumu": DenemeBolumuGorunumu,
  "deneme-seridi": DenemeSeridiGorunumu,
  "deneme-yorumlari": DenemeYorumlariGorunumu,
};
