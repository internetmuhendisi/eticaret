// Panel ekranlarının kapıya isteği (kart 0142): yönetici uçlarına JSON gövdeyle POST ya da adres parametreli GET.
// Zarfı açar: başarıda veri, hatada hata kodu ve ayrıntısı (cekirdek/kapi/zarf.ts). Ağ hatası "ag" koduyla döner.
// Metni ekran seçer (.claude/rules/metinler.md).
import { kapiyaIstek } from "../kapi/istemci";
import { kapiyaYukle } from "../kapi/yukleme-istemcisi";

export type PanelHatasi = {
  kod: string;
  // oneri: bazı alan hatalarının önerdiği değer (tema ayarlarında okunmayan rengin en yakın okunur tonu).
  ayrinti: { alan: string; kod: string; oneri?: string }[];
};
export type PanelSonucu<Veri> = { tamam: true; veri: Veri } | ({ tamam: false } & PanelHatasi);

export const yoneticiUcu = (yol: string): string => `/kapi/yonetici/${yol}`;

// Zarfı açar; zarf yoksa "beklenmeyen".
const zarfiAc = async <Veri>(yanit: Response): Promise<PanelSonucu<Veri>> => {
  const zarf = (await yanit.json().catch(() => undefined)) as
    | { basarili: true; veri: Veri }
    | { basarili: false; hata: { kod: string; ayrinti?: PanelHatasi["ayrinti"] } }
    | undefined;
  if (zarf?.basarili === true) return { tamam: true, veri: zarf.veri };
  return {
    tamam: false,
    kod: zarf?.basarili === false ? zarf.hata.kod : "beklenmeyen",
    ayrinti: zarf?.basarili === false ? (zarf.hata.ayrinti ?? []) : [],
  };
};

// Dosya yükleyen uca istek (kart 0094, karar 0165): ilerleme bildirilir, sinyal iptal eder ("iptal" koduyla döner).
// Sunucudaki ön kapı sınırı aşan gövdeyi zarfsız 413 ile durdurur: kapının kendi reddiyle aynı alan hatasına
// çevrilir.
export const panelYuklemesi = async <Veri>(
  yol: string,
  dosya: Blob,
  secenekler: { ilerleme?: (oran: number) => void; sinyal?: AbortSignal } = {},
): Promise<PanelSonucu<Veri>> => {
  let yanit: Response;
  try {
    yanit = await kapiyaYukle(yoneticiUcu(yol), dosya, secenekler);
  } catch (hata) {
    if (hata instanceof DOMException && hata.name === "AbortError") {
      return { tamam: false, kod: "iptal", ayrinti: [] };
    }
    return { tamam: false, kod: "ag", ayrinti: [] };
  }
  if (yanit.status === 413) {
    return { tamam: false, kod: "dogrulama", ayrinti: [{ alan: "dosya", kod: "cok-buyuk" }] };
  }
  return zarfiAc<Veri>(yanit);
};

export const panelIstegi = async <Veri>(
  yol: string,
  govde?: unknown,
): Promise<PanelSonucu<Veri>> => {
  let yanit: Response;
  try {
    yanit = await kapiyaIstek(yoneticiUcu(yol), {
      cache: "no-store",
      ...(govde === undefined
        ? {}
        : {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(govde),
          }),
    });
  } catch {
    return { tamam: false, kod: "ag", ayrinti: [] };
  }
  return zarfiAc<Veri>(yanit);
};
