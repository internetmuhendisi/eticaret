"use client";
// Ekipteki bir kullanıcının ekranı (kart 0274 ve 0053, karar 0178; taslak: Ekip, "kişi"): solda roller (bir ya da
// birden çok, "Rolleri kaydet" ile ortak form yapısında), sağda giriş (iki aşamalı girişin durumu, son giriş,
// "İki aşamalı girişi sıfırla") ve "Hesabı kapat". Geri dönüşsüz iki işlem onay penceresiyle sorulur.
//
// - Kendi hesabında hiçbir şey değiştirilemez: roller kapalı, iki düğme yoktur, nedeni yazar (servis de reddeder).
// - Mağazanın son sahibinde tam yetkili rolün kutusu kapalıdır ve hesap kapatılamaz; nedeni yazar.
// - Değiştirme izni olmayan yönetici yalnız görür.
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Ikon } from "../../../bilesenler/ikonlar/ikon";
import { bildirimGoster } from "../../../bilesenler/parcalar/bildirim";
import { Dugme } from "../../../bilesenler/parcalar/dugme";
import { Kart } from "../../../bilesenler/parcalar/kart";
import { OnayKutusu } from "../../../bilesenler/parcalar/onay-kutusu";
import { OnayPenceresi } from "../../../bilesenler/parcalar/onay-penceresi";
import { Uyari } from "../../../bilesenler/parcalar/uyari";
import { doldur } from "../../metinler/doldur";
import type { MetinAnahtari } from "../../metinler/metin";
import { usePanelMetni } from "../../metinler/panel-metni";
import { ekipAdresi } from "../adresler";
import { AlanKabi, KaydetCubugu, PanelFormu, usePanelFormu } from "../form/panel-formu";
import { kodluAlanHatalari, kodluHataMetni } from "../kodlu-form";
import { usePanelIslemi } from "../panel-islemi";
import { panelIstegi } from "../panel-istegi";
import { useSunucuFormu } from "../sunucu-formu";
import type { EkipKisisi, RolSecenegi } from "./veri";

// Ekip servisinin kodları ve metinleri.
export const ekipHataMetinleri = {
  "son-sahip": "yonetim.ekip.hata.son-sahip",
  "kendi-hesabi": "yonetim.ekip.hata.kendi-hesabi",
  "rol-gerekli": "yonetim.ekip.hata.rol-gerekli",
  "rol-yok": "yonetim.ekip.hata.rol-yok",
  "kurulu-degil": "yonetim.ekip.hata.kurulu-degil",
} as const satisfies Record<string, MetinAnahtari>;
const hataMetni = kodluHataMetni(ekipHataMetinleri);

type RolFormu = { roller: string[] };

