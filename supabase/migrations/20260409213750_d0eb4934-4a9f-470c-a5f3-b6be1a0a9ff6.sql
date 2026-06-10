
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_recipient ON public.notifications (recipient_id, is_read, created_at DESC);

-- Trigger: notify facility admins when a new referral arrives
CREATE OR REPLACE FUNCTION public.notify_facility_on_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _facility_name text;
  _admin_record record;
BEGIN
  SELECT facility_name INTO _facility_name
  FROM public.facilities WHERE id = NEW.facility_id;

  FOR _admin_record IN
    SELECT user_id FROM public.facility_users WHERE facility_id = NEW.facility_id
  LOOP
    INSERT INTO public.notifications (recipient_id, notification_type, title, message, metadata)
    VALUES (
      _admin_record.user_id,
      'new_referral',
      'New Patient Referral',
      'A new self-assessment referral has been matched to ' || COALESCE(_facility_name, 'your facility') || '. Please review it in your dashboard.',
      jsonb_build_object('referral_id', NEW.id, 'facility_id', NEW.facility_id, 'session_id', NEW.session_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_facility_on_referral
  AFTER INSERT ON public.facility_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_facility_on_referral();

-- Trigger: notify all admins when a new facility registers
CREATE OR REPLACE FUNCTION public.notify_admins_on_facility_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_record record;
BEGIN
  IF NEW.approval_status = 'pending' THEN
    FOR _admin_record IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (recipient_id, notification_type, title, message, metadata)
      VALUES (
        _admin_record.user_id,
        'facility_registration',
        'New Facility Registration',
        'A new facility "' || NEW.facility_name || '" in ' || NEW.region || ' has registered and is awaiting approval.',
        jsonb_build_object('facility_id', NEW.id, 'facility_name', NEW.facility_name, 'region', NEW.region)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_on_facility_registration
  AFTER INSERT ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_facility_registration();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
