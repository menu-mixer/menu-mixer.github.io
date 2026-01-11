import { useState } from 'react';
import {
  ChefHat,
  Import,
  LayoutGrid,
  Sparkles,
  Palette,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { parseRecipe } from '@/lib/ai/client';
import { loadStarterPack } from '@/lib/starterPack';
import type { StarterPack, StarterRecipe } from '@/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  hasStarterPack: boolean;
}

interface OnboardingStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function OnboardingModal({ isOpen, onComplete, hasStarterPack }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [businessDescription, setBusinessDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateStarter = async () => {
    if (!businessDescription.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Use the parse endpoint to generate recipes based on description
      const prompt = `Generate 6 sample recipes for a ${businessDescription}.
Include a mix of:
- 2-3 signature items that would be the main offerings
- 2-3 supporting items (sides, drinks, or complementary dishes)

For each recipe provide realistic ingredients and simple instructions appropriate for a small food business.`;

      const result = await parseRecipe(prompt, 'text');

      if (result.recipes.length === 0) {
        throw new Error('No recipes generated. Please try a more detailed description.');
      }

      // Convert parsed recipes to starter pack format
      const starterRecipes: StarterRecipe[] = result.recipes.map(r => ({
        name: r.name,
        metadata: {
          prepTime: r.prepTime,
          assemblyTime: r.assemblyTime,
          ingredientCost: r.cost,
          tags: r.tags as string[],
        },
        ingredients: r.ingredients.map(i => ({
          raw: i.quantity ? `${i.quantity} ${i.item}` : i.item,
          item: i.item,
          quantity: i.quantity,
        })),
        description: r.description || '',
        instructions: r.instructions,
      }));

      const dynamicPack: StarterPack = {
        id: `dynamic-${Date.now()}`,
        name: 'My Menu',
        description: `Generated from: ${businessDescription}`,
        recipes: starterRecipes,
        boxes: [{ name: 'My Recipes', recipeNames: starterRecipes.map(r => r.name) }],
        menus: [{ name: 'My Menu', recipeNames: starterRecipes.map(r => r.name) }],
      };

      await loadStarterPack(dynamicPack);
      onComplete();
      window.location.reload();
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate recipes');
    } finally {
      setIsGenerating(false);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Menu Mixer!',
      icon: <ChefHat size={48} className="text-primary-500" />,
      content: (
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Menu Mixer helps bakers, cafes, and caterers manage recipes and plan menus with AI assistance.
          </p>
          <p className="text-gray-600">
            Let's take a quick tour of the key features.
          </p>
        </div>
      ),
    },
    {
      id: 'import',
      title: 'Import Recipes From Anywhere',
      icon: <Import size={48} className="text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Drag and drop PDFs, images, or text to import recipes. Our AI extracts ingredients,
            instructions, and even pricing automatically.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <strong>Pro tip:</strong> You can paste recipe text directly, upload menu photos,
            or import from websites.
          </div>
        </div>
      ),
    },
    {
      id: 'organize',
      title: 'Organize Into Recipe Boxes',
      icon: <LayoutGrid size={48} className="text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Create recipe boxes to organize your recipes by category, event type, or however you like.
            Drag recipes between boxes to keep things tidy.
          </p>
          <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
            <strong>Example boxes:</strong> Breakfast, Lunch Specials, Catering Menu, Seasonal Items
          </div>
        </div>
      ),
    },
    {
      id: 'menus',
      title: 'Build & Manage Menus',
      icon: <LayoutGrid size={48} className="text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Create menus by dragging recipes from your boxes. Each menu item can be customized
            independently - perfect for seasonal variations or special events.
          </p>
          <div className="bg-purple-50 rounded-lg p-4 text-sm text-purple-800">
            <strong>Menus are copies:</strong> Editing a menu item won't change your original recipe.
          </div>
        </div>
      ),
    },
    {
      id: 'optimize',
      title: 'AI-Powered Optimization',
      icon: <Sparkles size={48} className="text-amber-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Use AI to analyze your menu for:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Shared ingredients across recipes (reduce waste)</li>
            <li>Dietary coverage gaps (vegan, gluten-free, etc.)</li>
            <li>Duplicate or similar recipes</li>
            <li>Cost optimization suggestions</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'theme',
      title: 'Theme Your Menu',
      icon: <Palette size={48} className="text-pink-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Give your menu a creative makeover! Enter a theme like "Cozy Fall Cafe" or
            "Beach Vibes" and AI will suggest fun renamed versions of your dishes.
          </p>
          <div className="bg-pink-50 rounded-lg p-4 text-sm text-pink-800">
            <strong>Great for:</strong> Seasonal menus, pop-ups, special events, or just having fun!
          </div>
        </div>
      ),
    },
    {
      id: 'chat',
      title: 'Chat With Your Menu',
      icon: <MessageSquare size={48} className="text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Ask the AI assistant anything about your recipes:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>"What vegan options do I have?"</li>
            <li>"Create a salad using ingredients I already have"</li>
            <li>"Which recipes share the most ingredients?"</li>
            <li>"Suggest a new appetizer for my cafe"</li>
          </ul>
        </div>
      ),
    },
  ];

  // Add starter pack generation step if user doesn't have one
  if (!hasStarterPack) {
    steps.push({
      id: 'generate',
      title: 'Generate Your First Menu',
      icon: <Sparkles size={48} className="text-primary-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Don't have recipes to import yet? Tell us about your business and we'll generate
            some sample recipes to get you started!
          </p>
          <textarea
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder="e.g., A cozy neighborhood bakery specializing in sourdough breads and French pastries..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {generationError && (
            <p className="text-red-600 text-sm">{generationError}</p>
          )}
          <Button
            onClick={handleGenerateStarter}
            disabled={!businessDescription.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Generating recipes...
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                Generate Sample Recipes
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Or skip this and import your own recipes later
          </p>
        </div>
      ),
    });
  }

  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep
                    ? 'bg-primary-500'
                    : idx < currentStep
                    ? 'bg-primary-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={onComplete}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
            title="Skip tour"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4">{currentStepData.icon}</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
          </div>
          <div className="min-h-[200px]">{currentStepData.content}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft size={18} className="mr-1" />
            Back
          </Button>

          <span className="text-sm text-gray-500">
            {currentStep + 1} of {steps.length}
          </span>

          {isLastStep ? (
            <Button onClick={onComplete}>
              Get Started
              <ArrowRight size={18} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ArrowRight size={18} className="ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
