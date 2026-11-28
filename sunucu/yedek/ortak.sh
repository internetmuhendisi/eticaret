# Yedek betiklerinin ortak parçası (kart 0024, karar 0037). gece.sh ve komutlar/yedek.mts'in sunucuda
# çalıştırdığı betikler bunu okur. Değer taşımaz: depo anahtarı gizli bilgi klasöründeki rclone
# ayarındadır (0400, kök), kutuya salt okunur bağlanır ve komut satırında görünmez.
K="${YEDEK_KOKU:-/srv/altyapi/yedek}"
G="${GIZLI_KOKU:-/srv/altyapi/gizli}"
D="${DOSYA_KOKU:-/srv/altyapi/dosyalar}"
# shellcheck disable=SC1091
. "$K/ayar"

# rc <ortam> <rclone argümanları>. RC_BAGLA verilirse o klasör kutuya bağlanır.
rc() {
  local ortam="$1"
  shift
  docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges:true --tmpfs /tmp \
    ${RC_BAGLA:+-v "$RC_BAGLA"} \
    -v "$G/$ortam/altyapi--yedek-deposu/rclone.conf:/run/secrets/rclone.conf:ro" \
    "$RCLONE_GORUNTUSU" --config /run/secrets/rclone.conf --cache-dir /tmp "$@" </dev/null
}

# kayit <ortam> <site> <tür> <sonuç> <sebep> <dosya> <boyut>. Sebepler sabit sözcüklerdir, kayıtta
# gizli bilgi ya da müşteri verisi yoktur.
kayit() {
  printf '{"zaman":"%s","ortam":"%s","site":"%s","tur":"%s","sonuc":"%s","sebep":"%s","dosya":"%s","boyut":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$@" >>"$K/kayit.jsonl"
}

# Depodaki dosya kopyaları (kart 0093, karar 0207): her dosya depoda "<ad>.<YYYYMMDDTHHMMSSZ>.age" adıyla bir ya
# da birkaç kez durur. Çıktı satır başına "<ad> <en yeni kopyanın zamanı>". Liste okunamazsa hata döner.
depodaki_dosyalar() {
  local liste
  liste="$(rc "$1" lsf -R --files-only --include 'dosyalar/**' "depo:$KOVA/$1/$2")" || return 1
  printf '%s\n' "$liste" | awk '
    { sub(/^dosyalar\//, "") }
    match($0, /\.[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z\.age$/) {
      ad = substr($0, 1, RSTART - 1); z = substr($0, RSTART + 1, 16)
      if (z > en[ad]) en[ad] = z
    }
    END { for (ad in en) print ad, en[ad] }' | sort
}

# Sitenin dosya adı biçimi: kaydın kimliği ve türün uzantısı (karar 0058). Geçici adlar (.yaziliyor) dışarıda kalır.
DOSYA_ADI='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$'
