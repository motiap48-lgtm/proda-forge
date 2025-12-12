import { useCallback } from "react";
import { toast } from "sonner";

interface OperationMaterial {
  product_id: string;
  quantity_per_operation?: number | null;
}

interface Operation {
  id?: string;
  sequence: number;
  name: string;
  work_center_id: string;
  setup_time_minutes: number;
  cycle_time_minutes: number;
  operation_type: "production" | "transport" | "control" | "setup";
  materials?: OperationMaterial[];
  is_external?: boolean;
  external_contractor?: string;
  contractor_id?: string;
  external_lead_time_days?: number;
}

interface SpecificationMaterial {
  material_id: string;
  quantity: number;
  products?: {
    product_type?: string;
    name?: string;
    code?: string;
  };
}

interface UseSmartDistributionProps {
  operations: Operation[];
  setOperations: React.Dispatch<React.SetStateAction<Operation[]>>;
  specificationMaterials: SpecificationMaterial[];
}

export function useSmartDistribution({
  operations,
  setOperations,
  specificationMaterials,
}: UseSmartDistributionProps) {
  
  // Calculate linked material IDs from operations
  const getLinkedMaterialIds = useCallback((ops: Operation[]): Set<string> => {
    const linked = new Set<string>();
    ops.forEach(op => {
      op.materials?.forEach(m => {
        if (m.product_id) {
          linked.add(m.product_id);
        }
      });
    });
    return linked;
  }, []);

  // Get unlinked materials
  const getUnlinkedMaterials = useCallback((ops: Operation[]): SpecificationMaterial[] => {
    const linkedIds = getLinkedMaterialIds(ops);
    return specificationMaterials.filter(m => !linkedIds.has(m.material_id));
  }, [specificationMaterials, getLinkedMaterialIds]);

  // Current state calculations
  const linkedMaterialIds = getLinkedMaterialIds(operations);
  const unlinkedMaterials = getUnlinkedMaterials(operations);
  const hasUnlinkedComponents = unlinkedMaterials.length > 0 && specificationMaterials.length > 0;

  // Distribute to specific operation
  const distributeToOperation = useCallback((targetSequence: number) => {
    const currentLinkedIds = getLinkedMaterialIds(operations);
    const unlinkedMats = specificationMaterials.filter(
      m => !currentLinkedIds.has(m.material_id)
    );

    if (unlinkedMats.length === 0) {
      toast.info("Все компоненты уже распределены по операциям");
      return;
    }

    const targetOp = operations.find(op => op.sequence === targetSequence);

    const newOperations = operations.map(op => {
      if (op.sequence === targetSequence) {
        const existingMaterials = op.materials || [];
        const existingIds = new Set(existingMaterials.map(m => m.product_id));
        const newMaterials = unlinkedMats
          .filter(m => !existingIds.has(m.material_id))
          .map(m => ({
            product_id: m.material_id,
            quantity_per_operation: m.quantity,
          }));

        if (newMaterials.length > 0) {
          toast.success(`${newMaterials.length} компонент(ов) распределено на операцию "${targetOp?.name || targetSequence}"`);
          return {
            ...op,
            materials: [...existingMaterials, ...newMaterials],
          };
        }
      }
      return op;
    });

    setOperations(newOperations);
  }, [operations, specificationMaterials, getLinkedMaterialIds, setOperations]);

  // Smart distribution by product type
  const distributeByProductType = useCallback(() => {
    const currentLinkedIds = getLinkedMaterialIds(operations);
    const unlinkedMats = specificationMaterials.filter(
      m => !currentLinkedIds.has(m.material_id)
    );

    if (unlinkedMats.length === 0) {
      toast.info("Все компоненты уже распределены по операциям");
      return;
    }

    const productionOps = operations.filter(op => op.operation_type === "production");

    if (productionOps.length === 0) {
      toast.error("Добавьте производственные операции для распределения");
      return;
    }

    // Categorize by product type
    const rawMaterials = unlinkedMats.filter(m => m.products?.product_type === "material");
    const components = unlinkedMats.filter(m => 
      m.products?.product_type === "semi-finished" || m.products?.product_type === "assembly"
    );
    const finishedGoods = unlinkedMats.filter(m => m.products?.product_type === "finished");
    const unknown = unlinkedMats.filter(m => !m.products?.product_type);

    // Get production operations sorted by sequence
    const sortedProductionOps = [...productionOps].sort((a, b) => a.sequence - b.sequence);
    
    const firstProductionSeq = sortedProductionOps[0].sequence;
    const lastProductionSeq = sortedProductionOps[sortedProductionOps.length - 1].sequence;
    const middleIdx = Math.floor(sortedProductionOps.length / 2);
    const middleProductionSeq = sortedProductionOps.length >= 3 ? sortedProductionOps[middleIdx].sequence : null;

    const distributedToOperations: string[] = [];

    const newOperations = operations.map(op => {
      let materialsToAdd: OperationMaterial[] = [];

      // Raw materials go to first production operation
      if (op.sequence === firstProductionSeq && op.operation_type === "production") {
        materialsToAdd = rawMaterials.map(m => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
      }

      // Components (ПФ, СБ) go to middle operation if 3+ ops
      if (middleProductionSeq && op.sequence === middleProductionSeq && op.operation_type === "production") {
        const componentMaterials = components.map(m => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
        materialsToAdd = [...materialsToAdd, ...componentMaterials];
      }

      // Last operation gets: finished goods, unknown, and components if no middle operation
      if (op.sequence === lastProductionSeq && op.operation_type === "production") {
        const finishedMaterials = finishedGoods.map(m => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
        const unknownMaterials = unknown.map(m => ({
          product_id: m.material_id,
          quantity_per_operation: m.quantity,
        }));
        
        materialsToAdd = [...materialsToAdd, ...finishedMaterials, ...unknownMaterials];
        
        // If no middle operation (1-2 production ops), components also go to last
        if (!middleProductionSeq) {
          const componentMaterials = components.map(m => ({
            product_id: m.material_id,
            quantity_per_operation: m.quantity,
          }));
          materialsToAdd = [...materialsToAdd, ...componentMaterials];
        }
      }

      if (materialsToAdd.length > 0) {
        const existingMaterials = op.materials || [];
        const existingIds = new Set(existingMaterials.map(m => m.product_id));
        const newMaterials = materialsToAdd.filter(m => !existingIds.has(m.product_id));
        
        if (newMaterials.length > 0) {
          distributedToOperations.push(`"${op.name}" (${newMaterials.length} шт)`);
          
          return {
            ...op,
            materials: [...existingMaterials, ...newMaterials],
          };
        }
      }
      return op;
    });

    // Update state with new operations
    setOperations(newOperations);

    // Show toast
    if (distributedToOperations.length > 0) {
      toast.success(`Распределено на: ${distributedToOperations.join(", ")}`);
    } else {
      toast.info("Все компоненты уже были распределены");
    }
  }, [operations, specificationMaterials, getLinkedMaterialIds, setOperations]);

  return {
    linkedMaterialIds,
    unlinkedMaterials,
    hasUnlinkedComponents,
    distributeToOperation,
    distributeByProductType,
  };
}
