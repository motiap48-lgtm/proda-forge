-- Fix overly permissive RLS policies - require authentication for all operations
-- and implement role-based access for write operations

-- Drop all existing "Allow public" policies and create proper authenticated policies

-- ============================================
-- PRODUCTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public insert access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public update access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public delete access on products" ON public.products;

CREATE POLICY "Authenticated users can read products" ON public.products
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert products" ON public.products
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can update products" ON public.products
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can delete products" ON public.products
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- WAREHOUSES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public insert access on warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public update access on warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Allow public delete access on warehouses" ON public.warehouses;

CREATE POLICY "Authenticated users can read warehouses" ON public.warehouses
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert warehouses" ON public.warehouses
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can update warehouses" ON public.warehouses
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can delete warehouses" ON public.warehouses
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- INVENTORY TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public insert access on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public update access on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public delete access on inventory" ON public.inventory;

CREATE POLICY "Authenticated users can read inventory" ON public.inventory
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert inventory" ON public.inventory
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can update inventory" ON public.inventory
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can delete inventory" ON public.inventory
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

-- ============================================
-- WORK_CENTERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on work_centers" ON public.work_centers;
DROP POLICY IF EXISTS "Allow public insert access on work_centers" ON public.work_centers;
DROP POLICY IF EXISTS "Allow public update access on work_centers" ON public.work_centers;
DROP POLICY IF EXISTS "Allow public delete access on work_centers" ON public.work_centers;

CREATE POLICY "Authenticated users can read work_centers" ON public.work_centers
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert work_centers" ON public.work_centers
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update work_centers" ON public.work_centers
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete work_centers" ON public.work_centers
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- SPECIFICATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on specifications" ON public.specifications;
DROP POLICY IF EXISTS "Allow public insert access on specifications" ON public.specifications;
DROP POLICY IF EXISTS "Allow public update access on specifications" ON public.specifications;
DROP POLICY IF EXISTS "Allow public delete access on specifications" ON public.specifications;

CREATE POLICY "Authenticated users can read specifications" ON public.specifications
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert specifications" ON public.specifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update specifications" ON public.specifications
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete specifications" ON public.specifications
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- SPECIFICATION_MATERIALS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on specification_materials" ON public.specification_materials;
DROP POLICY IF EXISTS "Allow public insert access on specification_materials" ON public.specification_materials;
DROP POLICY IF EXISTS "Allow public update access on specification_materials" ON public.specification_materials;
DROP POLICY IF EXISTS "Allow public delete access on specification_materials" ON public.specification_materials;

CREATE POLICY "Authenticated users can read specification_materials" ON public.specification_materials
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert specification_materials" ON public.specification_materials
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update specification_materials" ON public.specification_materials
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete specification_materials" ON public.specification_materials
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- ROUTING_SHEETS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on routing_sheets" ON public.routing_sheets;
DROP POLICY IF EXISTS "Allow public insert access on routing_sheets" ON public.routing_sheets;
DROP POLICY IF EXISTS "Allow public update access on routing_sheets" ON public.routing_sheets;
DROP POLICY IF EXISTS "Allow public delete access on routing_sheets" ON public.routing_sheets;

CREATE POLICY "Authenticated users can read routing_sheets" ON public.routing_sheets
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert routing_sheets" ON public.routing_sheets
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update routing_sheets" ON public.routing_sheets
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete routing_sheets" ON public.routing_sheets
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- ROUTING_OPERATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on routing_operations" ON public.routing_operations;
DROP POLICY IF EXISTS "Allow public insert access on routing_operations" ON public.routing_operations;
DROP POLICY IF EXISTS "Allow public update access on routing_operations" ON public.routing_operations;
DROP POLICY IF EXISTS "Allow public delete access on routing_operations" ON public.routing_operations;

CREATE POLICY "Authenticated users can read routing_operations" ON public.routing_operations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert routing_operations" ON public.routing_operations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update routing_operations" ON public.routing_operations
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete routing_operations" ON public.routing_operations
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- ROUTING_OPERATION_MATERIALS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on routing_operation_materials" ON public.routing_operation_materials;
DROP POLICY IF EXISTS "Allow public insert access on routing_operation_materials" ON public.routing_operation_materials;
DROP POLICY IF EXISTS "Allow public update access on routing_operation_materials" ON public.routing_operation_materials;
DROP POLICY IF EXISTS "Allow public delete access on routing_operation_materials" ON public.routing_operation_materials;

