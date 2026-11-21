// Ürün açıklamasındaki bağlantının izinli adresleri (kart 0138, karar 0108): temizlik (aciklama.ts) ve panelin
// biçimli metin alanı (kart 0263) aynı kuralı kullanır. Bağlantı yalnız bu şemalara ya da sitenin kendi yoluna
// ("/kategori/...") gider; şemasız "//" adresi başka siteye gider, izinli değildir. Tarayıcıda da çalışır.
export const aciklamaBaglantiSemalari = ["https", "http", "mailto", "tel"] as const;

export const aciklamaBaglantisiGecerliMi = (adres: string): boolean => {
  const temiz = adres.trim();
  if (temiz.startsWith("/")) return !temiz.startsWith("//");
  const sema = /^([a-z][a-z0-9+.-]*):/i.exec(temiz)?.[1]?.toLowerCase();
  return (
    sema !== undefined &&
    (aciklamaBaglantiSemalari as readonly string[]).includes(sema) &&
    temiz.length > sema.length + 1
  );
};
