// Panel ekranlarının kapıya isteği (kart 0142): yönetici uçlarına JSON gövdeyle POST ya da adres parametreli GET.
// Zarfı açar: başarıda veri, hatada hata kodu ve ayrıntısı (cekirdek/kapi/zarf.ts). Ağ hatası "ag" koduyla döner.
// Metni ekran seçer (.claude/rules/metinler.md).
import { kapiyaIstek } from "../kapi/istemci";

export type PanelHatasi = {
  kod: string;
  ayrinti: { alan: string; kod: string }[];
};
export type PanelSonucu<Veri> = { tamam: true; veri: Veri } | ({ tamam: false } & PanelHatasi);

export const yoneticiUcu = (yol: string): string => `/kapi/yonetici/${yol}`;

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
  const zarf = (await yanit.json().catch(() => undefined)) as
    | { basarili: true; veri: Veri }
    | { basarili: false; hata: { kod: string; ayrinti?: { alan: string; kod: string }[] } }
    | undefined;
  if (zarf?.basarili === true) return { tamam: true, veri: zarf.veri };
  return {
    tamam: false,
    kod: zarf?.basarili === false ? zarf.hata.kod : "beklenmeyen",
    ayrinti: zarf?.basarili === false ? (zarf.hata.ayrinti ?? []) : [],
  };
};
