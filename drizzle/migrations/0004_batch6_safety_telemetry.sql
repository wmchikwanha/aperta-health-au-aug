
ALTER TABLE public.ai_inference_events ADD COLUMN IF NOT EXISTS latency_ms integer;

CREATE TABLE public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','warning','info')),
  message text NOT NULL,
  source_function text,
  metadata jsonb NOT NULL DEFAULT '{}',
  patient_id uuid,
  recipient_id uuid,
  dedupe_key text UNIQUE,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  acknowledgement_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.system_alerts TO authenticated;
GRANT ALL ON public.system_alerts TO service_role;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins or recipient read alerts" ON public.system_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR recipient_id = auth.uid());
CREATE POLICY "Admins or recipient acknowledge alerts" ON public.system_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR recipient_id = auth.uid())
  WITH CHECK (acknowledged_by = auth.uid());
CREATE INDEX system_alerts_open_idx ON public.system_alerts (created_at DESC) WHERE resolved_at IS NULL;

CREATE TABLE public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL CHECK (char_length(message) <= 2000),
  stack_trace text CHECK (char_length(stack_trace) <= 8000),
  user_id uuid,
  url text CHECK (char_length(url) <= 500),
  user_agent text CHECK (char_length(user_agent) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own errors" ON public.error_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND source = 'client');
CREATE POLICY "Admins read errors" ON public.error_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Critical alerts notify every admin in-app
CREATE OR REPLACE FUNCTION public.notify_on_system_alert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record;
BEGIN
  IF NEW.recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, notification_type, title, message, metadata)
    VALUES (NEW.recipient_id, 'system_alert', initcap(NEW.severity) || ': ' || replace(NEW.alert_type,'_',' '), NEW.message,
            jsonb_build_object('alert_id', NEW.id, 'patient_id', NEW.patient_id));
  END IF;
  IF NEW.severity = 'critical' THEN
    FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (recipient_id, notification_type, title, message, metadata)
      VALUES (r.user_id, 'system_alert', 'CRITICAL: ' || replace(NEW.alert_type,'_',' '), NEW.message,
              jsonb_build_object('alert_id', NEW.id, 'patient_id', NEW.patient_id));
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER system_alerts_notify AFTER INSERT ON public.system_alerts FOR EACH ROW EXECUTE FUNCTION public.notify_on_system_alert();

-- Reliable-change deterioration: PHQ-9 rise >= 5, GAD-7 rise >= 4 vs previous score
CREATE OR REPLACE FUNCTION public.check_score_deterioration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _norm text := upper(regexp_replace(NEW.tool_type,'[^A-Za-z0-9]','','g'));
  _threshold int; _prev int; _owner uuid;
BEGIN
  _threshold := CASE _norm WHEN 'PHQ9' THEN 5 WHEN 'GAD7' THEN 4 ELSE NULL END;
  IF _threshold IS NULL THEN RETURN NEW; END IF;
  SELECT total_score INTO _prev FROM public.screening_assessments
   WHERE patient_id = NEW.patient_id AND id <> NEW.id
     AND upper(regexp_replace(tool_type,'[^A-Za-z0-9]','','g')) = _norm
     AND administered_at <= NEW.administered_at
   ORDER BY administered_at DESC LIMIT 1;
  IF _prev IS NULL OR NEW.total_score - _prev < _threshold THEN RETURN NEW; END IF;
  SELECT user_id INTO _owner FROM public.patients WHERE id = NEW.patient_id;
  INSERT INTO public.system_alerts (alert_type, severity, message, source_function, metadata, patient_id, recipient_id, dedupe_key)
  VALUES ('clinical_deterioration', 'warning',
    'Reliable deterioration on ' || NEW.tool_type || ': ' || _prev || ' → ' || NEW.total_score || '. Clinician review recommended.',
    'check_score_deterioration',
    jsonb_build_object('tool', NEW.tool_type, 'previous', _prev, 'current', NEW.total_score, 'threshold', _threshold, 'screening_id', NEW.id),
    NEW.patient_id, _owner, 'deterioration:' || NEW.id)
  ON CONFLICT (dedupe_key) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER screening_deterioration_check AFTER INSERT ON public.screening_assessments FOR EACH ROW EXECUTE FUNCTION public.check_score_deterioration();

-- Crisis pathway failure: PHQ-9 item 9 >= 1 with no crisis record or referral within 30 minutes
CREATE OR REPLACE FUNCTION public.check_crisis_pathway_failures()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.system_alerts (alert_type, severity, message, source_function, metadata, patient_id, dedupe_key)
  SELECT 'crisis_pathway_failure', 'critical',
    'PHQ-9 item 9 endorsed but no crisis intervention or referral recorded within 30 minutes.',
    'check_crisis_pathway_failures',
    jsonb_build_object('screening_id', s.id, 'item9', COALESCE(s.responses->>'item9', s.responses->>'q9', s.responses->>'8')),
    s.patient_id, 'crisis_fail:' || s.id
  FROM public.screening_assessments s
  WHERE upper(regexp_replace(s.tool_type,'[^A-Za-z0-9]','','g')) = 'PHQ9'
    AND s.administered_at < now() - interval '30 minutes'
    AND s.administered_at > now() - interval '14 days'
    AND COALESCE(NULLIF(s.responses->>'item9',''), NULLIF(s.responses->>'q9',''), NULLIF(s.responses->>'8',''), '0') ~ '^[0-9]+$'
    AND COALESCE(NULLIF(s.responses->>'item9',''), NULLIF(s.responses->>'q9',''), NULLIF(s.responses->>'8',''), '0')::int >= 1
    AND NOT EXISTS (SELECT 1 FROM public.crisis_interventions c WHERE c.patient_id = s.patient_id AND c.created_at >= s.administered_at - interval '1 day')
    AND NOT EXISTS (SELECT 1 FROM public.referrals r WHERE r.patient_id = s.patient_id AND r.created_at >= s.administered_at - interval '1 day')
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_crisis_pathway_failures() FROM PUBLIC, anon, authenticated;

