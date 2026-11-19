// Sipariş ekranlarının ortak metin seçimleri (kart 0234): durum, ödeme yöntemi, geçmişin nedeni ve yazanı. Sunucuda
// çizilen liste ile tarayıcıdaki ayrıntı aynı seçimi kullanır; metni çağıranın metin işlevi okur.
import type { SiparisDurumu, SiparisGecmisiNedeni } from "../../kayitlar/siparis";
import type { MetinAnahtari } from "../../metinler/metin";

// Kayıttaki her durumun ve nedenin metni (tür kontrolü eksik olanı yakalar).
const durumlar: Record<SiparisDurumu, MetinAnahtari> = {
  "odeme-bekleniyor": "ortak.siparisDurumu.odeme-bekleniyor",
  hazirlaniyor: "ortak.siparisDurumu.hazirlaniyor",
  kargoda: "ortak.siparisDurumu.kargoda",
  "teslim-edildi": "ortak.siparisDurumu.teslim-edildi",
  "kismi-iade": "ortak.siparisDurumu.kismi-iade",
  "iade-edildi": "ortak.siparisDurumu.iade-edildi",
  iptal: "ortak.siparisDurumu.iptal",
};
export const durumMetni = (durum: SiparisDurumu): MetinAnahtari => durumlar[durum];

const yontemler: Record<string, MetinAnahtari> = {
  havale: "ortak.odemeYontemi.havale",
  "kapida-odeme": "ortak.odemeYontemi.kapidaOdeme",
  kart: "ortak.odemeYontemi.kartla",
};
const secenekler: Record<string, MetinAnahtari> = {
  nakit: "ortak.odemeYontemi.nakit",
  kart: "ortak.odemeYontemi.kart",
};

// "Kapıda ödeme · Nakit" gibi: yöntem ve (kapıda ödemede) seçenek.
export const odemeYazisi = (
  metin: (anahtar: MetinAnahtari) => string,
  yontem: string,
  secenek: string | null,
): string =>
  [yontemler[yontem], secenek === null ? undefined : secenekler[secenek]]
    .filter((anahtar): anahtar is MetinAnahtari => anahtar !== undefined)
    .map(metin)
    .join(" · ");

const nedenler: Record<SiparisGecmisiNedeni, MetinAnahtari> = {
  olusturuldu: "yonetim.siparis.neden.olusturuldu",
  "havale-suresi-doldu": "yonetim.siparis.neden.havale-suresi-doldu",
  "havale-bildirildi": "yonetim.siparis.neden.havale-bildirildi",
  "havale-onaylandi": "yonetim.siparis.neden.havale-onaylandi",
  "hazirlamaya-alindi": "yonetim.siparis.neden.hazirlamaya-alindi",
  "kargoya-verildi": "yonetim.siparis.neden.kargoya-verildi",
  "kargo-duzeltildi": "yonetim.siparis.neden.kargo-duzeltildi",
  "teslim-edildi": "yonetim.siparis.neden.teslim-edildi",
};
export const nedenMetni = (neden: string): MetinAnahtari =>
  nedenler[neden as SiparisGecmisiNedeni] ?? "yonetim.siparis.neden.olusturuldu";

const sistemYazanlari: Record<string, MetinAnahtari> = {
  "havale-suresi": "yonetim.siparis.yazan.sistem.havale-suresi",
  "uye-olmayan-musteri": "yonetim.siparis.yazan.sistem.uye-olmayan-musteri",
};

export const yazanYazisi = (
  metin: (anahtar: MetinAnahtari) => string,
  yazan:
    | { tur: "musteri" | "yonetici" | "sahip"; eposta: string | null }
    | { tur: "sistem"; ad: string },
): string => {
  if (yazan.tur === "sistem")
    return metin(sistemYazanlari[yazan.ad] ?? "yonetim.siparis.yazan.sistemGenel");
  if (yazan.eposta !== null && yazan.eposta !== "") return yazan.eposta;
  return metin(
    yazan.tur === "musteri" ? "yonetim.siparis.yazan.musteri" : "yonetim.siparis.yazan.yonetici",
  );
};
