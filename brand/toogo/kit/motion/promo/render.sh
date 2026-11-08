#!/bin/zsh
# Renders the Toogo promo in Hebrew and English: 750 frames each (25 s at 30 fps), then 1080x1920 MP4s.
# Needs Google Chrome and ffmpeg. Change timings or copy in build.py, then run: ./render.sh  (or ./render.sh he)
set -e
cd "${0:A:h}"
python3 build.py
for lang in ${@:-he en}; do
  F=$(mktemp -d)
  seq 0 749 | xargs -P 8 -I{} ./shot.sh {} $lang $F
  n=$(ls $F/f*.png | wc -l | tr -d ' ')
  [[ $n == 750 ]] || { echo "only $n of 750 frames rendered for $lang"; exit 1; }
  ffmpeg -loglevel error -y -framerate 30 -i $F/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow \
    -movflags +faststart ../toogo-promo-$lang-9x16.mp4
  rm -rf $F
  echo "done: toogo-promo-$lang-9x16.mp4"
done
