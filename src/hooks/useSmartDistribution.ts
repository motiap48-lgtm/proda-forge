import { useCallback, useMemo, useRef } from "react";
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

export type DistributionStrategy = "smart" | "all_operations" | "even";

export interface DistributionPreviewItem {
  operationSequence: number;
  operationName: string;
  materials: {
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
  }[];
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
  // Store previous state for undo functionality
  const previousOperationsRef = useRef<Operation[] | null>(null);
  const hasDistributedRef = useRef(false);
  
  // Calculate linked material IDs from operations - memoized for display purposes
  const linkedMaterialIds = useMemo(() => {
    return calculateLinkedIds(operations);
  }, [operations]);

  // Calculate unlinked materials for display
  const unlinkedMaterials = useMemo(() => {
    return specificationMaterials.filter(m => !linkedMaterialIds.has(m.material_id));
  }, [specificationMaterials, linkedMaterialIds]);
  
  const hasUnlinkedComponents = unlinkedMaterials.length > 0 && specificationMaterials.length > 0;

  // Generate preview for distribution without applying it
  const generatePreview = useCallback((strategy: DistributionStrategy): DistributionPreviewItem[] => {
    const currentLinkedIds = calculateLinkedIds(operations);
    const unlinkedMats = specificationMaterials.filter(m => !currentLinkedIds.has(m.material_id));

    if (unlinkedMats.length === 0) {
      return [];
    }

    const productionOps = operations.filter(op => op.operation_type === "production");
    if (productionOps.length === 0) {
      return [];
    }

    const sortedProductionOps = [...productionOps].sort((a, b) => a.sequence - b.sequence);
    const previewMap = new Map<number, DistributionPreviewItem>();

    // Initialize preview map
    sortedProductionOps.forEach(op => {
      previewMap.set(op.sequence, {
        operationSequence: op.sequence,
        operationName: op.name,
        materials: [],
      });
    });

    if (strategy === "smart") {
      // Smart distribution logic
      const rawMaterials = unlinkedMats.filter(m => m.products?.product_type === "material");
      const components = unlinkedMats.filter(m => 
        m.products?.product_type === "semi-finished" || m.products?.product_type === "assembly"
      );
      const finishedGoods = unlinkedMats.filter(m => m.products?.product_type === "finished");
      const unknown = unlinkedMats.filter(m => !m.products?.product_type);

      const firstSeq = sortedProductionOps[0].sequence;
      const lastSeq = sortedProductionOps[sortedProductionOps.length - 1].sequence;
      const middleIdx = Math.floor(sortedProductionOps.length / 2);
      const middleSeq = sortedProductionOps.length >= 3 ? sortedProductionOps[middleIdx].sequence : null;

      // Raw materials to first
      rawMaterials.forEach(m => {
        previewMap.get(firstSeq)?.materials.push({
          productId: m.material_id,
          productCode: m.products?.code || "",
          productName: m.products?.name || "",
          quantity: m.quantity,
        });
      });

      // Components to middle if exists
      if (middleSeq) {
        components.forEach(m => {
          previewMap.get(middleSeq)?.materials.push({
            productId: m.material_id,
            productCode: m.products?.code || "",
            productName: m.products?.name || "",
            quantity: m.quantity,
          });
        });
      }

      // Finished, unknown, and components (if no middle) to last
      [...finishedGoods, ...unknown, ...(middleSeq ? [] : components)].forEach(m => {
        previewMap.get(lastSeq)?.materials.push({
          productId: m.material_id,
          productCode: m.products?.code || "",
          productName: m.products?.name || "",
          quantity: m.quantity,
        });
      });
    } else if (strategy === "all_operations") {
      // All operations get all materials
      unlinkedMats.forEach(m => {
        sortedProductionOps.forEach(op => {
          previewMap.get(op.sequence)?.materials.push({
            productId: m.material_id,
            productCode: m.products?.code || "",
            productName: m.products?.name || "",
            quantity: m.quantity,
          });
        });
      });
    } else if (strategy === "even") {
      // Distribute evenly using round-robin
      unlinkedMats.forEach((m, index) => {
        const targetOpIndex = index % sortedProductionOps.length;
        const targetSeq = sortedProductionOps[targetOpIndex].sequence;
        previewMap.get(targetSeq)?.materials.push({
          productId: m.material_id,
          productCode: m.products?.code || "",
          productName: m.products?.name || "",
          quantity: m.quantity,
        });
      });
    }

    // Filter out operations with no materials
    return Array.from(previewMap.values()).filter(item => item.materials.length > 0);
  }, [operations, specificationMaterials]);

  // Generate preview for specific operation
  const generatePreviewForOperation = useCallback((targetSequence: number): DistributionPreviewItem[] => {
    const currentLinkedIds = calculateLinkedIds(operations);
    const unlinkedMats = specificationMaterials.filter(m => !currentLinkedIds.has(m.material_id));
    
    if (unlinkedMats.length === 0) {
      return [];
    }

    const targetOp = operations.find(op => op.sequence === targetSequence);
    if (!targetOp) {
      return [];
    }

    return [{
      operationSequence: targetSequence,
      operationName: targetOp.name,
      materials: unlinkedMats.map(m => ({
        productId: m.material_id,
        productCode: m.products?.code || "",
        productName: m.products?.name || "",
        quantity: m.quantity,
      })),
    }];
  }, [operations, specificationMaterials]);

