# Uç belgesi

Kapıdaki her uç burada yazar (`.claude/rules/sunucu-arayuzu.md`). Yeni ya da değişen uç aynı değişiklikte buraya yazılır. Uygulamadaki her adresin burada olduğunu ve burada yazan her adresin uygulamada olduğunu `cekirdek/kapi/testler/uc-belgesi.test.ts` denetler. Kapının yapısı: karar 0024.

## Ortak kurallar

**Girişler.** Her adres dört girişten biriyle başlar: `/kapi/herkese-acik/`, `/kapi/musteri/`, `/kapi/yonetici/`, `/kapi/sahip/` (`cekirdek/kayitlar/kapi.ts`).

**Yanıt zarfı.** Her yanıt JSON'dur ve aynı biçimdedir.

```json
{ "basarili": true, "veri": { } }
{ "basarili": false, "hata": { "kod": "dogrulama", "ayrinti": [ ] } }
```

`ayrinti` yalnız gerekince vardır, kişisel veri ve iç hata mesajı taşımaz.

**Hata kodları** (`cekirdek/kayitlar/kapi.ts`):

| Kod | HTTP | Ne zaman |
|---|---|---|
| `dogrulama` | 400 | Girdi şemadan geçmedi. Ayrıntı: `[{ "alan", "kod" }]`, `kod` Zod'un hata kodudur. |
| `yetki` | 403 | İstenen izin yok (kart 0026). |
| `bulunamadi` | 404 | Kayıt yok. |
| `cakisma` | 409 | Kayıt başka biriyle çakışıyor. |
| `is-kurali` | 422 | Girdi geçerli ama iş kuralı izin vermiyor. |
| `istek-siniri` | 429 | Sınır aşıldı. `Retry-After` başlığı kaç saniye sonra yeniden denenebileceğini söyler. |
| `sunucu-hatasi` | 500 | Beklenmeyen hata. Ayrıntı yoktur. |
| `hizmet-kullanilamiyor` | 503 | Uygulamanın dayandığı bir parça (veritabanı gibi) kapalı. |

**Girdi.** `GET`, `HEAD` ve `DELETE` isteklerinde girdi adres parametreleridir, ötekilerde JSON gövdedir. Şemada olmayan alan doğrulama hatasıdır.

**İstek sınırı.** Her uç bir sınır seçer. Sayaç uç ve istemci adresi başınadır, süre dolunca sıfırlanır.

| Sınır | Sınır değeri |
|---|---|
| `genel` | 60 saniyede 120 istek |
| `siki` | 60 saniyede 5 istek (giriş, şifre sıfırlama gibi hassas uçlar) |

**İzin.** Herkese açık girişteki uçların izni `herkese-acik`tır. Öteki girişlerdeki uçlar izin kaydındaki bir izni ister (`cekirdek/kayitlar/izinler.ts`, kart 0026).

## Herkese açık

### GET /kapi/herkese-acik/saglik

Uygulamanın ve veritabanının ayakta olup olmadığını ve çalışan çekirdek sürümünü söyler. Yayın komutu ve zamanlanmış kontroller siteyi bununla yoklar. Kişisel veri döndürmez.

- İzin: `herkese-acik`. Sınır: `genel`.
- Girdi: yok. Adres parametresi verilirse `dogrulama`.
- Servis: `cekirdek/izleme/saglik.ts`.

Başarılı (200):

```json
{ "basarili": true, "veri": { "uygulama": "ayakta", "veritabani": "ayakta", "cekirdekSurumu": "0.1.0" } }
```

Veritabanına ulaşılamazsa (503):

```json
{ "basarili": false, "hata": { "kod": "hizmet-kullanilamiyor", "ayrinti": { "uygulama": "ayakta", "veritabani": "kapali", "cekirdekSurumu": "0.1.0" } } }
```

Veritabanı 5 saniye içinde cevap vermezse yanıt 503 olur.
