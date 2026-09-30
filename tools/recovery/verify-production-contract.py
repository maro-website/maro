"""Catalog-only production compatibility check. Never calls financial RPCs.

Requires pg8000 in a separate verification runtime, a trusted Supabase CA bundle,
and an existing credential file. Credentials are never emitted or copied.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import re
import ssl
import sys

import pg8000.dbapi

PROJECT = "pbhzobqpavkuttdipjaq"
FUNCTIONS = [
    "reserve_credits", "release_credit_reserve", "finalize_credit_charge",
    "v1_image_lifecycle_version", "start_v1_image_job",
    "mark_v1_image_provider_result", "persist_v1_image_generation",
    "v1_image_success_evidence", "settle_v1_image_job", "fail_v1_image_job",
    "reconcile_generation_job", "reconcile_stale_generation_jobs",
    "guard_generation_job_transition", "admin_v1_operations",
    "admin_publish_v1_prompt", "fulfill_commerce_order", "cancel_credit_order",
    "fulfill_non_paddle_commerce_order", "cancel_non_paddle_credit_order",
    "apply_paddle_event", "create_paddle_order", "maro_mcp_custom_access_token_hook",
]
TABLES = [
    "profiles", "generation_jobs", "generations", "credit_transactions",
    "credit_orders", "memberships", "workspaces", "generation_internal_prompts",
    "paddle_webhook_events", "pricing_snapshots",
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--credentials", required=True, type=pathlib.Path)
    parser.add_argument("--ca", required=True, type=pathlib.Path)
    parser.add_argument("--output", required=True, type=pathlib.Path)
    args = parser.parse_args()
    keys = {}
    for line in args.credentials.read_text().splitlines():
        match = re.match(r'^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$', line)
        if match:
            keys[match[1]] = match[2].strip().strip("\"'")
    password = keys.get("PADDLE_PRODUCTION_DB_PASSWORD")
    if not password:
        raise RuntimeError("missing_existing_production_database_password")
    tls = ssl.create_default_context(cafile=str(args.ca))
    # The official Supabase Root 2021 CA lacks a key-usage extension. Python
    # 3.13+ enables X509_STRICT by default; retain chain/signature and hostname
    # verification while allowing that legacy root's extension format.
    tls.verify_flags &= ~ssl.VERIFY_X509_STRICT
    if tls.verify_mode != ssl.CERT_REQUIRED or not tls.check_hostname:
        raise RuntimeError("verified_tls_required")
    connection = pg8000.dbapi.connect(
        user="postgres", password=password, host=f"db.{PROJECT}.supabase.co",
        database="postgres", port=5432, timeout=15,
        ssl_context=tls,
    )
    try:
        connection.autocommit = True
        cursor = connection.cursor()
        cursor.execute("BEGIN TRANSACTION READ ONLY")
        cursor.execute("SET LOCAL statement_timeout = '15s'")
        cursor.execute("SELECT current_setting('transaction_read_only'), version()")
        read_only, server_version = cursor.fetchone()
        if read_only != "on":
            raise RuntimeError("readonly_transaction_not_confirmed")

        def query(sql, params=()):
            cursor.execute(sql, params)
            columns = [column[0] for column in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

        functions = query("""
            SELECT p.proname AS name, p.oid::regprocedure::text AS signature,
              pg_get_function_identity_arguments(p.oid) AS identity_arguments,
              pg_get_function_result(p.oid) AS result, p.prosrc AS body,
              pg_get_functiondef(p.oid) AS definition, md5(p.prosrc) AS body_md5,
              p.prosecdef AS security_definer, p.proconfig AS config,
              pg_get_userbyid(p.proowner) AS owner, p.proacl::text AS acl,
              has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
              has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
              has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
            FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname=ANY(%s)
            ORDER BY p.proname,p.oid
        """, (FUNCTIONS,))
        triggers = query("""
            SELECT n.nspname AS schema,c.relname AS table,t.tgname AS name,
              t.tgenabled AS enabled,pg_get_triggerdef(t.oid) AS definition,
              p.proname AS function
            FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace
            JOIN pg_proc p ON p.oid=t.tgfoid
            WHERE NOT t.tgisinternal AND n.nspname='public' AND c.relname=ANY(%s)
            ORDER BY c.relname,t.tgname
        """, (TABLES,))
        indexes = query("SELECT schemaname AS schema,tablename AS table,indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname='public' AND tablename=ANY(%s) ORDER BY tablename,indexname", (TABLES,))
        constraints = query("SELECT c.relname AS table,k.conname AS name,k.contype AS type,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(%s) ORDER BY c.relname,k.conname", (TABLES,))
        policies = query("SELECT schemaname,tablename,policyname,permissive,roles::text,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname")
        rls = query("SELECT n.nspname AS schema,c.relname AS table,c.relrowsecurity AS enabled,c.relforcerowsecurity AS forced FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY(%s)", (TABLES,))
        columns = query("SELECT table_name,column_name,data_type,udt_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY(%s) ORDER BY table_name,ordinal_position", (TABLES,))
        ledger = query("SELECT version,name,cardinality(statements) AS statements_count FROM supabase_migrations.schema_migrations ORDER BY version")
        model_rows = query("SELECT id::text,tool_id,model_id,provider,display_name,enabled,is_default,coming_soon,sort_order,metadata,cost_metadata,updated_at::text FROM public.tool_model_configs WHERE tool_id IN ('maro_imazh','maro_logo') AND model_id IN ('flare','sunburst') ORDER BY tool_id,sort_order")
        prompt_summary = query("SELECT tool_id,count(*) AS live_count,min(length(trim(content))) AS minimum_content_length FROM public.system_prompt_versions WHERE tool_id IN ('maro_imazh','maro_logo') AND status='live' GROUP BY tool_id ORDER BY tool_id")
        logo_content = query("SELECT logo_wizard_content FROM public.app_settings WHERE id=1")
        cursor.execute("ROLLBACK")
    finally:
        connection.close()

    root = pathlib.Path(__file__).resolve().parents[2]
    expected = {}
    pattern = re.compile(r'create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_][a-z_0-9]*)\s*\((.*?)\)\s*(.*?)\bas\s+(\$(?:[A-Za-z_]\w*)?\$)(.*?)\4\s*;', re.I | re.S)
    for file in sorted((root / "supabase/migrations").glob("*.sql")):
        for match in pattern.finditer(file.read_text(encoding="utf-8")):
            expected[match[1]] = {"body": match[5].replace("\r\n", "\n").strip(), "migration": file.name}
    comparisons = []
    for function in functions:
        reference = expected.get(function["name"])
        if reference:
            comparisons.append({
                "name": function["name"], "signature": function["signature"],
                "golden_migration": reference["migration"],
                "body_exact_except_edge_whitespace": reference["body"] == function["body"].replace("\r\n", "\n").strip(),
                "live_body_md5": function["body_md5"],
                "anon_execute": function["anon_execute"],
                "authenticated_execute": function["authenticated_execute"],
                "service_execute": function["service_execute"],
            })
    evidence = {
        "checked_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "production_project": PROJECT, "transaction_read_only": read_only,
        "tls_ca_and_hostname_verified": True,
        "tls_root_compatibility": "Official Supabase CA; X509_STRICT off for legacy missing key-usage extension; CERT_REQUIRED and hostname checks on.",
        "server_version": server_version,
        "queries": "Catalog and non-user product-configuration SELECTs only; prompt counts/lengths only; no financial RPC or user rows; explicit ROLLBACK.",
        "functions": functions, "triggers": triggers, "indexes": indexes,
        "constraints": constraints, "policies": policies, "rls": rls,
        "columns": columns, "migration_ledger": ledger,
        "golden_body_comparison": comparisons,
        "v1_product_configuration": {"models": model_rows, "published_prompt_summary": prompt_summary, "logo_content": logo_content},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(evidence, indent=2, default=str) + "\n"
    args.output.write_text(encoded, encoding="utf-8")
    print(json.dumps({"read_only": read_only, "functions": len(functions),
                      "golden_body_comparison": comparisons, "ledger": ledger,
                      "evidence_sha256": hashlib.sha256(encoded.encode()).hexdigest()}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        # Never render raw authentication/connection exceptions or credential values.
        state = error.args[0].get("C") if error.args and isinstance(error.args[0], dict) else None
        print(json.dumps({"verification": "FAILED", "error_type": type(error).__name__,
                          "sqlstate": state, "tls_verify_code": getattr(error, "verify_code", None),
                          "tls_verify_reason": getattr(error, "verify_message", None)}))
        sys.exit(1)
