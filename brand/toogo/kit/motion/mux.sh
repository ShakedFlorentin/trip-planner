#!/bin/zsh
# Adds the synthesised soundtrack (sound.py, normalised to -14 LUFS, -1 dBTP) to every Toogo video in this folder.
# Run after render.sh / promo/render.sh. The picture is copied as is; only the audio track is replaced.
set -e
cd "${0:A:h}"
T=$(mktemp -d)
for score in promo logo; do
  python3 sound.py $score $T/$score.wav >/dev/null
  ffmpeg -loglevel error -y -i $T/$score.wav -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 $T/$score-n.wav
done
for v in toogo-promo-*.mp4 toogo-logo-*.mp4; do
  score=${${v#toogo-}%%-*}
  ffmpeg -loglevel error -y -i $v -i $T/$score-n.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest \
    -movflags +faststart $T/out.mp4 && mv $T/out.mp4 $v
  echo "sound added: $v"
done
rm -rf $T
