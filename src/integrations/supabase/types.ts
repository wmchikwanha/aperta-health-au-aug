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
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          scheduled_at: string
          status: string
          treatment_plan_reference: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_type: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_at: string
          status?: string
          treatment_plan_reference?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          scheduled_at?: string
          status?: string
          treatment_plan_reference?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_date: string
          created_at: string
          cultural_idioms_found: string[] | null
          id: string
          language_detected: string | null
          metadata: Json | null
          narrative: string
          patient_id: string | null
          processed_result: Json
          risk_level: string | null
          user_id: string
        }
        Insert: {
          assessment_date?: string
          created_at?: string
          cultural_idioms_found?: string[] | null
          id?: string
          language_detected?: string | null
          metadata?: Json | null
          narrative: string
          patient_id?: string | null
          processed_result: Json
          risk_level?: string | null
          user_id: string
        }
        Update: {
          assessment_date?: string
          created_at?: string
          cultural_idioms_found?: string[] | null
          id?: string
          language_detected?: string | null
          metadata?: Json | null
          narrative?: string
          patient_id?: string | null
          processed_result?: Json
          risk_level?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string
          actor_role: string
          description: string | null
          encounter_id: string | null
          id: string
          metadata: Json | null
          outcome: string
          patient_id: string | null
          recorded_at: string
          resource_id: string | null
          resource_type: string
          source: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role: string
          description?: string | null
          encounter_id?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string
          patient_id?: string | null
          recorded_at?: string
          resource_id?: string | null
          resource_type: string
          source?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string
          description?: string | null
          encounter_id?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string
          patient_id?: string | null
          recorded_at?: string
          resource_id?: string | null
          resource_type?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      chw_sessions: {
        Row: {
          age_band: string | null
          atsi_identifies: boolean
          atsi_identity_label: string | null
          atsi_identity_response: string | null
          chw_id: string
          completed_at: string | null
          created_at: string
          id: string
          language_code: string | null
          narrative_text: string | null
          narrative_translation: string | null
          notes: string | null
          patient_pseudonym: string
          phq9_item9_flag: boolean | null
          phq9_responses: Json | null
          phq9_score: number | null
          phq9_severity: string | null
          referral_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age_band?: string | null
          atsi_identifies?: boolean
          atsi_identity_label?: string | null
          atsi_identity_response?: string | null
          chw_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          language_code?: string | null
          narrative_text?: string | null
          narrative_translation?: string | null
          notes?: string | null
          patient_pseudonym: string
          phq9_item9_flag?: boolean | null
          phq9_responses?: Json | null
          phq9_score?: number | null
          phq9_severity?: string | null
          referral_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age_band?: string | null
          atsi_identifies?: boolean
          atsi_identity_label?: string | null
          atsi_identity_response?: string | null
          chw_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          language_code?: string | null
          narrative_text?: string | null
          narrative_translation?: string | null
          notes?: string | null
          patient_pseudonym?: string
          phq9_item9_flag?: boolean | null
          phq9_responses?: Json | null
          phq9_score?: number | null
          phq9_severity?: string | null
          referral_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_type: string
          consent_version: string
          consented_at: string
          created_at: string
          fhir_scope: string
          id: string
          language_code: string
          method: string
          notes: string | null
          patient_id: string
          recorded_by: string
          status: string
          updated_at: string
          withdrawal_reason: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          consent_version?: string
          consented_at?: string
          created_at?: string
          fhir_scope?: string
          id?: string
          language_code?: string
          method?: string
          notes?: string | null
          patient_id: string
          recorded_by: string
          status?: string
          updated_at?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          consent_version?: string
          consented_at?: string
          created_at?: string
          fhir_scope?: string
          id?: string
          language_code?: string
          method?: string
          notes?: string | null
          patient_id?: string
          recorded_by?: string
          status?: string
          updated_at?: string
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_interventions: {
        Row: {
          checklist_completed: Json | null
          created_at: string | null
          crisis_started_at: string | null
          crisis_type: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          interventions_applied: Json | null
          outcome: string | null
          patient_id: string
          referral_destination: string | null
          referral_made: boolean | null
          referral_notes: string | null
          referral_type: string | null
          resolved_at: string | null
          severity_level: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          checklist_completed?: Json | null
          created_at?: string | null
          crisis_started_at?: string | null
          crisis_type: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          interventions_applied?: Json | null
          outcome?: string | null
          patient_id: string
          referral_destination?: string | null
          referral_made?: boolean | null
          referral_notes?: string | null
          referral_type?: string | null
          resolved_at?: string | null
          severity_level: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          checklist_completed?: Json | null
          created_at?: string | null
          crisis_started_at?: string | null
          crisis_type?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          interventions_applied?: Json | null
          outcome?: string | null
          patient_id?: string
          referral_destination?: string | null
          referral_made?: boolean | null
          referral_notes?: string | null
          referral_type?: string | null
          resolved_at?: string | null
          severity_level?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_interventions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_formulations: {
        Row: {
          ai_suggestions: Json | null
          approved_at: string | null
          approved_by: string | null
          assessment_id: string | null
          created_at: string | null
          cultural_formulation: string | null
          diagnosis_confidence: string | null
          diagnostic_framework: string
          diagnostic_reasoning: string | null
          differential_diagnoses: Json | null
          formulated_at: string | null
          id: string
          patient_id: string
          primary_diagnosis_code: string
          primary_diagnosis_name: string
          status: string | null
          supporting_evidence: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_suggestions?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          created_at?: string | null
          cultural_formulation?: string | null
          diagnosis_confidence?: string | null
          diagnostic_framework: string
          diagnostic_reasoning?: string | null
          differential_diagnoses?: Json | null
          formulated_at?: string | null
          id?: string
          patient_id: string
          primary_diagnosis_code: string
          primary_diagnosis_name: string
          status?: string | null
          supporting_evidence?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_suggestions?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          created_at?: string | null
          cultural_formulation?: string | null
          diagnosis_confidence?: string | null
          diagnostic_framework?: string
          diagnostic_reasoning?: string | null
          differential_diagnoses?: Json | null
          formulated_at?: string | null
          id?: string
          patient_id?: string
          primary_diagnosis_code?: string
          primary_diagnosis_name?: string
          status?: string | null
          supporting_evidence?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_formulations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_formulations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          accepts_referrals: boolean
          approval_status: string
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          emergency_capable: boolean
          facility_name: string
          id: string
          is_active: boolean
          operating_hours: Json | null
          province: string | null
          region: string
          registered_by: string | null
          rejection_reason: string | null
          services_offered: string[] | null
          specialisations: string[] | null
          subscription_tier: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accepts_referrals?: boolean
          approval_status?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          emergency_capable?: boolean
          facility_name: string
          id?: string
          is_active?: boolean
          operating_hours?: Json | null
          province?: string | null
          region: string
          registered_by?: string | null
          rejection_reason?: string | null
          services_offered?: string[] | null
          specialisations?: string[] | null
          subscription_tier?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accepts_referrals?: boolean
          approval_status?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          emergency_capable?: boolean
          facility_name?: string
          id?: string
          is_active?: boolean
          operating_hours?: Json | null
          province?: string | null
          region?: string
          registered_by?: string | null
          rejection_reason?: string | null
          services_offered?: string[] | null
          specialisations?: string[] | null
          subscription_tier?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      facility_referrals: {
        Row: {
          accepted_at: string | null
          created_at: string
          escalated: boolean
          escalation_reason: string | null
          facility_id: string
          id: string
          matched_at: string
          notes: string | null
          session_id: string
          sla_deadline: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          escalated?: boolean
          escalation_reason?: string | null
          facility_id: string
          id?: string
          matched_at?: string
          notes?: string | null
          session_id: string
          sla_deadline?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          escalated?: boolean
          escalation_reason?: string | null
          facility_id?: string
          id?: string
          matched_at?: string
          notes?: string | null
          session_id?: string
          sla_deadline?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_referrals_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_referrals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "self_assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_users: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          is_owner: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          is_owner?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          is_owner?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_users_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      idiom_submissions: {
        Row: {
          clinical_context: string | null
          clinician_interpretation: string
          created_at: string
          id: string
          idiom: string
          language_code: string
          patient_utterance: string
          status: string
          submitted_by: string
        }
        Insert: {
          clinical_context?: string | null
          clinician_interpretation: string
          created_at?: string
          id?: string
          idiom: string
          language_code: string
          patient_utterance: string
          status?: string
          submitted_by: string
        }
        Update: {
          clinical_context?: string | null
          clinician_interpretation?: string
          created_at?: string
          id?: string
          idiom?: string
          language_code?: string
          patient_utterance?: string
          status?: string
          submitted_by?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          recipient_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type: string
          recipient_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          recipient_id?: string
          title?: string
        }
        Relationships: []
      }
      patient_intake_consents: {
        Row: {
          consent_text_version: string
          consent_type: string
          granted: boolean
          granted_at: string
          id: string
          ip_hash: string | null
          language_code: string
          session_id: string
        }
        Insert: {
          consent_text_version?: string
          consent_type: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_hash?: string | null
          language_code?: string
          session_id: string
        }
        Update: {
          consent_text_version?: string
          consent_type?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_hash?: string | null
          language_code?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_intake_consents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "patient_intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_intake_responses: {
        Row: {
          completed_at: string
          id: string
          interpretation: string | null
          item_flags: Json | null
          responses: Json
          session_id: string
          severity_level: string | null
          tool_type: string
          total_score: number
        }
        Insert: {
          completed_at?: string
          id?: string
          interpretation?: string | null
          item_flags?: Json | null
          responses: Json
          session_id: string
          severity_level?: string | null
          tool_type: string
          total_score: number
        }
        Update: {
          completed_at?: string
          id?: string
          interpretation?: string | null
          item_flags?: Json | null
          responses?: Json
          session_id?: string
          severity_level?: string | null
          tool_type?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_intake_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "patient_intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_intake_sessions: {
        Row: {
          ai_intake_summary: Json | null
          clinic_code: string | null
          clinician_id: string
          completed_at: string | null
          created_at: string
          demographics: Json | null
          expires_at: string
          id: string
          language_code: string
          narrative_text: string | null
          patient_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_flags: Json | null
          started_at: string | null
          status: string
          tier: string
          token: string
        }
        Insert: {
          ai_intake_summary?: Json | null
          clinic_code?: string | null
          clinician_id: string
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          expires_at?: string
          id?: string
          language_code?: string
          narrative_text?: string | null
          patient_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: Json | null
          started_at?: string | null
          status?: string
          tier?: string
          token: string
        }
        Update: {
          ai_intake_summary?: Json | null
          clinic_code?: string | null
          clinician_id?: string
          completed_at?: string | null
          created_at?: string
          demographics?: Json | null
          expires_at?: string
          id?: string
          language_code?: string
          narrative_text?: string | null
          patient_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: Json | null
          started_at?: string | null
          status?: string
          tier?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_intake_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          contact_notes: string | null
          created_at: string
          cultural_background: string | null
          date_of_birth: string | null
          gender: string | null
          id: string
          language_preference: string | null
          metadata: Json | null
          patient_identifier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_notes?: string | null
          created_at?: string
          cultural_background?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          language_preference?: string | null
          metadata?: Json | null
          patient_identifier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_notes?: string | null
          created_at?: string
          cultural_background?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          language_preference?: string | null
          metadata?: Json | null
          patient_identifier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      referral_messages: {
        Row: {
          body: string
          created_at: string
          facility_id: string
          id: string
          read_at: string | null
          sender: string
          session_id: string
        }
        Insert: {
          body: string
          created_at?: string
          facility_id: string
          id?: string
          read_at?: string | null
          sender: string
          session_id: string
        }
        Update: {
          body?: string
          created_at?: string
          facility_id?: string
          id?: string
          read_at?: string | null
          sender?: string
          session_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          context: string
          created_at: string
          crisis_intervention_id: string | null
          destination: string | null
          id: string
          notes: string | null
          pathway_id: string | null
          patient_id: string
          reason: string | null
          recorded_by: string
          referral_type: string
          specialist_type: string | null
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          context?: string
          created_at?: string
          crisis_intervention_id?: string | null
          destination?: string | null
          id?: string
          notes?: string | null
          pathway_id?: string | null
          patient_id: string
          reason?: string | null
          recorded_by: string
          referral_type: string
          specialist_type?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          context?: string
          created_at?: string
          crisis_intervention_id?: string | null
          destination?: string | null
          id?: string
          notes?: string | null
          pathway_id?: string | null
          patient_id?: string
          reason?: string | null
          recorded_by?: string
          referral_type?: string
          specialist_type?: string | null
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_assessments: {
        Row: {
          administered_at: string
          created_at: string
          id: string
          interpretation: string | null
          notes: string | null
          patient_id: string
          responses: Json
          severity_level: string | null
          tool_type: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          administered_at?: string
          created_at?: string
          id?: string
          interpretation?: string | null
          notes?: string | null
          patient_id: string
          responses: Json
          severity_level?: string | null
          tool_type: string
          total_score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          administered_at?: string
          created_at?: string
          id?: string
          interpretation?: string | null
          notes?: string | null
          patient_id?: string
          responses?: Json
          severity_level?: string | null
          tool_type?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      self_assessment_consents: {
        Row: {
          consent_text_version: string
          consent_type: string
          granted: boolean
          granted_at: string
          id: string
          ip_hash: string | null
          language_code: string
          session_id: string
        }
        Insert: {
          consent_text_version?: string
          consent_type: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_hash?: string | null
          language_code?: string
          session_id: string
        }
        Update: {
          consent_text_version?: string
          consent_type?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_hash?: string | null
          language_code?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_assessment_consents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "self_assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      self_assessment_responses: {
        Row: {
          completed_at: string
          id: string
          interpretation: string | null
          item_flags: Json | null
          responses: Json
          session_id: string
          severity_level: string | null
          tool_type: string
          total_score: number
        }
        Insert: {
          completed_at?: string
          id?: string
          interpretation?: string | null
          item_flags?: Json | null
          responses: Json
          session_id: string
          severity_level?: string | null
          tool_type: string
          total_score: number
        }
        Update: {
          completed_at?: string
          id?: string
          interpretation?: string | null
          item_flags?: Json | null
          responses?: Json
          session_id?: string
          severity_level?: string | null
          tool_type?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "self_assessment_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "self_assessment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      self_assessment_sessions: {
        Row: {
          completed_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          demographics: Json | null
          document_urls: string[] | null
          expires_at: string
          id: string
          language_code: string
          location_region: string | null
          narrative_text: string | null
          pin_failed_attempts: number
          pin_locked_until: string | null
          referral_code: string | null
          risk_level: string | null
          session_token: string
          status: string
          triage_result: Json | null
          verification_pin_hash: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          demographics?: Json | null
          document_urls?: string[] | null
          expires_at?: string
          id?: string
          language_code?: string
          location_region?: string | null
          narrative_text?: string | null
          pin_failed_attempts?: number
          pin_locked_until?: string | null
          referral_code?: string | null
          risk_level?: string | null
          session_token?: string
          status?: string
          triage_result?: Json | null
          verification_pin_hash?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          demographics?: Json | null
          document_urls?: string[] | null
          expires_at?: string
          id?: string
          language_code?: string
          location_region?: string | null
          narrative_text?: string | null
          pin_failed_attempts?: number
          pin_locked_until?: string | null
          referral_code?: string | null
          risk_level?: string | null
          session_token?: string
          status?: string
          triage_result?: Json | null
          verification_pin_hash?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: []
      }
      treatment_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          note_type: string
          patient_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          note_type: string
          patient_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          note_type?: string
          patient_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_upward_referral: {
        Args: { _referral_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_referral_clinicians: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "psychiatrist"
        | "viewer"
        | "chw"
        | "clinical_nurse"
        | "facility_admin"
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
      app_role: [
        "admin",
        "psychiatrist",
        "viewer",
        "chw",
        "clinical_nurse",
        "facility_admin",
      ],
    },
  },
} as const
