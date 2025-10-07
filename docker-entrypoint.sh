#!/bin/sh

# Check if we have an output directory (Docker Compose mode)
OUTPUT_DIR="${OUTPUT_DIR:-/output}"

echo "Starting frontend processing..."
echo "Source directory: /usr/share/nginx/html"
echo "Output directory: $OUTPUT_DIR"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Copy all files to output directory first
echo "Copying frontend assets..."
cp -r /usr/share/nginx/html/* "$OUTPUT_DIR/"

# Set up environment variables for replacement
API_HOST_VALUE="${API_HOST:-http://localhost:3000}"
API_PATH_PREFIX_VALUE="${API_PATH_PREFIX:-/api/}"
FRONTEND_HOST_VALUE="${FRONTEND_HOST:-http://localhost:5173}"
STATIC_HOST_VALUE="${STATIC_HOST:-https://static.example.com}"
BASE_URL_VALUE="${BASE_URL:-/}"
OAUTH_PROVIDERS_VALUE="${OAUTH_PROVIDERS:-''}"
BRAND_NAME_VALUE="${BRAND_NAME:-BakLab}"

# Process files in the output directory with environment variable replacement
echo "Processing files with environment variables..."
find "$OUTPUT_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec sh -c '
  API_HOST_VALUE="'"$API_HOST_VALUE"'"
  API_PATH_PREFIX_VALUE="'"$API_PATH_PREFIX_VALUE"'"
  FRONTEND_HOST_VALUE="'"$FRONTEND_HOST_VALUE"'"
  STATIC_HOST_VALUE="'"$STATIC_HOST_VALUE"'"
  OAUTH_PROVIDERS_VALUE="'"$OAUTH_PROVIDERS_VALUE"'"
  BASE_URL_VALUE="'"$BASE_URL_VALUE"'"
  BRAND_NAME_VALUE="'"$BRAND_NAME_VALUE"'"

  for file do
    # Use temporary file for safe replacement
    temp_file="${file}.tmp"

    sed "
      s|__API_HOST_PLACEHOLDER__|${API_HOST_VALUE}|g
      s|__API_PATH_PREFIX_PLACEHOLDER__|${API_PATH_PREFIX_VALUE}|g
      s|__FRONTEND_HOST_PLACEHOLDER__|${FRONTEND_HOST_VALUE}|g
      s|__STATIC_HOST_PLACEHOLDER__|${STATIC_HOST_VALUE}|g
      s|__OAUTH_PROVIDERS_PLACEHOLDER__|${OAUTH_PROVIDERS_VALUE}|g
      s|/__BASE_URL_PLACEHOLDER__/|${BASE_URL_VALUE}|g
      s|__BRAND_NAME_PLACEHOLDER__|${BRAND_NAME_VALUE}|g
    " "$file" > "$temp_file" && mv "$temp_file" "$file" || {
      echo "Warning: Could not process $file"
      rm -f "$temp_file"
    }
  done
' sh {} +

# Verify environment variable replacement worked
echo "Environment variable replacement summary:"
if grep -q "__.*_PLACEHOLDER__" "$OUTPUT_DIR"/*.js 2>/dev/null; then
  echo "Warning: Some placeholders may not have been replaced"
  grep -o "__.*_PLACEHOLDER__" "$OUTPUT_DIR"/*.js 2>/dev/null | head -5
else
  echo "All placeholders appear to have been replaced successfully"
fi

# Generate frontend resource manifest for baklab-setup consumption
echo "Generating frontend resource manifest..."

# Extract asset paths from processed index.html
FRONTEND_SCRIPTS=""
FRONTEND_STYLES=""

if [ -f "$OUTPUT_DIR/index.html" ]; then
  # Extract processed script and style references
  FRONTEND_SCRIPTS=$(grep -o 'src="[^"]*\.js"' "$OUTPUT_DIR/index.html" | sed 's/src="//' | sed 's/"$//' | tr '\n' ',' | sed 's/,$//')
  FRONTEND_STYLES=$(grep -o 'href="[^"]*\.css"' "$OUTPUT_DIR/index.html" | sed 's/href="//' | sed 's/"$//' | tr '\n' ',' | sed 's/,$//')
fi

# Write comprehensive manifest for baklab-setup
cat > "$OUTPUT_DIR/.frontend-manifest.json" << EOF
{
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseUrl": "${BASE_URL_VALUE}",
  "assets": {
    "scripts": "$FRONTEND_SCRIPTS",
    "styles": "$FRONTEND_STYLES"
  },
  "envVarsReplaced": {
    "API_HOST": "${API_HOST_VALUE}",
    "API_PATH_PREFIX": "${API_PATH_PREFIX_VALUE}",
    "FRONTEND_HOST": "${FRONTEND_HOST_VALUE}",
    "STATIC_HOST": "${STATIC_HOST_VALUE}",
    "BASE_URL": "${BASE_URL_VALUE}",
    "BRAND_NAME": "${BRAND_NAME_VALUE}"
  }
}
EOF

echo "Frontend resource manifest generated:"
cat "$OUTPUT_DIR/.frontend-manifest.json"

echo "Frontend processing complete!"

# Execute the main command
exec "$@"
