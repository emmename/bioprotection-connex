export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      checkin_rewards: {
        Row: {
          coins_reward: number
          created_at: string
          day_number: number
          id: string
          is_bonus: boolean
        }
        Insert: {
          coins_reward: number
          created_at?: string
          day_number: number
          id?: string
          is_bonus?: boolean
        }
        Update: {
          coins_reward?: number
          created_at?: string
          day_number?: number
          id?: string
          is_bonus?: boolean
        }
        Relationships: []
      }
      coins_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          profile_id: string
          source: string
          source_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          profile_id: string
          source: string
          source_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          profile_id?: string
          source?: string
          source_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "coins_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_details: {
        Row: {
          business_type: Database["public"]["Enums"]["company_business"]
          company_name: string
          created_at: string
          id: string
          is_elanco: boolean | null
          position: string | null
          profile_id: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["company_business"]
          company_name: string
          created_at?: string
          id?: string
          is_elanco?: boolean | null
          position?: string | null
          profile_id: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["company_business"]
          company_name?: string
          created_at?: string
          id?: string
          is_elanco?: boolean | null
          position?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          banner_url: string | null
          content_body: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          points_reward: number
          published_at: string | null
          target_member_types:
          | Database["public"]["Enums"]["member_type"][]
          | null
          target_tiers: Database["public"]["Enums"]["tier_level"][] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          banner_url?: string | null
          content_body?: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          points_reward?: number
          published_at?: string | null
          target_member_types?:
          | Database["public"]["Enums"]["member_type"][]
          | null
          target_tiers?: Database["public"]["Enums"]["tier_level"][] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          banner_url?: string | null
          content_body?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          points_reward?: number
          published_at?: string | null
          target_member_types?:
          | Database["public"]["Enums"]["member_type"][]
          | null
          target_tiers?: Database["public"]["Enums"]["tier_level"][] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      content_progress: {
        Row: {
          completed_at: string | null
          content_id: string
          created_at: string
          id: string
          is_completed: boolean
          points_earned: number
          profile_id: string
          progress_percent: number
          quiz_score: number | null
          survey_responses: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          created_at?: string
          id?: string
          is_completed?: boolean
          points_earned?: number
          profile_id: string
          progress_percent?: number
          quiz_score?: number | null
          survey_responses?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          created_at?: string
          id?: string
          is_completed?: boolean
          points_earned?: number
          profile_id?: string
          progress_percent?: number
          quiz_score?: number | null
          survey_responses?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_progress_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          coins_earned: number
          created_at: string
          id: string
          profile_id: string
          streak_count: number
        }
        Insert: {
          checkin_date: string
          coins_earned?: number
          created_at?: string
          id?: string
          profile_id: string
          streak_count?: number
        }
        Update: {
          checkin_date?: string
          coins_earned?: number
          created_at?: string
          id?: string
          profile_id?: string
          streak_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_details: {
        Row: {
          animal_count: string | null
          animal_types: string[] | null
          building_count: string | null
          created_at: string
          farm_name: string
          id: string
          pest_control_methods: string[] | null
          pest_problems: string[] | null
          position: string | null
          profile_id: string
        }
        Insert: {
          animal_count?: string | null
          animal_types?: string[] | null
          building_count?: string | null
          created_at?: string
          farm_name: string
          id?: string
          pest_control_methods?: string[] | null
          pest_problems?: string[] | null
          position?: string | null
          profile_id: string
        }
        Update: {
          animal_count?: string | null
          animal_types?: string[] | null
          building_count?: string | null
          created_at?: string
          farm_name?: string
          id?: string
          pest_control_methods?: string[] | null
          pest_problems?: string[] | null
          position?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          coins_spent: number
          game_type: string
          id: string
          played_at: string
          profile_id: string
          rewards_earned: Json | null
          score: number
        }
        Insert: {
          coins_spent?: number
          game_type: string
          id?: string
          played_at?: string
          profile_id: string
          rewards_earned?: Json | null
          score?: number
        }
        Update: {
          coins_spent?: number
          game_type?: string
          id?: string
          played_at?: string
          profile_id?: string
          rewards_earned?: Json | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_settings: {
        Row: {
          coins_per_extra_play: number
          created_at: string
          free_plays_per_day: number
          game_type: string
          id: string
          is_active: boolean
          max_reward_coins: number
          max_reward_points: number
          min_reward_coins: number
          min_reward_points: number
          updated_at: string
        }
        Insert: {
          coins_per_extra_play?: number
          created_at?: string
          free_plays_per_day?: number
          game_type: string
          id?: string
          is_active?: boolean
          max_reward_coins?: number
          max_reward_points?: number
          min_reward_coins?: number
          min_reward_points?: number
          updated_at?: string
        }
        Update: {
          coins_per_extra_play?: number
          created_at?: string
          free_plays_per_day?: number
          game_type?: string
          id?: string
          is_active?: boolean
          max_reward_coins?: number
          max_reward_points?: number
          min_reward_coins?: number
          min_reward_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      government_details: {
        Row: {
          created_at: string
          id: string
          organization_name: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_name: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_name?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_completions: {
        Row: {
          coins_earned: number
          completed_at: string
          id: string
          mission_id: string
          points_earned: number
          profile_id: string
          proof_image_url: string | null
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          coins_earned?: number
          completed_at?: string
          id?: string
          mission_id: string
          points_earned?: number
          profile_id: string
          proof_image_url?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          coins_earned?: number
          completed_at?: string
          id?: string
          mission_id?: string
          points_earned?: number
          profile_id?: string
          proof_image_url?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "mission_completions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_completions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          coins_reward: number
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          location: string | null
          mission_type: string
          points_reward: number
          qr_code: string | null
          requirements: Json | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          coins_reward?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          mission_type: string
          points_reward?: number
          qr_code?: string | null
          requirements?: Json | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          coins_reward?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          mission_type?: string
          points_reward?: number
          qr_code?: string | null
          requirements?: Json | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          profile_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          profile_id: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          profile_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          profile_id: string
          source: string
          source_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          profile_id: string
          source: string
          source_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          profile_id?: string
          source?: string
          source_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          created_at: string
          district: string | null
          email: string | null
          first_name: string
          id: string
          interests: string[] | null
          known_products: string[] | null
          last_name: string
          line_display_name: string | null
          line_id: string | null
          line_picture_url: string | null
          line_user_id: string | null
          member_id: string | null
          member_type: Database["public"]["Enums"]["member_type"]
          migrated_at: string | null
          migration_source: string | null
          nickname: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          referral_source: string | null
          subdistrict: string | null
          tier: Database["public"]["Enums"]["tier_level"]
          total_coins: number
          total_points: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          first_name: string
          id?: string
          interests?: string[] | null
          known_products?: string[] | null
          last_name: string
          line_display_name?: string | null
          line_id?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          member_id?: string | null
          member_type: Database["public"]["Enums"]["member_type"]
          migrated_at?: string | null
          migration_source?: string | null
          nickname?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          referral_source?: string | null
          subdistrict?: string | null
          tier?: Database["public"]["Enums"]["tier_level"]
          total_coins?: number
          total_points?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          first_name?: string
          id?: string
          interests?: string[] | null
          known_products?: string[] | null
          last_name?: string
          line_display_name?: string | null
          line_id?: string | null
          line_picture_url?: string | null
          line_user_id?: string | null
          member_id?: string | null
          member_type?: Database["public"]["Enums"]["member_type"]
          migrated_at?: string | null
          migration_source?: string | null
          nickname?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          referral_source?: string | null
          subdistrict?: string | null
          tier?: Database["public"]["Enums"]["tier_level"]
          total_coins?: number
          total_points?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          content_id: string
          correct_answer: number
          created_at: string
          id: string
          options: Json
          order_index: number
          points: number
          question: string
        }
        Insert: {
          content_id: string
          correct_answer: number
          created_at?: string
          id?: string
          options: Json
          order_index?: number
          points?: number
          question: string
        }
        Update: {
          content_id?: string
          correct_answer?: number
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          points?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          admin_notes: string | null
          amount: number | null
          created_at: string
          id: string
          image_url: string
          points_awarded: number | null
          profile_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          image_url: string
          points_awarded?: number | null
          profile_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          image_url?: string
          points_awarded?: number | null
          profile_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "receipts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          points_spent: number
          profile_id: string
          reward_id: string
          shipping_address: string | null
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          points_spent: number
          profile_id: string
          reward_id: string
          shipping_address?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          points_spent?: number
          profile_id?: string
          reward_id?: string
          shipping_address?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean
          name: string
          points_cost: number
          stock_quantity: number
          target_member_types: Database["public"]["Enums"]["member_type"][] | null
          requirements: Json | null
          target_tiers: Database["public"]["Enums"]["tier_level"][] | null
          tier_points_cost: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          name: string
          points_cost: number
          stock_quantity?: number
          target_member_types?: Database["public"]["Enums"]["member_type"][] | null
          requirements?: Json | null
          target_tiers?: Database["public"]["Enums"]["tier_level"][] | null
          tier_points_cost?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          name?: string
          points_cost?: number
          stock_quantity?: number
          target_tiers?: Database["public"]["Enums"]["tier_level"][] | null
          tier_points_cost?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      shop_details: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          shop_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          shop_name: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          shop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          content_id: string
          created_at: string
          id: string
          is_required: boolean
          options: Json | null
          order_index: number
          question: string
          question_type: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question: string
          question_type?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          order_index?: number
          question?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_settings: {
        Row: {
          benefits: string[] | null
          color: string | null
          created_at: string
          display_name: string
          id: string
          max_points: number | null
          min_points: number
          tier: Database["public"]["Enums"]["tier_level"]
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string
          display_name: string
          id?: string
          max_points?: number | null
          min_points: number
          tier: Database["public"]["Enums"]["tier_level"]
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          color?: string | null
          created_at?: string
          display_name?: string
          id?: string
          max_points?: number | null
          min_points?: number
          tier?: Database["public"]["Enums"]["tier_level"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vet_details: {
        Row: {
          created_at: string
          id: string
          organization_name: string
          profile_id: string
          vet_type: Database["public"]["Enums"]["vet_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          organization_name: string
          profile_id: string
          vet_type: Database["public"]["Enums"]["vet_type"]
        }
        Update: {
          created_at?: string
          id?: string
          organization_name?: string
          profile_id?: string
          vet_type?: Database["public"]["Enums"]["vet_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vet_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_coins: {
        Args: {
          p_amount: number
          p_description?: string
          p_profile_id: string
          p_source: string
        }
        Returns: undefined
      }
      add_points: {
        Args: {
          p_amount: number
          p_description?: string
          p_profile_id: string
          p_source: string
        }
        Returns: undefined
      }
      deduct_coins: {
        Args: {
          p_amount: number
          p_description?: string
          p_profile_id: string
          p_source: string
        }
        Returns: undefined
      }
      deduct_points: {
        Args: {
          p_amount: number
          p_description?: string
          p_profile_id: string
          p_source: string
        }
        Returns: undefined
      }
      generate_member_id: { Args: never; Returns: string }
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_reward:
      | {
        Args: {
          p_points_cost: number
          p_profile_id: string
          p_reward_id: string
          p_shipping_address: string
        }
        Returns: Json
      }
      | {
        Args: {
          p_notes?: string
          p_points_cost: number
          p_profile_id: string
          p_reward_id: string
          p_shipping_address: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      approval_status: "pending" | "approved" | "rejected"
      company_business:
      | "animal_production"
      | "animal_feed"
      | "veterinary_distribution"
      | "other"
      content_type: "article" | "video" | "quiz" | "survey"
      member_type:
      | "farm"
      | "company_employee"
      | "veterinarian"
      | "livestock_shop"
      | "government"
      | "other"
      tier_level: "bronze" | "silver" | "gold" | "platinum"
      transaction_type: "earn" | "spend"
      vet_type: "livestock" | "hospital_clinic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      approval_status: ["pending", "approved", "rejected"],
      company_business: [
        "animal_production",
        "animal_feed",
        "veterinary_distribution",
        "other",
      ],
      content_type: ["article", "video", "quiz", "survey"],
      member_type: [
        "farm",
        "company_employee",
        "veterinarian",
        "livestock_shop",
        "government",
        "other",
      ],
      tier_level: ["bronze", "silver", "gold", "platinum"],
      transaction_type: ["earn", "spend"],
      vet_type: ["livestock", "hospital_clinic"],
    },
  },
} as const