CREATE POLICY "Authenticated users can read routing_operation_materials" ON public.routing_operation_materials
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert routing_operation_materials" ON public.routing_operation_materials
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update routing_operation_materials" ON public.routing_operation_materials
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete routing_operation_materials" ON public.routing_operation_materials
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- PRODUCTION_ORDERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on production_orders" ON public.production_orders;
DROP POLICY IF EXISTS "Allow public insert access on production_orders" ON public.production_orders;
DROP POLICY IF EXISTS "Allow public update access on production_orders" ON public.production_orders;
DROP POLICY IF EXISTS "Allow public delete access on production_orders" ON public.production_orders;

CREATE POLICY "Authenticated users can read production_orders" ON public.production_orders
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert production_orders" ON public.production_orders
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can update production_orders" ON public.production_orders
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can delete production_orders" ON public.production_orders
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- PRODUCTION_ORDER_OPERATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on production_order_operations" ON public.production_order_operations;
DROP POLICY IF EXISTS "Allow public insert access on production_order_operations" ON public.production_order_operations;
DROP POLICY IF EXISTS "Allow public update access on production_order_operations" ON public.production_order_operations;
DROP POLICY IF EXISTS "Allow public delete access on production_order_operations" ON public.production_order_operations;

CREATE POLICY "Authenticated users can read production_order_operations" ON public.production_order_operations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert production_order_operations" ON public.production_order_operations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can update production_order_operations" ON public.production_order_operations
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can delete production_order_operations" ON public.production_order_operations
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- MATERIAL_RESERVATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on material_reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Allow public insert access on material_reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Allow public update access on material_reservations" ON public.material_reservations;
DROP POLICY IF EXISTS "Allow public delete access on material_reservations" ON public.material_reservations;

CREATE POLICY "Authenticated users can read material_reservations" ON public.material_reservations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert material_reservations" ON public.material_reservations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can update material_reservations" ON public.material_reservations
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can delete material_reservations" ON public.material_reservations
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

-- ============================================
-- MATERIAL_ISSUES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on material_issues" ON public.material_issues;
DROP POLICY IF EXISTS "Allow public insert access on material_issues" ON public.material_issues;
DROP POLICY IF EXISTS "Allow public update access on material_issues" ON public.material_issues;
DROP POLICY IF EXISTS "Allow public delete access on material_issues" ON public.material_issues;

CREATE POLICY "Authenticated users can read material_issues" ON public.material_issues
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert material_issues" ON public.material_issues
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can update material_issues" ON public.material_issues
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can delete material_issues" ON public.material_issues
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

-- ============================================
-- MATERIAL_ISSUE_LINES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on material_issue_lines" ON public.material_issue_lines;
DROP POLICY IF EXISTS "Allow public insert access on material_issue_lines" ON public.material_issue_lines;
DROP POLICY IF EXISTS "Allow public update access on material_issue_lines" ON public.material_issue_lines;
DROP POLICY IF EXISTS "Allow public delete access on material_issue_lines" ON public.material_issue_lines;

CREATE POLICY "Authenticated users can read material_issue_lines" ON public.material_issue_lines
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert material_issue_lines" ON public.material_issue_lines
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can update material_issue_lines" ON public.material_issue_lines
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

CREATE POLICY "Authorized users can delete material_issue_lines" ON public.material_issue_lines
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

-- ============================================
-- CONTRACTORS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on contractors" ON public.contractors;
DROP POLICY IF EXISTS "Allow public insert access on contractors" ON public.contractors;
DROP POLICY IF EXISTS "Allow public update access on contractors" ON public.contractors;
DROP POLICY IF EXISTS "Allow public delete access on contractors" ON public.contractors;

CREATE POLICY "Authenticated users can read contractors" ON public.contractors
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert contractors" ON public.contractors
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update contractors" ON public.contractors
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete contractors" ON public.contractors
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- EQUIPMENT TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow public insert access on equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow public update access on equipment" ON public.equipment;
DROP POLICY IF EXISTS "Allow public delete access on equipment" ON public.equipment;

