-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings
CREATE POLICY "Anyone can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default exchange rate (1 Coin = 1 Point by default, adjustable)
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('coins_to_points_ratio', '1', 'Number of points received for 1 coin');

-- Function to exchange coins for points
CREATE OR REPLACE FUNCTION public.exchange_coins_to_points(p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rate INTEGER;
  v_points_to_receive INTEGER;
  v_current_coins INTEGER;
  v_settings_record RECORD;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'จำนวนเหรียญต้องมากกว่า 0');
  END IF;

  -- Get current exchange rate
  SELECT value::INTEGER INTO v_rate
  FROM public.system_settings
  WHERE key = 'coins_to_points_ratio';

  IF v_rate IS NULL THEN
    -- Fallback default
    v_rate := 1;
  END IF;

  v_points_to_receive := p_amount * v_rate;

  -- Check user's coin balance
  SELECT total_coins INTO v_current_coins
  FROM public.profiles
  WHERE id = (SELECT id FROM public.profiles WHERE user_id = v_user_id);

  IF v_current_coins IS NULL OR v_current_coins < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญไม่พอสำหรับแลก');
  END IF;

  -- Perform transaction
  -- 1. Deduct coins
  -- 2. Add points
  -- 3. Record transactions
  
  -- Get owner profile id
  DECLARE
    v_profile_id UUID;
  BEGIN
    SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id;

    -- Update profile
    UPDATE public.profiles
    SET 
      total_coins = total_coins - p_amount,
      total_points = total_points + v_points_to_receive,
      updated_at = now()
    WHERE id = v_profile_id;

    -- Record Coin transaction (Spend)
    INSERT INTO public.coins_transactions (
      profile_id, 
      amount, 
      transaction_type, 
      source, 
      description
    ) VALUES (
      v_profile_id, 
      p_amount, 
      'spend', 
      'exchange_to_points', 
      'แลกเป็น ' || v_points_to_receive || ' คะแนน'
    );

    -- Record Point transaction (Earn)
    INSERT INTO public.points_transactions (
      profile_id, 
      amount, 
      transaction_type, 
      source, 
      description
    ) VALUES (
      v_profile_id, 
      v_points_to_receive, 
      'earn', 
      'exchange_from_coins', 
      'แลกจาก ' || p_amount || ' เหรียญ'
    );
    
    -- Create notification
    INSERT INTO public.notifications (
      profile_id, 
      title, 
      message, 
      type, 
      link
    ) VALUES (
      v_profile_id,
      'แลกคะแนนสำเร็จ!',
      'คุณใช้ ' || p_amount || ' เหรียญ แลกได้รับ ' || v_points_to_receive || ' คะแนน',
      'success',
      '/points-history'
    );

  END;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'แลกคะแนนสำเร็จ! คุณได้รับ ' || v_points_to_receive || ' คะแนน',
    'points_received', v_points_to_receive
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'เกิดข้อผิดพลาด: ' || SQLERRM);
END;
$$;
