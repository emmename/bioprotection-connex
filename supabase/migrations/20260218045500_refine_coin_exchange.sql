CREATE OR REPLACE FUNCTION public.exchange_coins_to_points(p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  -- Settings variables
  v_is_active BOOLEAN;
  v_min_coins INTEGER;
  v_max_daily INTEGER;
  v_rate INTEGER; -- Coins per 1 Point
  
  -- Calculation variables
  v_points_to_receive INTEGER;
  v_coins_to_deduct INTEGER;
  v_current_coins INTEGER;
  v_daily_spent INTEGER;
  v_profile_id UUID;
BEGIN
  -- 1. Fetch System Settings
  SELECT value::BOOLEAN INTO v_is_active FROM public.system_settings WHERE key = 'exchange_is_active';
  SELECT value::INTEGER INTO v_min_coins FROM public.system_settings WHERE key = 'exchange_min_coins';
  SELECT value::INTEGER INTO v_max_daily FROM public.system_settings WHERE key = 'exchange_max_daily_coins';
  SELECT value::INTEGER INTO v_rate FROM public.system_settings WHERE key = 'coins_per_point';

  -- Set defaults if missing
  IF v_is_active IS NULL THEN v_is_active := true; END IF;
  IF v_min_coins IS NULL THEN v_min_coins := 100; END IF;
  IF v_max_daily IS NULL THEN v_max_daily := 5000; END IF;
  IF v_rate IS NULL OR v_rate <= 0 THEN v_rate := 1; END IF;

  -- 2. System Checks
  IF v_is_active = false THEN
    RETURN jsonb_build_object('success', false, 'message', 'ระบบแลกคะแนนปิดปรับปรุงชั่วคราว');
  END IF;

  IF p_amount < v_min_coins THEN
    RETURN jsonb_build_object('success', false, 'message', 'ต้องแลกขั้นต่ำ ' || v_min_coins || ' เหรียญ');
  END IF;

  -- 3. Calculate Logic (Coins per Point)
  -- Example: Rate=10, Amount=15 -> Points=1, Deduct=10.
  v_points_to_receive := FLOOR(p_amount::decimal / v_rate::decimal)::INTEGER;
  v_coins_to_deduct := v_points_to_receive * v_rate;

  IF v_points_to_receive < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญไม่พอสำหรับแลก 1 คะแนน (อัตรา ' || v_rate || ' เหรียญ = 1 คะแนน)');
  END IF;

  -- 4. Get Profile & Check Balance
  SELECT id, total_coins INTO v_profile_id, v_current_coins 
  FROM public.profiles 
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบข้อมูลผู้ใช้');
  END IF;

  IF v_current_coins < v_coins_to_deduct THEN
    RETURN jsonb_build_object('success', false, 'message', 'เหรียญสะสมไม่พอ');
  END IF;

  -- 5. Check Daily Limit (Only if v_max_daily > 0)
  IF v_max_daily > 0 THEN
    SELECT COALESCE(SUM(amount), 0)::INTEGER INTO v_daily_spent
    FROM public.coins_transactions
    WHERE profile_id = v_profile_id
        AND transaction_type = 'spend'
        AND source = 'exchange_to_points'
        AND DATE(created_at) = CURRENT_DATE;

    IF (v_daily_spent + v_coins_to_deduct) > v_max_daily THEN
        RETURN jsonb_build_object('success', false, 'message', 'เกินโควตาแลกเหรียญต่อวัน (เหลือโควตา ' || (v_max_daily - v_daily_spent) || ' เหรียญ)');
    END IF;
  END IF;

  -- 6. Perform Transaction
  -- Update Profile
  UPDATE public.profiles
  SET 
    total_coins = total_coins - v_coins_to_deduct,
    total_points = total_points + v_points_to_receive,
    updated_at = now()
  WHERE id = v_profile_id;

  -- Log Coin Transaction (Spend)
  INSERT INTO public.coins_transactions (
    profile_id, 
    amount, 
    transaction_type, 
    source, 
    description
  ) VALUES (
    v_profile_id, 
    v_coins_to_deduct, 
    'spend', 
    'exchange_to_points', 
    'แลกเป็น ' || v_points_to_receive || ' คะแนน'
  );

  -- Log Point Transaction (Earn)
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
    'แลกจาก ' || v_coins_to_deduct || ' เหรียญ'
  );
  
  -- Notification
  INSERT INTO public.notifications (
    profile_id, 
    title, 
    message, 
    type, 
    link
  ) VALUES (
    v_profile_id,
    'แลกคะแนนสำเร็จ!',
    'ใช้ ' || v_coins_to_deduct || ' เหรียญ ได้รับ ' || v_points_to_receive || ' คะแนน',
    'success',
    '/history'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'แลกสำเร็จ! ได้รับ ' || v_points_to_receive || ' คะแนน',
    'points_received', v_points_to_receive,
    'coins_deducted', v_coins_to_deduct
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', 'เกิดข้อผิดพลาด: ' || SQLERRM);
END;
$$;
