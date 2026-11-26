// Sipariş fişi (kart 0270, karar 0171; taslak planlar/tasarim-yonu/panel.html "Sipariş fişi"): mağazanın üst bilgisi,
// siparişin numarası, tarihi ve ödemesi, teslimat, kargo ve fatura bilgisi, paketlerken işaretlenen kutucuklu ürün
// tablosu, fiyatlar (ayar açıksa) ya da ürün ve kalem sayısı, müşterinin notu, satıcının vergi bilgileri ve "fatura
// yerine geçmez". Sunucuda çizilir. Kâğıttır: her zaman açık renkte (zorlanan renk), ekranda A4 genişliğinde kart,
// yazdırırken kenarsız; her fiş yeni sayfadan başlar, ürün satırı sayfalar arasında bölünmez (tailwind.css, @page fis).
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import {
  Tablo,
  TabloBasHucresi,
  TabloBasligi,
  TabloGovdesi,
  TabloHucresi,
  TabloSatiri,
  TabloUstu,
} from "../../../bilesenler/parcalar/tablo";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { zorlananRenkOzniteligi } from "../../../bilesenler/tasarim-degerleri/renk-ozniteligi";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { siparislerAdresi } from "../adresler";
import type { FisMagazasi, SiparisFisi, SiparisFisleriVerisi } from "./fis-verisi";
import { odemeYazisi } from "./metinler";

const kucukBaslik = "text-kucuk font-kalin uppercase text-soluk-yazi";

function MagazaBilgisi({ magaza }: { magaza: FisMagazasi }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {magaza.logoAdresi === null ? null : (
        // biome-ignore lint/performance/noImgElement: logo ucundan gelir, yazdırmada da aynı dosyadır.
        <img src={magaza.logoAdresi} alt="" className="h-10 w-auto max-w-1/2 object-contain" />
      )}
      <div className="flex min-w-0 flex-col">
        <strong className="text-govde">{magaza.ad}</strong>
        {[magaza.unvan, magaza.adres, [magaza.telefon, magaza.eposta].filter(Boolean).join(" · ")]
          .filter((satir): satir is string => satir !== null && satir !== "")
          .map((satir, sira) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: satırlar sabittir, aynı yazı iki satırda olabilir.
            <span key={sira} className="wrap-anywhere">
              {satir}
            </span>
          ))}
      </div>
    </div>
  );
}

