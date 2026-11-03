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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_config: {
        Row: {
          api_key: string | null
          created_at: string
          environment: string
          id: string
          is_active: boolean
          organization_id: string | null
          updated_at: string
          webhook_token: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          webhook_token?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          organization_id?: string | null
          updated_at?: string
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_customers: {
        Row: {
          asaas_id: string
          client_id: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          asaas_id: string
          client_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          asaas_id?: string
          client_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asaas_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_payments: {
        Row: {
          asaas_customer_id: string | null
          asaas_id: string
          bank_slip_url: string | null
          billing_type: string | null
          created_at: string
          description: string | null
          due_date: string | null
          external_reference: string | null
          id: string
          invoice_url: string | null
          net_value: number | null
          organization_id: string | null
          payment_date: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_id: string
          bank_slip_url?: string | null
          billing_type?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          net_value?: number | null
          organization_id?: string | null
          payment_date?: string | null
          status: string
          updated_at?: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_id?: string
          bank_slip_url?: string | null
          billing_type?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_reference?: string | null
          id?: string
          invoice_url?: string | null
          net_value?: number | null
          organization_id?: string | null
          payment_date?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_payments_asaas_customer_id_fkey"
            columns: ["asaas_customer_id"]
            isOneToOne: false
            referencedRelation: "asaas_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_id: string
          billing_type: string | null
          contract_id: string | null
          created_at: string
          cycle: string | null
          id: string
          next_due_date: string | null
          organization_id: string | null
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_id: string
          billing_type?: string | null
          contract_id?: string | null
          created_at?: string
          cycle?: string | null
          id?: string
          next_due_date?: string | null
          organization_id?: string | null
          status: string
          updated_at?: string
          value?: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_id?: string
          billing_type?: string | null
          contract_id?: string | null
          created_at?: string
          cycle?: string | null
          id?: string
          next_due_date?: string | null
          organization_id?: string | null
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "asaas_subscriptions_asaas_customer_id_fkey"
            columns: ["asaas_customer_id"]
            isOneToOne: false
            referencedRelation: "asaas_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_subscriptions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asaas_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asaas_webhook_logs: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          organization_id: string | null
          payload: Json
          processed: boolean
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          organization_id?: string | null
          payload?: Json
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "asaas_webhook_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          agency: string | null
          balance: number
          bank_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          balance?: number
          bank_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          agency?: string | null
          balance?: number
          bank_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      cancellation_reasons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      client_observations: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_observations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_type_id: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          instagram: string | null
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          partner_id: string | null
          phone: string | null
          responsible_id: string | null
          segment: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
          zip_code: string | null
          company_name: string | null
          cnpj: string | null
          contact_name: string | null
          industry: string | null
          business_description: string | null
          products_services: string | null
          time_in_market: string | null
          company_size: string | null
          monthly_revenue: string | null
          main_niche: string | null
          main_pains: string | null
          desires: string | null
          age_min: number | null
          age_max: number | null
          gender: string | null
          location: string | null
          social_class: string | null
          brand_tone: string | null
          primary_color: string | null
          secondary_color: string | null
          fonts: string | null
          visual_elements: string | null
          visual_personality: string | null
          support_channels: string[] | null
          crm_used: string | null
          sla_response: string | null
          business_hours_start: string | null
          business_hours_end: string | null
          working_days: string[] | null
          additional_info: string | null
          terms_accepted: boolean | null
          import_batch_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type_id?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id?: string
          partner_id?: string | null
          phone?: string | null
          responsible_id?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
          company_name?: string | null
          cnpj?: string | null
          contact_name?: string | null
          industry?: string | null
          business_description?: string | null
          products_services?: string | null
          time_in_market?: string | null
          company_size?: string | null
          monthly_revenue?: string | null
          main_niche?: string | null
          main_pains?: string | null
          desires?: string | null
          age_min?: number | null
          age_max?: number | null
          gender?: string | null
          location?: string | null
          social_class?: string | null
          brand_tone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          fonts?: string | null
          visual_elements?: string | null
          visual_personality?: string | null
          support_channels?: string[] | null
          crm_used?: string | null
          sla_response?: string | null
          business_hours_start?: string | null
          business_hours_end?: string | null
          working_days?: string[] | null
          additional_info?: string | null
          terms_accepted?: boolean | null
          import_batch_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type_id?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          partner_id?: string | null
          phone?: string | null
          responsible_id?: string | null
          segment?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
          company_name?: string | null
          cnpj?: string | null
          contact_name?: string | null
          industry?: string | null
          business_description?: string | null
          products_services?: string | null
          time_in_market?: string | null
          company_size?: string | null
          monthly_revenue?: string | null
          main_niche?: string | null
          main_pains?: string | null
          desires?: string | null
          age_min?: number | null
          age_max?: number | null
          gender?: string | null
          location?: string | null
          social_class?: string | null
          brand_tone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          fonts?: string | null
          visual_elements?: string | null
          visual_personality?: string | null
          support_channels?: string[] | null
          crm_used?: string | null
          sla_response?: string | null
          business_hours_start?: string | null
          business_hours_end?: string | null
          working_days?: string[] | null
          additional_info?: string | null
          terms_accepted?: boolean | null
          import_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_client_type_id_fkey"
            columns: ["client_type_id"]
            isOneToOne: false
            referencedRelation: "client_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_id: string | null
          phone: string | null
          primary_color: string | null
          settings: Json
          state: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_id?: string | null
          phone?: string | null
          primary_color?: string | null
          settings?: Json
          state?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          primary_color?: string | null
          settings?: Json
          state?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_products: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          organization_id: string | null
          product_id: string | null
          quantity: number
          unit_price: number | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          product_id?: string | null
          quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_products_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          billing_day: number | null
          cancellation_reason_id: string | null
          client_id: string
          contract_type_id: string | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          organization_id: string
          plan_id: string | null
          responsible_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          value: number | null
        }
        Insert: {
          billing_day?: number | null
          cancellation_reason_id?: string | null
          client_id: string
          contract_type_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          responsible_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          billing_day?: number | null
          cancellation_reason_id?: string | null
          client_id?: string
          contract_type_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          responsible_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_cancellation_reason_id_fkey"
            columns: ["cancellation_reason_id"]
            isOneToOne: false
            referencedRelation: "cancellation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_contract_type_id_fkey"
            columns: ["contract_type_id"]
            isOneToOne: false
            referencedRelation: "contract_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delay_reasons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      delinquency_reasons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      delivery_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          delivery_model_item_id: string | null
          id: string
          justification: string | null
          notes: string | null
          observation: string | null
          organization_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["delivery_item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          delivery_model_item_id?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          observation?: string | null
          organization_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["delivery_item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          delivery_model_item_id?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          observation?: string | null
          organization_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["delivery_item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "delivery_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklist_items_delivery_model_item_id_fkey"
            columns: ["delivery_model_item_id"]
            isOneToOne: false
            referencedRelation: "delivery_model_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_checklists: {
        Row: {
          client_id: string
          completed_at: string | null
          completed_by: string | null
          contract_id: string | null
          created_at: string
          frequency: Database["public"]["Enums"]["checklist_frequency"]
          fulfillment_pct: number | null
          id: string
          organization_id: string | null
          period: string | null
          period_end: string | null
          period_start: string | null
          plan_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          contract_id?: string | null
          created_at?: string
          frequency?: Database["public"]["Enums"]["checklist_frequency"]
          fulfillment_pct?: number | null
          id?: string
          organization_id?: string | null
          period?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          contract_id?: string | null
          created_at?: string
          frequency?: Database["public"]["Enums"]["checklist_frequency"]
          fulfillment_pct?: number | null
          id?: string
          organization_id?: string | null
          period?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_checklists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklists_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_checklists_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_model_items: {
        Row: {
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["checklist_frequency"] | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["checklist_frequency"] | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["checklist_frequency"] | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_recorrentes: {
        Row: {
          categoria: string | null
          conta_bancaria: string | null
          created_at: string | null
          data: string | null
          descricao: string | null
          documento: string | null
          email_cliente: string | null
          id: number
          nome_cliente: string | null
          observacoes: string | null
          organization_id: string | null
          status: string | null
          tags: string | null
          telefone_cliente: string | null
          tipo: string | null
          valor: number | null
        }
        Insert: {
          categoria?: string | null
          conta_bancaria?: string | null
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          documento?: string | null
          email_cliente?: string | null
          id?: number
          nome_cliente?: string | null
          observacoes?: string | null
          organization_id?: string | null
          status?: string | null
          tags?: string | null
          telefone_cliente?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Update: {
          categoria?: string | null
          conta_bancaria?: string | null
          created_at?: string | null
          data?: string | null
          descricao?: string | null
          documento?: string | null
          email_cliente?: string | null
          id?: number
          nome_cliente?: string | null
          observacoes?: string | null
          organization_id?: string | null
          status?: string | null
          tags?: string | null
          telefone_cliente?: string | null
          tipo?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "despesas_recorrentes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_type: string | null
          id: string
          message: string
          organization_id: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_type?: string | null
          id?: string
          message: string
          organization_id?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_type?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          type: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          type?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          bank_account_id: string | null
          category_id: string | null
          client_id: string | null
          contract_id: string | null
          cost_center_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_date: string | null
          recurrence: Database["public"]["Enums"]["expense_recurrence"] | null
          recurrence_config: Json | null
          status: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          bank_account_id?: string | null
          category_id?: string | null
          client_id?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"] | null
          recurrence_config?: Json | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Update: {
          bank_account_id?: string | null
          category_id?: string | null
          client_id?: string | null
          contract_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          recurrence?: Database["public"]["Enums"]["expense_recurrence"] | null
          recurrence_config?: Json | null
          status?: Database["public"]["Enums"]["financial_entry_status"]
          supplier_id?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      general_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          module: string | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module?: string | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          module?: string | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string
          entity_type: string
          error_rows: number
          errors: Json | null
          id: string
          organization_id: string | null
          status: string
          success_rows: number
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          error_rows?: number
          errors?: Json | null
          id?: string
          organization_id?: string | null
          status?: string
          success_rows?: number
          total_rows?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          error_rows?: number
          errors?: Json | null
          id?: string
          organization_id?: string | null
          status?: string
          success_rows?: number
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          organization_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          organization_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          organization_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          bg_color: string | null
          card_color: string | null
          created_at: string | null
          custom_domain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          logo_url_light: string | null
          name: string
          primary_color: string | null
          settings: Json | null
          slug: string
          subdomain: string | null
          updated_at: string | null
          vercel_domain_status: string | null
        }
        Insert: {
          bg_color?: string | null
          card_color?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          logo_url_light?: string | null
          name: string
          primary_color?: string | null
          settings?: Json | null
          slug: string
          subdomain?: string | null
          updated_at?: string | null
          vercel_domain_status?: string | null
        }
        Update: {
          bg_color?: string | null
          card_color?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          logo_url_light?: string | null
          name?: string
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          subdomain?: string | null
          updated_at?: string | null
          vercel_domain_status?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          commission_type: string | null
          commission_value: number | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pop_checklist_items: {
        Row: {
          created_at: string
          id: string
          pop_id: string
          sort_order: number
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          pop_id: string
          sort_order?: number
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          pop_id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_checklist_items_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pops"
            referencedColumns: ["id"]
          },
        ]
      }
      pop_steps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pop_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pop_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pop_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pop_steps_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pops"
            referencedColumns: ["id"]
          },
        ]
      }
      pops: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string | null
          price: number | null
          price_package: number | null
          product_type_id: string | null
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          price_package?: number | null
          product_type_id?: string | null
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          price_package?: number | null
          product_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string
          commission_type: string | null
          commission_value: number | null
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_master: boolean
          last_access: string | null
          organization_id: string | null
          phone: string | null
          role_id: string | null
          salary: number | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          is_master?: boolean
          last_access?: string | null
          organization_id?: string | null
          phone?: string | null
          role_id?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_master?: boolean
          last_access?: string | null
          organization_id?: string | null
          phone?: string | null
          role_id?: string | null
          salary?: number | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          sort_order: number
          subtasks: Json | null
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          sort_order?: number
          subtasks?: Json | null
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          sort_order?: number
          subtasks?: Json | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          revenue_type_id: string | null
          service_type_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          revenue_type_id?: string | null
          service_type_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          revenue_type_id?: string | null
          service_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_types_revenue_type_id_fkey"
            columns: ["revenue_type_id"]
            isOneToOne: false
            referencedRelation: "revenue_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          contract_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          organization_id: string
          project_type_id: string | null
          responsible_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          organization_id?: string
          project_type_id?: string | null
          responsible_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          contract_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          organization_id?: string
          project_type_id?: string | null
          responsible_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_type_id_fkey"
            columns: ["project_type_id"]
            isOneToOne: false
            referencedRelation: "project_types"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      service_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          price: number | null
          service_type_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          price?: number | null
          service_type_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          price?: number | null
          service_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_rules: {
        Row: {
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          max_resolution_minutes: number
          max_response_minutes: number
          name: string
          organization_id: string | null
          priority: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          max_resolution_minutes?: number
          max_response_minutes?: number
          name: string
          organization_id?: string | null
          priority?: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          max_resolution_minutes?: number
          max_response_minutes?: number
          name?: string
          organization_id?: string | null
          priority?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          organization_id: string | null
          responsible_id: string | null
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string | null
          responsible_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          organization_id?: string | null
          responsible_id?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          archive_after_days: number
          created_at: string
          currency: string
          date_format: string
          default_checklist_rules: Json
          default_contract_rules: Json
          default_recurrence_rules: Json
          default_task_priority: string
          default_task_status: string
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          archive_after_days?: number
          created_at?: string
          currency?: string
          date_format?: string
          default_checklist_rules?: Json
          default_contract_rules?: Json
          default_recurrence_rules?: Json
          default_task_priority?: string
          default_task_status?: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          archive_after_days?: number
          created_at?: string
          currency?: string
          date_format?: string
          default_checklist_rules?: Json
          default_contract_rules?: Json
          default_recurrence_rules?: Json
          default_task_priority?: string
          default_task_status?: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          module: string | null
          name: string
          organization_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string | null
          name: string
          organization_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          module?: string | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checklist_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          organization_id: string | null
          sort_order: number
          task_id: string
          text: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          organization_id?: string | null
          sort_order?: number
          task_id: string
          text: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          organization_id?: string | null
          sort_order?: number
          task_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          depends_on_task_id: string
          id: string
          organization_id: string | null
          project_id: string | null
          task_id: string
        }
        Insert: {
          created_at?: string
          depends_on_task_id: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          task_id: string
        }
        Update: {
          created_at?: string
          depends_on_task_id?: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_goals: {
        Row: {
          client_id: string | null
          created_at: string
          current_count: number
          description: string | null
          end_date: string | null
          goal_type: string
          id: string
          organization_id: string | null
          period: string
          responsible_id: string | null
          start_date: string
          status: string
          target_count: number
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          current_count?: number
          description?: string | null
          end_date?: string | null
          goal_type?: string
          id?: string
          organization_id?: string | null
          period?: string
          responsible_id?: string | null
          start_date?: string
          status?: string
          target_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          current_count?: number
          description?: string | null
          end_date?: string | null
          goal_type?: string
          id?: string
          organization_id?: string | null
          period?: string
          responsible_id?: string | null
          start_date?: string
          status?: string
          target_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          organization_id: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          organization_id?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          organization_id?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string | null
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string | null
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number | null
          client_id: string
          contract_id: string | null
          created_at: string
          delivery_model_item_id: string | null
          description: string | null
          due_date: string | null
          estimated_minutes: number | null
          generation_period: string | null
          id: string
          is_recurring: boolean
          last_generated_at: string | null
          organization_id: string
          parent_task_id: string | null
          plan_id: string | null
          pop_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          recurrence_config: Json | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          responsible_id: string | null
          sla_id: string | null
          sla_resolution_deadline: string | null
          sla_response_deadline: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          actual_minutes?: number | null
          client_id: string
          contract_id?: string | null
          created_at?: string
          delivery_model_item_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          generation_period?: string | null
          id?: string
          is_recurring?: boolean
          last_generated_at?: string | null
          organization_id?: string
          parent_task_id?: string | null
          plan_id?: string | null
          pop_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_config?: Json | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          responsible_id?: string | null
          sla_id?: string | null
          sla_resolution_deadline?: string | null
          sla_response_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          actual_minutes?: number | null
          client_id?: string
          contract_id?: string | null
          created_at?: string
          delivery_model_item_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_minutes?: number | null
          generation_period?: string | null
          id?: string
          is_recurring?: boolean
          last_generated_at?: string | null
          organization_id?: string
          parent_task_id?: string | null
          plan_id?: string | null
          pop_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          recurrence_config?: Json | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          responsible_id?: string | null
          sla_id?: string | null
          sla_resolution_deadline?: string | null
          sla_response_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_delivery_model_item_id_fkey"
            columns: ["delivery_model_item_id"]
            isOneToOne: false
            referencedRelation: "delivery_model_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_pop_id_fkey"
            columns: ["pop_id"]
            isOneToOne: false
            referencedRelation: "pops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "sla_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client: { Args: { _client_id: string }; Returns: boolean }
      can_access_delivery_checklist: {
        Args: { _checklist_id: string }
        Returns: boolean
      }
      can_access_org: { Args: { _organization_id: string }; Returns: boolean }
      can_access_task: { Args: { _task_id: string }; Returns: boolean }
      can_access_task_attachment_path: {
        Args: { _path: string }
        Returns: boolean
      }
      check_subdomain_available: {
        Args: { _subdomain: string }
        Returns: boolean
      }
      get_user_client_id: { Args: never; Returns: string }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_permissions: { Args: { _user_id: string }; Returns: Json }
      has_any_admin: { Args: never; Returns: boolean }
      has_permission: {
        Args: { _perm_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master_user: { Args: never; Returns: boolean }
      log_audit: {
        Args: {
          _action: string
          _detail?: string
          _entity_id?: string
          _entity_type: string
          _new_data?: Json
          _old_data?: Json
          _user_id: string
        }
        Returns: undefined
      }
      log_sensitive_access: {
        Args: {
          _action?: string
          _entity_id?: string
          _entity_type: string
          _user_id: string
        }
        Returns: undefined
      }
      resolve_organization_by_host: { Args: { _host: string }; Returns: Json }
      rollback_import: { Args: { _batch_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "diretor"
        | "financeiro"
        | "gestor"
        | "social_media"
        | "designer"
        | "trafego"
        | "atendimento"
        | "assistente"
        | "parceiro"
        | "cliente_convidado"
      checklist_frequency: "semanal" | "quinzenal" | "mensal" | "personalizada"
      contract_status: "ativo" | "pausado" | "cancelado" | "encerrado"
      delivery_item_status:
        | "entregue"
        | "entregue_parcialmente"
        | "nao_entregue"
        | "nao_aplicavel"
      expense_recurrence: "recorrente" | "unica" | "parcelada"
      financial_entry_status: "pendente" | "pago" | "atrasado" | "cancelado"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status:
        | "pendente"
        | "em_andamento"
        | "pausado"
        | "concluido"
        | "arquivado"
      task_type:
        | "conteudo"
        | "trafego"
        | "reuniao"
        | "relatorio"
        | "design"
        | "desenvolvimento"
        | "outro"
      user_status: "ativo" | "inativo" | "bloqueado" | "pendente"
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
        "diretor",
        "financeiro",
        "gestor",
        "social_media",
        "designer",
        "trafego",
        "atendimento",
        "assistente",
        "parceiro",
        "cliente_convidado",
      ],
      checklist_frequency: ["semanal", "quinzenal", "mensal", "personalizada"],
      contract_status: ["ativo", "pausado", "cancelado", "encerrado"],
      delivery_item_status: [
        "entregue",
        "entregue_parcialmente",
        "nao_entregue",
        "nao_aplicavel",
      ],
      expense_recurrence: ["recorrente", "unica", "parcelada"],
      financial_entry_status: ["pendente", "pago", "atrasado", "cancelado"],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: [
        "pendente",
        "em_andamento",
        "pausado",
        "concluido",
        "arquivado",
      ],
      task_type: [
        "conteudo",
        "trafego",
        "reuniao",
        "relatorio",
        "design",
        "desenvolvimento",
        "outro",
      ],
      user_status: ["ativo", "inativo", "bloqueado", "pendente"],
    },
  },
} as const
