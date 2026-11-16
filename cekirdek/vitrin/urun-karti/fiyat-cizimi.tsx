// Fiyat bileşeni (kart 0109, karar 0085). Vitrin, sepet ve e-posta fiyatı her yerde bununla gösterir
// (.claude/rules/vitrin.md). Tutar, eski fiyat, vergi metni ve para biçimi çekirdeğin gösterilecek fiyat
// işlevinden hazır gelir (fiyatAraliklari, karar 0067); burada hesap yapılmaz, yalnız yazılır.
//
// - Tek fiyat: indirimli fiyat (eski fiyat gösteriliyorsa indirim renginde) ve üstü çizili eski fiyat.
//   Ekran okuyucu üstü çizili yazıyı ayırt etmez; iki tutarın adı ekran okuyucuda okunur.
// - Aralık (varyantlı ürün, kullanıcı kararı): "en düşük – en yüksek", para simgesi bir kez (Canlı Çarşı
//   taslağı). Aralıkta eski fiyat gösterilmez; indirimi kartın rozeti söyler.
// - Vergi metni (mağaza ayarı ya da vergi adından) fiyatın altında, soluk ve küçük.
// Büyük tutar kartı taşırmaz: tutar gerekirse alt satıra geçer, o da sığmazsa kırılır.
//
// Bu dosya çizimin kendisidir ve metin okumaz (kart 0212): sunucuda FiyatGosterimi (fiyat.tsx), tarayıcıda sepet
// (sepet/fiyat.tsx) iki ekran okuyucu etiketini verip bunu çizer. Fiyat yalnız gösterimin alanlarıyla gelir
// (GosterimFiyati): tarayıcıya JSON olarak giden sepet de aynı çizimi kullanır.
import { sinif } from "../../../bilesenler/parcalar/sinif";
import type { GosterimFiyati } from "./fiyat-turu";

// kucuk: sepet satırının birim fiyatı (kart 0211 taslağı).
export type FiyatBoyutu = "kucuk" | "normal" | "buyuk";

const tutarBoyutu: Record<FiyatBoyutu, string> = {
  kucuk: "text-govde",
  normal: "text-orta",
  buyuk: "text-baslik-4",
};
const eskiBoyutu: Record<FiyatBoyutu, string> = {
  kucuk: "text-kucuk",
  normal: "text-kucuk",
  buyuk: "text-govde",
};

// Ekran okuyucunun iki tutarı ayırt ettiği adlar ("İndirimli fiyat", "Eski fiyat").
export type FiyatEtiketleri = { indirimliFiyat: string; eskiFiyat: string };

export function FiyatCizimi({
  fiyat,
  etiketler,
  boyut = "normal",
  vergiMetni = true,
  className,
}: {
  fiyat: GosterimFiyati;
  etiketler: FiyatEtiketleri;
  boyut?: FiyatBoyutu;
  // Vergi metni ("KDV dahil") fiyatın altında. Sepet satırında yazılmaz: sepetin özeti vergiyi bir kez söyler.
  vergiMetni?: boolean;
  className?: string;
}) {
  const { enDusuk, enYuksek } = fiyat;
  // İki uç aynı tutardaysa (birleşimlerin eski fiyatı ya da indirimi farklı olsa da) tek tutar yazılır;
  // "150,00 – 150,00" yazılmaz. Eski fiyat yalnız bütün birleşimler aynıyken (tek) yazılır.
  const tekTutar = fiyat.tek || enDusuk.tutar === enYuksek.tutar;
  const eski = fiyat.tek ? enDusuk.yazili.eskiTutar : undefined;
  return (
    <div
      data-slot="fiyat"
      className={sinif("flex min-w-0 flex-wrap items-baseline gap-x-2", className)}
    >
      {tekTutar ? (
        <>
          {eski === undefined ? null : <span className="sr-only">{etiketler.indirimliFiyat}</span>}
          <strong
            className={sinif(
              "min-w-0 font-en-kalin wrap-anywhere",
              tutarBoyutu[boyut],
              eski !== undefined && "text-indirim",
            )}
          >
            {enDusuk.yazili.tutar}
          </strong>
          {eski === undefined ? null : (
            <>
              <span className="sr-only">{etiketler.eskiFiyat}</span>
              <s className={sinif("min-w-0 text-soluk-yazi wrap-anywhere", eskiBoyutu[boyut])}>
                {eski}
              </s>
            </>
          )}
        </>
      ) : (
        <strong className={sinif("min-w-0 font-en-kalin wrap-anywhere", tutarBoyutu[boyut])}>
          {fiyat.yaziliAralik}
        </strong>
      )}
      {!vergiMetni || enDusuk.ekMetin === undefined ? null : (
        <span className="w-full text-kucuk text-soluk-yazi">{enDusuk.ekMetin}</span>
      )}
    </div>
  );
}
