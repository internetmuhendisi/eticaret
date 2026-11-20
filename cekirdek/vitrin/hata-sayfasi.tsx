"use client";
// Vitrinin hata sayfası (kart 0120, karar 0102; Canlı Çarşı taslağı). Vitrin çerçevesinin içindeki hata sınırıdır
// (app/(vitrin)/error.tsx): bir vitrin sayfası hata verince üst ve alt kısım yerinde kalır, hata içerikte görünür.
// Hatanın ayrıntısı müşteriye gösterilmez; hata kaydedilir. "Yeniden dene" sayfayı sunucudan yeniden ister.
// Mağazanın telefonu varsa açıklamada görünür. Sekme başlığı "Bir şeyler ters gitti | <mağaza adı>" olur: ekran
// okuyucu sayfa geçişini sekme başlığıyla duyurur. Hata ekranı tarayıcıda çizildiği için sayfa bilgisi
// (generateMetadata) veremez; başlık React'ın <title> öğesiyle yazılır, sayfa bilgisininkinden önce gelir (ölçüldü).
import { useEffect } from "react";
import { Ikon } from "../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../bilesenler/parcalar/baglanti";
import { Dugme } from "../../bilesenler/parcalar/dugme";
import { istemciHatasiniKaydet } from "../izleme/istemci-hata-katmani";
import { doldur } from "../metinler/doldur";
import { useMetin } from "../metinler/istemci-metni";
import { sekmeBasligi } from "../moduller/gorunurluk/sekme-basligi";
import { vitrinAdresleri } from "./adresler";
import { DurumSayfasi } from "./durum-sayfasi";
import { useVitrinBilgisi } from "./vitrin-bilgisi";

export function HataSayfasi({ error, retry }: { error: unknown; retry: () => void }) {
  const metin = useMetin();
  const { magazaAdi, telefon } = useVitrinBilgisi();
  const baslik = metin("vitrin.hata.baslik");
  useEffect(() => istemciHatasiniKaydet(error), [error]);
  return (
    <main className="flex w-full flex-col pb-12">
      <title>
        {magazaAdi === undefined
          ? metin("vitrin.hata.sekmeBasligi")
          : sekmeBasligi(
              metin("vitrin.sayfaBilgisi.kalip"),
              metin("vitrin.hata.sekmeBasligi"),
              magazaAdi,
            )}
      </title>
      <DurumSayfasi
        isaret={
          <span className="flex size-16 items-center justify-center rounded-dugme bg-yuzey text-soluk-yazi">
            <Ikon ad="yenile" className="size-6" />
          </span>
        }
        baslik={baslik}
        aciklama={
          telefon === undefined
            ? metin("vitrin.hata.aciklama")
            : doldur(metin("vitrin.hata.aciklamaTelefonlu"), { telefon })
        }
      >
        <Dugme tur="ikincil" onClick={() => retry()}>
          <Ikon ad="yenile" />
          {metin("vitrin.hata.yenidenDene")}
        </Dugme>
        <Baglanti href={vitrinAdresleri.anasayfa} gorunum="cerceveli">
          {metin("vitrin.hata.anasayfayaDon")}
        </Baglanti>
      </DurumSayfasi>
    </main>
  );
}
