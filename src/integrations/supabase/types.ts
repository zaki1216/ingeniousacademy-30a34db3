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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          code: string
          coin_reward: number
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          category: string
          code: string
          coin_reward?: number
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward?: number
        }
        Update: {
          category?: string
          code?: string
          coin_reward?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          id: string
          message: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          coins_delta: number
          created_at: string
          date: string
          id: string
          marked_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          coins_delta?: number
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          coins_delta?: number
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_name: string
          chapter_number: number
          created_at: string
          description: string | null
          id: string
          subject_id: string
        }
        Insert: {
          chapter_name: string
          chapter_number?: number
          created_at?: string
          description?: string | null
          id?: string
          subject_id: string
        }
        Update: {
          chapter_name?: string
          chapter_number?: number
          created_at?: string
          description?: string | null
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_spins: {
        Row: {
          created_at: string
          id: string
          prize_label: string
          rarity: string
          reward_amount: number
          reward_type: string
          reward_value: string
          streak: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prize_label: string
          rarity?: string
          reward_amount?: number
          reward_type: string
          reward_value: string
          streak?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prize_label?: string
          rarity?: string
          reward_amount?: number
          reward_type?: string
          reward_value?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      gamification_stats: {
        Row: {
          chest_cycle_day: number
          coins: number
          last_active_date: string | null
          last_chest_claim_date: string | null
          level: number
          max_streak: number
          streak_days: number
          talent_points_spent: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          chest_cycle_day?: number
          coins?: number
          last_active_date?: string | null
          last_chest_claim_date?: string | null
          level?: number
          max_streak?: number
          streak_days?: number
          talent_points_spent?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          chest_cycle_day?: number
          coins?: number
          last_active_date?: string | null
          last_chest_claim_date?: string | null
          level?: number
          max_streak?: number
          streak_days?: number
          talent_points_spent?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      lectures: {
        Row: {
          chapter_id: string
          created_at: string
          description: string | null
          id: string
          lecture_number: number
          lecture_title: string
          youtube_url: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description?: string | null
          id?: string
          lecture_number?: number
          lecture_title: string
          youtube_url: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lecture_number?: number
          lecture_title?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          chapter_id: string
          created_at: string
          description: string | null
          id: string
          pdf_url: string
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          description?: string | null
          id?: string
          pdf_url: string
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_marks: {
        Row: {
          created_at: string
          entered_by: string | null
          id: string
          marks_obtained: number
          offline_test_id: string
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_by?: string | null
          id?: string
          marks_obtained: number
          offline_test_id: string
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_by?: string | null
          id?: string
          marks_obtained?: number
          offline_test_id?: string
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_marks_offline_test_id_fkey"
            columns: ["offline_test_id"]
            isOneToOne: false
            referencedRelation: "offline_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_tests: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          id: string
          max_marks: number
          subject_id: string
          test_date: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_marks: number
          subject_id: string
          test_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          max_marks?: number
          subject_id?: string
          test_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_tests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_status: string | null
          pass_id: string
          prev_status: string | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          pass_id: string
          prev_status?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string | null
          pass_id?: string
          prev_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pass_audit_log_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "user_passes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          equipped_avatar: string | null
          equipped_frame: string | null
          equipped_title: string | null
          id: string
          is_active: boolean
          name: string
          parent_phone: string | null
          phone: string | null
          standard_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          equipped_avatar?: string | null
          equipped_frame?: string | null
          equipped_title?: string | null
          id: string
          is_active?: boolean
          name: string
          parent_phone?: string | null
          phone?: string | null
          standard_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          equipped_avatar?: string | null
          equipped_frame?: string | null
          equipped_title?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_phone?: string | null
          phone?: string | null
          standard_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "standards"
            referencedColumns: ["id"]
          },
        ]
      }
      pvp_br_players: {
        Row: {
          eliminated: boolean
          eliminated_at_index: number | null
          finish_place: number | null
          id: string
          joined_at: string
          room_id: string
          score: number
          user_id: string
        }
        Insert: {
          eliminated?: boolean
          eliminated_at_index?: number | null
          finish_place?: number | null
          id?: string
          joined_at?: string
          room_id: string
          score?: number
          user_id: string
        }
        Update: {
          eliminated?: boolean
          eliminated_at_index?: number | null
          finish_place?: number | null
          id?: string
          joined_at?: string
          room_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pvp_br_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "pvp_br_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      pvp_br_questions: {
        Row: {
          id: string
          order_index: number
          question_id: string
          room_id: string
        }
        Insert: {
          id?: string
          order_index: number
          question_id: string
          room_id: string
        }
        Update: {
          id?: string
          order_index?: number
          question_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pvp_br_questions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "pvp_br_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      pvp_br_rooms: {
        Row: {
          code: string
          created_at: string
          current_question_index: number
          finished_at: string | null
          host_id: string
          id: string
          max_players: number
          prize_coins: number
          prize_xp: number
          started_at: string | null
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_question_index?: number
          finished_at?: string | null
          host_id: string
          id?: string
          max_players?: number
          prize_coins?: number
          prize_xp?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_question_index?: number
          finished_at?: string | null
          host_id?: string
          id?: string
          max_players?: number
          prize_coins?: number
          prize_xp?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      pvp_duel_answers: {
        Row: {
          created_at: string
          duel_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected: string | null
          time_ms: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duel_id: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected?: string | null
          time_ms?: number
          user_id: string
        }
        Update: {
          created_at?: string
          duel_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected?: string | null
          time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pvp_duel_answers_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "pvp_duels"
            referencedColumns: ["id"]
          },
        ]
      }
      pvp_duels: {
        Row: {
          challenger_id: string
          challenger_score: number
          created_at: string
          expires_at: string
          id: string
          opponent_id: string
          opponent_score: number
          prize_coins: number
          prize_xp: number
          question_ids: string[]
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          challenger_score?: number
          created_at?: string
          expires_at?: string
          id?: string
          opponent_id: string
          opponent_score?: number
          prize_coins?: number
          prize_xp?: number
          question_ids: string[]
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          challenger_score?: number
          created_at?: string
          expires_at?: string
          id?: string
          opponent_id?: string
          opponent_score?: number
          prize_coins?: number
          prize_xp?: number
          question_ids?: string[]
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_option: number
          created_at: string
          id: string
          marks: number
          options: Json
          question_order: number
          question_text: string
          test_id: string
        }
        Insert: {
          correct_option: number
          created_at?: string
          id?: string
          marks?: number
          options: Json
          question_order?: number
          question_text: string
          test_id: string
        }
        Update: {
          correct_option?: number
          created_at?: string
          id?: string
          marks?: number
          options?: Json
          question_order?: number
          question_text?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          coins_awarded: number
          correct_count: number
          created_at: string
          id: string
          lecture_id: string | null
          student_id: string
          test_id: string
          total_questions: number
        }
        Insert: {
          coins_awarded?: number
          correct_count?: number
          created_at?: string
          id?: string
          lecture_id?: string | null
          student_id: string
          test_id: string
          total_questions?: number
        }
        Update: {
          coins_awarded?: number
          correct_count?: number
          created_at?: string
          id?: string
          lecture_id?: string | null
          student_id?: string
          test_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_remarks: {
        Row: {
          created_at: string
          id: string
          remarks: string
          student_id: string
          term: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          remarks: string
          student_id: string
          term?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          remarks?: string
          student_id?: string
          term?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      results: {
        Row: {
          answers: Json
          attempt_date: string
          id: string
          percentage: number
          score: number
          student_id: string
          test_id: string
          total_marks: number
        }
        Insert: {
          answers: Json
          attempt_date?: string
          id?: string
          percentage: number
          score: number
          student_id: string
          test_id: string
          total_marks: number
        }
        Update: {
          answers?: Json
          attempt_date?: string
          id?: string
          percentage?: number
          score?: number
          student_id?: string
          test_id?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      season_progress: {
        Row: {
          id: string
          points: number
          season_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          points?: number
          season_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          points?: number
          season_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_progress_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          code: string
          created_at: string
          ends_at: string
          id: string
          name: string
          rewards: Json
          starts_at: string
          theme: string | null
        }
        Insert: {
          code: string
          created_at?: string
          ends_at: string
          id?: string
          name: string
          rewards?: Json
          starts_at: string
          theme?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          rewards?: Json
          starts_at?: string
          theme?: string | null
        }
        Relationships: []
      }
      shadows: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          rarity: string
          subject: string | null
          unlock_rule: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          rarity?: string
          subject?: string | null
          unlock_rule?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          rarity?: string
          subject?: string | null
          unlock_rule?: string | null
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          price_coins: number
          rarity: string
          sort_order: number
          type: string
          value: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          price_coins?: number
          rarity?: string
          sort_order?: number
          type: string
          value: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          price_coins?: number
          rarity?: string
          sort_order?: number
          type?: string
          value?: string
        }
        Relationships: []
      }
      spin_prize_configs: {
        Row: {
          code: string
          color: string
          created_at: string
          enabled: boolean
          icon: string
          id: string
          label: string
          rarity: string
          reward_amount: number
          reward_type: string
          reward_value: string
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          enabled?: boolean
          icon?: string
          id?: string
          label: string
          rarity?: string
          reward_amount?: number
          reward_type: string
          reward_value: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          enabled?: boolean
          icon?: string
          id?: string
          label?: string
          rarity?: string
          reward_amount?: number
          reward_type?: string
          reward_value?: string
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      standards: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          standard_id: string
          subject_name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          standard_id: string
          subject_name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          standard_id?: string
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "standards"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          talent_code: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          talent_code: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          talent_code?: string
        }
        Relationships: []
      }
      talent_configs: {
        Row: {
          cost_per_tier: number[]
          created_at: string
          max_tier: number
          per_tier_value: number
          talent_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cost_per_tier: number[]
          created_at?: string
          max_tier: number
          per_tier_value: number
          talent_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cost_per_tier?: number[]
          created_at?: string
          max_tier?: number
          per_tier_value?: number
          talent_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          is_boss: boolean
          kind: string
          lecture_id: string | null
          title: string
          total_marks: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          is_boss?: boolean
          kind?: string
          lecture_id?: string | null
          title: string
          total_marks?: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          is_boss?: boolean
          kind?: string
          lecture_id?: string | null
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "tests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          rarity: string
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rarity?: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rarity?: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          acquired_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_passes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cost_coins: number
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          pass_code: string
          status: string
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cost_coins: number
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          pass_code: string
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cost_coins?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          pass_code?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string
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
      user_shadows: {
        Row: {
          id: string
          shadow_code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          shadow_code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          shadow_code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shadows_shadow_code_fkey"
            columns: ["shadow_code"]
            isOneToOne: false
            referencedRelation: "shadows"
            referencedColumns: ["code"]
          },
        ]
      }
      user_talents: {
        Row: {
          created_at: string
          id: string
          talent_code: string
          tier: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          talent_code: string
          tier?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          talent_code?: string
          tier?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_titles: {
        Row: {
          id: string
          title_code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title_code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title_code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_titles_title_code_fkey"
            columns: ["title_code"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["code"]
          },
        ]
      }
      video_completions: {
        Row: {
          completed_at: string
          id: string
          last_watched_at: string
          lecture_id: string
          user_id: string
          watch_count: number
        }
        Insert: {
          completed_at?: string
          id?: string
          last_watched_at?: string
          lecture_id: string
          user_id: string
          watch_count?: number
        }
        Update: {
          completed_at?: string
          id?: string
          last_watched_at?: string
          lecture_id?: string
          user_id?: string
          watch_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_completions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
