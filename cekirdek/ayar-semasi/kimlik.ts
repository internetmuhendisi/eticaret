// Sitenin kimlik dosyasının (siteler/<kod-adi>/kimlik.json) şeması (kararlar 0010, 0011).
// Sitenin çekirdek sürümü yalnız burada yazar.
import { z } from "zod";
import { siteTurleri, teslimAdimiDurumlari } from "../kayitlar/site.ts";

const teslimAdimi = z.enum(teslimAdimiDurumlari);

export const kimlikSemasi = z.strictObject({
  // Klasörün adıyla aynıdır: küçük harf, rakam ve tire. Veritabanı adı bundan türer
  // (site_<kod adı>, karar 0022); PostgreSQL adları 63 harfte kestiği için en çok 40 harftir.
  kodAdi: z
    .string()
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Küçük harf, rakam ve tireden oluşmalı."),
  gorunenAd: z.string().trim().min(1),
  tur: z.enum(siteTurleri),
  // Adresler alan adı bağlanınca yazılır.
  adresler: z.strictObject({
    canli: z.url().optional(),
    deneme: z.url().optional(),
  }),
  // büyük.orta.küçük (karar 0011).
  cekirdekSurumu: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "büyük.orta.küçük biçiminde olmalı, örneğin 1.0.0."),
  teslimDurumu: z.strictObject({
    magazaSahibiHesabi: teslimAdimi,
    yurtDisiAktarimBelgeleri: teslimAdimi,
  }),
});

export type Kimlik = z.output<typeof kimlikSemasi>;
