#!/bin/bash
set -e

# Configure PostgreSQL log level based on DEBUG or DEV mode
if [ "$DEBUG" = "true" ] || [ "$DEV" = "true" ]; then
    LOG_STATEMENT="all"
    echo "DEBUG/DEV mode enabled: Setting log_statement to 'all'"
else
    LOG_STATEMENT="ddl"
    echo "Production mode: Setting log_statement to 'ddl'"
fi

# Use ALTER SYSTEM to change log_statement (persists across restarts)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-EOSQL
    ALTER SYSTEM SET log_statement = '$LOG_STATEMENT';
    SELECT pg_reload_conf();
EOSQL

echo "PostgreSQL log configuration applied: log_statement=$LOG_STATEMENT"
