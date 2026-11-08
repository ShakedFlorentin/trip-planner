#!/bin/zsh
# Renders the Toogo guide in Hebrew and English: 953 frames each (31.75 s at 30 fps), then 1080x1920 MP4s, plus the
# app-sized copies in public/guide/ that the in-app guide plays (src/views/Guide.tsx).
# Needs Google Chrome and ffmpeg. Change timings or copy in build.py, then run: ./render.sh  (or ./render.sh he)
set -e
cd "${0:A:h}"
python3 build.py
FRAMES=953
(( $# )) || set -- he en   # zsh keeps "${@:-he en}" as one word, so the default list is set this way
for lang in "$@"; do
  F=$(mktemp -d)
  seq 0 $((FRAMES - 1)) | xargs -P 8 -I{} ./shot.sh {} $lang $F
  n=$(ls $F/f*.png | wc -l | tr -d ' ')
  [[ $n == $FRAMES ]] || { echo "only $n of $FRAMES frames rendered for $lang"; exit 1; }
  ffmpeg -loglevel error -y -framerate 30 -i $F/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow \
    -movflags +faststart ../toogo-guide-$lang-9x16.mp4
  rm -rf "${F:?}"
  mkdir -p ../../../../../public/guide
  ffmpeg -loglevel error -y -i ../toogo-guide-$lang-9x16.mp4 -vf scale=720:1280 -c:v libx264 -profile:v high -pix_fmt yuv420p \
    -crf 26 -preset slow -an -movflags +faststart ../../../../../public/guide/guide-$lang.mp4
  echo "done: toogo-guide-$lang-9x16.mp4 and public/guide/guide-$lang.mp4"
done
