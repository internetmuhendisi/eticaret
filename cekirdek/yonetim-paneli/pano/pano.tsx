// Panonun ekranı (kart 0186, karar 0199; taslak: panel.html ve panel-2.html "Pano"). Solda açılış adımları (yeni
// mağazada), bakılması gerekenler ve son günlerin satışı; sağda kısa sayılar ve kısayollar. Her kutu yalnız verisi
// varsa (izin) çizilir, okunamayan kutu kendi yerinde hata söyler. Sunucuda çizilir; yalnız satış grafiği tarayıcıdaki
// parçadır (SeriGrafigi).
import Link from "next/link";
import { Baglanti } from "../../../bilesenler/parcalar/baglanti";
import { sinif } from "../../../bilesenler/parcalar/sinif";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { doldur } from "../../metinler/doldur";
import { metin } from "../../metinler/site-metni";
import { vitrinAdresleri } from "../../vitrin/adresler";
import { Bolum } from "../ayrinti-parcalari";
import { EylemBaglantisi } from "../eylem-dugmesi";
import { PanelIkon } from "../panel-ikon";
import { SayiKutusu } from "../raporlar/ortak";
import { SeriGrafigi } from "../raporlar/seri-grafigi";
import type { PanoSatiri, PanoVerisi } from "./veri";

function Hata({ eksik = false }: { eksik?: boolean }) {
  return <Uyari tur="tehlike">{metin(eksik ? "yonetim.pano.eksik" : "yonetim.pano.hata")}</Uyari>;
}

// Satırın tamamı bağlantıdır (ikon, başlık, alt yazı, sağda eylem); bağlantısı yoksa düz satır. Tamamlanan açılış
// adımı soluk ve üstü çizili, ekran okuyucuda "tamamlandı".
function Satir({ satir, tamam = false }: { satir: PanoSatiri; tamam?: boolean }) {
  const ic = (
    <>
      <span
        className={sinif(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tamam ? "bg-basari-zemin text-basari-yazi" : "bg-uyari-zemin text-uyari-yazi",
        )}
      >
        <PanelIkon ad={satir.ikon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={sinif("break-words", tamam && "text-soluk-yazi line-through")}>
          {satir.baslik}
          {tamam ? <span className="sr-only">{metin("yonetim.pano.adimTamam")}</span> : null}
        </span>
        {satir.alt === null ? null : (
          <span className="break-words text-kucuk text-soluk-yazi">{satir.alt}</span>
        )}
      </span>
      {satir.eylem === null ? null : (
        <span className="flex shrink-0 items-center gap-1 self-center text-kucuk text-soluk-yazi">
          <span className="hidden tablet:inline">{satir.eylem}</span>
          <PanelIkon ad="sonraki" className="size-4" />
        </span>
      )}
    </>
  );
  const siniflar = "flex min-h-11 items-start gap-3 py-2";
  return (
    <li className="border-b border-kenar last:border-b-0">
      {satir.adres === null ? (
        <div className={siniflar}>{ic}</div>
      ) : (
        <Link
          href={satir.adres}
          className={sinif(siniflar, "text-yazi no-underline -outline-offset-2 hover:bg-yuzey")}
        >
          {ic}
        </Link>
      )}
    </li>
  );
}

export function Pano({ veri }: { veri: PanoVerisi }) {
  const { adimlar, bakilacaklar, satis, sayilar, kisayollar } = veri;
  return (
    <div className="grid grid-cols-1 gap-4 masaustu:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 masaustu:col-span-2">
        {adimlar === null ? null : (
          <Bolum
            baslik={metin("yonetim.pano.adimlar")}
            kimlik="pano-adimlar"
            ek={
              adimlar === "hata" ? undefined : (
                <span className="text-kucuk text-soluk-yazi">
                  {doldur(metin("yonetim.pano.adimSayisi"), {
                    tamam: String(adimlar.tamam),
                    toplam: String(adimlar.toplam),
                  })}
                </span>
              )
            }
          >
            {adimlar === "hata" ? (
              <Hata />
            ) : (
              <ol className="flex flex-col">
                {adimlar.adimlar.map((adim) => (
                  <Satir key={adim.kod} satir={adim} tamam={adim.tamam} />
                ))}
              </ol>
            )}
          </Bolum>
        )}
        {bakilacaklar === null ? null : (
          <Bolum baslik={metin("yonetim.pano.bakilacaklar")} kimlik="pano-bakilacaklar">
            {bakilacaklar === "hata" ? (
              <Hata />
            ) : (
              <div className="flex flex-col gap-3">
                {bakilacaklar.eksik ? <Hata eksik /> : null}
                {bakilacaklar.satirlar.length === 0 ? (
                  bakilacaklar.eksik ? null : (
                    <p className="text-soluk-yazi">{metin("yonetim.pano.bakilacakYok")}</p>
                  )
                ) : (
                  <ul className="flex flex-col">
                    {bakilacaklar.satirlar.map((satir) => (
                      <Satir key={satir.kod} satir={satir} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Bolum>
        )}
        {satis === null ? null : (
          <Bolum
            baslik={satis === "hata" ? metin("yonetim.pano.raporlar") : satis.baslik}
            kimlik="pano-satis"
            ek={
              satis === "hata" ? undefined : (
                <Baglanti href={satis.raporAdresi} gorunum="cerceveli" className="no-underline">
                  {metin("yonetim.pano.raporlar")}
                </Baglanti>
              )
            }
          >
            {satis === "hata" ? (
              <Hata />
            ) : (
              <SeriGrafigi baslik={satis.baslik} sutun={satis.sutun} noktalar={satis.noktalar} />
            )}
          </Bolum>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        {sayilar === null ? null : (
          // Okunamayan sayıların uyarısı da bölgenin içindedir: ekran okuyucu hangi bölümün yüklenmediğini söyler.
          <section aria-label={metin("yonetim.pano.sayilar")} className="flex flex-col gap-3">
            {sayilar === "hata" || sayilar.eksik ? <Hata eksik={sayilar !== "hata"} /> : null}
            {sayilar === "hata" ? null : (
              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 masaustu:grid-cols-1">
                {sayilar.kutular.map(({ adres, ...kutu }) => (
                  <SayiKutusu key={kutu.kod} kutu={kutu} {...(adres === null ? {} : { adres })} />
                ))}
              </div>
            )}
          </section>
        )}
        <Bolum baslik={metin("yonetim.pano.kisayollar")} kimlik="pano-kisayollar">
          <div className="flex flex-wrap gap-2">
            {kisayollar.map((kisayol) =>
              kisayol.eylem === null ? (
                <Baglanti
                  key={kisayol.kod}
                  href={kisayol.adres}
                  gorunum="cerceveli"
                  className="no-underline"
                >
                  <PanelIkon ad={kisayol.ikon} />
                  {kisayol.ad}
                </Baglanti>
              ) : (
                <EylemBaglantisi
                  key={kisayol.kod}
                  eylem={kisayol.eylem}
                  href={kisayol.adres}
                  cerceveli
                  className="no-underline"
                />
              ),
            )}
            <EylemBaglantisi
              eylem="vitrine-git"
              href={vitrinAdresleri.anasayfa}
              target="_blank"
              rel="noopener"
              aria-label={metin("yonetim.eylem.vitrineGitYeniSekme")}
              cerceveli
              className="no-underline"
            />
          </div>
        </Bolum>
      </div>
    </div>
  );
}
