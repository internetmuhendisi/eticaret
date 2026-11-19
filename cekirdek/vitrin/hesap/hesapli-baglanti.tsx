"use client";
// Girişli müşteride başka adrese giden bağlantı (kart 0237): üst satırın ve yan pencerenin favori bağlantısı girişli
// müşteride Hesabım'ın Favorilerim'ine, öteki ziyaretçide favoriler sayfasına gider (taslak, karar 0149). Sunucu ve ilk
// çizim girişsiz adresi verir; hesap durumu gelince adres değişir (sayfada tek istek, hesap-durumu.ts).
import type { ComponentProps } from "react";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { useHesapDurumu } from "../hesap-durumu";

export function HesapliBaglanti({
  href,
  girisliAdres,
  sorulur,
  ...ozellikler
}: ComponentProps<typeof Baglanti> & {
  href: string;
  girisliAdres: string;
  // Bağlamın müşteri oturumu "sorulur" ise; katalogda ve demoda istek gitmez.
  sorulur: boolean;
}) {
  const durum = useHesapDurumu(sorulur);
  return <Baglanti href={durum.tur === "girisli" ? girisliAdres : href} {...ozellikler} />;
}
