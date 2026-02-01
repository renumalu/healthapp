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
      accountability_partners: {
        Row: {
          created_at: string
          id: string
          partner_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          points?: number
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          confidence_score: number | null
          content: string
          created_at: string | null
          explanation: string | null
          id: string
          insight_type: string
          is_read: boolean | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          content: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          insight_type: string
          is_read?: boolean | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          insight_type?: string
          is_read?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      diet_plans: {
        Row: {
          created_at: string
          daily_calories: number | null
          daily_carbs: number | null
          daily_fat: number | null
          daily_protein: number | null
          goal: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_calories?: number | null
          daily_carbs?: number | null
          daily_fat?: number | null
          daily_protein?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_calories?: number | null
          daily_carbs?: number | null
          daily_fat?: number | null
          daily_protein?: number | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      energy_logs: {
        Row: {
          created_at: string | null
          energy_level: number
          id: string
          logged_at: string | null
          mood: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          energy_level: number
          id?: string
          logged_at?: string | null
          mood?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          energy_level?: number
          id?: string
          logged_at?: string | null
          mood?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      energy_predictions: {
        Row: {
          actual_energy: number | null
          confidence_score: number
          created_at: string
          factors: Json | null
          id: string
          predicted_energy: number
          prediction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_energy?: number | null
          confidence_score?: number
          created_at?: string
          factors?: Json | null
          id?: string
          predicted_energy: number
          prediction_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_energy?: number | null
          confidence_score?: number
          created_at?: string
          factors?: Json | null
          id?: string
          predicted_energy?: number
          prediction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_plans: {
        Row: {
          created_at: string
          days_per_week: number | null
          focus_areas: string[] | null
          goal: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number | null
          focus_areas?: string[] | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number | null
          focus_areas?: string[] | null
          goal?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      experiment_results: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          log_date: string
          metric_value: number
          notes: string | null
          user_id: string
          variant: string
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          log_date: string
          metric_value: number
          notes?: string | null
          user_id: string
          variant: string
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          log_date?: string
          metric_value?: number
          notes?: string | null
          user_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "life_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_sessions: {
        Row: {
          completed: boolean | null
          created_at: string
          ended_at: string | null
          fasting_type: string
          id: string
          notes: string | null
          started_at: string
          target_hours: number
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          ended_at?: string | null
          fasting_type?: string
          id?: string
          notes?: string | null
          started_at?: string
          target_hours?: number
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          ended_at?: string | null
          fasting_type?: string
          id?: string
          notes?: string | null
          started_at?: string
          target_hours?: number
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          energy_after: number | null
          energy_before: number | null
          focus_type: string | null
          id: string
          interruptions: number | null
          notes: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          energy_after?: number | null
          energy_before?: number | null
          focus_type?: string | null
          id?: string
          interruptions?: number | null
          notes?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          energy_after?: number | null
          energy_before?: number | null
          focus_type?: string | null
          id?: string
          interruptions?: number | null
          notes?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_database: {
        Row: {
          brand: string | null
          calories: number
          carbs: number
          category: string
          created_at: string
          fat: number
          fiber: number | null
          id: string
          is_verified: boolean | null
          name: string
          protein: number
          serving_size: string
          sodium: number | null
          sugar: number | null
        }
        Insert: {
          brand?: string | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          is_verified?: boolean | null
          name: string
          protein?: number
          serving_size?: string
          sodium?: number | null
          sugar?: number | null
        }
        Update: {
          brand?: string | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          protein?: number
          serving_size?: string
          sodium?: number | null
          sugar?: number | null
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean | null
          items: Json
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          items?: Json
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          items?: Json
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      life_debugger_sessions: {
        Row: {
          clarifying_questions: Json | null
          created_at: string | null
          fix_plan: Json | null
          id: string
          problem_description: string
          progress_notes: string | null
          root_causes: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clarifying_questions?: Json | null
          created_at?: string | null
          fix_plan?: Json | null
          id?: string
          problem_description: string
          progress_notes?: string | null
          root_causes?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clarifying_questions?: Json | null
          created_at?: string | null
          fix_plan?: Json | null
          id?: string
          problem_description?: string
          progress_notes?: string | null
          root_causes?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      life_experiments: {
        Row: {
          created_at: string
          end_date: string | null
          hypothesis: string
          id: string
          metric: string
          min_sample_size: number
          name: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
          variable_a: string
          variable_b: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          hypothesis: string
          id?: string
          metric?: string
          min_sample_size?: number
          name: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
          variable_a: string
          variable_b: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          hypothesis?: string
          id?: string
          metric?: string
          min_sample_size?: number
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          variable_a?: string
          variable_b?: string
        }
        Relationships: []
      }
      meal_likes: {
        Row: {
          created_at: string
          id: string
          shared_meal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          shared_meal_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          shared_meal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_likes_shared_meal_id_fkey"
            columns: ["shared_meal_id"]
            isOneToOne: false
            referencedRelation: "shared_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          day_of_week: number
          fat: number | null
          id: string
          meal_name: string
          meal_type: string
          notes: string | null
          protein: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          day_of_week: number
          fat?: number | null
          id?: string
          meal_name: string
          meal_type: string
          notes?: string | null
          protein?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          day_of_week?: number
          fat?: number | null
          id?: string
          meal_name?: string
          meal_type?: string
          notes?: string | null
          protein?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_prep_sessions: {
        Row: {
          created_at: string
          id: string
          ingredients: Json | null
          is_completed: boolean | null
          meals_count: number | null
          name: string
          notes: string | null
          prep_date: string
          recipes: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredients?: Json | null
          is_completed?: boolean | null
          meals_count?: number | null
          name: string
          notes?: string | null
          prep_date: string
          recipes?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredients?: Json | null
          is_completed?: boolean | null
          meals_count?: number | null
          name?: string
          notes?: string | null
          prep_date?: string
          recipes?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_reminders: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          id: string
          is_enabled: boolean | null
          meal_type: string
          reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_enabled?: boolean | null
          meal_type: string
          reminder_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          id?: string
          is_enabled?: boolean | null
          meal_type?: string
          reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          diet_plan_id: string | null
          fat: number | null
          id: string
          logged_at: string
          meal_type: string
          name: string
          notes: string | null
          protein: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          diet_plan_id?: string | null
          fat?: number | null
          id?: string
          logged_at?: string
          meal_type: string
          name: string
          notes?: string | null
          protein?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          diet_plan_id?: string | null
          fat?: number | null
          id?: string
          logged_at?: string
          meal_type?: string
          name?: string
          notes?: string | null
          protein?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_diet_plan_id_fkey"
            columns: ["diet_plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_streaks: {
        Row: {
          created_at: string
          current_streak: number | null
          id: string
          last_log_date: string | null
          longest_streak: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_log_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_log_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_rules: {
        Row: {
          created_at: string | null
          id: string
          if_condition: string
          is_active: boolean | null
          is_ai_suggested: boolean | null
          success_rate: number | null
          then_action: string
          times_triggered: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          if_condition: string
          is_active?: boolean | null
          is_ai_suggested?: boolean | null
          success_rate?: number | null
          then_action: string
          times_triggered?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          if_condition?: string
          is_active?: boolean | null
          is_ai_suggested?: boolean | null
          success_rate?: number | null
          then_action?: string
          times_triggered?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_pro: boolean | null
          onboarding_completed: boolean | null
          silent_mode: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_pro?: boolean | null
          onboarding_completed?: boolean | null
          silent_mode?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_pro?: boolean | null
          onboarding_completed?: boolean | null
          silent_mode?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_per_serving: number | null
          category: string | null
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          fat_per_serving: number | null
          id: string
          image_url: string | null
          ingredients: Json | null
          instructions: string | null
          is_favorite: boolean | null
          name: string
          prep_time_minutes: number | null
          protein_per_serving: number | null
          servings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: string | null
          is_favorite?: boolean | null
          name: string
          prep_time_minutes?: number | null
          protein_per_serving?: number | null
          servings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json | null
          instructions?: string | null
          is_favorite?: boolean | null
          name?: string
          prep_time_minutes?: number | null
          protein_per_serving?: number | null
          servings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          detected_emotion: string | null
          emotion_confidence: number | null
          id: string
          insights: string | null
          lessons_learned: string | null
          transcript: string | null
          updated_at: string | null
          user_id: string
          voice_url: string | null
          week_start: string
          what_didnt_work: string | null
          what_worked: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          detected_emotion?: string | null
          emotion_confidence?: number | null
          id?: string
          insights?: string | null
          lessons_learned?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id: string
          voice_url?: string | null
          week_start: string
          what_didnt_work?: string | null
          what_worked?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          detected_emotion?: string | null
          emotion_confidence?: number | null
          id?: string
          insights?: string | null
          lessons_learned?: string | null
          transcript?: string | null
          updated_at?: string | null
          user_id?: string
          voice_url?: string | null
          week_start?: string
          what_didnt_work?: string | null
          what_worked?: string | null
        }
        Relationships: []
      }
      shared_meals: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_public: boolean | null
          likes_count: number | null
          meal_id: string | null
          recipe_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          meal_id?: string | null
          recipe_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          meal_id?: string | null
          recipe_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_meals_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_logs: {
        Row: {
          created_at: string
          deep_sleep_hours: number | null
          id: string
          notes: string | null
          quality_rating: number | null
          sleep_end: string
          sleep_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deep_sleep_hours?: number | null
          id?: string
          notes?: string | null
          quality_rating?: number | null
          sleep_end: string
          sleep_start: string
          user_id: string
        }
        Update: {
          created_at?: string
          deep_sleep_hours?: number | null
          id?: string
          notes?: string | null
          quality_rating?: number | null
          sleep_end?: string
          sleep_start?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
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
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          current_xp: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
          xp_to_next_level: number
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          current_xp?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
          xp_to_next_level?: number
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          current_xp?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
          xp_to_next_level?: number
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          current_streak: number | null
          goal_completion_rate: number | null
          id: string
          longest_streak: number | null
          total_meals_logged: number | null
          total_workouts: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          goal_completion_rate?: number | null
          id?: string
          longest_streak?: number | null
          total_meals_logged?: number | null
          total_workouts?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number | null
          goal_completion_rate?: number | null
          id?: string
          longest_streak?: number | null
          total_meals_logged?: number | null
          total_workouts?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_intake: {
        Row: {
          amount_ml: number
          created_at: string
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount_ml: number
          created_at?: string
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount_ml?: number
          created_at?: string
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_reminders: {
        Row: {
          created_at: string
          end_time: string
          id: string
          interval_minutes: number
          is_enabled: boolean | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string
          id?: string
          interval_minutes?: number
          is_enabled?: boolean | null
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          interval_minutes?: number
          is_enabled?: boolean | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          id: string
          logged_at: string
          notes: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          logged_at?: string
          notes?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string
          duration_minutes: number | null
          exercises: Json | null
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
          workout_type: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
          workout_type: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories_burned: number | null
          completed_at: string
          created_at: string
          duration_minutes: number | null
          exercise_plan_id: string | null
          exercises: Json | null
          id: string
          name: string
          notes: string | null
          user_id: string
          workout_type: string
        }
        Insert: {
          calories_burned?: number | null
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          exercise_plan_id?: string | null
          exercises?: Json | null
          id?: string
          name: string
          notes?: string | null
          user_id: string
          workout_type: string
        }
        Update: {
          calories_burned?: number | null
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          exercise_plan_id?: string | null
          exercises?: Json | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_exercise_plan_id_fkey"
            columns: ["exercise_plan_id"]
            isOneToOne: false
            referencedRelation: "exercise_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
