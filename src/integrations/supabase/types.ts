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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      equipment: {
        Row: {
          code: string
          created_at: string
          equipment_type: string
          id: string
          last_maintenance_date: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          status: string
          updated_at: string
          work_center_id: string
        }
        Insert: {
          code: string
          created_at?: string
          equipment_type?: string
          id?: string
          last_maintenance_date?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          work_center_id: string
        }
        Update: {
          code?: string
          created_at?: string
          equipment_type?: string
          id?: string
          last_maintenance_date?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          available_quantity: number | null
          id: string
          last_updated: string
          product_id: string
          quantity: number
          reserved_quantity: number
          warehouse_id: string
        }
        Insert: {
          available_quantity?: number | null
          id?: string
          last_updated?: string
          product_id: string
          quantity?: number
          reserved_quantity?: number
          warehouse_id: string
        }
        Update: {
          available_quantity?: number | null
          id?: string
          last_updated?: string
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issue_lines: {
        Row: {
          created_at: string
          id: string
          material_issue_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_issue_id: string
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          material_issue_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_issue_lines_material_issue_id_fkey"
            columns: ["material_issue_id"]
            isOneToOne: false
            referencedRelation: "material_issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issue_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      material_issues: {
        Row: {
          created_at: string
          id: string
          issue_date: string
          issue_number: string
          issued_by: string | null
          production_order_id: string
          status: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_date?: string
          issue_number: string
          issued_by?: string | null
          production_order_id: string
          status?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_date?: string
          issue_number?: string
          issued_by?: string | null
          production_order_id?: string
          status?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_issues_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      material_reservations: {
        Row: {
          created_at: string
          id: string
          issued_quantity: number
          product_id: string
          production_order_id: string
          reserved_quantity: number
          status: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issued_quantity?: number
          product_id: string
          production_order_id: string
          reserved_quantity: number
          status?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issued_quantity?: number
          product_id?: string
          production_order_id?: string
          reserved_quantity?: number
          status?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reservations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      mrp_calculation_results: {
        Row: {
          available: number
          calculation_id: string
          created_at: string
          gross_requirement: number
          id: string
          net_requirement: number
          on_hand: number
          product_id: string
          reserved: number
          status: string
        }
        Insert: {
          available?: number
          calculation_id: string
          created_at?: string
          gross_requirement?: number
          id?: string
          net_requirement?: number
          on_hand?: number
          product_id: string
          reserved?: number
          status: string
        }
        Update: {
          available?: number
          calculation_id?: string
          created_at?: string
          gross_requirement?: number
          id?: string
          net_requirement?: number
          on_hand?: number
          product_id?: string
          reserved?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mrp_calculation_results_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "mrp_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mrp_calculation_results_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mrp_calculations: {
        Row: {
          calculation_date: string
          created_at: string
          created_by: string | null
          id: string
          planning_horizon_days: number
          start_date: string
        }
        Insert: {
          calculation_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          planning_horizon_days: number
          start_date: string
        }
        Update: {
          calculation_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          planning_horizon_days?: number
          start_date?: string
        }
        Relationships: []
      }
      production_order_history: {
        Row: {
          change_type: string
          created_at: string
          description: string | null
          id: string
          new_value: string | null
          old_value: string | null
          production_order_id: string
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          production_order_id: string
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          production_order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_history_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      production_order_operations: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          completed_quantity: number
          created_at: string
          cycle_time_actual: number | null
          id: string
          notes: string | null
          operator_id: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          production_order_id: string
          routing_operation_id: string
          sequence: number
          setup_time_actual: number | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          completed_quantity?: number
          created_at?: string
          cycle_time_actual?: number | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          production_order_id: string
          routing_operation_id: string
          sequence: number
          setup_time_actual?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          completed_quantity?: number
          created_at?: string
          cycle_time_actual?: number | null
          id?: string
          notes?: string | null
          operator_id?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          production_order_id?: string
          routing_operation_id?: string
          sequence?: number
          setup_time_actual?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_order_operations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_operations_production_order_id_fkey"
            columns: ["production_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_order_operations_routing_operation_id_fkey"
            columns: ["routing_operation_id"]
            isOneToOne: false
            referencedRelation: "routing_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      production_orders: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          completed_quantity: number
          created_at: string
          id: string
          order_number: string
          planned_end_date: string
          planned_start_date: string
          priority: string
          product_id: string
          quantity: number
          responsible_person: string | null
          routing_sheet_id: string | null
          specification_id: string | null
          status: string
          updated_at: string
          work_center_id: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          completed_quantity?: number
          created_at?: string
          id?: string
          order_number: string
          planned_end_date: string
          planned_start_date: string
          priority?: string
          product_id: string
          quantity: number
          responsible_person?: string | null
          routing_sheet_id?: string | null
          specification_id?: string | null
          status?: string
          updated_at?: string
          work_center_id?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          completed_quantity?: number
          created_at?: string
          id?: string
          order_number?: string
          planned_end_date?: string
          planned_start_date?: string
          priority?: string
          product_id?: string
          quantity?: number
          responsible_person?: string | null
          routing_sheet_id?: string | null
          specification_id?: string | null
          status?: string
          updated_at?: string
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_routing_sheet_id_fkey"
            columns: ["routing_sheet_id"]
            isOneToOne: false
            referencedRelation: "routing_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          product_type: string
          unit: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_type?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_type?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_requisitions: {
        Row: {
          calculation_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          required_date: string
          requisition_number: string
          status: string
          updated_at: string
        }
        Insert: {
          calculation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          required_date: string
          requisition_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          calculation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          required_date?: string
          requisition_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_calculation_id_fkey"
            columns: ["calculation_id"]
            isOneToOne: false
            referencedRelation: "mrp_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_operations: {
        Row: {
          created_at: string
          cycle_time_minutes: number
          id: string
          name: string
          routing_sheet_id: string
          sequence: number
          setup_time_minutes: number
          work_center_id: string
        }
        Insert: {
          created_at?: string
          cycle_time_minutes: number
          id?: string
          name: string
          routing_sheet_id: string
          sequence: number
          setup_time_minutes?: number
          work_center_id: string
        }
        Update: {
          created_at?: string
          cycle_time_minutes?: number
          id?: string
          name?: string
          routing_sheet_id?: string
          sequence?: number
          setup_time_minutes?: number
          work_center_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_operations_routing_sheet_id_fkey"
            columns: ["routing_sheet_id"]
            isOneToOne: false
            referencedRelation: "routing_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_operations_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_sheets: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          product_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_sheets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      specification_materials: {
        Row: {
          created_at: string
          id: string
          material_id: string
          quantity: number
          specification_id: string
          waste_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          quantity: number
          specification_id: string
          waste_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          quantity?: number
          specification_id?: string
          waste_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "specification_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_materials_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
        ]
      }
      specifications: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          updated_at: string
          version: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          updated_at?: string
          version?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "specifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          updated_at: string
          warehouse_type: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          updated_at?: string
          warehouse_type?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          updated_at?: string
          warehouse_type?: string
        }
        Relationships: []
      }
      work_centers: {
        Row: {
          capacity_minutes_per_day: number
          code: string
          created_at: string
          department: string | null
          efficiency_percent: number
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity_minutes_per_day?: number
          code: string
          created_at?: string
          department?: string | null
          efficiency_percent?: number
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity_minutes_per_day?: number
          code?: string
          created_at?: string
          department?: string | null
          efficiency_percent?: number
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "production_manager"
        | "warehouse_manager"
        | "operator"
        | "viewer"
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
        "production_manager",
        "warehouse_manager",
        "operator",
        "viewer",
      ],
    },
  },
} as const
