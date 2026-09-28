import type { DietMeal, DietMealItem } from "@/types/diet"
import type { RecipeNutrition } from "@/types/recipe"
import { buildShoppingList, getMealItemNutrition } from "./diet-meal-items"
import { getRecipeFoodUnitPresentation } from "./recipe-nutrition"

export interface DietPrintInput {
  clientName: string
  dateLabel: string
  dietInfo: { title: string; goal: string; durationDays: number; notes: string }
  meals: readonly DietMeal[]
}

export interface ShoppingListPrintInput extends DietPrintInput {
  shoppingDays: number
}

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 })
const formatNumber = (value: number) => numberFormat.format(value)
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]!)
const multiline = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br>")

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; font-size: 13px; }
  @page { size: A4; margin: 16mm 14mm 14mm 14mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0d9488; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { font-size: 11px; font-weight: 700; color: #0d9488; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
  .doc-title { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; line-height: 1; }
  .doc-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
  .header-right { text-align: right; }
  .client-name { font-size: 15px; font-weight: 800; color: #0f172a; }
  .meta-line { font-size: 11px; color: #94a3b8; margin-top: 3px; }
  .info-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
  .info-card .label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; }
  .info-card .value { font-size: 14px; font-weight: 800; color: #0f172a; }
  .info-card .value.green { color: #0d9488; }
  .meal-block { margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
  .meal-header { background: #f1f5f9; padding: 9px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
  .meal-title-row { display: flex; align-items: center; gap: 10px; }
  .meal-time { font-size: 12px; font-weight: 800; color: #0d9488; background: #ccfbf1; padding: 2px 8px; border-radius: 4px; }
  .meal-name { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.03em; }
  .meal-macros { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; }
  .macro-kcal { color: #334155; font-weight: 700; }
  .macro-sep { color: #cbd5e1; }
  .macro-p { color: #e11d48; }
  .macro-c { color: #059669; }
  .macro-g { color: #d97706; }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table tbody tr { border-bottom: 1px solid #f1f5f9; }
  .items-table tbody tr:last-child { border-bottom: none; }
  .items-table td { padding: 7px 14px; vertical-align: middle; }
  .qty-cell { width: 90px; font-weight: 700; color: #334155; white-space: nowrap; }
  .qty-cell .unit { font-size: 10px; color: #94a3b8; font-weight: 500; margin-left: 2px; }
  .qty-cell .measure { display: block; font-size: 10px; color: #94a3b8; font-weight: 400; font-style: italic; }
  .food-name { font-weight: 500; color: #1e293b; }
  .recipe-detail { padding: 8px 14px; font-size: 11px; line-height: 1.6; }
  .recipe-detail ul { padding-left: 16px; margin-bottom: 6px; }
  .meal-notes { background: #fffbeb; border-top: 1px solid #fde68a; padding: 8px 14px; font-size: 11px; color: #78350f; font-style: italic; }
  .totals-section { border: 1.5px solid #0d9488; border-radius: 10px; padding: 14px 18px; margin: 20px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; text-align: center; }
  .total-item { padding: 0 10px; }
  .total-item + .total-item { border-left: 1px solid #e2e8f0; }
  .total-item .t-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 4px; }
  .total-item .t-value { font-size: 20px; font-weight: 900; color: #0d9488; }
  .total-item .t-unit { font-size: 10px; color: #94a3b8; font-weight: 500; }
  .total-item.ptn .t-value { color: #e11d48; }
  .total-item.carb .t-value { color: #059669; }
  .total-item.fat .t-value { color: #d97706; }
  .general-notes { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 14px 18px; margin-top: 20px; page-break-inside: avoid; }
  .general-notes h3 { font-size: 11px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 8px; }
  .general-notes p { font-size: 12px; color: #134e4a; line-height: 1.7; }
  .intro { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 12px; color: #134e4a; line-height: 1.6; }
  .intro strong { font-weight: 700; color: #0d9488; }
  .section-title { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .list-table { width: 100%; border-collapse: collapse; }
  .list-table tbody tr { border-bottom: 1px solid #f1f5f9; }
  .list-table tbody tr:last-child { border-bottom: none; }
  .list-table tbody tr:hover { background: #f8fafc; }
  .check-cell { width: 28px; padding: 8px 4px 8px 0; vertical-align: middle; }
  .checkbox { width: 16px; height: 16px; border: 2px solid #cbd5e1; border-radius: 4px; }
  .item-name { padding: 8px 6px; font-weight: 500; color: #1e293b; font-size: 13px; }
  .item-qty { padding: 8px 0 8px 6px; text-align: right; font-weight: 800; color: #0d9488; font-size: 13px; white-space: nowrap; }
  .tips { margin-top: 22px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; page-break-inside: avoid; }
  .tips-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
  .tips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .tip-item { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; color: #475569; line-height: 1.5; }
  .tip-icon { font-size: 13px; flex-shrink: 0; margin-top: 0; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-left, .footer-right, .footer span { font-size: 10px; color: #94a3b8; }
  .footer-right { text-align: right; }
  .footer .highlight { font-weight: 700; color: #0d9488; }
`

function documentHtml(title: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>${body}</body></html>`
}

function header(input: DietPrintInput, title: string, subtitle: string, meta: string) {
  return `<div class="header"><div class="header-left"><div class="brand">SafeMove · Nutrição</div><div class="doc-title">${title}</div><div class="doc-subtitle">${subtitle}</div></div><div class="header-right"><div class="client-name">${escapeHtml(input.clientName)}</div>${meta}</div></div>`
}

function footer(goal: string) {
  return `<div class="footer"><div class="footer-left">Documento gerado pelo <span class="highlight">SafeMove</span> · Uso exclusivo do paciente</div><div class="footer-right">Objetivo: <span class="highlight">${escapeHtml(goal)}</span></div></div>`
}

function totals(items: readonly DietMealItem[]) {
  return items.reduce((sum, item) => {
    const value = getMealItemNutrition(item)
    for (const key of Object.keys(sum) as (keyof RecipeNutrition)[]) sum[key] += value[key]
    return sum
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, calcium: 0, iron: 0 })
}

function renderMealItem(item: DietMealItem) {
  if (item.kind === "FOOD") {
    const unit = getRecipeFoodUnitPresentation(item.food.baseAmount, item.food.baseUnit).measure
    const measure = item.measure.trim() && item.measure !== unit ? `<span class="measure">${escapeHtml(item.measure)}</span>` : ""
    return `<tr><td class="qty-cell">${formatNumber(item.quantity)}<span class="unit">${escapeHtml(unit)}</span>${measure}</td><td class="food-name">${escapeHtml(item.food.name)}</td></tr>`
  }
  const version = item.recipeVersion
  const ingredients = buildShoppingList([item], 1).map(ingredient => `<li>${formatNumber(ingredient.qty)} ${escapeHtml(ingredient.measure)} — ${escapeHtml(ingredient.name)}</li>`).join("")
  const instructions = version.instructions ? `<strong>Modo de preparo</strong><p class="recipe-instructions">${multiline(version.instructions)}</p>` : ""
  return `<tr><td class="qty-cell">${formatNumber(item.quantity)}<span class="unit">${item.quantity === 1 ? "porção" : "porções"}</span></td><td class="food-name">${escapeHtml(version.name)} · versão ${formatNumber(version.version)}</td></tr><tr><td colspan="2"><div class="recipe-detail"><strong>Ingredientes para ${formatNumber(item.quantity)} ${item.quantity === 1 ? "porção" : "porções"}</strong><ul>${ingredients}</ul>${instructions}</div></td></tr>`
}

export function buildDietPrintHtml(input: DietPrintInput): string {
  const { dietInfo, meals } = input
  const dayTotals = totals(meals.flatMap(meal => meal.items))
  const mealBlocks = meals.map(meal => {
    const value = totals(meal.items)
    return `<div class="meal-block"><div class="meal-header"><div class="meal-title-row"><span class="meal-time">${escapeHtml(meal.time ?? "")}</span><span class="meal-name">${escapeHtml(meal.name.toUpperCase())}</span></div><div class="meal-macros"><span class="macro-kcal">${formatNumber(Math.round(value.kcal))} kcal</span><span class="macro-sep">·</span><span class="macro-p">P ${formatNumber(Math.round(value.protein))}g</span><span class="macro-sep">·</span><span class="macro-c">C ${formatNumber(Math.round(value.carbs))}g</span><span class="macro-sep">·</span><span class="macro-g">G ${formatNumber(Math.round(value.fat))}g</span></div></div><table class="items-table"><tbody>${meal.items.map(renderMealItem).join("")}</tbody></table>${meal.notes ? `<div class="meal-notes">📌 ${multiline(meal.notes)}</div>` : ""}</div>`
  }).join("")
  const totalCards = ([
    ["", "Calorias", dayTotals.kcal, "kcal"], ["ptn", "Proteínas", dayTotals.protein, "g"],
    ["carb", "Carboidratos", dayTotals.carbs, "g"], ["fat", "Gorduras", dayTotals.fat, "g"],
  ] as const).map(([className, label, value, unit]) => `<div class="total-item ${className}"><div class="t-label">${label}</div><div class="t-value">${formatNumber(Math.round(value))}</div><div class="t-unit">${unit} / dia</div></div>`).join("")
  const notes = dietInfo.notes ? `<div class="general-notes"><h3>Orientações Gerais</h3><p>${multiline(dietInfo.notes)}</p></div>` : ""
  return documentHtml(`Plano Alimentar — ${input.clientName}`, `${header(input, "Plano Alimentar", `${escapeHtml(dietInfo.title)} · Foco: ${escapeHtml(dietInfo.goal)}`, `<div class="meta-line">Prescrito em ${escapeHtml(input.dateLabel)}</div><div class="meta-line">${formatNumber(dietInfo.durationDays)} dias de plano</div>`)}<div class="info-strip"><div class="info-card"><div class="label">Meta Calórica</div><div class="value green">${formatNumber(Math.round(dayTotals.kcal))} kcal</div></div><div class="info-card"><div class="label">Refeições por dia</div><div class="value">${meals.length}</div></div><div class="info-card"><div class="label">Duração do plano</div><div class="value">${formatNumber(dietInfo.durationDays)} dias</div></div></div>${mealBlocks}<div class="totals-section">${totalCards}</div>${notes}${footer(dietInfo.goal)}`)
}

export function buildShoppingListPrintHtml(input: ShoppingListPrintInput): string {
  const { dietInfo, shoppingDays } = input
  const list = buildShoppingList(input.meals.flatMap(meal => meal.items), shoppingDays)
  const half = Math.ceil(list.length / 2)
  const columns = [list.slice(0, half), list.slice(half)].map(items => `<table class="list-table"><tbody>${items.map(item => `<tr><td class="check-cell"><div class="checkbox"></div></td><td class="item-name">${escapeHtml(item.name)}</td> <td class="item-qty">${formatNumber(item.qty)} ${escapeHtml(item.measure)}</td></tr>`).join("")}</tbody></table>`).join("")
  const tips = `<div class="tips"><div class="tips-title">💡 Dicas para suas compras</div><div class="tips-grid"><div class="tip-item"><span class="tip-icon">🥩</span><span>Proteínas frescas (carne, frango, peixe): prefira comprar 1–2x por semana para garantir frescor.</span></div><div class="tip-item"><span class="tip-icon">🥦</span><span>Legumes e verduras: compre 2–3x por semana. Congele o excedente se necessário.</span></div><div class="tip-item"><span class="tip-icon">🫙</span><span>Grãos e proteínas em pó podem ser comprados mensalmente — verifique a data de validade.</span></div><div class="tip-item"><span class="tip-icon">⚖️</span><span>Confira as medidas e o preparo prescritos ao separar os ingredientes.</span></div></div></div>`
  return documentHtml(`Lista de Compras — ${input.clientName}`, `${header(input, "Lista de Compras", `${escapeHtml(dietInfo.title)} · ${escapeHtml(dietInfo.goal)}`, `<div class="meta-line">Gerada em ${escapeHtml(input.dateLabel)}</div><div class="meta-line">Quantidade para <strong>${formatNumber(shoppingDays)} dias</strong></div>`)}<div class="intro">📋 Esta lista contém todos os alimentos necessários para <strong>${formatNumber(shoppingDays)} dias</strong> do seu plano alimentar "<strong>${escapeHtml(dietInfo.title)}</strong>". As quantidades já estão calculadas — basta comprar e seguir o plano!</div><div class="section-title">Todos os Alimentos (${list.length} itens)</div><div class="columns">${columns}</div>${tips}${footer(dietInfo.goal)}`)
}
