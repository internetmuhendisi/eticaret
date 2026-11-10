"use client";
// Fırsatların geri sayımı (kart 0111, karar 0088). Saat tarayıcıda sürer; sunucu bağlamın anıyla çizer, ilk
// çizim aynıdır (hidrasyon farkı yok), sonra tarayıcının saatine geçer.
//
// - Kalan süre gün, saat ve dakikayla yazılır; ekran dakikada bir değişir. Sayaç role="timer"dır: ekran
//   okuyucu her değişimi okumaz, kullanıcı gelince okur (WCAG 2.2.2'deki gibi dikkat dağıtmaz).
// - İndirimi biten ürünün kartı bölümden kalkar (kullanıcı kararı); hepsi biterse bölüm çizilmez. Panelin
//   sayacı kalanların en yakın bitişine sayar.
// - Bitiş indirimin bittiği andır (hariç): o anda fiyat artık indirimli değildir.
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { ikiHaneli } from "../../../metinler/bicimleyici";
import { useMetin } from "../../../metinler/istemci-metni";
import { doldur } from "../../../moduller/eposta/sablon";
import { kalanSure, sonrakiDegisim } from "./sure";

// Şimdiki an; yalnız FirsatSaati'nin içinde anlamlıdır (bölüm hep onun içinde çizer).
const SimdiBaglami = createContext(0);
const useSimdi = (): number => useContext(SimdiBaglami);

export function FirsatSaati({
  baslangic,
  bitisler,
  children,
}: {
  // Sunucunun çizdiği an (bağlamın anı), milisaniye.
  baslangic: number;
  bitisler: readonly number[];
  children: ReactNode;
}) {
  const [simdi, setSimdi] = useState(baslangic);
  // Tarayıcıya geçince saati tarayıcının saatine alır; sonra yalnız bir sonraki değişimde yeniden kurar.
  // Arka plandaki sekmede zamanlayıcı gecikebilir: sekme yeniden görünür olunca saat hemen tazelenir.
  useEffect(() => {
    const tazele = () => setSimdi(Date.now());
    tazele();
    document.addEventListener("visibilitychange", tazele);
    return () => document.removeEventListener("visibilitychange", tazele);
  }, []);
  useEffect(() => {
    const bekle = sonrakiDegisim(bitisler, simdi);
    if (bekle === undefined) return;
    const zamanlayici = setTimeout(() => setSimdi(Date.now()), bekle);
    return () => clearTimeout(zamanlayici);
  }, [bitisler, simdi]);
  if (bitisler.every((bitis) => bitis <= simdi)) return null;
  return <SimdiBaglami.Provider value={simdi}>{children}</SimdiBaglami.Provider>;
}

// Bitişi geçen kartı kaldırır.
export function FirsatOgesi({ bitis, children }: { bitis: number; children: ReactNode }) {
  return bitis <= useSimdi() ? null : children;
}

// Kartın üstündeki kalan süre: "Bitmesine 2 gün 5 saat".
export function KalanSure({ bitis }: { bitis: number }) {
  const metin = useMetin();
  const { gun: g, saat: s, dakika: d } = kalanSure(bitis, useSimdi());
  // Sıfır olan küçük birim yazılmaz: "2 gün", "1 saat", "40 dakika".
  const sure =
    g > 0
      ? s > 0
        ? doldur(metin("vitrin.bolum.firsatlar.gunSaat"), { gun: String(g), saat: String(s) })
        : doldur(metin("vitrin.bolum.firsatlar.yalnizGun"), { gun: String(g) })
      : s > 0
        ? d > 0
          ? doldur(metin("vitrin.bolum.firsatlar.saatDakika"), {
              saat: String(s),
              dakika: String(d),
            })
          : doldur(metin("vitrin.bolum.firsatlar.yalnizSaat"), { saat: String(s) })
        : doldur(metin("vitrin.bolum.firsatlar.dakika"), { dakika: String(d) });
  return (
    <p className="font-kalin text-indirim text-kucuk">
      {doldur(metin("vitrin.bolum.firsatlar.bitmesine"), { sure })}
    </p>
  );
}

// Panelin büyük sayacı: kalanların en yakın bitişine gün, saat ve dakika kutuları.
export function Sayac({ bitisler }: { bitisler: readonly number[] }) {
  const metin = useMetin();
  const simdi = useSimdi();
  const hedef = useMemo(
    () => Math.min(...bitisler.filter((bitis) => bitis > simdi)),
    [bitisler, simdi],
  );
  if (!Number.isFinite(hedef)) return null;
  const kalan = kalanSure(hedef, simdi);
  const kutular = [
    { kod: "gun", sayi: kalan.gun, ad: metin("vitrin.bolum.firsatlar.gun") },
    { kod: "saat", sayi: kalan.saat, ad: metin("vitrin.bolum.firsatlar.saat") },
    { kod: "dakika", sayi: kalan.dakika, ad: metin("vitrin.bolum.firsatlar.dakikaAdi") },
  ];
  return (
    <div role="timer" aria-label={metin("vitrin.bolum.firsatlar.kalanSure")} className="flex gap-2">
      {kutular.map((kutu) => (
        <span
          key={kutu.kod}
          className="flex min-w-16 flex-col items-center rounded-kucuk bg-zemin px-2 py-3 text-kucuk text-yazi"
        >
          <span className="font-en-kalin text-baslik-2 tabular-nums">{ikiHaneli(kutu.sayi)}</span>
          {kutu.ad}
        </span>
      ))}
    </div>
  );
}
