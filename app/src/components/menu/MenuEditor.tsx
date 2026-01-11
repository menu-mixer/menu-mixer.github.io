import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
} from '@xyflow/react';
import type { Node, NodeChange, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMenuStore, useRecipeStore } from '@/stores';
import { RecipeNode } from './RecipeNode';

const nodeTypes: NodeTypes = {
  recipe: RecipeNode,
};

export function MenuEditor() {
  const { getActiveMenu, updateLayout, removeFromActiveMenu } = useMenuStore();
  const { getRecipeById } = useRecipeStore();

  const activeMenu = getActiveMenu();

  const nodes: Node[] = useMemo(() => {
    if (!activeMenu) return [];

    return activeMenu.layout.map((item) => {
      const recipe = getRecipeById(item.id);
      return {
        id: item.id,
        type: 'recipe',
        position: { x: item.x, y: item.y },
        data: { recipe, onRemove: () => removeFromActiveMenu(item.id) },
      };
    });
  }, [activeMenu, getRecipeById, removeFromActiveMenu]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!activeMenu) return;

      // Apply changes to get new positions
      const updatedNodes = applyNodeChanges(changes, nodes);

      // Only update layout if positions changed
      const positionChanges = changes.filter((c) => c.type === 'position' && c.position);
      if (positionChanges.length > 0) {
        const newLayout = updatedNodes.map((node) => ({
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        }));
        updateLayout(newLayout);
      }
    },
    [activeMenu, nodes, updateLayout]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const recipeId = e.dataTransfer.getData('recipe-id');
      if (!recipeId) return;

      const bounds = e.currentTarget.getBoundingClientRect();
      const position = {
        x: e.clientX - bounds.left - 130,
        y: e.clientY - bounds.top - 50,
      };

      useMenuStore.getState().addToActiveMenu(recipeId, position);
    },
    []
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  if (!activeMenu) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No menu selected
      </div>
    );
  }

  return (
    <div className="h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
