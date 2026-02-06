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
      absence_compensations: {
        Row: {
          absence_date: string
          absence_hours: number
          created_at: string
          created_by: string | null
          id: string
          operator_id: string
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          absence_date: string
          absence_hours?: number
          created_at?: string
          created_by?: string | null
          id?: string
          operator_id: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          absence_date?: string
          absence_hours?: number
          created_at?: string
          created_by?: string | null
          id?: string
          operator_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_compensations_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      brigade_assignments: {
        Row: {
          assignment_date: string
          brigade_id: string
          created_at: string
          id: string
          notes: string | null
          planned_end_time: string | null
          planned_start_time: string | null
          production_order_operation_id: string
          shift_number: number
          status: string
          updated_at: string
        }
        Insert: {
          assignment_date: string
          brigade_id: string
          created_at?: string
          id?: string
          notes?: string | null
          planned_end_time?: string | null
          planned_start_time?: string | null
          production_order_operation_id: string
          shift_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          assignment_date?: string
          brigade_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          planned_end_time?: string | null
          planned_start_time?: string | null
          production_order_operation_id?: string
          shift_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brigade_assignments_brigade_id_fkey"
            columns: ["brigade_id"]
            isOneToOne: false
            referencedRelation: "brigades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brigade_assignments_production_order_operation_id_fkey"
            columns: ["production_order_operation_id"]
            isOneToOne: false
            referencedRelation: "production_order_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      brigade_member_history: {
        Row: {
          action_type: string
          brigade_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_role: string | null
          old_role: string | null
          operator_id: string
        }
        Insert: {
          action_type: string
          brigade_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_role?: string | null
          old_role?: string | null
          operator_id: string
        }
        Update: {
          action_type?: string
          brigade_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_role?: string | null
          old_role?: string | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brigade_member_history_brigade_id_fkey"
            columns: ["brigade_id"]
            isOneToOne: false
            referencedRelation: "brigades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brigade_member_history_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      brigade_members: {
        Row: {
          brigade_id: string
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          operator_id: string
          role: string
        }
        Insert: {
          brigade_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          operator_id: string
          role?: string
        }
        Update: {
          brigade_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          operator_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "brigade_members_brigade_id_fkey"
            columns: ["brigade_id"]
            isOneToOne: false
            referencedRelation: "brigades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brigade_members_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      brigades: {
        Row: {
          brigade_type: string
          code: string
          created_at: string
          default_work_center_id: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          productivity_factor: number
          updated_at: string
          work_schedule_id: string | null
        }
        Insert: {
          brigade_type?: string
          code: string
          created_at?: string
          default_work_center_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          productivity_factor?: number
          updated_at?: string
          work_schedule_id?: string | null
        }
        Update: {
          brigade_type?: string
          code?: string
          created_at?: string
          default_work_center_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          productivity_factor?: number
          updated_at?: string
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brigades_default_work_center_id_fkey"
            columns: ["default_work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brigades_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_exceptions: {
        Row: {
          created_at: string
          description: string | null
          exception_date: string
          exception_type: string
          id: string
          is_working_day: boolean
          name: string
          reduced_hours: number | null
          reduction_hours: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exception_date: string
          exception_type?: string
          id?: string
          is_working_day?: boolean
          name: string
          reduced_hours?: number | null
          reduction_hours?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exception_date?: string
          exception_type?: string
          id?: string
          is_working_day?: boolean
          name?: string
          reduced_hours?: number | null
          reduction_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          changes: string[]
          created_at: string
          created_by: string | null
          date: string
          id: string
          is_published: boolean
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          changes?: string[]
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          changes?: string[]
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      changelog_views: {
        Row: {
          changelog_id: string
          id: string
          user_id: string
          view_source: string | null
          viewed_at: string
        }
        Insert: {
          changelog_id: string
          id?: string
          user_id: string
          view_source?: string | null
          viewed_at?: string
        }
        Update: {
          changelog_id?: string
          id?: string
          user_id?: string
          view_source?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_views_changelog_id_fkey"
            columns: ["changelog_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_records: {
        Row: {
          absence_compensation_id: string
          compensation_date: string
          created_at: string
          created_by: string | null
          hours_worked: number
          id: string
          notes: string | null
          operator_id: string
          status: string
        }
        Insert: {
          absence_compensation_id: string
          compensation_date: string
          created_at?: string
          created_by?: string | null
          hours_worked?: number
          id?: string
          notes?: string | null
          operator_id: string
          status?: string
        }
        Update: {
          absence_compensation_id?: string
          compensation_date?: string
          created_at?: string
          created_by?: string | null
          hours_worked?: number
          id?: string
          notes?: string | null
          operator_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_records_absence_compensation_id_fkey"
            columns: ["absence_compensation_id"]
            isOneToOne: false
            referencedRelation: "absence_compensations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compensation_records_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          inn: string | null
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          inn: string | null
          is_active: boolean
          kpp: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          is_active?: boolean
          kpp?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          inn?: string | null
          is_active?: boolean
          kpp?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      distribution_history: {
        Row: {
          components_distributed: number
          created_at: string
          id: string
          notes: string | null
          operations_affected: number
          routing_sheet_id: string
          strategy: string
          user_id: string | null
        }
        Insert: {
          components_distributed?: number
          created_at?: string
          id?: string
          notes?: string | null
          operations_affected?: number
          routing_sheet_id: string
          strategy: string
          user_id?: string | null
        }
        Update: {
          components_distributed?: number
          created_at?: string
          id?: string
          notes?: string | null
          operations_affected?: number
          routing_sheet_id?: string
          strategy?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_history_routing_sheet_id_fkey"
            columns: ["routing_sheet_id"]
            isOneToOne: false
            referencedRelation: "routing_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_history: {
        Row: {
          created_at: string
          created_by: string | null
          event_date: string
          event_type: string
          id: string
          notes: string | null
          operator_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_date: string
          event_type: string
          id?: string
          notes?: string | null
          operator_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          operator_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employment_history_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
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
          power_consumption_kwh: number | null
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
          power_consumption_kwh?: number | null
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
          power_consumption_kwh?: number | null
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
      feature_comments: {
        Row: {
          content: string
          created_at: string
          feature_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feature_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feature_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_statuses: {
        Row: {
          id: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      material_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      operator_absences: {
        Row: {
          absence_type: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          operator_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          absence_type: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          operator_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          absence_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          operator_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_absences_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_assignments: {
        Row: {
          assignment_date: string
          created_at: string
          id: string
          notes: string | null
          operator_id: string
          planned_end_time: string | null
          planned_start_time: string | null
          production_order_operation_id: string
          shift_number: number
          status: string
          updated_at: string
        }
        Insert: {
          assignment_date: string
          created_at?: string
          id?: string
          notes?: string | null
          operator_id: string
          planned_end_time?: string | null
          planned_start_time?: string | null
          production_order_operation_id: string
          shift_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          assignment_date?: string
          created_at?: string
          id?: string
          notes?: string | null
          operator_id?: string
          planned_end_time?: string | null
          planned_start_time?: string | null
          production_order_operation_id?: string
          shift_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_assignments_production_order_operation_id_fkey"
            columns: ["production_order_operation_id"]
            isOneToOne: false
            referencedRelation: "production_order_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_schedule_history: {
        Row: {
          assigned_shift_id: string | null
          assigned_shift_name: string | null
          assigned_shift_number: number | null
          change_reason: string | null
          changed_by: string | null
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          operator_id: string
          shift_rotation_enabled: boolean | null
          shift_rotation_start_date: string | null
          work_schedule_id: string | null
          work_schedule_name: string | null
        }
        Insert: {
          assigned_shift_id?: string | null
          assigned_shift_name?: string | null
          assigned_shift_number?: number | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          operator_id: string
          shift_rotation_enabled?: boolean | null
          shift_rotation_start_date?: string | null
          work_schedule_id?: string | null
          work_schedule_name?: string | null
        }
        Update: {
          assigned_shift_id?: string | null
          assigned_shift_name?: string | null
          assigned_shift_number?: number | null
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          operator_id?: string
          shift_rotation_enabled?: boolean | null
          shift_rotation_start_date?: string | null
          work_schedule_id?: string | null
          work_schedule_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_schedule_history_assigned_shift_id_fkey"
            columns: ["assigned_shift_id"]
            isOneToOne: false
            referencedRelation: "work_schedule_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_schedule_history_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_schedule_history_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_schedule_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_working_day: boolean
          notes: string | null
          operator_id: string
          original_cycle_start_date: string | null
          override_date: string
          reason: string | null
          shift_number: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_working_day?: boolean
          notes?: string | null
          operator_id: string
          original_cycle_start_date?: string | null
          override_date: string
          reason?: string | null
          shift_number?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_working_day?: boolean
          notes?: string | null
          operator_id?: string
          original_cycle_start_date?: string | null
          override_date?: string
          reason?: string | null
          shift_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_schedule_overrides_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_skills: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          operator_id: string
          skill_level: number
          standard_operation_id: string | null
          work_center_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          operator_id: string
          skill_level?: number
          standard_operation_id?: string | null
          work_center_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          operator_id?: string
          skill_level?: number
          standard_operation_id?: string | null
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_skills_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_skills_standard_operation_id_fkey"
            columns: ["standard_operation_id"]
            isOneToOne: false
            referencedRelation: "standard_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operator_skills_work_center_id_fkey"
            columns: ["work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_timesheets: {
        Row: {
          actual_minutes: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          operator_id: string
          overtime_minutes: number
          planned_minutes: number
          status: string
          updated_at: string
          work_date: string
        }
        Insert: {
          actual_minutes?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          operator_id: string
          overtime_minutes?: number
          planned_minutes?: number
          status?: string
          updated_at?: string
          work_date: string
        }
        Update: {
          actual_minutes?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          operator_id?: string
          overtime_minutes?: number
          planned_minutes?: number
          status?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_timesheets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          assigned_shift_number: number | null
          code: string
          created_at: string
          default_work_center_id: string | null
          email: string | null
          employee_type: string
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          position: string | null
          shift_rotation_enabled: boolean | null
          shift_rotation_start_date: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          work_schedule_id: string | null
        }
        Insert: {
          assigned_shift_number?: number | null
          code: string
          created_at?: string
          default_work_center_id?: string | null
          email?: string | null
          employee_type?: string
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          position?: string | null
          shift_rotation_enabled?: boolean | null
          shift_rotation_start_date?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          work_schedule_id?: string | null
        }
        Update: {
          assigned_shift_number?: number | null
          code?: string
          created_at?: string
          default_work_center_id?: string | null
          email?: string | null
          employee_type?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          position?: string | null
          shift_rotation_enabled?: boolean | null
          shift_rotation_start_date?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_default_work_center_id_fkey"
            columns: ["default_work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operators_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          description: string
          duration_minutes: number | null
          end_time: string
          id: string
          operator_id: string
          start_time: string
          status: string
          timesheet_id: string | null
          updated_at: string
          work_date: string
          work_order_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          duration_minutes?: number | null
          end_time: string
          id?: string
          operator_id: string
          start_time: string
          status?: string
          timesheet_id?: string | null
          updated_at?: string
          work_date: string
          work_order_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number | null
          end_time?: string
          id?: string
          operator_id?: string
          start_time?: string
          status?: string
          timesheet_id?: string | null
          updated_at?: string
          work_date?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overtime_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_entries_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: false
            referencedRelation: "operator_timesheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_entries_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_medals_settings: {
        Row: {
          id: string
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      overtime_monthly_medals: {
        Row: {
          created_at: string
          id: string
          medal_type: string
          month: number
          operator_id: string
          total_overtime_minutes: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          medal_type: string
          month: number
          operator_id: string
          total_overtime_minutes?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          medal_type?: string
          month?: number
          operator_id?: string
          total_overtime_minutes?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "overtime_monthly_medals_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      production_calendar: {
        Row: {
          calendar_date: string
          created_at: string
          day_type: string
          id: string
          notes: string | null
          work_schedule_id: string | null
        }
        Insert: {
          calendar_date: string
          created_at?: string
          day_type?: string
          id?: string
          notes?: string | null
          work_schedule_id?: string | null
        }
        Update: {
          calendar_date?: string
          created_at?: string
          day_type?: string
          id?: string
          notes?: string | null
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_calendar_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
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
          external_actual_date: string | null
          external_planned_date: string | null
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
          external_actual_date?: string | null
          external_planned_date?: string | null
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
          external_actual_date?: string | null
          external_planned_date?: string | null
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
          customer_id: string | null
          id: string
          order_number: string
          original_quantity: number | null
          parent_order_id: string | null
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
          customer_id?: string | null
          id?: string
          order_number: string
          original_quantity?: number | null
          parent_order_id?: string | null
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
          customer_id?: string | null
          id?: string
          order_number?: string
          original_quantity?: number | null
          parent_order_id?: string | null
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
            foreignKeyName: "production_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "production_orders"
            referencedColumns: ["id"]
          },
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
          category: string | null
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
          category?: string | null
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
          category?: string | null
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
      routing_operation_materials: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity_per_operation: number | null
          routing_operation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity_per_operation?: number | null
          routing_operation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity_per_operation?: number | null
          routing_operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_operation_materials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_operation_materials_routing_operation_id_fkey"
            columns: ["routing_operation_id"]
            isOneToOne: false
            referencedRelation: "routing_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_operations: {
        Row: {
          contractor_id: string | null
          created_at: string
          cycle_time_minutes: number
          external_contractor: string | null
          external_lead_time_days: number | null
          id: string
          is_external: boolean
          name: string
          operation_type: string
          routing_sheet_id: string
          sequence: number
          setup_time_minutes: number
          standard_operation_id: string | null
          work_center_id: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string
          cycle_time_minutes: number
          external_contractor?: string | null
          external_lead_time_days?: number | null
          id?: string
          is_external?: boolean
          name: string
          operation_type?: string
          routing_sheet_id: string
          sequence: number
          setup_time_minutes?: number
          standard_operation_id?: string | null
          work_center_id?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string
          cycle_time_minutes?: number
          external_contractor?: string | null
          external_lead_time_days?: number | null
          id?: string
          is_external?: boolean
          name?: string
          operation_type?: string
          routing_sheet_id?: string
          sequence?: number
          setup_time_minutes?: number
          standard_operation_id?: string | null
          work_center_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routing_operations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_operations_routing_sheet_id_fkey"
            columns: ["routing_sheet_id"]
            isOneToOne: false
            referencedRelation: "routing_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routing_operations_standard_operation_id_fkey"
            columns: ["standard_operation_id"]
            isOneToOne: false
            referencedRelation: "standard_operations"
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
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          product_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string
          sort_order?: number | null
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
      specification_history: {
        Row: {
          change_type: string
          created_at: string
          description: string | null
          id: string
          new_value: string | null
          old_value: string | null
          specification_id: string
          user_id: string
        }
        Insert: {
          change_type: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          specification_id: string
          user_id: string
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          specification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "specification_history_specification_id_fkey"
            columns: ["specification_id"]
            isOneToOne: false
            referencedRelation: "specifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          has_no_specification: boolean
          id: string
          is_active: boolean
          product_id: string
          updated_at: string
          version: string
        }
        Insert: {
          code: string
          created_at?: string
          has_no_specification?: boolean
          id?: string
          is_active?: boolean
          product_id: string
          updated_at?: string
          version?: string
        }
        Update: {
          code?: string
          created_at?: string
          has_no_specification?: boolean
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
      standard_operations: {
        Row: {
          code: string
          created_at: string
          default_cycle_time_minutes: number | null
          default_setup_time_minutes: number | null
          default_work_center_id: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          operation_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_cycle_time_minutes?: number | null
          default_setup_time_minutes?: number | null
          default_work_center_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          operation_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_cycle_time_minutes?: number | null
          default_setup_time_minutes?: number | null
          default_work_center_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          operation_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "standard_operations_default_work_center_id_fkey"
            columns: ["default_work_center_id"]
            isOneToOne: false
            referencedRelation: "work_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_history: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_actual_minutes: number | null
          new_notes: string | null
          new_planned_minutes: number | null
          new_status: string | null
          old_actual_minutes: number | null
          old_notes: string | null
          old_planned_minutes: number | null
          old_status: string | null
          operator_id: string
          timesheet_id: string
          work_date: string
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_actual_minutes?: number | null
          new_notes?: string | null
          new_planned_minutes?: number | null
          new_status?: string | null
          old_actual_minutes?: number | null
          old_notes?: string | null
          old_planned_minutes?: number | null
          old_status?: string | null
          operator_id: string
          timesheet_id: string
          work_date: string
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_actual_minutes?: number | null
          new_notes?: string | null
          new_planned_minutes?: number | null
          new_status?: string | null
          old_actual_minutes?: number | null
          old_notes?: string | null
          old_planned_minutes?: number | null
          old_status?: string | null
          operator_id?: string
          timesheet_id?: string
          work_date?: string
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
      user_seen_changelog: {
        Row: {
          changelog_id: string
          id: string
          seen_at: string
          user_id: string
        }
        Insert: {
          changelog_id: string
          id?: string
          seen_at?: string
          user_id: string
        }
        Update: {
          changelog_id?: string
          id?: string
          seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_seen_changelog_changelog_id_fkey"
            columns: ["changelog_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
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
          operators_per_shift: number | null
          resource_type: string | null
          status: string
          updated_at: string
          work_schedule_id: string | null
        }
        Insert: {
          capacity_minutes_per_day?: number
          code: string
          created_at?: string
          department?: string | null
          efficiency_percent?: number
          id?: string
          name: string
          operators_per_shift?: number | null
          resource_type?: string | null
          status?: string
          updated_at?: string
          work_schedule_id?: string | null
        }
        Update: {
          capacity_minutes_per_day?: number
          code?: string
          created_at?: string
          department?: string | null
          efficiency_percent?: number
          id?: string
          name?: string
          operators_per_shift?: number | null
          resource_type?: string | null
          status?: string
          updated_at?: string
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_centers_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedule_breaks: {
        Row: {
          break_name: string
          created_at: string
          duration_minutes: number
          id: string
          is_paid: boolean
          shift_id: string
          start_time: string
        }
        Insert: {
          break_name: string
          created_at?: string
          duration_minutes: number
          id?: string
          is_paid?: boolean
          shift_id: string
          start_time: string
        }
        Update: {
          break_name?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_paid?: boolean
          shift_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedule_breaks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "work_schedule_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedule_shifts: {
        Row: {
          break_minutes: number
          created_at: string
          end_time: string
          gross_work_minutes: number
          id: string
          net_work_minutes: number | null
          shift_name: string
          shift_number: number
          start_time: string
          work_schedule_id: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          gross_work_minutes?: number
          id?: string
          net_work_minutes?: number | null
          shift_name: string
          shift_number?: number
          start_time?: string
          work_schedule_id: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          end_time?: string
          gross_work_minutes?: number
          id?: string
          net_work_minutes?: number | null
          shift_name?: string
          shift_number?: number
          start_time?: string
          work_schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedule_shifts_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          code: string
          created_at: string
          cycle_days_off: number
          cycle_days_on: number
          cycle_start_date: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          reduction_hours: number | null
          schedule_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          cycle_days_off?: number
          cycle_days_on?: number
          cycle_start_date?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          reduction_hours?: number | null
          schedule_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          cycle_days_off?: number
          cycle_days_on?: number
          cycle_start_date?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          reduction_hours?: number | null
          schedule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_brigade_code: { Args: never; Returns: string }
      generate_contractor_code: { Args: never; Returns: string }
      generate_customer_code: { Args: never; Returns: string }
      generate_equipment_code: { Args: never; Returns: string }
      generate_operator_code: { Args: never; Returns: string }
      generate_product_code: {
        Args: { p_product_type: string }
        Returns: string
      }
      generate_routing_sheet_code: { Args: never; Returns: string }
      generate_specification_code: { Args: never; Returns: string }
      generate_standard_operation_code: { Args: never; Returns: string }
      generate_warehouse_code: { Args: never; Returns: string }
      generate_work_center_code: { Args: never; Returns: string }
      generate_work_schedule_code: { Args: never; Returns: string }
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
      merge_operator_absences: {
        Args: {
          p_end_date?: string
          p_operator_id: string
          p_start_date?: string
        }
        Returns: {
          merged_count: number
          remaining_count: number
        }[]
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
