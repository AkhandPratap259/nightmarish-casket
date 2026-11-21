// Built-in ingredient nutrition table. Values are per 100 g unless `per`
// says otherwise. This is a rough estimate from common reference values,
// not a laboratory measurement — the API and UI label every result as an
// estimate, and ingredients missing from this table contribute nothing and
// are listed as "not estimated".
const TABLE = {
  'chickpeas': { per: '100g', cal: 164, protein: 9, carbs: 27, fat: 2.6 },
  'rice': { per: '100g', cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'basmati rice': { per: '100g', cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'paneer': { per: '100g', cal: 265, protein: 18, carbs: 3.6, fat: 20 },
  'tomato': { per: '100g', cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  'tomatoes': { per: '100g', cal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  'onion': { per: '100g', cal: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  'potato': { per: '100g', cal: 77, protein: 2, carbs: 17, fat: 0.1 },
  'potatoes': { per: '100g', cal: 77, protein: 2, carbs: 17, fat: 0.1 },
  'chicken breast': { per: '100g', cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  'chicken': { per: '100g', cal: 165, protein: 31, carbs: 0, fat: 3.6 },
  'pasta': { per: '100g', cal: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  'spaghetti': { per: '100g', cal: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  'olive oil': { per: '100g', cal: 884, protein: 0, carbs: 0, fat: 100 },
  'garlic': { per: '100g', cal: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  'cheese': { per: '100g', cal: 402, protein: 25, carbs: 1.3, fat: 33 },
  'mozzarella': { per: '100g', cal: 280, protein: 28, carbs: 3.1, fat: 17 },
  'feta': { per: '100g', cal: 264, protein: 14, carbs: 4, fat: 21 },
  'egg': { per: 'piece', cal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  'eggs': { per: 'piece', cal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
  'flour': { per: '100g', cal: 364, protein: 10, carbs: 76, fat: 1 },
  'plain flour': { per: '100g', cal: 364, protein: 10, carbs: 76, fat: 1 },
  'butter': { per: '100g', cal: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  'milk': { per: '100g', cal: 42, protein: 3.4, carbs: 5, fat: 1 },
  'spinach': { per: '100g', cal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  'bell pepper': { per: '100g', cal: 31, protein: 1, carbs: 6, fat: 0.3 },
  'capsicum': { per: '100g', cal: 31, protein: 1, carbs: 6, fat: 0.3 },
  'kidney beans': { per: '100g', cal: 132, protein: 8.9, carbs: 24, fat: 0.5 },
  'black beans': { per: '100g', cal: 132, protein: 8.9, carbs: 24, fat: 0.5 },
  'tortilla': { per: '100g', cal: 218, protein: 5.7, carbs: 36, fat: 2.9 },
  'noodles': { per: '100g', cal: 138, protein: 4.5, carbs: 25, fat: 2 },
  'coconut milk': { per: '100g', cal: 230, protein: 2.3, carbs: 5.5, fat: 23 },
  'cucumber': { per: '100g', cal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  'lentils': { per: '100g', cal: 116, protein: 9, carbs: 20, fat: 0.4 },
  'yogurt': { per: '100g', cal: 59, protein: 3.5, carbs: 4.7, fat: 3.3 },
  'curd': { per: '100g', cal: 59, protein: 3.5, carbs: 4.7, fat: 3.3 },
  'tofu': { per: '100g', cal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  'mushrooms': { per: '100g', cal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  'mushroom': { per: '100g', cal: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  'carrot': { per: '100g', cal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  'carrots': { per: '100g', cal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  'broccoli': { per: '100g', cal: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  'ginger': { per: '100g', cal: 80, protein: 1.8, carbs: 18, fat: 0.8 },
  'bread': { per: '100g', cal: 265, protein: 9, carbs: 49, fat: 3.2 },
  'urad dal': { per: '100g', cal: 116, protein: 9, carbs: 20, fat: 0.4 },
  'cream': { per: '100g', cal: 340, protein: 2.9, carbs: 2.8, fat: 37 },
  'ghee': { per: '100g', cal: 900, protein: 0, carbs: 0, fat: 100 },
  'sugar': { per: '100g', cal: 387, protein: 0, carbs: 100, fat: 0 },
  'honey': { per: '100g', cal: 304, protein: 0.3, carbs: 82, fat: 0 },
  'soy sauce': { per: '100g', cal: 53, protein: 9, carbs: 5, fat: 0.6 },
  'peanuts': { per: '100g', cal: 567, protein: 26, carbs: 16, fat: 49 },
  'lime': { per: '100g', cal: 30, protein: 0.7, carbs: 11, fat: 0.2 },
  'lemon': { per: '100g', cal: 29, protein: 1.1, carbs: 9, fat: 0.3 },
  'basil': { per: '100g', cal: 22, protein: 3.2, carbs: 2.6, fat: 0.6 },
  'coriander leaves': { per: '100g', cal: 23, protein: 2.1, carbs: 3.7, fat: 0.5 },
  'green chilli': { per: '100g', cal: 40, protein: 2, carbs: 9.5, fat: 0.2 },
  'red chilli': { per: '100g', cal: 40, protein: 2, carbs: 9.5, fat: 0.2 },
  'pizza dough': { per: '100g', cal: 250, protein: 7, carbs: 48, fat: 2 },
  'tomato sauce': { per: '100g', cal: 32, protein: 1.3, carbs: 7, fat: 0.3 },
  'cabbage': { per: '100g', cal: 25, protein: 1.3, carbs: 5.8, fat: 0.1 },
  'spring onion': { per: '100g', cal: 32, protein: 1.8, carbs: 7.3, fat: 0.2 },
  'corn': { per: '100g', cal: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  'sweetcorn': { per: '100g', cal: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  'avocado': { per: '100g', cal: 160, protein: 2, carbs: 9, fat: 15 },
  'salsa': { per: '100g', cal: 36, protein: 1.1, carbs: 7.6, fat: 0.2 },
  'parmesan': { per: '100g', cal: 431, protein: 38, carbs: 4.1, fat: 29 },
  'chilli flakes': { per: '100g', cal: 282, protein: 12, carbs: 50, fat: 14 },
  'salt': { per: '100g', cal: 0, protein: 0, carbs: 0, fat: 0 },
  'black pepper': { per: '100g', cal: 251, protein: 10, carbs: 64, fat: 3.3 },
  'water': { per: '100g', cal: 0, protein: 0, carbs: 0, fat: 0 },
  'oil': { per: '100g', cal: 884, protein: 0, carbs: 0, fat: 100 },
  'vegetable oil': { per: '100g', cal: 884, protein: 0, carbs: 0, fat: 100 },
};

// Convert a quantity+unit into grams for 100 g entries. Cups are treated as
// roughly 200 g and tablespoons as 15 g — documented approximations.
function gramsFor(quantity, unit) {
  const u = String(unit || '').toLowerCase();
  if (u === 'kg') return quantity * 1000;
  if (u === 'g' || u === 'ml') return quantity;
  if (u === 'cup') return quantity * 200;
  if (u === 'tbsp') return quantity * 15;
  if (u === 'tsp') return quantity * 5;
  return null; // piece / clove / pinch etc. — handled per-piece below
}

function estimateNutrition(ingredients, servings) {
  let total = { cal: 0, protein: 0, carbs: 0, fat: 0 };
  const notEstimated = [];
  let estimatedAny = false;
  for (const ing of ingredients || []) {
    const key = String(ing.name || '').trim().toLowerCase();
    const entry = TABLE[key];
    if (!entry) {
      notEstimated.push(ing.name);
      continue;
    }
    if (entry.per === 'piece') {
      const qty = ing.unit && /piece|pc/.test(String(ing.unit).toLowerCase()) ? Number(ing.quantity) || 0 : 0;
      if (!qty) { notEstimated.push(ing.name); continue; }
      total.cal += entry.cal * qty;
      total.protein += entry.protein * qty;
      total.carbs += entry.carbs * qty;
      total.fat += entry.fat * qty;
      estimatedAny = true;
      continue;
    }
    const grams = gramsFor(ing.quantity, ing.unit);
    if (grams === null) {
      notEstimated.push(ing.name);
      continue;
    }
    const factor = grams / 100;
    total.cal += entry.cal * factor;
    total.protein += entry.protein * factor;
    total.carbs += entry.carbs * factor;
    total.fat += entry.fat * factor;
    estimatedAny = true;
  }
  const perServing = servings > 0
    ? {
        calories: Math.round(total.cal / servings),
        protein: Math.round(total.protein / servings * 10) / 10,
        carbs: Math.round(total.carbs / servings * 10) / 10,
        fat: Math.round(total.fat / servings * 10) / 10,
      }
    : null;
  return {
    estimate: true,
    perServing: estimatedAny ? perServing : null,
    notEstimated,
    note: 'Estimate only — computed from a built-in reference table for common ingredients. Ingredients not in the table are excluded from the estimate.',
  };
}

module.exports = { estimateNutrition };
