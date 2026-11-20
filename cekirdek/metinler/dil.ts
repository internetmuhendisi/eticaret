// Metin dosyası olan diller ve varsayılan dil (tek tanım; metin.ts ve tarayıcıdaki okuyucu kullanır). Ayrı dosyadadır:
// tarayıcıda yalnız dili bilmesi gereken ekran (kök hata ekranı) bütün metin dosyasını içe aktarmasın (kart 0253).
export const diller = ["tr"] as const;
export type Dil = (typeof diller)[number];

// Dil ayarının varsayılanı (ayar şeması onu kullanır). Sitenin dili bilinmezken metin gösteren ekran (kök hata
// ekranı) ayar şemasını, onunla da zod'u ve bütün şemaları tarayıcıya taşımasın (kart 0146, ölçüldü).
export const varsayilanDil: Dil = "tr";
