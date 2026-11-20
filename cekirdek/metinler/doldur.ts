// Metindeki {ad} biçimindeki yerleri doldurur (tek tanım; e-posta şablonu, sunucu ve tarayıcı ekranları kullanır).
// Değer metnin içinde yeniden aranmaz. Ayrı dosyadadır: tarayıcıdaki ekran bunu alırken e-posta şablonunu ve onunla
// bütün metin dosyasını içe aktarmasın (kart 0253).
export const doldur = (metin: string, degerler: Record<string, string>): string =>
  metin.replace(/\{([a-zA-Z]+)\}/g, (yer, ad: string) => degerler[ad] ?? yer);