CREATE POLICY "Authenticated users can read equipment" ON public.equipment
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert equipment" ON public.equipment
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update equipment" ON public.equipment
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete equipment" ON public.equipment
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- MATERIAL_CATEGORIES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on material_categories" ON public.material_categories;
DROP POLICY IF EXISTS "Allow public insert access on material_categories" ON public.material_categories;
DROP POLICY IF EXISTS "Allow public update access on material_categories" ON public.material_categories;
DROP POLICY IF EXISTS "Allow public delete access on material_categories" ON public.material_categories;

CREATE POLICY "Authenticated users can read material_categories" ON public.material_categories
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert material_categories" ON public.material_categories
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can update material_categories" ON public.material_categories
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can delete material_categories" ON public.material_categories
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- STANDARD_OPERATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on standard_operations" ON public.standard_operations;
DROP POLICY IF EXISTS "Allow public insert access on standard_operations" ON public.standard_operations;
DROP POLICY IF EXISTS "Allow public update access on standard_operations" ON public.standard_operations;
DROP POLICY IF EXISTS "Allow public delete access on standard_operations" ON public.standard_operations;

CREATE POLICY "Authenticated users can read standard_operations" ON public.standard_operations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert standard_operations" ON public.standard_operations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can update standard_operations" ON public.standard_operations
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

CREATE POLICY "Authorized users can delete standard_operations" ON public.standard_operations
FOR DELETE USING (
  auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- MRP_CALCULATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on mrp_calculations" ON public.mrp_calculations;
DROP POLICY IF EXISTS "Allow public insert access on mrp_calculations" ON public.mrp_calculations;
DROP POLICY IF EXISTS "Allow public delete access on mrp_calculations" ON public.mrp_calculations;

CREATE POLICY "Authenticated users can read mrp_calculations" ON public.mrp_calculations
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert mrp_calculations" ON public.mrp_calculations
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can delete mrp_calculations" ON public.mrp_calculations
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- MRP_CALCULATION_RESULTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on mrp_calculation_results" ON public.mrp_calculation_results;
DROP POLICY IF EXISTS "Allow public insert access on mrp_calculation_results" ON public.mrp_calculation_results;
DROP POLICY IF EXISTS "Allow public delete access on mrp_calculation_results" ON public.mrp_calculation_results;

CREATE POLICY "Authenticated users can read mrp_calculation_results" ON public.mrp_calculation_results
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert mrp_calculation_results" ON public.mrp_calculation_results
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can delete mrp_calculation_results" ON public.mrp_calculation_results
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);

-- ============================================
-- PURCHASE_REQUISITIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on purchase_requisitions" ON public.purchase_requisitions;
DROP POLICY IF EXISTS "Allow public insert access on purchase_requisitions" ON public.purchase_requisitions;
DROP POLICY IF EXISTS "Allow public update access on purchase_requisitions" ON public.purchase_requisitions;
DROP POLICY IF EXISTS "Allow public delete access on purchase_requisitions" ON public.purchase_requisitions;

CREATE POLICY "Authenticated users can read purchase_requisitions" ON public.purchase_requisitions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert purchase_requisitions" ON public.purchase_requisitions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can update purchase_requisitions" ON public.purchase_requisitions
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

CREATE POLICY "Authorized users can delete purchase_requisitions" ON public.purchase_requisitions
FOR DELETE USING (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'warehouse_manager')
  )
);

-- ============================================
-- PRODUCTION_ORDER_HISTORY TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on production_order_history" ON public.production_order_history;
DROP POLICY IF EXISTS "Allow public insert access on production_order_history" ON public.production_order_history;

CREATE POLICY "Authenticated users can read production_order_history" ON public.production_order_history
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert production_order_history" ON public.production_order_history
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager') OR
    public.has_role(auth.uid(), 'operator')
  )
);

-- ============================================
-- SPECIFICATION_HISTORY TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow public read access on specification_history" ON public.specification_history;
DROP POLICY IF EXISTS "Allow public insert access on specification_history" ON public.specification_history;

CREATE POLICY "Authenticated users can read specification_history" ON public.specification_history
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized users can insert specification_history" ON public.specification_history
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'production_manager')
  )
);