-- Admin-only aggregated telemetry
CREATE OR REPLACE FUNCTION public.safety_monitor_metrics(_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _since timestamptz := now() - make_interval(days => LEAST(GREATEST(_days,1),365)); res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT jsonb_build_object(
    'function_perf', (SELECT COALESCE(jsonb_agg(x),'[]') FROM (
       SELECT function_name, count(*) AS total,
         round(100.0*avg(CASE WHEN schema_valid THEN 0 ELSE 1 END),1) AS error_rate,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
         percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99
       FROM ai_inference_events WHERE created_at >= _since GROUP BY function_name ORDER BY 2 DESC) x),
    'model_perf', (SELECT COALESCE(jsonb_agg(x),'[]') FROM (
       SELECT COALESCE(model_id,'unknown') AS model_id, count(*) AS total,
         round(100.0*avg(CASE WHEN schema_valid THEN 0 ELSE 1 END),1) AS failure_rate,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50,
         percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95
       FROM ai_inference_events WHERE created_at >= _since GROUP BY 1 ORDER BY 2 DESC) x),
    'scrub_rate', (SELECT round(100.0*avg(CASE WHEN pii_spans_detected>0 THEN 1 ELSE 0 END),1) FROM ai_inference_events WHERE created_at >= _since),
    'injection_rate', (SELECT round(100.0*avg(CASE WHEN injection_detected THEN 1 ELSE 0 END),1) FROM ai_inference_events WHERE created_at >= _since),
    'review_by_fn_lang', (SELECT COALESCE(jsonb_agg(x),'[]') FROM (
       SELECT function_name, COALESCE(language_of_encounter,'unknown') AS language, count(*) AS total,
         count(*) FILTER (WHERE decision='accepted') AS accepted,
         count(*) FILTER (WHERE decision<>'accepted') AS overridden,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY review_time_ms) AS median_review_ms
       FROM ai_reviews WHERE created_at >= _since GROUP BY 1,2) x),
    'confidence_by_lang', (SELECT COALESCE(jsonb_agg(x),'[]') FROM (
       SELECT COALESCE(language_of_input,'unknown') AS language, round(avg(COALESCE(calibrated_confidence, raw_confidence))::numeric,3) AS avg_confidence,
         round(100.0*avg(CASE WHEN clinician_override THEN 1 ELSE 0 END),1) AS override_rate, count(*) AS total
       FROM ai_confidence_log WHERE created_at >= _since GROUP BY 1) x),
    'time_to_approve', (SELECT jsonb_build_object(
         'lt1m', count(*) FILTER (WHERE review_time_ms < 60000),
         'm1_5', count(*) FILTER (WHERE review_time_ms BETWEEN 60000 AND 300000),
         'm5_30', count(*) FILTER (WHERE review_time_ms > 300000 AND review_time_ms <= 1800000),
         'gt30m', count(*) FILTER (WHERE review_time_ms > 1800000),
         'under_10s', count(*) FILTER (WHERE review_time_ms < 10000))
       FROM ai_reviews WHERE created_at >= _since AND review_time_ms IS NOT NULL),
    'crisis', (SELECT jsonb_build_object(
         'open', count(*) FILTER (WHERE resolved_at IS NULL),
         'closed', count(*) FILTER (WHERE resolved_at IS NOT NULL))
       FROM crisis_interventions WHERE created_at >= _since),
    'alerts', (SELECT jsonb_build_object(
         'critical_open', count(*) FILTER (WHERE severity='critical' AND resolved_at IS NULL),
         'warning_open', count(*) FILTER (WHERE severity='warning' AND resolved_at IS NULL),
         'unacknowledged', count(*) FILTER (WHERE acknowledged_at IS NULL))
       FROM system_alerts WHERE created_at >= _since),
    'referral_sla_breaches', (
       (SELECT count(*) FROM referrals WHERE status = 'pending' AND created_at < now() - interval '24 hours')
       + (SELECT count(*) FROM facility_referrals WHERE accepted_at IS NULL AND sla_deadline IS NOT NULL AND sla_deadline < now())),
    'active_users_30m', (SELECT count(DISTINCT actor_id) FROM audit_events WHERE recorded_at >= now() - interval '30 minutes'),
    'client_errors_24h', (SELECT count(*) FROM error_log WHERE created_at >= now() - interval '24 hours'),
    'db_size_mb', round(pg_database_size(current_database())/1048576.0,1),
    'db_connections', (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database())
  ) INTO res;
  RETURN res;
END $$;
REVOKE EXECUTE ON FUNCTION public.safety_monitor_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.safety_monitor_metrics(integer) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_alerts;
