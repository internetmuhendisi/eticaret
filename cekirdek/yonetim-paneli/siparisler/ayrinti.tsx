// Sipariş ayrıntısı (kart 0234, karar 0145; kart 0233'ün taslağı): solda ürünler ve tutar, kargo, havale bildirimleri,
// geçmiş ve notlar; sağda müşteri, teslimat ve fatura, ödeme. Masaüstünde iki sütun, daha darda tek sütun. Tutarlar
// siparişin saklanan değerleridir, yeniden hesaplanmaz. Not ekleme yalnız yönetim izni olana görünür.
import type { ReactNode } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { metin } from "../../metinler/site-metni";
import { doldur } from "../../moduller/eposta/sablon";
import { DurumRozeti } from "./liste";
import { durumMetni, nedenMetni, odemeYazisi, yazanYazisi } from "./metinler";
import { NotFormu } from "./not-formu";
import type { SiparisAyrintisiVerisi } from "./veri";

function Bolum({
  baslik,
  kimlik,
  children,
}: {
  baslik: string;
  kimlik: string;
  children: ReactNode;
}) {
  return (
    <Kart className="gap-4 p-4 tablet:p-5">
      <h2 id={kimlik} className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {baslik}
      </h2>
      {children}
    </Kart>
  );
}

function Satir({
  ad,
  children,
  vurgu = false,
}: {
  ad: string;
  children: ReactNode;
  vurgu?: boolean;
}) {
  return (
    <div
      className={sinif(
        "flex justify-between gap-3",
        vurgu && "border-t border-kenar pt-2 font-kalin",
      )}
    >
      <dt className={vurgu ? "" : "text-soluk-yazi"}>{ad}</dt>
      <dd className="text-right whitespace-nowrap">{children}</dd>
    </div>
  );
}

function Bilgi({ ad, children }: { ad: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-kucuk text-soluk-yazi">{ad}</dt>
      <dd className="font-kalin wrap-anywhere">{children}</dd>
    </div>
  );
}

