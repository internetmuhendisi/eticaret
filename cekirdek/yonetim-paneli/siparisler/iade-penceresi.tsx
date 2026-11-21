"use client";
// İptal ve iade penceresi (kart 0235, karar 0147; kart 0233'ün taslağı). Komut çubuğunda "İptal et" ve "İade yap"
// yalnız siparişin durumu izin veriyorsa ve yöneticinin siparis.iade izni varsa görünür (veri.ts). Pencere aynıdır:
// iptalde bütün ürünler sabit gelir, iadede ürün ve adet seçilir, kargo ücreti iade edilir ya da edilmez, tutar elle
// değiştirilebilir. Tutar ve vergi sunucunun hesabıyla aynı işlevden (iadeyiHesapla) ve sunucunun biçimiyle yazılır;
// gönderilen yalnız seçimdir, tutarı sunucu yeniden hesaplar. Asıl düğme tutarı yazar. Müşterinin onaylanmış ve iadesi
// yapılmamış talebi varsa (kart 0239) iade penceresi talebin ürünleri, adetleri ve nedeniyle seçili açılır; iade
// talebe bağlanır (talep kimliği gider). Mağaza sahibi seçimi değiştirebilir.
import { useMemo, useState } from "react";
import { AdetSecici } from "../../../bilesenler/parcalar/adet-secici";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { GirisAlani } from "../../../bilesenler/parcalar/giris-alani";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { SecenekGrubu } from "../../../bilesenler/parcalar/secenek-grubu";
import {
  SecimDegeri,
  SecimKutusu,
  SecimListesi,
  SecimOgesi,
  SecimTetikleyici,
} from "../../../bilesenler/parcalar/secim-kutusu";
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
import { UzunMetinAlani } from "../../../bilesenler/parcalar/uzun-metin-alani";
import {
  YanPencere,
  YanPencereAciklamasi,
  YanPencereBasligi,
  YanPencereIcerigi,
  YanPencereUstu,
} from "../../../bilesenler/parcalar/yan-pencere";
import {
  type IadeNedeni,
  type IadeTuru,
  iadeNedenleri,
  iadeSinirlari,
} from "../../kayitlar/siparis";
import { bicimleyiciOlustur } from "../../metinler/bicimleyici";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import {
  type IadeHatasi,
  type IadeHesabi,
  IadeHesapHatasi,
  iadeyiHesapla,
} from "../../moduller/siparis/iade-hesabi";
import { EylemDugmesi } from "../eylem-dugmesi";
import { AlanKabi, KaydetCubugu, PanelAlani, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { useKapatmaSorusu } from "../kapatma-sorusu";
import { usePanelIslemi } from "../panel-islemi";
import type { PanelHatasi } from "../panel-istegi";
import { iadeNedenMetni } from "./metinler";
import type { IadePenceresiVerisi } from "./veri";

const hataMetinleri: Record<IadeHatasi | "tutar-okunamadi", MetinAnahtari> = {
  "kalem-yok": "yonetim.iade.hata.kalem",
  "kalem-tekrar": "yonetim.iade.hata.kalem",
  "adet-fazla": "yonetim.iade.hata.kalem",
  "kargo-iade-edildi": "yonetim.iade.hata.kargo",
  "bos-iade": "yonetim.iade.hata.bos",
  "tutar-fazla": "yonetim.iade.hata.tutarFazla",
  "tutar-gecersiz": "yonetim.iade.hata.tutarGecersiz",
  "tutar-okunamadi": "yonetim.iade.hata.tutarOkunamadi",
  odenmemis: "yonetim.iade.hata.odenmemis",
};

const hataMetni = (hata: PanelHatasi): MetinAnahtari => {
  if (hata.kod === "cakisma") {
    return hata.ayrinti.some((sorun) => sorun.kod === "iade-bekliyor")
      ? "yonetim.iade.hata.bekliyor"
      : "yonetim.siparis.hata.cakisma";
  }
  if (hata.kod === "yetki") return "yonetim.siparis.hata.yetki";
  if (hata.kod === "is-kurali") return "yonetim.siparis.hata.gecis";
  return "yonetim.siparis.hata.genel";
};

type IadeYaniti = { numara: string; durum: string; iade: "tamamlandi" | "bekliyor" | "basarisiz" };

export function IadeIslemleri({ numara, veri }: { numara: string; veri: IadePenceresiVerisi }) {
  const [tur, setTur] = useState<IadeTuru | null>(null);
  const { kapat, kapatmayiIste, degisince, soru } = useKapatmaSorusu(() => setTur(null));
  const metin = usePanelMetni();
  return (
    <>
      {veri.turler.map((secilen) => (
        <EylemDugmesi
          key={secilen}
          eylem={secilen === "iptal" ? "siparis-iptal" : "iade-yap"}
          onClick={() => setTur(secilen)}
        />
      ))}
      <YanPencere open={tur !== null} onOpenChange={(acik) => (acik ? undefined : kapatmayiIste())}>
        {tur === null ? null : (
          <YanPencereIcerigi
            kapatEtiketi={metin("ortak.parca.kapat")}
            className="tablet:max-w-form"
          >
            <YanPencereUstu>
              <YanPencereBasligi>
                {metin(tur === "iptal" ? "yonetim.iade.iptalBaslik" : "yonetim.iade.iadeBaslik")}
              </YanPencereBasligi>
              <YanPencereAciklamasi>
                {metin(
                  tur === "iptal" ? "yonetim.iade.iptalAciklamasi" : "yonetim.iade.iadeAciklamasi",
                )}
              </YanPencereAciklamasi>
            </YanPencereUstu>
            {soru}
            <IadeFormu
              numara={numara}
              tur={tur}
              veri={veri}
              degisince={degisince}
              vazgec={kapatmayiIste}
              bitti={kapat}
            />
          </YanPencereIcerigi>
        )}
      </YanPencere>
    </>
  );
}

function IadeFormu({
  numara,
  tur,
  veri,
  degisince,
  vazgec,
  bitti,
}: {
  numara: string;
  tur: IadeTuru;
  veri: IadePenceresiVerisi;
  degisince: (degisti: boolean) => void;
  vazgec: () => void;
  bitti: () => void;
}) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const b = useMemo(() => bicimleyiciOlustur(veri.bicim), [veri.bicim]);
  const iptal = tur === "iptal";
  const talep = iptal ? null : veri.talep;
  const [adetler, setAdetler] = useState<Record<number, number>>(() =>
    talep === null
      ? {}
      : Object.fromEntries(
          talep.kalemler.map((secilen) => {
            const kalem = veri.kalemler.find((k) => k.sira === secilen.sira);
            const enCok = kalem === undefined ? 0 : kalem.adet - kalem.iadeEdilen;
            return [secilen.sira, Math.min(secilen.adet, enCok)];
          }),
        ),
  );
  // Kargo: seçilmediyse bütün kalan ürünler seçilince iade edilir (tam iade), değilse edilmez.
  const [kargoSecimi, setKargoSecimi] = useState<boolean | null>(null);
  const [elleTutar, setElleTutar] = useState<string | null>(null);
  const [stogaKoy, setStogaKoy] = useState(true);
  const [neden, setNeden] = useState<IadeNedeni | "">(talep?.neden ?? "");
  const [aciklama, setAciklama] = useState("");
  const [degisti, setDegisti] = useState(false);
  // Ortak form yapısı (kart 0259): hata, özet, odak; pencere kapatılırken soru useKapatmaSorusu'ndadır.
  const pf = usePanelFormu({ degisti });

  const kalan = (kalem: IadePenceresiVerisi["kalemler"][number]) => kalem.adet - kalem.iadeEdilen;
  const butunKalanSecili = veri.kalemler.every(
    (kalem) => (adetler[kalem.sira] ?? 0) === kalan(kalem),
  );
  const kargo = veri.kargoIadeEdilebilir && (kargoSecimi ?? butunKalanSecili);
  const secilenKalemler = veri.kalemler
    .map((kalem) => ({ sira: kalem.sira, adet: adetler[kalem.sira] ?? 0 }))
    .filter((kalem) => kalem.adet > 0);
  const elleKurus =
    elleTutar === null || elleTutar.trim() === "" ? undefined : b.paraOku(elleTutar);

  // Hesap: sunucunun işlevi; elle tutar okunamıyorsa hesaplanan gösterilir, hata alanda.
  const hesap = useMemo((): IadeHesabi | IadeHesapHatasi => {
    try {
      return iadeyiHesapla(veri.hesap, veri.onceki, tur, {
        kalemler: secilenKalemler,
        kargo,
        elleTutar: elleKurus,
      });
    } catch (hata) {
      if (hata instanceof IadeHesapHatasi) return hata;
      throw hata;
    }
  }, [veri, tur, secilenKalemler, kargo, elleKurus]);
  const sonuc = hesap instanceof IadeHesapHatasi ? null : hesap;
  // Alandaki değer: elle yazılan ya da hesaplanan (simgesiz).
  const hesaplanan = (() => {
    try {
      return iadeyiHesapla(veri.hesap, veri.onceki, tur, { kalemler: secilenKalemler, kargo })
        .tutar;
    } catch {
      return 0;
    }
  })();
  const alanDegeri = elleTutar ?? b.paraYazisi(hesaplanan);
  const kalanOdenen =
    veri.hesap.odenen === null
      ? 0
      : veri.hesap.odenen - veri.onceki.reduce((t, i) => t + i.tutar, 0);

  const degistir = () => {
    setDegisti(true);
    degisince(true);
  };
  const adetDegistir = (sira: number, adet: number) => {
    setAdetler((onceki) => ({ ...onceki, [sira]: adet }));
    pf.alaniTemizle("kalemler");
    degistir();
  };

  const gonder = async () => {
    const yeniHatalar: Record<string, string> = {};
    if (neden === "") yeniHatalar["neden"] = metin("yonetim.iade.hata.neden");
    if (!iptal && elleTutar !== null && elleTutar.trim() !== "" && elleKurus === undefined) {
      yeniHatalar["tutar"] = metin("yonetim.iade.hata.tutarOkunamadi");
    } else if (hesap instanceof IadeHesapHatasi) {
      yeniHatalar[hesap.alan === "tutar" ? "tutar" : "kalemler"] = metin(hataMetinleri[hesap.kod]);
    }
    if (Object.keys(yeniHatalar).length > 0) {
      pf.hatalariGoster(yeniHatalar);
      return;
    }
    const yanit = await pf.isle(() =>
      islem<IadeYaniti>(
        "siparis-iadesi",
        {
          numara,
          tur,
          gorulenDurum: veri.durum,
          kalemler: iptal ? [] : secilenKalemler,
          kargo,
          ...(iptal || elleTutar === null || elleTutar.trim() === "" ? {} : { tutar: elleTutar }),
          stogaKoy,
          neden,
          ...(aciklama.trim() === "" ? {} : { aciklama }),
          ...(talep === null ? {} : { talep: talep.kimlik }),
        },
        iptal ? "yonetim.iade.basari.iptal" : "yonetim.iade.basari.iade",
        {
          formda: true,
          bildirim: (sonucVerisi) =>
            sonucVerisi.iade === "bekliyor"
              ? { tur: "uyari", metin: "yonetim.iade.basari.bekliyor" }
              : sonucVerisi.iade === "basarisiz"
                ? { tur: "tehlike", metin: "yonetim.iade.basari.basarisiz" }
                : {
                    tur: "basari",
                    metin: iptal ? "yonetim.iade.basari.iptal" : "yonetim.iade.basari.iade",
                  },
        },
      ),
    );
    if (yanit === undefined) return;
    if (yanit.tamam) {
      bitti();
      return;
    }
    const alanHatasi = (alan: string) =>
      yanit.ayrinti.find((sorun) => sorun.alan === alan || sorun.alan.startsWith(`${alan}.`));
    const tutarHatasi = alanHatasi("tutar");
    const kalemHatasi = alanHatasi("kalemler") ?? alanHatasi("kargo");
    if (tutarHatasi !== undefined || kalemHatasi !== undefined) {
      pf.hatalariGoster({
        ...(tutarHatasi === undefined
          ? {}
          : {
              tutar: metin(
                hataMetinleri[tutarHatasi.kod as IadeHatasi] ?? "yonetim.iade.hata.tutarGecersiz",
              ),
            }),
        ...(kalemHatasi === undefined
          ? {}
          : {
              kalemler: metin(
                hataMetinleri[kalemHatasi.kod as IadeHatasi] ?? "yonetim.iade.hata.bos",
              ),
            }),
      });
      return;
    }
    pf.hatalariGoster({}, [metin(hataMetni(yanit))]);
  };

  const vergiSatiri = (satir: { ad?: string | undefined; oran: number }) =>
    doldur(metin("yonetim.iade.icindekiVergi"), {
      ad: satir.ad ?? metin("yonetim.siparis.vergi"),
      oran: b.yuzde(satir.oran / 10_000),
    });
  const tutar = sonuc?.tutar ?? 0;
  // Bütün kalanlar seçilip ödenen kalandan az elle tutar yazılınca sipariş "iade edildi" olur, kalan para artık iade
  // edilemez (bağımsız kontrolün bulgusu): pencere uyarır.
  const kalanKalir =
    !iptal && sonuc?.tam === true && elleKurus !== undefined && tutar < kalanOdenen;

  return (
    <PanelFormu durum={pf} gonder={gonder}>
      {iptal ? <Uyari tur="uyari">{metin("yonetim.iade.iptalUyarisi")}</Uyari> : null}
      {talep === null ? null : (
        <Uyari tur="bilgi">{metin("yonetim.iadeTalebi.penceredeSecili")}</Uyari>
      )}
      <AlanKabi
        ad="kalemler"
        etiket={metin("yonetim.iade.urunler")}
        className="flex min-w-0 flex-col gap-2"
      >
        <Tablo
          className="text-left"
          // Hatada odak tabloya gelir; hata yazısı tabloya bağlıdır (iade edilebilir satır olmasa da).
          data-hata-odagi=""
          tabIndex={-1}
          aria-describedby={pf.hata("kalemler") === undefined ? undefined : "iade-kalem-hatasi"}
        >
          <TabloBasligi className="sr-only">{metin("yonetim.iade.urunler")}</TabloBasligi>
          <TabloUstu>
            <TabloSatiri className="text-kucuk text-soluk-yazi">
              <TabloBasHucresi scope="col" className="pb-2 font-kalin">
                {metin("yonetim.iade.sutun.urun")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="px-2 pb-2 font-kalin">
                {metin(iptal ? "yonetim.iade.sutun.adet" : "yonetim.iade.sutun.iadeAdedi")}
              </TabloBasHucresi>
              <TabloBasHucresi scope="col" className="pb-2 text-right font-kalin">
                {metin("yonetim.iade.sutun.tutar")}
              </TabloBasHucresi>
            </TabloSatiri>
          </TabloUstu>
          <TabloGovdesi>
            {veri.kalemler.map((kalem) => {
              const enCok = kalan(kalem);
              return (
                <TabloSatiri key={kalem.sira} className="last:border-b-0">
                  <TabloHucresi className="py-3 align-middle">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-kalin wrap-anywhere">{kalem.ad}</span>
                      {kalem.secim === "" ? null : (
                        <span className="text-kucuk text-soluk-yazi">{kalem.secim}</span>
                      )}
                      <span className="text-kucuk text-soluk-yazi">
                        {kalem.iadeEdilen > 0
                          ? doldur(metin("yonetim.iade.adetIadeli"), {
                              adet: String(kalem.adet),
                              iade: String(kalem.iadeEdilen),
                            })
                          : doldur(metin("yonetim.iade.adetAlindi"), {
                              adet: String(kalem.adet),
                            })}
                      </span>
                    </span>
                  </TabloHucresi>
                  <TabloHucresi className="px-2 py-3 align-middle">
                    {iptal ? (
                      <span className="font-kalin">{enCok}</span>
                    ) : enCok === 0 ? (
                      <span className="text-kucuk text-soluk-yazi">
                        {metin("yonetim.iade.hepsiIadeli")}
                      </span>
                    ) : (
                      <AdetSecici
                        deger={adetler[kalem.sira] ?? 0}
                        enAz={0}
                        enCok={enCok}
                        onDegerDegisti={(adet) => adetDegistir(kalem.sira, adet)}
                        etiketler={{
                          grup: doldur(metin("yonetim.iade.adetGrubu"), { ad: kalem.ad }),
                          azalt: doldur(metin("yonetim.iade.azalt"), { ad: kalem.ad }),
                          artir: doldur(metin("yonetim.iade.artir"), { ad: kalem.ad }),
                        }}
                      />
                    )}
                  </TabloHucresi>
                  <TabloHucresi className="py-3 text-right align-middle font-kalin whitespace-nowrap">
                    {b.para(
                      sonuc?.kalemler.find((secilen) => secilen.sira === kalem.sira)?.tutar ?? 0,
                    )}
                  </TabloHucresi>
                </TabloSatiri>
              );
            })}
          </TabloGovdesi>
        </Tablo>
        {pf.hata("kalemler") === undefined ? null : (
          <p id="iade-kalem-hatasi" className="text-kucuk text-tehlike-yazi">
            {pf.hata("kalemler")}
          </p>
        )}
      </AlanKabi>
      {!iptal && veri.kargoIadeEdilebilir ? (
        <SecenekGrubu
          baslik={metin("yonetim.iade.kargo")}
          etiket={metin("yonetim.iade.kargo")}
          secilemezEki=""
          ogeler={[
            { deger: "hayir", ad: metin("yonetim.iade.kargoHayir") },
            {
              deger: "evet",
              ad: doldur(metin("yonetim.iade.kargoEvet"), {
                tutar: b.para(
                  veri.hesap.toplam -
                    veri.hesap.kalemler.reduce((t, k) => t + k.vergisiz + k.vergi, 0),
                ),
              }),
            },
          ]}
          deger={kargo ? "evet" : "hayir"}
          onDegerDegisti={(deger) => {
            setKargoSecimi(deger === "evet");
            degistir();
          }}
        />
      ) : null}
      <OnayKutusu
        etiket={metin(iptal ? "yonetim.iade.stogaKoyIptal" : "yonetim.iade.stogaKoy")}
        checked={stogaKoy}
        onCheckedChange={(isaretli) => {
          setStogaKoy(isaretli === true);
          degistir();
        }}
      />
      <div className="grid gap-4 tablet:grid-cols-2 tablet:items-start">
        {iptal ? null : (
          <PanelAlani
            ad="tutar"
            etiket={metin("yonetim.iade.tutar")}
            aciklama={doldur(metin("yonetim.iade.tutarAciklamasi"), { kalan: b.para(kalanOdenen) })}
            zorunlu
          >
            {(alan) => (
              <GirisAlani
                {...alan}
                name="iade-tutari"
                inputMode="decimal"
                autoComplete="off"
                value={alanDegeri}
                onChange={(olay) => {
                  setElleTutar(olay.target.value);
                  pf.alaniTemizle("tutar");
                  degistir();
                }}
              />
            )}
          </PanelAlani>
        )}
        <PanelAlani
          ad="neden"
          etiket={metin(iptal ? "yonetim.iade.iptalNedeni" : "yonetim.iade.iadeNedeni")}
          zorunlu
        >
          {(alan) => (
            <SecimKutusu
              value={neden}
              onValueChange={(deger) => {
                setNeden(deger as IadeNedeni);
                pf.alaniTemizle("neden");
                degistir();
              }}
            >
              <SecimTetikleyici {...alan}>
                <SecimDegeri placeholder={metin("yonetim.iade.nedenSec")} />
              </SecimTetikleyici>
              <SecimListesi>
                {iadeNedenleri.map((secenek) => (
                  <SecimOgesi key={secenek} value={secenek}>
                    {metin(iadeNedenMetni(secenek))}
                  </SecimOgesi>
                ))}
              </SecimListesi>
            </SecimKutusu>
          )}
        </PanelAlani>
      </div>
      <PanelAlani
        ad="aciklama"
        etiket={metin("yonetim.iade.aciklama")}
        aciklama={metin("yonetim.iade.aciklamaAciklamasi")}
        zorunlu={false}
      >
        {(alan) => (
          <UzunMetinAlani
            {...alan}
            name="iade-aciklamasi"
            maxLength={iadeSinirlari.aciklamaEnCok}
            value={aciklama}
            onChange={(olay) => {
              setAciklama(olay.target.value);
              degistir();
            }}
          />
        )}
      </PanelAlani>
      <dl className="flex flex-col gap-1 border-t border-kenar pt-4 text-kucuk" aria-live="polite">
        <div className="flex justify-between gap-3 font-baslik text-baslik-4 font-baslik-kalinligi">
          <dt>{metin(iptal ? "yonetim.iade.geriOdenecek" : "yonetim.iade.iadeEdilecek")}</dt>
          <dd className="whitespace-nowrap">{b.para(tutar)}</dd>
        </div>
        {(sonuc?.vergiDokumu ?? []).map((satir) => (
          <div
            key={`${satir.ad ?? ""}-${satir.oran}`}
            className="flex justify-between gap-3 text-soluk-yazi"
          >
            <dt>{vergiSatiri(satir)}</dt>
            <dd className="whitespace-nowrap">{b.para(satir.vergi)}</dd>
          </div>
        ))}
      </dl>
      {kalanKalir ? (
        <Uyari tur="uyari">
          {doldur(metin("yonetim.iade.kalanKalir"), { kalan: b.para(kalanOdenen - tutar) })}
        </Uyari>
      ) : null}
      <Uyari tur="bilgi">
        {metin(
          veri.para === "kurulus"
            ? "yonetim.iade.para.kurulus"
            : veri.para === "elle"
              ? "yonetim.iade.para.elle"
              : "yonetim.iade.para.yok",
        )}
      </Uyari>
      <KaydetCubugu
        kaydetEtiketi={
          iptal
            ? metin("yonetim.iade.iptalDugmesi")
            : doldur(metin("yonetim.iade.iadeDugmesi"), { tutar: b.para(tutar) })
        }
        vazgec={vazgec}
      />
    </PanelFormu>
  );
}

// Kuruluşun yanıtını bekleyen iadeyi yeniden dener (ayrıntıdaki uyarının düğmesi).
export function IadeyiYenidenDene({ numara }: { numara: string }) {
  const metin = usePanelMetni();
  const islem = usePanelIslemi(hataMetni);
  const [suruyor, setSuruyor] = useState(false);
  return (
    <Dugme
      tur="cerceveli"
      className="w-fit"
      disabled={suruyor}
      onClick={async () => {
        setSuruyor(true);
        await islem<IadeYaniti>("siparis-iadesi-yeniden", { numara }, "yonetim.iade.basari.iade", {
          bildirim: (sonucVerisi) =>
            sonucVerisi.iade === "bekliyor"
              ? { tur: "uyari", metin: "yonetim.iade.basari.bekliyor" }
              : sonucVerisi.iade === "basarisiz"
                ? { tur: "tehlike", metin: "yonetim.iade.basari.basarisiz" }
                : { tur: "basari", metin: "yonetim.iade.basari.iade" },
        });
        setSuruyor(false);
      }}
    >
      {metin("yonetim.iade.yenidenDene")}
    </Dugme>
  );
}
