\set app_user `echo "$APP_DB_USER"`

CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO :"app_user";