export function SiparisAyrintisi({ veri }: { veri: SiparisAyrintisiVerisi }) {
  const { tutarlar } = veri;
  const vergiSatiri = (vergi: SiparisAyrintisiVerisi["tutarlar"]["vergiler"][number]) =>
    doldur(
      metin(tutarlar.vergiDahil ? "yonetim.siparis.vergiDahil" : "yonetim.siparis.vergiHaric"),
      {
        ad: vergi.ad ?? metin("yonetim.siparis.vergi"),
        oran: vergi.oran,
      },
    );
  return (
    <div className="flex flex-col gap-4 masaustu:flex-row masaustu:items-start">
      <div className="flex min-w-0 flex-col gap-4 masaustu:w-2/3">
        {veri.kisiselSilindi ? (
          <Uyari tur="bilgi">{metin("yonetim.siparis.kisiselSilindi")}</Uyari>
        ) : null}
        {veri.bildirimler.length === 0 ? null : (
          <Bolum baslik={metin("yonetim.siparis.bildirimler.baslik")} kimlik="siparis-bildirimleri">
            <ul className="flex flex-col gap-2">
              {veri.bildirimler.map((bildirim) => (
                <li
                  key={`${bildirim.zaman}-${bildirim.tutar}`}
                  className="flex flex-col rounded-orta bg-uyari-zemin px-3 py-2 text-kucuk"
                >
                  <span className="font-kalin">
                    {doldur(metin("yonetim.siparis.bildirimler.satir"), {
                      gonderen:
                        bildirim.gonderen === ""
                          ? metin("yonetim.siparisler.kisiselSilindi")
                          : bildirim.gonderen,
                      banka: bildirim.banka,
                      tutar: bildirim.tutar,
                    })}
                  </span>
                  <span>
                    {doldur(metin("yonetim.siparis.bildirimler.ayrinti"), {
                      gun: bildirim.gun,
                      zaman: bildirim.zaman,
                    })}
                  </span>
                  {bildirim.not === null ? null : (
                    <span className="wrap-anywhere">{bildirim.not}</span>
                  )}
                </li>
              ))}
            </ul>
            {veri.durum === "odeme-bekleniyor" ? (
              <p className="text-kucuk text-soluk-yazi">
                {metin("yonetim.siparis.bildirimler.aciklama")}
              </p>
            ) : null}
          </Bolum>
        )}
        <Bolum baslik={metin("yonetim.siparis.urunler")} kimlik="siparis-urunleri">
          <ul className="flex flex-col">
            {veri.kalemler.map((kalem, sira) => (
              <li
                // Aynı ürün iki kalemde olabilir (farklı birleşim): sıra anahtardır.
                // biome-ignore lint/suspicious/noArrayIndexKey: kalemler siparişin sırasıyla sabittir
                key={sira}
                className="flex justify-between gap-3 border-b border-kenar py-3 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-kalin wrap-anywhere">{kalem.ad}</span>
                  {kalem.secim === "" ? null : (
                    <span className="text-kucuk text-soluk-yazi">{kalem.secim}</span>
                  )}
                  <span className="text-kucuk text-soluk-yazi">
                    {[
                      doldur(metin("yonetim.siparis.adet"), {
                        adet: String(kalem.adet),
                        fiyat: kalem.birim,
                      }),
                      kalem.stokKodu,
                    ]
                      .filter((parca) => parca !== null && parca !== "")
                      .join(" · ")}
                  </span>
                </span>
                <span className="font-kalin whitespace-nowrap">{kalem.tutar}</span>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-1 text-kucuk">
            <Satir ad={metin("yonetim.siparis.araToplam")}>{tutarlar.araToplam}</Satir>
            <Satir ad={metin("yonetim.siparis.kargo")}>
              {tutarlar.kargo.tur === "ucretli"
                ? tutarlar.kargo.tutar
                : metin(
                    tutarlar.kargo.tur === "ucretsiz"
                      ? "yonetim.siparis.kargoUcretsiz"
                      : "yonetim.siparis.kargoYok",
                  )}
            </Satir>
            {tutarlar.vergiDahil
              ? null
              : tutarlar.vergiler.map((vergi) => (
                  <Satir key={`${vergi.ad}-${vergi.oran}`} ad={vergiSatiri(vergi)}>
                    {vergi.tutar}
                  </Satir>
                ))}
            <Satir ad={metin("yonetim.siparis.toplam")} vurgu>
              {tutarlar.toplam}
            </Satir>
            {tutarlar.vergiDahil
              ? tutarlar.vergiler.map((vergi) => (
                  <Satir key={`${vergi.ad}-${vergi.oran}`} ad={vergiSatiri(vergi)}>
                    {vergi.tutar}
                  </Satir>
                ))
              : null}
          </dl>
        </Bolum>
        {veri.kargo === null ? null : (
          <Bolum baslik={metin("yonetim.siparis.kargoBilgisi.baslik")} kimlik="siparis-kargosu">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-orta bg-yuzey px-4 py-3">
              <span className="flex flex-col">
                <span className="font-kalin">{veri.kargo.firma}</span>
                <span className="text-kucuk">
                  {veri.kargo.takipNumarasi === null
                    ? metin("yonetim.siparis.kargoBilgisi.takipYok")
                    : doldur(metin("yonetim.siparis.kargoBilgisi.takipNo"), {
                        no: veri.kargo.takipNumarasi,
                      })}
                </span>
                <span className="text-kucuk text-soluk-yazi">
                  {doldur(metin("yonetim.siparis.kargoBilgisi.verildi"), {
                    zaman: veri.kargo.zaman,
                  })}
                </span>
              </span>
              {veri.kargo.takipAdresi === null ? null : (
                <Baglanti
                  href={veri.kargo.takipAdresi}
                  target="_blank"
                  rel="noopener noreferrer"
                  gorunum="sade"
                >
                  {metin("yonetim.siparis.kargoBilgisi.takipEt")}
                  <Ikon ad="yeni-sekme" />
                </Baglanti>
              )}
            </div>
          </Bolum>
        )}
        <Bolum baslik={metin("yonetim.siparis.gecmis.baslik")} kimlik="siparis-gecmisi">
          {veri.notEkleyebilir ? <NotFormu numara={veri.numara} /> : null}
          <ol className="flex flex-col gap-4">
            {veri.gecmis.map((satir, sira) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: geçmiş değiştirilemez, sırası sabittir
                key={sira}
                className="flex flex-col gap-1 border-l-2 border-kenar pl-3 text-kucuk"
              >
                {satir.tur === "gecis" ? (
                  <>
                    <span className="font-kalin">{metin(nedenMetni(satir.neden))}</span>
                    {satir.onceki === null || satir.onceki === satir.sonraki ? null : (
                      <span>
                        {doldur(metin("yonetim.siparis.gecmis.gecis"), {
                          onceki: metin(durumMetni(satir.onceki)),
                          sonraki: metin(durumMetni(satir.sonraki)),
                        })}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="font-kalin">
                      {metin(
                        satir.notTuru === "musteri"
                          ? "yonetim.siparis.notlar.musteriBaslik"
                          : "yonetim.siparis.notlar.icBaslik",
                      )}
                    </span>
                    <span
                      className={sinif(
                        "rounded-orta px-3 py-2 wrap-anywhere whitespace-pre-line",
                        satir.notTuru === "musteri" ? "bg-yuzey" : "bg-uyari-zemin",
                      )}
                    >
                      {satir.metin}
                    </span>
                  </>
                )}
                <span className="text-soluk-yazi">
                  {doldur(metin("yonetim.siparis.gecmis.yazanZaman"), {
                    yazan: yazanYazisi(metin, satir.yazan),
                    zaman: satir.zaman,
                  })}
                </span>
              </li>
            ))}
          </ol>
        </Bolum>
      </div>
      <div className="flex min-w-0 flex-col gap-4 masaustu:w-1/3">
        <Bolum baslik={metin("yonetim.siparis.musteri.baslik")} kimlik="siparis-musterisi">
          <dl className="flex flex-col gap-2">
            <Bilgi ad={metin("yonetim.siparis.musteri.ad")}>
              {veri.musteri.ad === ""
                ? metin("yonetim.siparisler.kisiselSilindi")
                : veri.musteri.ad}
            </Bilgi>
            <Bilgi ad={metin("yonetim.siparis.musteri.eposta")}>
              {veri.musteri.eposta === ""
                ? metin("yonetim.siparisler.kisiselSilindi")
                : veri.musteri.eposta}
            </Bilgi>
            {veri.musteri.telefon === null ? null : (
              <Bilgi ad={metin("yonetim.siparis.musteri.telefon")}>{veri.musteri.telefon}</Bilgi>
            )}
            <Bilgi ad={metin("yonetim.siparis.musteri.hesap")}>
              {metin(
                veri.musteri.uye
                  ? "yonetim.siparis.musteri.uye"
                  : "yonetim.siparis.musteri.uyeDegil",
              )}
            </Bilgi>
          </dl>
        </Bolum>
        <Bolum baslik={metin("yonetim.siparis.teslimat.baslik")} kimlik="siparis-teslimati">
          <dl className="flex flex-col gap-2">
            <Bilgi ad={metin("yonetim.siparis.teslimat.teslimat")}>
              {veri.teslimat.satirlar.map((satir) => (
                <span key={satir} className="block">
                  {satir}
                </span>
              ))}
            </Bilgi>
            <Bilgi ad={metin("yonetim.siparis.teslimat.fatura")}>
              <span className="block">
                {veri.fatura.tur === "kurumsal" && veri.kisiselSilindi
                  ? metin("yonetim.siparisler.kisiselSilindi")
                  : veri.fatura.tur === "kurumsal"
                    ? doldur(metin("yonetim.siparis.teslimat.kurumsal"), {
                        firma: veri.fatura.firma,
                        vergiDairesi: veri.fatura.vergiDairesi,
                        vergiNumarasi: veri.fatura.vergiNumarasi,
                      })
                    : metin("yonetim.siparis.teslimat.bireysel")}
              </span>
              {veri.fatura.adresAyni ? (
                <span className="block font-normal text-soluk-yazi">
                  {metin("yonetim.siparis.teslimat.adresAyni")}
                </span>
              ) : (
                veri.fatura.adres.map((satir) => (
                  <span key={satir} className="block">
                    {satir}
                  </span>
                ))
              )}
            </Bilgi>
            {veri.not === null ? null : (
              <Bilgi ad={metin("yonetim.siparis.teslimat.siparisNotu")}>
                <span className="font-normal whitespace-pre-line">{veri.not}</span>
              </Bilgi>
            )}
          </dl>
        </Bolum>
        <Bolum baslik={metin("yonetim.siparis.odeme.baslik")} kimlik="siparis-odemesi">
          <dl className="flex flex-col gap-2">
            <Bilgi ad={metin("yonetim.siparis.odeme.yontem")}>
              {odemeYazisi(metin, veri.ust.yontem, veri.ust.secenek)}
            </Bilgi>
            <Bilgi ad={metin("yonetim.siparis.odeme.durum")}>
              {veri.odeme.tur === "alindi"
                ? doldur(metin("yonetim.siparis.odeme.alindi"), { zaman: veri.odeme.zaman ?? "" })
                : veri.odeme.tur === "bekleniyor"
                  ? doldur(metin("yonetim.siparis.odeme.bekleniyor"), {
                      zaman: veri.odeme.zaman ?? "",
                    })
                  : metin(
                      veri.odeme.tur === "teslimde"
                        ? "yonetim.siparis.odeme.teslimde"
                        : "yonetim.siparis.odeme.iptal",
                    )}
            </Bilgi>
          </dl>
        </Bolum>
      </div>
    </div>
  );
}

export function AyrintiBasligi({ veri }: { veri: SiparisAyrintisiVerisi }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <DurumRozeti durum={veri.durum} />
      <span className="text-kucuk text-soluk-yazi">
        {doldur(metin("yonetim.siparis.ust"), {
          zaman: veri.ust.zaman,
          yontem: odemeYazisi(metin, veri.ust.yontem, veri.ust.secenek),
        })}
      </span>
    </span>
  );
}
