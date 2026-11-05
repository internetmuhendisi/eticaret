# Yedek betiklerinin ortak parçası (kart 0024, karar 0037). gece.sh ve komutlar/yedek.mts'in sunucuda
# çalıştırdığı betikler bunu okur. Değer taşımaz: depo anahtarı gizli bilgi klasöründeki rclone
# ayarındadır (0400, kök), kutuya salt okunur bağlanır ve komut satırında görünmez.
K="${YEDEK_KOKU:-/srv/altyapi/yedek}"
G="${GIZLI_KOKU:-/srv/altyapi/gizli}"
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
