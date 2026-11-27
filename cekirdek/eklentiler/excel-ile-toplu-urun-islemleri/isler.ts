// Excel ile toplu ürün işlemleri eklentisinin arka plan işleri (kart 0315); kaydı arka-plan-isleri/isler.ts'tedir.
// İşin girdisinde yalnız kaydın kimliği vardır. Eklentinin açık olup olmadığına servis bakar; kapalıyken iş bir şey
// yapmadan biter, zamanlı tarama eklenti açılınca işi sürdürür.
import { z } from "zod";
import { isEkle, isTanimla } from "../../arka-plan-isleri/kuyruk.ts";
import { calisanSite } from "../../ayar-semasi/calisan-site.ts";
import { gunluk } from "../../izleme/gunluk.ts";
import { kimlikSemasi } from "../../veritabani/kimlik.ts";
import { type ExcelIsleri, excelServisi } from "./servis.ts";

const girdi = z.strictObject({ kimlik: kimlikSemasi });

// İşleri kuyruğa koyanlar: servis bunlarla iş ekler.
export const excelIsleri: ExcelIsleri = {
  disaAktar: (vt, kimlik) => isEkle(vt, excelDisaAktarmaIsi, { kimlik }),
  denetle: (vt, kimlik) => isEkle(vt, excelDenetimIsi, { kimlik }),
  uygula: (vt, kimlik) => isEkle(vt, excelUygulamaIsi, { kimlik }),
};

export const calisanExcelServisi = () => excelServisi(calisanSite(), excelIsleri);

export const excelDisaAktarmaIsi = isTanimla({
  tur: "excel-disa-aktarma",
  sema: girdi,
  enCokDeneme: 3,
  calistir: async ({ kimlik }, { vt }) => {
    await calisanExcelServisi().disaAktarmayiHazirla(vt, kimlik);
  },
  sonHata: async ({ kimlik }, vt) => calisanExcelServisi().disaAktarmaHatali(vt, kimlik),
});

export const excelDenetimIsi = isTanimla({
  tur: "excel-denetim",
  sema: girdi,
  enCokDeneme: 3,
  calistir: async ({ kimlik }, { vt }) => {
    await calisanExcelServisi().iceAktarmayiDenetle(vt, kimlik);
  },
  sonHata: async ({ kimlik }, vt) => calisanExcelServisi().denetimHatali(vt, kimlik),
});

// Uygulama partileri: parti bitince kalan varsa sonraki parti kuyruğa girer.
export const excelUygulamaIsi = isTanimla({
  tur: "excel-uygulama",
  sema: girdi,
  calistir: async ({ kimlik }, { vt }) => {
    const surecek = await calisanExcelServisi().uygulamaPartisi(vt, kimlik);
    if (surecek) await isEkle(vt, excelUygulamaIsi, { kimlik });
  },
});

export const excelTaramasiIsi = isTanimla({
  tur: "excel-taramasi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const surdurulen = await calisanExcelServisi().takilanlariSurdur(vt);
    if (surdurulen > 0) gunluk.bilgi("Excel işleri sürdürüldü", { surdurulen });
  },
});

export const excelTemizligiIsi = isTanimla({
  tur: "excel-temizligi",
  sema: z.strictObject({}),
  calistir: async (_, { vt }) => {
    const silinen = await calisanExcelServisi().eskileriSil(vt);
    gunluk.bilgi("süresi dolan Excel kayıtları silindi", { silinen });
  },
});
