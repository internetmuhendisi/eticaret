# İzinler ve roller

Kuralları `.claude/rules/yetki.md`, gerekçeleri karar 0040'tadır. Yeni izin ya da rol aynı değişiklikte buraya yazılır. Listelerin kayıtla aynı olduğunu `cekirdek/moduller/ekip/testler/belge.test.ts` denetler.

**Kapsam.** `kendi`: hesabın kendi kayıtları. `ekip`: hesabın ekibinin kayıtları; mağazada henüz alt ekip yapısı olmadığı için bu kapsamı kullanan izin yoktur. `tumu`: sitenin bütün kayıtları.

## İzinler

| İzin | Giriş | Kapsam | Ne verir |
|---|---|---|---|
| `ekip.kendi-hesabi.gor` | yonetici | kendi | Yönetici kendi hesabını görür. |
| `ekip.gor` | yonetici | tumu | Ekipteki bütün yöneticileri görür. |
| `ekip.rol-ata` | yonetici | tumu | Yöneticilere rol verir ve alır. |
| `musteri.kendi-hesabi.gor` | musteri | kendi | Müşteri kendi hesabını görür. |

Müşterinin rolü yoktur: geçerli oturumu olan her müşteri müşteri girişinin izinlerine sahiptir, kapsamı yalnız kendi kayıtlarıdır. Sahip girişinin izni sahip paneliyle gelir.

## Roller

Her sitede hazır gelir. Ekranda görünen adları metin dosyasındadır (`yonetim.rol`).

| Kod | Görünen ad | İzinler |
|---|---|---|
| `magaza-sahibi` | Mağaza sahibi | bütün yönetici izinleri |
| `gorevli` | Görevli | ekip.kendi-hesabi.gor |

Tam yetkili son yöneticinin rolü alınamaz. Görevlinin izinleri ürün ve sipariş gibi modüller geldikçe artar.
