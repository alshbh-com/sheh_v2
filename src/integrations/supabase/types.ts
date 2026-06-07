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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          section: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          section?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          section?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      admin_user_permissions: {
        Row: {
          admin_user_id: string | null
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          permission: string
          permission_key: string | null
          permission_type: string
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          admin_user_id?: string | null
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          permission: string
          permission_key?: string | null
          permission_type?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          admin_user_id?: string | null
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          permission?: string
          permission_key?: string | null
          permission_type?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_permissions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          is_active: boolean
          password: string
          phone: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          password: string
          phone?: string | null
          role?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          password?: string
          phone?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      agent_daily_closings: {
        Row: {
          closed_by: string | null
          closed_by_username: string | null
          closing_date: string
          created_at: string
          delivery_agent_id: string | null
          id: string
          net_amount: number
          notes: string | null
        }
        Insert: {
          closed_by?: string | null
          closed_by_username?: string | null
          closing_date?: string
          created_at?: string
          delivery_agent_id?: string | null
          id?: string
          net_amount?: number
          notes?: string | null
        }
        Update: {
          closed_by?: string | null
          closed_by_username?: string | null
          closing_date?: string
          created_at?: string
          delivery_agent_id?: string | null
          id?: string
          net_amount?: number
          notes?: string | null
        }
        Relationships: []
      }
      agent_payments: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          amount: number
          created_at: string
          created_by: string | null
          delivery_agent_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_date: string
          payment_method: string
          payment_type: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          delivery_agent_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          delivery_agent_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_date?: string
          payment_method?: string
          payment_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          payload: Json
          product_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json
          product_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          payload?: Json
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          active_template: string
          active_theme: string
          brand_name: string
          created_at: string
          id: string
          invoice_footer: string | null
          invoice_name: string
          invoice_prefix: string
          invoice_warning: string | null
          logo_url: string | null
          platform_name: string
          settings: Json
          updated_at: string
          watermark_url: string | null
        }
        Insert: {
          active_template?: string
          active_theme?: string
          brand_name?: string
          created_at?: string
          id?: string
          invoice_footer?: string | null
          invoice_name?: string
          invoice_prefix?: string
          invoice_warning?: string | null
          logo_url?: string | null
          platform_name?: string
          settings?: Json
          updated_at?: string
          watermark_url?: string | null
        }
        Update: {
          active_template?: string
          active_theme?: string
          brand_name?: string
          created_at?: string
          id?: string
          invoice_footer?: string | null
          invoice_name?: string
          invoice_prefix?: string
          invoice_warning?: string | null
          logo_url?: string | null
          platform_name?: string
          settings?: Json
          updated_at?: string
          watermark_url?: string | null
        }
        Relationships: []
      }
      cashbox: {
        Row: {
          amount: number
          balance: number
          created_at: string
          description: string | null
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          opening_balance: number
          payment_method: string
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          balance?: number
          created_at?: string
          description?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          opening_balance?: number
          payment_method?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          created_at?: string
          description?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          opening_balance?: number
          payment_method?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      cashbox_transactions: {
        Row: {
          amount: number
          cashbox_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          payment_method: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cashbox_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cashbox_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashbox_transactions_cashbox_id_fkey"
            columns: ["cashbox_id"]
            isOneToOne: false
            referencedRelation: "cashbox"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          governorate: string | null
          id: string
          last_order_at: string | null
          name: string
          notes: string | null
          phone: string
          phone2: string | null
          secondary_phone: string | null
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          governorate?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          notes?: string | null
          phone: string
          phone2?: string | null
          secondary_phone?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          governorate?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          notes?: string | null
          phone?: string
          phone2?: string | null
          secondary_phone?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_agents: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          governorate: string | null
          id: string
          is_active: boolean
          is_deleted: boolean
          name: string
          notes: string | null
          phone: string | null
          serial_number: string | null
          total_owed: number
          total_paid: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          serial_number?: string | null
          total_owed?: number
          total_paid?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          is_deleted?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          serial_number?: string | null
          total_owed?: number
          total_paid?: number
          updated_at?: string
        }
        Relationships: []
      }
      governorates: {
        Row: {
          agent_shipping_cost: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          shipping_cost: number
          updated_at: string
        }
        Insert: {
          agent_shipping_cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          shipping_cost?: number
          updated_at?: string
        }
        Update: {
          agent_shipping_cost?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          shipping_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      offices: {
        Row: {
          address: string | null
          created_at: string
          id: string
          invoice_prefix: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json
          updated_at: string
          watermark_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json
          updated_at?: string
          watermark_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          invoice_prefix?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json
          updated_at?: string
          watermark_url?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          price: number
          product_barcode: string | null
          product_code: string | null
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          price?: number
          product_barcode?: string | null
          product_code?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          size?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          price?: number
          product_barcode?: string | null
          product_code?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_username: string | null
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          order_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_username?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_username?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_id?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          agent_shipping_cost: number
          assigned_at: string | null
          city: string | null
          created_at: string
          created_by: string | null
          created_by_username: string | null
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_agent_id: string | null
          discount: number
          governorate: string | null
          governorate_id: string | null
          id: string
          invoice_number: string
          is_printed: boolean
          locked_at: string | null
          manual_code: string | null
          metadata: Json
          notes: string | null
          office_id: string | null
          order_details: string | null
          order_number: string | null
          paid_amount: number
          payment_date: string | null
          payment_status: string
          returned_at: string | null
          shipping_cost: number
          source: string
          status: string
          subtotal: number
          total_amount: number
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          agent_shipping_cost?: number
          assigned_at?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_username?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_agent_id?: string | null
          discount?: number
          governorate?: string | null
          governorate_id?: string | null
          id?: string
          invoice_number: string
          is_printed?: boolean
          locked_at?: string | null
          manual_code?: string | null
          metadata?: Json
          notes?: string | null
          office_id?: string | null
          order_details?: string | null
          order_number?: string | null
          paid_amount?: number
          payment_date?: string | null
          payment_status?: string
          returned_at?: string | null
          shipping_cost?: number
          source?: string
          status?: string
          subtotal?: number
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          agent_shipping_cost?: number
          assigned_at?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          created_by_username?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_agent_id?: string | null
          discount?: number
          governorate?: string | null
          governorate_id?: string | null
          id?: string
          invoice_number?: string
          is_printed?: boolean
          locked_at?: string | null
          manual_code?: string | null
          metadata?: Json
          notes?: string | null
          office_id?: string | null
          order_details?: string | null
          order_number?: string | null
          paid_amount?: number
          payment_date?: string | null
          payment_status?: string
          returned_at?: string | null
          shipping_cost?: number
          source?: string
          status?: string
          subtotal?: number
          total_amount?: number
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_governorate_id_fkey"
            columns: ["governorate_id"]
            isOneToOne: false
            referencedRelation: "governorates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_color_variants: {
        Row: {
          color: string
          created_at: string
          id: string
          image_url: string | null
          product_id: string | null
          size: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string | null
          size?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          product_id?: string | null
          size?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_color_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          category_id: string | null
          code: string
          color: string | null
          color_options: string[] | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          images: string[]
          is_active: boolean
          is_offer: boolean
          metadata: Json
          min_price: number
          name: string
          offer_price: number | null
          price: number
          purchase_price: number
          quantity: number
          quantity_pricing: Json
          sale_price: number
          size: string | null
          size_options: string[] | null
          stock: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          category_id?: string | null
          code: string
          color?: string | null
          color_options?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[]
          is_active?: boolean
          is_offer?: boolean
          metadata?: Json
          min_price?: number
          name: string
          offer_price?: number | null
          price?: number
          purchase_price?: number
          quantity?: number
          quantity_pricing?: Json
          sale_price?: number
          size?: string | null
          size_options?: string[] | null
          stock?: number
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          barcode?: string | null
          category?: string | null
          category_id?: string | null
          code?: string
          color?: string | null
          color_options?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          images?: string[]
          is_active?: boolean
          is_offer?: boolean
          metadata?: Json
          min_price?: number
          name?: string
          offer_price?: number | null
          price?: number
          purchase_price?: number
          quantity?: number
          quantity_pricing?: Json
          sale_price?: number
          size?: string | null
          size_options?: string[] | null
          stock?: number
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_agent_id: string | null
          id: string
          order_id: string | null
          order_item_id: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          reason: string | null
          return_amount: number
          returned_at: string
          returned_items: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_agent_id?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          reason?: string | null
          return_amount?: number
          returned_at?: string
          returned_items?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_agent_id?: string | null
          id?: string
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          reason?: string | null
          return_amount?: number
          returned_at?: string
          returned_items?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_delivery_agent_id_fkey"
            columns: ["delivery_agent_id"]
            isOneToOne: false
            referencedRelation: "delivery_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          order_id: string | null
          payload: Json
          session_id: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_id?: string | null
          payload?: Json
          session_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_id?: string | null
          payload?: Json
          session_id?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_session_items: {
        Row: {
          barcode: string | null
          code: string | null
          created_at: string
          id: string
          order_id: string | null
          payload: Json
          product_id: string | null
          product_name: string | null
          quantity: number
          scan_session_id: string | null
          scanned_at: string
          scanned_code: string | null
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          code?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          scan_session_id?: string | null
          scanned_at?: string
          scanned_code?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          code?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          payload?: Json
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          scan_session_id?: string | null
          scanned_at?: string
          scanned_code?: string | null
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_session_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_session_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_session_items_scan_session_id_fkey"
            columns: ["scan_session_id"]
            isOneToOne: false
            referencedRelation: "scan_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          ended_at: string | null
          id: string
          name: string | null
          payload: Json
          scanned_items: number
          session_id: string | null
          started_at: string
          started_by: string | null
          started_by_username: string | null
          status: string
          total_items: number
          total_scanned: number
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          name?: string | null
          payload?: Json
          scanned_items?: number
          session_id?: string | null
          started_at?: string
          started_by?: string | null
          started_by_username?: string | null
          status?: string
          total_items?: number
          total_scanned?: number
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          name?: string | null
          payload?: Json
          scanned_items?: number
          session_id?: string | null
          started_at?: string
          started_by?: string | null
          started_by_username?: string | null
          status?: string
          total_items?: number
          total_scanned?: number
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      statistics: {
        Row: {
          created_at: string
          id: string
          payload: Json
          stat_date: string
          total_customers: number
          total_orders: number
          total_products: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          stat_date?: string
          total_customers?: number
          total_orders?: number
          total_products?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          stat_date?: string
          total_customers?: number
          total_orders?: number
          total_products?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_passwords: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          password: string | null
          password_type: string
          password_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          password?: string | null
          password_type: string
          password_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          password?: string | null
          password_type?: string
          password_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      treasury: {
        Row: {
          balance: number
          cash_balance: number
          created_at: string
          id: string
          name: string
          notes: string | null
          transfer_balance: number
          type: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          cash_balance?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          transfer_balance?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          cash_balance?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          transfer_balance?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_activity_logs: { Args: never; Returns: undefined }
      reset_order_sequence: { Args: never; Returns: undefined }
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
