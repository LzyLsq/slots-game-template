#!/bin/zsh
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  print -u2 "usage: $0 OUTPUT_PNG PROMPT [opaque|transparent]"
  exit 2
fi

output_path="$1"
prompt_text="$2"
background_mode="${3:-opaque}"
response_path="$(mktemp -t tidal-kingdom-image.XXXXXX.json)"
request_path="$(mktemp -t tidal-kingdom-request.XXXXXX.json)"

cleanup() {
  rm -f "$response_path" "$request_path"
}
trap cleanup EXIT

jq -n \
  --arg model "gpt-5.6-sol" \
  --arg input "$prompt_text" \
  '{
    model: $model,
    input: $input,
    tools: [{type: "image_generation"}],
    tool_choice: {type: "image_generation"}
  }' > "$request_path"

curl -sS --fail-with-body --max-time 600 \
  -X POST "http://127.0.0.1:15721/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-cc-switch" \
  --data-binary "@$request_path" \
  -o "$response_path"

mkdir -p "${output_path:h}"
jq -er '.output[] | select(.type == "image_generation_call") | .result' "$response_path" \
  | base64 --decode > "$output_path"

response_id="$(jq -r '.id // "unknown"' "$response_path")"
dimensions="$(sips -g pixelWidth -g pixelHeight "$output_path" 2>/dev/null | awk '/pixelWidth|pixelHeight/ {printf "%s%s", separator, $2; separator="x"}')"
print "generated ${output_path} (${dimensions}, ${response_id})"
