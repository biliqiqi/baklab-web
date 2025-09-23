#!/bin/sh

# Replace environment variables in JavaScript files
find /usr/share/nginx/html -name "*.js" -exec sh -c '
  for file do
    # Create temporary file
    temp_file=$(mktemp)

    # Use envsubst to replace variables and write to temp file
    envsubst < "$file" > "$temp_file"

    # Replace original file with processed content
    mv "$temp_file" "$file"
  done
' sh {} +

# Replace environment variables in CSS files (in case there are any)
find /usr/share/nginx/html -name "*.css" -exec sh -c '
  for file do
    temp_file=$(mktemp)
    envsubst < "$file" > "$temp_file"
    mv "$temp_file" "$file"
  done
' sh {} +

# Replace environment variables in HTML files
find /usr/share/nginx/html -name "*.html" -exec sh -c '
  for file do
    temp_file=$(mktemp)
    envsubst < "$file" > "$temp_file"
    mv "$temp_file" "$file"
  done
' sh {} +

# Start the main process
exec "$@"