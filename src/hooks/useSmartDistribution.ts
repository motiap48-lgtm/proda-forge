import { useCallback, useMemo } from "react";
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

// Helper function to calculate linked material IDs
function calculateLinkedIds(ops: Operation[]): Set<string> {
  const linked = new Set<string>();
  ops.forEach(op => {
    op.materials?.forEach(m => {
      if (m.product_id) {
        linked.add(m.product_id);
      }
    });
  });
  return linked;
}

export function useSmartDistribution({
  operations,
  setOperations,
  specificationMaterials,
}: UseSmartDistributionProps) {
  
  // Calculate linked material IDs from operations - memoized for display purposes
  const linkedMaterialIds = useMemo(() => {
    const ids = calculateLinkedIds(operations);
    console.log("[useSmartDistribution] Calculating linkedMaterialIds, operations count:", operations.length);
    console.log("[useSmartDistribution] Operations materials:", operations.map(op => ({
      name: op.name,
      seq: op.sequence,
      materialsCount: op.materials?.length || 0
    })));
    console.log("[useSmartDistribution] Linked IDs:", Array.from(ids));
    return ids;
  }, [operations]);

  // Calculate unlinked materials for display
  const unlinkedMaterials = useMemo(() => {
    const unlinked = specificationMaterials.filter(m => !linkedMaterialIds.has(m.material_id));
    console.log("[useSmartDistribution] Unlinked materials count:", unlinked.length);
    return unlinked;
  }, [specificationMaterials, linkedMaterialIds]);
  
  const hasUnlinkedComponents = unlinkedMaterials.length > 0 && specificationMaterials.length > 0;
  console.log("[useSmartDistribution] hasUnlinkedComponents:", hasUnlinkedComponents);

  // Distribute to specific operation - uses functional update to ensure fresh state
  const distributeToOperation = useCallback((targetSequence: number) => {
    setOperations(prevOperations => {
      // Calculate linked IDs from PREVIOUS state
      const currentLinkedIds = calculateLinkedIds(prevOperations);
      
      const unlinkedMats = specificationMaterials.filter(
        m => !currentLinkedIds.has(m.material_id)
      );

      if (unlinkedMats.length === 0) {
        // Use setTimeout to show toast outside of state update
        setTimeout(() => toast.info("Все компоненты уже распределены по операциям"), 0);
        return prevOperations;
      }

      const targetOp = prevOperations.find(op => op.sequence === targetSequence);
      let addedCount = 0;

      const newOperations = prevOperations.map(op => {
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
            addedCount = newMaterials.length;
            return {
              ...op,
              materials: [...existingMaterials, ...newMaterials],
            };
          }
        }
        return op;
      });

      if (addedCount > 0) {
        setTimeout(() => {
          toast.success(`${addedCount} компонент(ов) распределено на операцию "${targetOp?.name || targetSequence}"`);
        }, 0);
      }

      return newOperations;
    });
  }, [specificationMaterials, setOperations]);

  // Smart distribution by product type - uses functional update
  const distributeByProductType = useCallback(() => {
    setOperations(prevOperations => {
      // Calculate linked IDs from PREVIOUS state
      const currentLinkedIds = calculateLinkedIds(prevOperations);
      
      const unlinkedMats = specificationMaterials.filter(
        m => !currentLinkedIds.has(m.material_id)
      );

      if (unlinkedMats.length === 0) {
        setTimeout(() => toast.info("Все компоненты уже распределены по операциям"), 0);
        return prevOperations;
      }

      const productionOps = prevOperations.filter(op => op.operation_type === "production");

      if (productionOps.length === 0) {
        setTimeout(() => toast.error("Добавьте производственные операции для распределения"), 0);
        return prevOperations;
      }

      // Categorize by product type
      const rawMaterials = unlinkedMats.filter(m => m.products?.product_type === "material");
      const components = unlinkedMats.filter(m => 
        m.products?.product_type === "semi-finished" || m.products?.product_type === "assembly"
      );
      const finishedGoods = unlinkedMats.filter(m => m.products?.product_type === "finished");
      const unknown = unlinkedMats.filter(m => !m.products?.product_type);

      console.log("[Smart Distribution] Unlinked materials with types:", unlinkedMats.map(m => ({
        name: m.products?.name,
        type: m.products?.product_type
      })));
      console.log("[Smart Distribution] Categorized - raw:", rawMaterials.length, "components:", components.length, "finished:", finishedGoods.length, "unknown:", unknown.length);

      // Get production operations sorted by sequence
      const sortedProductionOps = [...productionOps].sort((a, b) => a.sequence - b.sequence);
      
      console.log("[Smart Distribution] Production operations:", sortedProductionOps.map(op => ({
        name: op.name,
        seq: op.sequence,
        type: op.operation_type
      })));

      const firstProductionSeq = sortedProductionOps[0].sequence;
      const lastProductionSeq = sortedProductionOps[sortedProductionOps.length - 1].sequence;
      const middleIdx = Math.floor(sortedProductionOps.length / 2);
      const middleProductionSeq = sortedProductionOps.length >= 3 ? sortedProductionOps[middleIdx].sequence : null;

      console.log("[Smart Distribution] Target sequences - first:", firstProductionSeq, "middle:", middleProductionSeq, "last:", lastProductionSeq);

      const distributedToOperations: string[] = [];

      const newOperations = prevOperations.map(op => {
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

      // Show toast after returning new state
      setTimeout(() => {
        if (distributedToOperations.length > 0) {
          toast.success(`Распределено на: ${distributedToOperations.join(", ")}`);
        } else {
          toast.info("Все компоненты уже были распределены");
        }
      }, 0);

      return newOperations;
    });
  }, [specificationMaterials, setOperations]);

  return {
    linkedMaterialIds,
    unlinkedMaterials,
    hasUnlinkedComponents,
    distributeToOperation,
    distributeByProductType,
  };
}