function Fis({ magaza, fis, sira }: { magaza: FisMagazasi; fis: SiparisFisi; sira: number }) {
  const { tutarlar } = fis;
  const vergiSatiri = (vergi: NonNullable<SiparisFisi["tutarlar"]>["vergiler"][number]) =>
    doldur(
      metin(tutarlar?.vergiDahil ? "yonetim.siparis.vergiDahil" : "yonetim.siparis.vergiHaric"),
      { ad: vergi.ad ?? metin("yonetim.siparis.vergi"), oran: vergi.oran },
    );
  const altSatir = [
    magaza.unvan,
    magaza.vergiDairesi === null
      ? null
      : doldur(metin("yonetim.siparisFisi.vergiDairesi"), { ad: magaza.vergiDairesi }),
    magaza.vergiNumarasi === null
      ? null
      : doldur(metin("yonetim.siparisFisi.vergiNumarasi"), { numara: magaza.vergiNumarasi }),
    magaza.mersisNumarasi === null
      ? null
      : doldur(metin("yonetim.siparisFisi.mersis"), { numara: magaza.mersisNumarasi }),
    metin("yonetim.siparisFisi.faturaDegil"),
  ].filter((parca): parca is string => parca !== null);
  const fatura = fis.fatura;
  return (
    <article
      {...{ [zorlananRenkOzniteligi]: "acik" }}
      aria-label={doldur(metin("yonetim.siparisFisi.etiket"), { numara: fis.numara })}
      className={sinif(
        "fis-sayfasi flex w-full max-w-fis flex-col gap-5 rounded-orta border border-kenar bg-zemin p-4 text-govde text-yazi tablet:p-12",
        "print:max-w-none print:rounded-none print:border-0 print:p-0",
        sira > 0 && "break-before-page",
      )}
    >
      <header className="flex flex-col gap-4 border-b-2 border-yazi pb-4 tablet:flex-row tablet:justify-between print:flex-row print:justify-between">
        <MagazaBilgisi magaza={magaza} />
        <div className="flex shrink-0 flex-col tablet:text-right print:text-right">
          <h2 className="font-baslik text-baslik-3 font-baslik-kalinligi">
            {metin("yonetim.siparisFisi.baslik")}
          </h2>
          <strong className="text-govde">{fis.numara}</strong>
          <span>{fis.zaman}</span>
          <span>{odemeYazisi(metin, fis.odeme.yontem, fis.odeme.secenek)}</span>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2 print:grid-cols-2">
        <div className="flex flex-col">
          <h3 className={kucukBaslik}>{metin("yonetim.siparisFisi.teslimat")}</h3>
          <strong>{fis.teslimat.ad}</strong>
          {fis.teslimat.telefon === null ? null : <span>{fis.teslimat.telefon}</span>}
          {fis.teslimat.satirlar.map((satir, sira) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: adres satırları sabittir, aynı yazı iki satırda olabilir.
            <span key={sira} className="wrap-anywhere">
              {satir}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {fis.kargo === null ? null : (
            <div className="flex flex-col">
              <h3 className={kucukBaslik}>{metin("yonetim.siparisFisi.kargo")}</h3>
              <span>{fis.kargo.firma}</span>
              {fis.kargo.takipNumarasi === null ? null : (
                <span className="font-kod">{fis.kargo.takipNumarasi}</span>
              )}
            </div>
          )}
          <div className="flex flex-col">
            <h3 className={kucukBaslik}>{metin("yonetim.siparisFisi.fatura")}</h3>
            {/* Taslaktaki gibi tek satır: "Bireysel · teslimat adresiyle aynı". */}
            <span>
              {[
                fatura.tur === "kurumsal"
                  ? doldur(metin("yonetim.siparis.teslimat.kurumsal"), {
                      firma: fatura.firma,
                      vergiDairesi: fatura.vergiDairesi,
                      vergiNumarasi: fatura.vergiNumarasi,
                    })
                  : metin("yonetim.siparis.teslimat.bireysel"),
                ...(fatura.adresAyni ? [metin("yonetim.siparis.teslimat.adresAyni")] : []),
              ].join(" · ")}
            </span>
            {fatura.adresAyni
              ? null
              : fatura.adres.map((satir, sira) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: adres satırları sabittir, aynı yazı iki satırda olabilir.
                  <span key={sira} className="wrap-anywhere">
                    {satir}
                  </span>
                ))}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        <Tablo>
          <TabloBasligi className="sr-only">{metin("yonetim.siparisFisi.urunler")}</TabloBasligi>
          <TabloUstu>
            <TabloSatiri className="border-yazi text-soluk-yazi">
              <TabloBasHucresi scope="col" className="w-6 py-2 pr-2">
                <span className="sr-only">{metin("yonetim.siparisFisi.paketlendi")}</span>
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="py-2 pr-2 font-kalin uppercase">
                {metin("yonetim.siparisFisi.urun")}
              </TabloBasHucresi>
              {/* Telefonda stok kodu ürünün altındadır (dar sütunda harf harf kırılıyordu); yazdırmada sütundur. */}
              <TabloBasHucresi
                scope="col"
                className="hidden py-2 pr-2 font-kalin uppercase tablet:table-cell print:table-cell"
              >
                {metin("yonetim.siparisFisi.stokKodu")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="py-2 text-right font-kalin uppercase">
                {metin("yonetim.siparisFisi.adet")}
              </TabloBasHucresi>
              {tutarlar === null ? null : (
                <>
                  <TabloBasHucresi
                    scope="col"
                    className="py-2 pl-2 text-right font-kalin uppercase"
                  >
                    {metin("yonetim.siparisFisi.birim")}
                  </TabloBasHucresi>
                  <TabloBasHucresi
                    scope="col"
                    className="py-2 pl-2 text-right font-kalin uppercase"
                  >
                    {metin("yonetim.siparisFisi.tutar")}
                  </TabloBasHucresi>
                </>
              )}
            </TabloSatiri>
          </TabloUstu>
          <TabloGovdesi>
            {fis.kalemler.map((kalem, kalemSirasi) => (
              <TabloSatiri
                // Aynı ürün iki kalemde olabilir: sıra anahtarın parçasıdır.
                // biome-ignore lint/suspicious/noArrayIndexKey: kalemlerin sırası siparişte sabittir.
                key={kalemSirasi}
                className="break-inside-avoid align-top"
              >
                <TabloHucresi className="py-2 pr-2">
                  <span
                    aria-hidden="true"
                    className="block size-4 rounded-kucuk border-2 border-yazi"
                  />
                </TabloHucresi>
                <TabloHucresi className="py-2 pr-2">
                  <strong className="block">{kalem.ad}</strong>
                  {kalem.secim === "" ? null : <span className="block">{kalem.secim}</span>}
                  {kalem.stokKodu === null ? null : (
                    <span className="block wrap-anywhere tablet:hidden print:hidden">
                      {kalem.stokKodu}
                    </span>
                  )}
                </TabloHucresi>
                <TabloHucresi className="hidden py-2 pr-2 wrap-anywhere tablet:table-cell print:table-cell">
                  {kalem.stokKodu ?? ""}
                </TabloHucresi>
                <TabloHucresi className="py-2 text-right">{kalem.adet}</TabloHucresi>
                {tutarlar === null ? null : (
                  <>
                    <TabloHucresi className="py-2 pl-2 text-right whitespace-nowrap">
                      {kalem.birim}
                    </TabloHucresi>
                    <TabloHucresi className="py-2 pl-2 text-right whitespace-nowrap">
                      {kalem.tutar}
                    </TabloHucresi>
                  </>
                )}
              </TabloSatiri>
            ))}
          </TabloGovdesi>
        </Tablo>
      </div>
      {tutarlar === null ? (
        <p className="font-kalin">
          {doldur(metin("yonetim.siparisFisi.ozet"), {
            urun: String(fis.urunSayisi),
            kalem: String(fis.kalemSayisi),
          })}
        </p>
      ) : (
        <dl className="ml-auto flex w-full max-w-karekod flex-col gap-1 break-inside-avoid">
          {[
            { ad: metin("yonetim.siparis.araToplam"), deger: tutarlar.araToplam, vurgu: false },
            ...(tutarlar.kupon === null
              ? []
              : [
                  {
                    ad: doldur(metin("yonetim.siparis.kupon"), { kod: tutarlar.kupon.kod }),
                    deger: doldur(
                      metin(
                        tutarlar.kupon.ucretsizKargo
                          ? "yonetim.siparis.kuponKargo"
                          : "yonetim.siparis.kuponIndirimi",
                      ),
                      { tutar: tutarlar.kupon.indirim },
                    ),
                    vurgu: false,
                  },
                ]),
            {
              ad: metin("yonetim.siparis.kargo"),
              deger:
                tutarlar.kargo.tur === "ucretli"
                  ? tutarlar.kargo.tutar
                  : metin(
                      tutarlar.kargo.tur === "ucretsiz"
                        ? "yonetim.siparis.kargoUcretsiz"
                        : "yonetim.siparis.kargoYok",
                    ),
              vurgu: false,
            },
            ...(tutarlar.vergiDahil
              ? []
              : tutarlar.vergiler.map((vergi) => ({
                  ad: vergiSatiri(vergi),
                  deger: vergi.tutar,
                  vurgu: false,
                }))),
            { ad: metin("yonetim.siparis.toplam"), deger: tutarlar.toplam, vurgu: true },
            ...(tutarlar.vergiDahil
              ? tutarlar.vergiler.map((vergi) => ({
                  ad: vergiSatiri(vergi),
                  deger: vergi.tutar,
                  vurgu: false,
                }))
              : []),
          ].map((satir) => (
            <div
              key={satir.ad}
              className={sinif("flex justify-between gap-4", satir.vurgu && "font-kalin")}
            >
              <dt>{satir.ad}</dt>
              <dd className="whitespace-nowrap">{satir.deger}</dd>
            </div>
          ))}
        </dl>
      )}
      {fis.not === null ? null : (
        <p className="rounded-orta border border-dashed border-alan-kenari px-3 py-2 whitespace-pre-line break-inside-avoid">
          <strong>{metin("yonetim.siparisFisi.musteriNotu")}</strong> {fis.not}
        </p>
      )}
      <footer className="mt-auto border-t border-kenar pt-3 text-kucuk text-soluk-yazi">
        {altSatir.join(" · ")}
      </footer>
    </article>
  );
}

export function SiparisFisleri({ veri }: { veri: SiparisFisleriVerisi }) {
  return (
    <div className="flex flex-col items-center gap-6 print:block">
      {veri.atlanan.length === 0 ? null : (
        <Uyari tur="bilgi" className="w-full max-w-fis print:hidden">
          {doldur(metin("yonetim.siparisFisi.atlanan"), { numaralar: veri.atlanan.join(", ") })}
        </Uyari>
      )}
      {veri.fisler.length === 0 ? (
        <Uyari tur="bilgi" className="w-full max-w-fis">
          {metin("yonetim.siparisFisi.yok")}{" "}
          <Baglanti href={siparislerAdresi}>{metin("yonetim.siparisFisi.siparislereDon")}</Baglanti>
        </Uyari>
      ) : (
        veri.fisler.map((fis, sira) => (
          <Fis key={fis.numara} magaza={veri.magaza} fis={fis} sira={sira} />
        ))
      )}
    </div>
  );
}
