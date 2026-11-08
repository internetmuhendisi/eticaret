// Video bağlantısının çözülmesi (kart 0087, karar 0073). Galeriye eklenen video, mağaza sahibinin
// yapıştırdığı bağlantıdan çıkarılan site ve kimlikle saklanır; bağlantının kendisi saklanmaz. Oynatıcı
// adresi kayıttaki kalıpla kimlikten kurulur (cekirdek/kayitlar/video-siteleri.ts).
//
// Kabul edilen biçimler:
// - YouTube: youtube.com/watch?v=<kimlik>, youtu.be/<kimlik>, youtube.com/embed|shorts|live/<kimlik>,
//   youtube-nocookie.com/embed/<kimlik>.
// - Vimeo: vimeo.com/<kimlik>, player.vimeo.com/video/<kimlik>. Liste dışı (gizli) Vimeo videosu ek bir
//   anahtar ister, kabul edilmez.
// Bağlantı http ya da https olmalı; kullanıcı adı, şifre ya da port taşıyamaz.
//
// Site doğrulaması bu dosyayı Node ile doğrudan çalıştırır: veritabanı kodu almaz.
import { type VideoSitesi, videoSiteAdlari, videoSiteleri } from "../../kayitlar/video-siteleri.ts";

export type CozulenVideo = { site: VideoSitesi; kimlik: string };

// Bağlantının en uzun hâli: daha uzun metin bağlantı olarak çözülmeye çalışılmaz.
export const videoAdresiUzunlugu = 500;

const yolParcalari = (adres: URL) => adres.pathname.split("/").filter((parca) => parca !== "");

const kimlikAdayi = (site: VideoSitesi, adres: URL): string | undefined => {
  const parcalar = yolParcalari(adres);
  if (site === "youtube") {
    if (adres.hostname === "youtu.be") return parcalar.length === 1 ? parcalar[0] : undefined;
    if (parcalar.length === 1 && parcalar[0] === "watch") {
      return adres.searchParams.get("v") ?? undefined;
    }
    if (parcalar.length === 2 && ["embed", "shorts", "live"].includes(parcalar[0] ?? "")) {
      return parcalar[1];
    }
    return undefined;
  }
  // Liste dışı Vimeo videosunun anahtarı (h) saklanmaz; anahtarsız oynatıcı açılmaz, kabul edilmez.
  if (adres.searchParams.has("h")) return undefined;
  if (adres.hostname === "player.vimeo.com") {
    return parcalar.length === 2 && parcalar[0] === "video" ? parcalar[1] : undefined;
  }
  return parcalar.length === 1 ? parcalar[0] : undefined;
};

// Bağlantı tanınan bir video sitesinin videosuysa site ve kimlik; değilse undefined. Sitenin bu sitede
// kabul edilip edilmediği ayrıca denetlenir (videoSitesiIzinliMi).
export const videoAdresiniCoz = (metin: string): CozulenVideo | undefined => {
  if (metin.length > videoAdresiUzunlugu) return undefined;
  let adres: URL;
  try {
    adres = new URL(metin.trim());
  } catch {
    return undefined;
  }
  if (adres.protocol !== "https:" && adres.protocol !== "http:") return undefined;
  if (adres.username !== "" || adres.password !== "" || adres.port !== "") return undefined;
  const alanAdi = adres.hostname.toLowerCase();
  const site = videoSiteAdlari.find((ad) =>
    (videoSiteleri[ad].adresler as readonly string[]).includes(alanAdi),
  );
  if (site === undefined) return undefined;
  const kimlik = kimlikAdayi(site, adres);
  if (kimlik === undefined || !videoSiteleri[site].kimlik.test(kimlik)) return undefined;
  return { site, kimlik };
};

export const videoSitesiIzinliMi = (site: VideoSitesi, izinli: readonly VideoSitesi[]) =>
  izinli.includes(site);

// Sayfaya gömülen oynatıcının adresi.
export const oynaticiAdresi = (video: CozulenVideo) =>
  videoSiteleri[video.site].oynatici(video.kimlik);
