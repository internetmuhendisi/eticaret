// Bülten kaydının görünüşü (kart 0112; Canlı Çarşı taslağının bülten şeridi). Başlık ve metin zemin renginde
// solda, form sağda; telefonda alt alta. Form zemin renginde bir kutudadır: alanın, onay kutusunun ve hatanın
// okunurluğu yalnız zemin üstünde ölçülmüştür (taslakta form doğrudan şeridin üstündedir). Bütün odaklanabilir öğeler
// o kutuda olduğu için şeride renkli zeminin odak kuralı verilmez: kural kutuya geçip odağı görünmez yapıyordu.
// - Şerit: sayfanın bütün genişliğinde bant, içeriği içerik genişliğinde (taslak).
// - Kutu: içerik genişliğinde köşeli kutu.
import { useId } from "react";
import { sinif } from "../../../../bilesenler/parcalar/sinif";
import type { BolumGorunumuOzellikleri } from "../../bolum-kutuphanesi/gorunumler";
import { BultenFormu } from "../../bulten-formu";
import { metinMi } from "../ortak/deger";
import { solukYaziSiniflari, zeminSiniflari } from "../ortak/zemin";

export function BultenKaydiGorunumu({ gorunum, degerler: ham, baglam }: BolumGorunumuOzellikleri) {
  const baslikKimligi = useId();
  // Değerler tarifin şemasından geçmiştir (kart 0106); türleri tarifteki alanlardır.
  const degerler = ham as Partial<Record<"baslik" | "metin" | "zemin", unknown>>;
  // Eklentisi kurulmamış sitede gönderilecek yer yoktur: bölüm çizilmez (işlev açık olsa da).
  const kayit = baglam.bultenKaydi;
  if (!metinMi(degerler.baslik) || kayit === undefined) return null;
  const zemin = degerler.zemin ?? "birincil";
  const serit = gorunum === "serit";
  const icerik = (
    <div className="flex flex-col gap-6 masaustu:flex-row masaustu:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2
          id={baslikKimligi}
          className="font-baslik text-baslik-2 font-baslik-kalinligi wrap-anywhere"
        >
          {degerler.baslik}
        </h2>
        {metinMi(degerler.metin) ? (
          <p className={sinif("whitespace-pre-line", solukYaziSiniflari(zemin))}>
            {degerler.metin}
          </p>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 rounded-orta bg-zemin p-4 text-yazi tablet:p-6">
        <BultenFormu kayit={kayit} />
      </div>
    </div>
  );
  return (
    <section
      aria-labelledby={baslikKimligi}
      className={sinif(
        serit ? "w-full py-8" : "mx-auto w-full max-w-icerik px-4 tablet:px-6",
        serit ? zeminSiniflari(zemin, "birincil", { odak: false }) : undefined,
      )}
    >
      {serit ? (
        <div className="mx-auto w-full max-w-icerik px-4 tablet:px-6">{icerik}</div>
      ) : (
        <div
          className={sinif(
            "rounded-orta p-6 tablet:p-8",
            zeminSiniflari(zemin, "birincil", { odak: false }),
          )}
        >
          {icerik}
        </div>
      )}
    </section>
  );
}
