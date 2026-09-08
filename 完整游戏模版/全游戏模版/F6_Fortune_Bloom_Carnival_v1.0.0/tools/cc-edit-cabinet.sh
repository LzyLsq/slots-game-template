#!/bin/zsh
set -euo pipefail

if [[ $# -ne 6 ]]; then
  print -u2 "usage: $0 EDIT_TARGET STYLE_REFERENCE OUTPUT_PNG REQUEST_JSON RESPONSE_JSON PROMPT_FILE"
  exit 2
fi

edit_target="$1"
style_reference="$2"
output_path="$3"
request_path="$4"
response_path="$5"
prompt_path="$6"
target_b64="$(mktemp -t gilded-cabinet-target.XXXXXX.b64)"
reference_b64="$(mktemp -t gilded-cabinet-reference.XXXXXX.b64)"

cleanup() {
  rm -f "$target_b64" "$reference_b64"
}
trap cleanup EXIT

base64 < "$edit_target" | tr -d '\n' > "$target_b64"
base64 < "$style_reference" | tr -d '\n' > "$reference_b64"

mkdir -p "${request_path:h}" "${response_path:h}" "${output_path:h}"
jq -n \
  --rawfile prompt "$prompt_path" \
  --rawfile target "$target_b64" \
  --rawfile reference "$reference_b64" \
  '{
    model: "gpt-5.6-sol",
    input: [{
      role: "user",
      content: [
        {type: "input_text", text: $prompt},
        {type: "input_image", image_url: ("data:image/png;base64," + $target)},
        {type: "input_image", image_url: ("data:image/png;base64," + $reference)}
      ]
    }],
  tools: [{type: "image_generation", model: "gpt-image-2", quality: "high", size: "1024x1536", output_format: "png"}],
    tool_choice: {type: "image_generation"}
  }' > "$request_path"

curl -sS --fail-with-body --max-time 900 \
  -X POST "http://127.0.0.1:15721/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROXY_MANAGED" \
  --data-binary "@$request_path" \
  -o "$response_path"

jq -er '.output[] | select(.type == "image_generation_call") | .result' "$response_path" \
  | base64 --decode > "$output_path"

response_id="$(jq -r '.id // "unknown"' "$response_path")"
dimensions="$(sips -g pixelWidth -g pixelHeight "$output_path" 2>/dev/null | awk '/pixelWidth|pixelHeight/ {printf "%s%s", separator, $2; separator="x"}')"
print "generated ${output_path} (${dimensions}, ${response_id})"
