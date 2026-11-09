// Form parçalarının görünüşü: yalnız tasarım değerlerinin adlarıyla yazılmış Tailwind sınıfları
// (kart 0102, karar 0076). Renkler sitenin temasından gelir, açık ve koyu temada kendiliğinden değişir.
// Yükseklik 11 (2,75rem): parmakla rahat basılır.
export const stil = {
  alan: "flex flex-col gap-1",
  aciklama: "text-kucuk text-soluk-yazi",
  hata: "font-kalin text-tehlike-yazi",
  giris:
    "box-border min-h-11 w-full rounded-orta border border-alan-kenari bg-zemin px-3 text-yazi placeholder:text-soluk-yazi aria-invalid:border-2 aria-invalid:border-tehlike",
  dugme:
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-dugme bg-birincil px-6 font-kalin text-birincil-ustu disabled:cursor-not-allowed disabled:bg-yuzey disabled:text-soluk-yazi",
  // Anlamı yazıyla verilir, renk yalnız destekler (.claude/rules/erisilebilirlik.md).
  uyari: "rounded-orta border-2 border-tehlike bg-tehlike-zemin p-3 text-tehlike-yazi",
  // Kod birkaç saniyede yüklenmezse görünür (kart 0057).
  yukleniyor: "invisible animate-geciken-gorunum",
  onay: "flex flex-col gap-1",
  // Yazının tamamı kutuyu işaretler: dokunma alanı kutuyla sınırlı kalmaz.
  onayEtiketi: "flex min-h-11 cursor-pointer items-start gap-2 py-2",
  // İşaretli kutu yazı rengindedir: birincil renk açık zeminde işaret için yeterli kontrastta olmayabilir.
  onayKutusu: "m-0 size-6 flex-none accent-yazi",
  baglanti: "inline-flex min-h-11 items-center",
} as const;
