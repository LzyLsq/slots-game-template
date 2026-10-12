#!/bin/zsh
set -euo pipefail

if [[ $# -lt 3 || $# -gt 6 ]]; then
  print -u2 "usage: $0 PROMPT_FILE OUTPUT_PNG RESPONSE_JSON [transparent|opaque] [WIDTHxHEIGHT] [REFERENCE_PNG]"
  exit 2
fi

prompt_path="$1"
output_path="$2"
response_path="$3"
background="${4:-opaque}"
output_size="${5:-1024x1536}"
request_path="${response_path%.response.json}.request.json"
reference_path="${6:-}"

mkdir -p "${output_path:h}" "${response_path:h}"
jq -n --rawfile prompt "$prompt_path" --arg background "$background" --arg size "$output_size" '{
  model: "gpt-5.6-sol",
  input: [{role: "user", content: [{type: "input_text", text: $prompt}]}],
  tools: [{
    type: "image_generation",
    model: "gpt-image-2",
    quality: "high",
    size: $size,
    output_format: "png",
    background: $background
  }],
  tool_choice: {type: "image_generation"}
}' > "$request_path"

if [[ -n "$reference_path" ]]; then
  base64 < "$reference_path" > "${request_path}.image-base64"
  jq --rawfile image "${request_path}.image-base64" '.input[0].content += [{type:"input_image",image_url:("data:image/png;base64," + ($image | gsub("\\s";"")))}]' "$request_path" > "${request_path}.with-image"
  mv "${request_path}.with-image" "$request_path"
fi

curl -sS --fail-with-body --max-time 900 \
  -X POST "http://127.0.0.1:15721/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROXY_MANAGED" \
  --data-binary "@$request_path" \
  -o "$response_path"

jq -er '.output[] | select(.type == "image_generation_call") | .result' "$response_path" | base64 --decode > "$output_path"
response_id="$(jq -r '.id // "unknown"' "$response_path")"
dimensions="$(sips -g pixelWidth -g pixelHeight "$output_path" 2>/dev/null | awk '/pixelWidth|pixelHeight/ {printf "%s%s", separator, $2; separator="x"}')"
print "generated ${output_path} (${dimensions}, ${response_id})"
