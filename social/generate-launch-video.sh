#!/usr/bin/env bash
set -euo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source_image="$root/social/card-square.png"
bold_font="$root/storefront/public/fonts/IBMPlexMono-Bold.ttf"
regular_font="$root/storefront/public/fonts/IBMPlexMono-Regular.ttf"
output="${1:-$root/storefront/public/social/launch.mp4}"

for command in ffmpeg ffprobe; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf '%s is required\n' "$command" >&2
    exit 1
  fi
done

for input in "$source_image" "$bold_font" "$regular_font"; do
  if [[ ! -f "$input" ]]; then
    printf 'missing input: %s\n' "$input" >&2
    exit 1
  fi
done

mkdir -p -- "$(dirname -- "$output")"

ffmpeg -hide_banner -loglevel error -y \
  -loop 1 -framerate 30 -i "$source_image" \
  -f lavfi -i "color=c=#fafaf7:s=1080x1920:r=30:d=8" \
  -filter_complex \
  "[0:v]scale=920:920,zoompan=z='min(zoom+0.00035,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=240:s=920x920:fps=30[card];\
   [1:v][card]overlay=x=80:y=390:shortest=1,\
   drawtext=fontfile='$bold_font':text='THE STORE IS OPEN':fontcolor=#141412:fontsize=64:x=(w-text_w)/2:y=170,\
   drawtext=fontfile='$regular_font':text='A NUMBERED CERTIFICATE.':fontcolor=#141412:fontsize=38:x=(w-text_w)/2:y=1460,\
   drawtext=fontfile='$regular_font':text='NOTHING ELSE OF VALUE.':fontcolor=#141412:fontsize=38:x=(w-text_w)/2:y=1530,\
   drawtext=fontfile='$bold_font':text='LOUSYDEAL.COM':fontcolor=#b3261e:fontsize=54:x=(w-text_w)/2:y=1690,\
   fade=t=in:st=0:d=0.35,fade=t=out:st=7.65:d=0.35,format=yuv420p[v]" \
  -map '[v]' -an -t 8 -r 30 \
  -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.0 \
  -movflags +faststart "$output"

codec="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "$output")"
dimensions="$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$output")"
pixel_format="$(ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt -of csv=p=0 "$output")"
frame_rate="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$output")"
duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$output")"

if [[ "$codec" != "h264" || "$dimensions" != "1080x1920" || "$pixel_format" != "yuv420p" || "$frame_rate" != "30/1" || "$duration" != "8.000000" ]]; then
  printf 'unexpected video properties: %s %s %s %s %s\n' \
    "$codec" "$dimensions" "$pixel_format" "$frame_rate" "$duration" >&2
  exit 1
fi

printf '%s %s %s %s %s\n' \
  "$codec" "$dimensions" "$pixel_format" "$frame_rate" "$duration"