export function EkipKisisiEkrani({
  kisi,
  roller,
  izinler,
}: {
  kisi: EkipKisisi;
  roller: RolSecenegi[];
  izinler: { rolAta: boolean; hesapKapat: boolean; ikiAsamaSifirla: boolean };
}) {
  const metin = usePanelMetni();
  const router = useRouter();
  const islem = usePanelIslemi(hataMetni);
  const rolDegisir = izinler.rolAta && !kisi.kendi;
  // Sunucunun verisi nesneyle tanınır (useSunucuFormu): her çizimde yeni nesne sonsuz yeniden çizim verir.
  const rollerAnahtari = kisi.roller.join(",");
  const sunucudaki = useMemo<RolFormu>(
    () => ({ roller: rollerAnahtari === "" ? [] : rollerAnahtari.split(",") }),
    [rollerAnahtari],
  );
  const { form, setForm, degisti, kaydedildi, vazgec } = useSunucuFormu<RolFormu>(sunucudaki);
  const pf = usePanelFormu({ degisti: rolDegisir && degisti, kaydet: () => kaydet() });
  const [pencere, setPencere] = useState<"sifirla" | "kapat" | null>(null);

  const kaydet = async (): Promise<boolean> => {
    const gonderilen = form;
    const sonuc = await pf.isle(() =>
      islem(
        "ekip-rolleri",
        { kimlik: kisi.kimlik, roller: gonderilen.roller },
        "yonetim.ekip.kaydedildi",
        { formda: true },
      ),
    );
    if (sonuc === undefined) return false;
    if (sonuc.tamam) {
      kaydedildi(gonderilen);
      pf.temizle();
      return true;
    }
    const alanHatalari = kodluAlanHatalari(ekipHataMetinleri, sonuc, ["roller"], () => "roller");
    pf.hatalariGoster(
      Object.fromEntries(
        Object.entries(alanHatalari).map(([alan, anahtar]) => [alan, metin(anahtar)]),
      ),
      Object.keys(alanHatalari).length > 0 ? [] : [metin(hataMetni(sonuc))],
    );
    return false;
  };

  const rolDegistir = (kod: string, isaretli: boolean) =>
    setForm((onceki) => ({
      roller: isaretli
        ? [...new Set([...onceki.roller, kod])]
        : onceki.roller.filter((rol) => rol !== kod),
    }));

  const kapat = async () => {
    // Sayfa yenilenmez (kapatılan hesabın ekranı bulunamadı verirdi), listeye gidilir.
    const sonuc = await panelIstegi("ekip-hesap-kapat", { kimlik: kisi.kimlik });
    if (sonuc.tamam) {
      bildirimGoster("basari", metin("yonetim.ekip.kapatildi"));
      router.push(ekipAdresi);
    } else {
      bildirimGoster("tehlike", metin(hataMetni(sonuc)));
    }
  };

  const rollerHatasi = pf.hata("roller");
  const rollerBolumu = (
    <Kart
      role="region"
      aria-labelledby="ekip-roller-baslik"
      className="flex min-w-0 flex-col gap-3 p-4 tablet:p-6"
    >
      <h2 id="ekip-roller-baslik" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.ekip.bolum.roller")}
      </h2>
      {kisi.kendi ? <Uyari tur="bilgi">{metin("yonetim.ekip.kendiHesabi")}</Uyari> : null}
      {kisi.sonSahip && !kisi.kendi ? (
        <Uyari tur="bilgi">{metin("yonetim.ekip.sonSahip")}</Uyari>
      ) : null}
      <AlanKabi ad="roller" etiket={metin("yonetim.ekip.bolum.roller")}>
        <fieldset
          disabled={!rolDegisir}
          aria-describedby={rollerHatasi === undefined ? undefined : "ekip-roller-hata"}
          className="m-0 flex flex-col border-0 p-0"
        >
          <legend className="sr-only">{metin("yonetim.ekip.bolum.roller")}</legend>
          {roller.map((rol, sira) => {
            // Son sahibin tam yetkili rolü bırakılamaz: kutusu işaretli ve kapalıdır.
            const kilitli = rol.tamYetki && kisi.sonSahip && form.roller.includes(rol.kod);
            return (
              <OnayKutusu
                key={rol.kod}
                etiket={metin(`yonetim.rol.${rol.kod}` as MetinAnahtari)}
                ek={
                  <span className="-mt-2 pl-8 text-kucuk text-soluk-yazi">
                    {metin(`yonetim.rolAciklamasi.${rol.kod}` as MetinAnahtari)}
                  </span>
                }
                checked={form.roller.includes(rol.kod)}
                disabled={kilitli}
                onCheckedChange={(isaretli) => rolDegistir(rol.kod, isaretli === true)}
                {...(sira === 0 ? { "data-hata-odagi": "" } : {})}
              />
            );
          })}
        </fieldset>
        {rollerHatasi === undefined ? null : (
          <p id="ekip-roller-hata" className="m-0 mt-2 font-kalin text-tehlike-yazi">
            {rollerHatasi}
          </p>
        )}
      </AlanKabi>
      <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.ekip.rolIpucu")}</p>
    </Kart>
  );

  const giris = (
    <Kart
      role="region"
      aria-labelledby="ekip-giris-baslik"
      className="flex flex-col gap-3 p-4 tablet:p-6"
    >
      <h2 id="ekip-giris-baslik" className="font-baslik text-baslik-4 font-baslik-kalinligi">
        {metin("yonetim.ekip.bolum.giris")}
      </h2>
      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1 text-kucuk">
        <dt className="text-soluk-yazi">{metin("yonetim.ekip.ikiAsama")}</dt>
        <dd className="m-0">
          {metin(kisi.ikiAsamaKurulu ? "yonetim.ekip.kurulu" : "yonetim.ekip.kuruluDegil")}
        </dd>
        <dt className="text-soluk-yazi">{metin("yonetim.ekip.sonGirisBaslik")}</dt>
        <dd className="m-0">{kisi.sonGiris ?? metin("yonetim.ekip.hicGirmedi")}</dd>
      </dl>
      {izinler.ikiAsamaSifirla && !kisi.kendi && kisi.ikiAsamaKurulu ? (
        <>
          <Dugme tur="cerceveli" className="self-start" onClick={() => setPencere("sifirla")}>
            <Ikon ad="yenile" />
            {metin("yonetim.ekip.sifirla")}
          </Dugme>
          <p className="m-0 text-kucuk text-soluk-yazi">
            {metin("yonetim.ekip.sifirlaAciklamasi")}
          </p>
        </>
      ) : null}
    </Kart>
  );

  const hesapKapatma =
    !izinler.hesapKapat || kisi.kendi ? null : (
      <Kart
        role="region"
        aria-labelledby="ekip-kapat-baslik"
        className="flex flex-col gap-3 p-4 tablet:p-6"
      >
        <h2 id="ekip-kapat-baslik" className="font-baslik text-baslik-4 font-baslik-kalinligi">
          {metin("yonetim.ekip.bolum.kapat")}
        </h2>
        {kisi.sonSahip ? (
          <p className="m-0 text-kucuk text-soluk-yazi">{metin("yonetim.ekip.sonSahip")}</p>
        ) : (
          <>
            <p className="m-0 text-kucuk text-soluk-yazi">
              {metin("yonetim.ekip.kapatAciklamasi")}
            </p>
            <Dugme tur="cerceveli" className="self-start" onClick={() => setPencere("kapat")}>
              <Ikon ad="sil" />
              {metin("yonetim.ekip.kapat")}
            </Dugme>
          </>
        )}
      </Kart>
    );

  return (
    <>
      <PanelFormu
        durum={pf}
        gonder={async () => {
          await kaydet();
        }}
      >
        <div className="grid gap-6 masaustu:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 masaustu:col-span-2">
            {rollerBolumu}
            {rolDegisir ? (
              <KaydetCubugu
                sayfada
                durumYazisi
                degisiklikGerekli
                kaydetEtiketi={metin("yonetim.ekip.rollerKaydet")}
                vazgec={() => {
                  vazgec();
                  pf.temizle();
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-6 masaustu:sticky masaustu:top-4 masaustu:self-start">
            {giris}
            {hesapKapatma}
          </div>
        </div>
      </PanelFormu>
      <OnayPenceresi
        acik={pencere === "sifirla"}
        acikDegisince={(acik) => setPencere(acik ? "sifirla" : null)}
        baslik={doldur(metin("yonetim.ekip.sifirlaOnay.baslik"), { eposta: kisi.eposta })}
        aciklama={metin("yonetim.ekip.sifirlaOnay.aciklama")}
        onayEtiketi={metin("yonetim.ekip.sifirlaOnay.onay")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={async () => {
          await islem("ekip-iki-asama-sifirla", { kimlik: kisi.kimlik }, "yonetim.ekip.sifirlandi");
        }}
        tur="tehlike"
      />
      <OnayPenceresi
        acik={pencere === "kapat"}
        acikDegisince={(acik) => setPencere(acik ? "kapat" : null)}
        baslik={doldur(metin("yonetim.ekip.kapatOnay.baslik"), { eposta: kisi.eposta })}
        aciklama={metin("yonetim.ekip.kapatOnay.aciklama")}
        onayEtiketi={metin("yonetim.ekip.kapat")}
        vazgecEtiketi={metin("ortak.islem.vazgec")}
        onayla={kapat}
        tur="tehlike"
      />
    </>
  );
}