  // Save current state before distribution
  const saveStateForUndo = useCallback(() => {
    previousOperationsRef.current = JSON.parse(JSON.stringify(operations));
    hasDistributedRef.current = true;
  }, [operations]);

  // Undo last distribution
  const undoDistribution = useCallback(() => {
    if (previousOperationsRef.current && hasDistributedRef.current) {
      setOperations(previousOperationsRef.current);
      hasDistributedRef.current = false;
      toast.success("Распределение отменено");
      return true;
    }
    toast.info("Нет действий для отмены");
    return false;
  }, [setOperations]);

  // Check if undo is available - only when distribution was actually performed
  const canUndo = useCallback(() => hasDistributedRef.current && previousOperationsRef.current !== null, []);

  // Distribute to specific operation
  const distributeToOperation = useCallback((targetSequence: number) => {
    saveStateForUndo();
    
    setOperations(prevOperations => {
      const currentLinkedIds = calculateLinkedIds(prevOperations);
      
      const unlinkedMats = specificationMaterials.filter(
        m => !currentLinkedIds.has(m.material_id)
      );

      if (unlinkedMats.length === 0) {
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
  }, [specificationMaterials, setOperations, saveStateForUndo]);

  // Strategy 1: Smart distribution by product type (materials → first, ПФ/СБ → last)
  const distributeByProductType = useCallback(() => {
    saveStateForUndo();
    
    setOperations(prevOperations => {
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

      // Get production operations sorted by sequence
      const sortedProductionOps = [...productionOps].sort((a, b) => a.sequence - b.sequence);

      const firstProductionSeq = sortedProductionOps[0].sequence;
      const lastProductionSeq = sortedProductionOps[sortedProductionOps.length - 1].sequence;
      const middleIdx = Math.floor(sortedProductionOps.length / 2);
      const middleProductionSeq = sortedProductionOps.length >= 3 ? sortedProductionOps[middleIdx].sequence : null;

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
  }, [specificationMaterials, setOperations, saveStateForUndo]);

  // Strategy 2: Distribute all components to ALL production operations
  const distributeToAllOperations = useCallback(() => {
    saveStateForUndo();
    
    setOperations(prevOperations => {
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

      const distributedToOperations: string[] = [];

      const newOperations = prevOperations.map(op => {
        if (op.operation_type !== "production") {
          return op;
        }

        const existingMaterials = op.materials || [];
        const existingIds = new Set(existingMaterials.map(m => m.product_id));
        
        const newMaterials = unlinkedMats
          .filter(m => !existingIds.has(m.material_id))
          .map(m => ({
            product_id: m.material_id,
            quantity_per_operation: m.quantity,
          }));

        if (newMaterials.length > 0) {
          distributedToOperations.push(`"${op.name}" (${newMaterials.length} шт)`);
          return {
            ...op,
            materials: [...existingMaterials, ...newMaterials],
          };
        }
        return op;
      });

      setTimeout(() => {
        if (distributedToOperations.length > 0) {
          toast.success(`Распределено на: ${distributedToOperations.join(", ")}`);
        } else {
          toast.info("Все компоненты уже были распределены");
        }
      }, 0);

      return newOperations;
    });
  }, [specificationMaterials, setOperations, saveStateForUndo]);

  // Strategy 3: Distribute components evenly across production operations
  const distributeEvenly = useCallback(() => {
    saveStateForUndo();
    
    setOperations(prevOperations => {
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

      // Sort production ops by sequence
      const sortedProductionOps = [...productionOps].sort((a, b) => a.sequence - b.sequence);
      
      // Create a map of sequence -> materials to add
      const operationMaterialsMap = new Map<number, OperationMaterial[]>();
      sortedProductionOps.forEach(op => {
        operationMaterialsMap.set(op.sequence, []);
      });

      // Distribute unlinked materials evenly using round-robin
      unlinkedMats.forEach((mat, index) => {
        const targetOpIndex = index % sortedProductionOps.length;
        const targetSeq = sortedProductionOps[targetOpIndex].sequence;
        operationMaterialsMap.get(targetSeq)?.push({
          product_id: mat.material_id,
          quantity_per_operation: mat.quantity,
        });
      });

      const distributedToOperations: string[] = [];

      const newOperations = prevOperations.map(op => {
        const materialsToAdd = operationMaterialsMap.get(op.sequence);
        if (!materialsToAdd || materialsToAdd.length === 0) {
          return op;
        }

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
        return op;
      });

      setTimeout(() => {
        if (distributedToOperations.length > 0) {
          toast.success(`Равномерно распределено на: ${distributedToOperations.join(", ")}`);
        } else {
          toast.info("Все компоненты уже были распределены");
        }
      }, 0);

      return newOperations;
    });
  }, [specificationMaterials, setOperations, saveStateForUndo]);

  return {
    linkedMaterialIds,
    unlinkedMaterials,
    hasUnlinkedComponents,
    distributeToOperation,
    distributeByProductType,
    distributeToAllOperations,
    distributeEvenly,
    generatePreview,
    generatePreviewForOperation,
    undoDistribution,
    canUndo,
  };
}
