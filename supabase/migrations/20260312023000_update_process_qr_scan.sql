-- Update the RPC to process QR scan missions with better string matching
CREATE OR REPLACE FUNCTION process_qr_scan(p_qr_text text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission_record record;
  v_mission_found boolean := false;
  v_total_points_awarded integer := 0;
  v_total_coins_awarded integer := 0;
  v_count integer := 0;
BEGIN
  -- We search for active missions of type 'qr_scan' whose qr_code matches exactly or case-insensitive
  FOR v_mission_record IN 
    SELECT id, title, points_reward, coins_reward
    FROM missions
    WHERE is_active = true
      AND mission_type = 'qr_scan'
      AND NULLIF(TRIM(qr_code), '') IS NOT NULL
      AND (
        LOWER(TRIM(qr_code)) = LOWER(TRIM(p_qr_text))
        OR p_qr_text ILIKE '%' || TRIM(qr_code) || '%'
      )
  LOOP
    v_mission_found := true;
    
    -- Check if the user has ALREADY completed this specific mission
    IF NOT EXISTS (SELECT 1 FROM mission_completions WHERE profile_id = p_user_id AND mission_id = v_mission_record.id) THEN
      
      -- Insert completion
      INSERT INTO mission_completions (profile_id, mission_id, status, points_earned, coins_earned)
      VALUES (p_user_id, v_mission_record.id, 'approved', COALESCE(v_mission_record.points_reward, 0), COALESCE(v_mission_record.coins_reward, 0));
      
      -- Award points
      IF COALESCE(v_mission_record.points_reward, 0) > 0 THEN
        UPDATE profiles SET total_points = COALESCE(total_points, 0) + v_mission_record.points_reward WHERE id = p_user_id;
        INSERT INTO points_transactions (profile_id, amount, transaction_type, source, description, source_id)
        VALUES (p_user_id, v_mission_record.points_reward, 'earn', 'mission_completion', 'QR Scan Mission: ' || v_mission_record.title, v_mission_record.id);
        
        v_total_points_awarded := v_total_points_awarded + v_mission_record.points_reward;
      END IF;

      -- Award coins
      IF COALESCE(v_mission_record.coins_reward, 0) > 0 THEN
        UPDATE profiles SET total_coins = COALESCE(total_coins, 0) + v_mission_record.coins_reward WHERE id = p_user_id;
        INSERT INTO coins_transactions (profile_id, amount, transaction_type, source, description, source_id)
        VALUES (p_user_id, v_mission_record.coins_reward, 'earn', 'mission_completion', 'QR Scan Mission: ' || v_mission_record.title, v_mission_record.id);
        
        v_total_coins_awarded := v_total_coins_awarded + v_mission_record.coins_reward;
      END IF;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  IF NOT v_mission_found THEN
    RETURN json_build_object(
      'success', false,
      'message', 'QR Code ไม่ถูกต้อง หรือไม่มีภารกิจที่ใช้ QR รหัสนี้'
    );
  END IF;

  IF v_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'คุณได้ทำภารกิจที่ใช้ QR Code นี้ไปแล้ว'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'ทำภารกิจสแกน QR Code สำเร็จ!',
    'points_awarded', v_total_points_awarded,
    'coins_awarded', v_total_coins_awarded,
    'missions_completed', v_count
  );

END;
$$;
