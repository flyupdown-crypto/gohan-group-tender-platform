const logoPath = "./assets/logo.png";
const STORAGE_KEY = "gohanGroupTenderPlatformV2";
const WINDOW_STATE_PREFIX = "GOHAN_GROUP_TENDER_STATE:";
const DATA_SCHEMA_VERSION = 4;
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyF6xppyQ7BkYZbe6EAW0kj2tMv3nCJQaw9KWC6XqTONP4l5uBr4VxUPd7pfC-QJxz7/exec";
let remoteLoadStarted = false;
const pageMode = (() => {
  const filename = window.location.pathname.split("/").pop().toLowerCase();
  if (filename === "supplier.html") return "supplier";
  if (filename === "admin.html") return "admin";
  if (filename === "owner.html") return "owner";
  return "";
})();
const modeParam = new URLSearchParams(window.location.search).get("mode") || pageMode || "owner";
const currentMode = ["owner", "supplier", "admin"].includes(modeParam) ? modeParam : "owner";
const modeMeta = {
  owner: { label: "老板模式", defaultView: "boss", role: "客户老板视图", views: ["boss", "risk", "compare"] },
  supplier: { label: "供应商模式", defaultView: "supplier", role: "供应商填写视图", views: ["supplier"] },
  admin: { label: "管理员模式", defaultView: "admin", role: "管理员评估视图", views: ["admin", "boss", "risk"] },
};

const capabilityMeta = {
  A: { name: "通用基础功能", weightLevel: "低", weightScore: 1 },
  B: { name: "企业级运营管理功能", weightLevel: "中", weightScore: 2 },
  C: { name: "ERP / WMS 深度能力", weightLevel: "高", weightScore: 4 },
  D: { name: "跨业态 / 跨模块能力", weightLevel: "极高", weightScore: 5 },
  E: { name: "实施与迁移能力", weightLevel: "极高", weightScore: 5 },
  F: { name: "架构与扩展能力", weightLevel: "高", weightScore: 4 },
  H: { name: "硬件与设备能力", weightLevel: "中高", weightScore: 3 },
};

const scoreDimensions = ["总体评分", "功能覆盖率", "标准功能比例", "定制开发比例", "ERP/WMS 深度", "跨业态能力", "实施迁移能力", "架构扩展能力", "硬件适配风险", "隐性成本风险"];

const moduleDefinitions = [
  { code: "M01", name: "项目背景与供应商资格", description: "确认供应商是否理解 Gohan Group 跨业态招标背景，并具备基本集团级交付资格。", defaultCategory: "B", items: [["A01｜基础商品资料管理能力", "A"], ["A02｜基础销售订单与退换货管理能力", "A"], ["A03｜基础客户资料管理能力", "A"], ["A04｜基础供应商资料管理能力", "A"], ["A05｜基础员工与部门管理能力", "A"], ["A06｜基础经营报表能力", "A"], ["A07｜基础系统配置能力", "A"], ["A08｜基础账号登录与权限入口能力", "A"]] },
  { code: "M02", name: "跨业态会员与客户数据整合", description: "验证餐饮、零售、娱乐、未来酒店之间的会员、储值、积分和客户画像整合能力。", defaultCategory: "D", items: ["餐饮 + 零售统一会员", "餐饮 + 娱乐统一会员", "未来酒店会员扩展", "跨业态积分互通", "跨业态储值互通", "跨业态会员权益", "集团统一客户画像", "跨业态会员数据清洗", "多业态营销活动", "WhatsApp 跨业态营销", "餐饮 POS 数据接入", "零售 POS 数据接入", "娱乐系统数据接入", "未来酒店系统接口预留", "POS + ERP + CRM 数据同步", "集团级数据中台", "多业态订单拆分", "多业态订单合并", "子公司 / 多品牌数据汇总", "跨业态客户隐私同意管理"] },
  { code: "M03", name: "ERP / WMS 深度能力", description: "验证供应商是否具备真正 ERP / WMS 深度，而非轻量库存或普通 POS 能力。", defaultCategory: "C", items: ["多仓体系", "中央仓与门店仓", "库区管理", "库位管理", "货架管理", "批次管理", "保质期管理", "FIFO / FEFO 出库规则", "入库差异单", "出库流水", "入库流水", "库存变更日志", "库存损耗记录", "多仓调拨", "多仓拆单", "合并订单出库", "部分出库", "自动补货建议", "安全库存规则", "最低库存规则", "采购审批流", "出库审批流", "财务审批流", "客户授信额度", "欠款控制", "应收款管理", "应付款管理", "VAT 税率配置", "多税率配置", "打印模板自定义"] },
  { code: "M04", name: "供应链与采购库存管理", description: "验证集团采购、供应商、库存、追溯和成本管理的业务闭环。", defaultCategory: "B", items: [["总部采购管理", "B"], ["供应商评级", "B"], ["成本分析", "B"]] },
  { code: "M05", name: "多系统集成与硬件适配", description: "验证 Open API、Webhook、OAuth、欧洲部署、安全合规和关键硬件复用能力。", defaultCategory: "F", items: [["Open API", "F"], ["Webhook", "F"], ["第三方 API 集成", "F"], ["OAuth / SSO", "F"], ["GDPR 合规", "F"], ["数据加密", "F"], ["操作审计日志", "F"], ["权限隔离", "F"], ["欧洲云部署", "F"], ["多语言切换", "F"], ["多时区切换", "F"], ["系统消息提醒", "F"], ["高并发能力", "F"], ["数据备份", "F"], ["灾备恢复", "F"], ["POS 硬件适配", "H"], ["商米设备适配", "H"], ["KDS 设备适配", "H"], ["自助收款机适配", "H"], ["扫码设备适配", "H"], ["标签打印机适配", "H"], ["小票打印机适配", "H"], ["现有硬件复用能力", "H"], ["硬件更换成本披露", "H"], ["设备远程诊断", "H"]] },
  { code: "M06", name: "数据分析与老板决策", description: "提供老板可读的集团经营、BI、预测和多品牌对比能力。", defaultCategory: "B", items: [["集团统一 BI 看板", "D"], ["利润分析", "B"], ["子公司 / 多品牌数据汇总", "D"]] },
  { code: "M07", name: "实施、迁移与上线交付", description: "验证数据初始化、历史数据导入、上线策略、培训和回滚能力。", defaultCategory: "E", items: ["商品主数据初始化", "客户数据初始化", "供应商数据初始化", "历史库存导入", "历史销售订单导入", "历史采购订单导入", "期初库存录入", "期初应收款录入", "期初应付款录入", "数据清洗", "数据去重", "数据校验", "试点上线"] },
  { code: "M08", name: "报价、隐性成本与风险披露", description: "验证供应商是否完整披露迁移、培训、新店、硬件、运维和后续定制成本。", defaultCategory: "E", items: ["数据迁移费用披露", "培训费用披露", "后续新增门店费用披露", "硬件更换成本披露", "运维费用披露", "定制开发费用披露", "多仓部署费用披露", "隐性成本说明"] },
];

const requirements = moduleDefinitions.reduce((all, module) => all.concat(module.items.map((item, index) => {
  const requirementName = Array.isArray(item) ? item[0] : item;
  const capabilityCategory = Array.isArray(item) ? item[1] : module.defaultCategory;
  const meta = capabilityMeta[capabilityCategory];
  return { moduleCode: module.code, moduleName: module.name, requirementCode: `${module.code}-R${String(index + 1).padStart(3, "0")}`, requirementName, capabilityCategory, capabilityName: meta.name, weightLevel: meta.weightLevel, weightScore: meta.weightScore };
})), []);

const selfDeclarationItems = ["我方已阅读本项目背景与需求范围", "我方确认报价已包含所列功能的实施成本", "我方已明确区分标准功能与定制开发功能", "如需额外开发，已填写预计工时与费用", "未在本表中说明的额外费用，不应作为后续追加预算依据"];

const defaultState = {
  schemaVersion: DATA_SCHEMA_VERSION,
  selectedSupplierId: "supplierA",
  activeView: "home",
  activeRole: "客户老板视图",
  searchTerm: "",
  activeFilter: "全部",
  openModules: [],
  suppliers: ["A", "B", "C"].map((code, supplierIndex) => ({
    id: `supplier${code}`,
    code,
    label: `供应商 ${code}`,
    companyName: "",
    contact: "",
    email: "",
    website: "",
    notes: "",
    capabilities: { gdpr: "", europeDeploy: "", openApi: "", thirdParty: "", thirdPartySummary: "", successCase: "" },
    quotation: { software: "", implementation: "", migration: "", training: "", hardware: "", thirdParty: "", annualSaas: "", notes: "" },
    declarations: [supplierIndex === 0, supplierIndex === 0, false, false, false],
    responses: createDefaultResponses(supplierIndex),
  })),
};

let state = loadState();
normalizeModeState();
saveState();

const icons = {
  dashboard: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="8" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/></svg>`,
  supplier: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-8h6v8"/><path d="M8 9h.01M12 9h.01M16 9h.01"/></svg>`,
  shield: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></svg>`,
  export: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`,
};

function createDefaultResponses(seed) {
  return requirements.map((requirement) => {
    return {
      requirementCode: requirement.requirementCode,
      support: "",
      depth: "",
      standardType: "",
      customDays: "",
      fee: "",
      riskNote: "",
    };
  });
}

function normalizeLegacyResponse(response, isLegacyState) {
  const next = { ...response };
  const looksLikeOldPrefill = isLegacyState
    && next.support === "支持"
    && next.depth === "标准支持"
    && next.standardType === "标准功能"
    && String(next.customDays || "") === "0"
    && String(next.fee || "") === "0"
    && !next.riskNote;
  if (looksLikeOldPrefill) {
    next.support = "";
    next.depth = "";
    next.standardType = "";
    next.customDays = "";
    next.fee = "";
  }
  return next;
}

function loadState() {
  try {
    const saved = readSavedState();
    if (!saved || !Array.isArray(saved.suppliers)) return cloneData(defaultState);
    const isLegacyState = Number(saved.schemaVersion || 0) < DATA_SCHEMA_VERSION;
    const next = cloneData(defaultState);
    Object.assign(next, saved);
    next.schemaVersion = DATA_SCHEMA_VERSION;
    next.suppliers = next.suppliers.map((baseSupplier) => {
      const savedSupplier = saved.suppliers.find((supplier) => supplier.id === baseSupplier.id) || {};
      const quotation = { ...baseSupplier.quotation, ...(savedSupplier.quotation || {}) };
      delete quotation.totalOverride;
      return {
        ...baseSupplier,
        ...savedSupplier,
        capabilities: { ...baseSupplier.capabilities, ...(savedSupplier.capabilities || {}) },
        quotation,
        responses: requirements.map((req, i) => normalizeLegacyResponse({ ...baseSupplier.responses[i], ...(savedSupplier.responses || []).find((r) => r.requirementCode === req.requirementCode), requirementCode: req.requirementCode }, isLegacyState)),
      };
    });
    return next;
  } catch {
    return cloneData(defaultState);
  }
}

function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
function readSavedState() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw && typeof window !== "undefined" && typeof window.name === "string" && window.name.indexOf(WINDOW_STATE_PREFIX) === 0) {
    raw = window.name.slice(WINDOW_STATE_PREFIX.length);
  }
  return raw ? JSON.parse(raw) : null;
}
function saveState() {
  const content = JSON.stringify(state);
  if (typeof window !== "undefined") window.name = WINDOW_STATE_PREFIX + content;
  try {
    localStorage.setItem(STORAGE_KEY, content);
    return true;
  } catch {
    showActionStatus("浏览器当前未允许 LocalStorage，本页已启用临时保存；建议后续部署到 Vercel 后再正式填写。");
    return false;
  }
}
function normalizeModeState() {
  const meta = modeMeta[currentMode];
  state.activeRole = meta.role;
  if (!meta.views.includes(state.activeView)) state.activeView = meta.defaultView;
}
function selectedSupplier() { return state.suppliers.find((s) => s.id === state.selectedSupplierId) || state.suppliers[0]; }
function comparisonSuppliers() {
  const filled = state.suppliers.filter((supplier) => String(supplier.companyName || "").trim());
  return filled.length ? filled : state.suppliers.slice(0, 1);
}
function displaySupplierName(supplier) { return supplier.companyName || "公司名称未填写"; }
function requirementFor(response) { return requirements.find((r) => r.requirementCode === response.requirementCode); }
function isMobileViewport() { return window.matchMedia && window.matchMedia("(max-width: 780px)").matches; }
function isFilled(r) { return Boolean(r.support && r.depth && r.standardType); }
function money(value) { return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value || 0)); }
function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
function riskClass(v) { return v === "高" || v === "high" ? "red" : v === "中" || v === "medium" ? "amber" : "green"; }
function scoreClass(score) { return score >= 80 ? "good" : score >= 65 ? "mid" : "bad"; }
function parseAmount(value) { return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0; }
function quoteTotal(supplier) {
  return quoteAutomaticTotal(supplier);
}
function quoteAutomaticTotal(supplier) {
  const q = supplier.quotation || {};
  const quoteFieldsTotal = ["software", "implementation", "migration", "training", "hardware", "thirdParty", "annualSaas"].reduce((sum, key) => sum + parseAmount(q[key]), 0);
  return quoteFieldsTotal + responseTotals(supplier).fee;
}
function responseTotals(supplier, moduleName) {
  return supplier.responses.reduce((totals, response) => {
    const req = requirementFor(response);
    if (!req || (moduleName && req.moduleName !== moduleName)) return totals;
    totals.days += Number(response.customDays || 0) || 0;
    totals.fee += parseAmount(response.fee);
    return totals;
  }, { days: 0, fee: 0 });
}
function formatDays(value) { return `${Number(value || 0).toLocaleString("zh-CN")} 人天`; }
function getPath(obj, path) {
  const value = path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  return value === undefined || value === null ? "" : value;
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {};
    return acc[key];
  }, obj);
  target[last] = value;
}

function validateResponse(response) {
  const warnings = [];
  if (!response.support) warnings.push("是否支持未填写");
  if (!response.depth) warnings.push("功能深度未填写");
  if (!response.standardType) warnings.push("是否标准功能未填写");
  if (response.standardType === "标准功能" && response.depth === "需定制开发") warnings.push("功能深度与标准功能存在矛盾");
  if (response.standardType === "标准功能" && Number(response.customDays || 0) >= 3) warnings.push("存在疑似隐性定制开发");
  if (response.standardType === "需定制开发" && !response.customDays) warnings.push("定制开发工时必填");
  if (response.standardType === "需定制开发" && !response.fee) warnings.push("定制开发费用未填写");
  return warnings;
}

function calcSupplierStats(supplier) {
  const total = requirements.length;
  const filled = supplier.responses.filter(isFilled).length;
  const custom = supplier.responses.filter((r) => r.standardType === "需定制开发").length;
  const standard = supplier.responses.filter((r) => r.standardType === "标准功能").length;
  const thirdParty = supplier.capabilities && supplier.capabilities.thirdParty === "是" ? 1 : 0;
  const customDays = supplier.responses.reduce((sum, r) => sum + Number(r.customDays || 0), 0);
  const hiddenMissing = supplier.responses.filter((r) => r.standardType === "需定制开发" && !r.fee).length;
  const validationCount = supplier.responses.reduce((sum, r) => sum + validateResponse(r).length, 0);
  const highRisk = supplier.responses.filter((r) => validateResponse(r).length >= 2 || r.depth === "基础支持").length;
  return { total, filled, missing: total - filled, standard, custom, thirdParty, customDays, hiddenMissing, validationCount, highRisk, completion: clamp((filled / total) * 82 + (supplier.declarations.filter(Boolean).length / selfDeclarationItems.length) * 12 - validationCount * 0.35) };
}

function calcCategoryScore(supplier, category) {
  const scoped = supplier.responses.filter((r) => requirementFor(r).capabilityCategory === category);
  if (!scoped.length) return 0;
  const raw = scoped.reduce((sum, r) => {
    let score = r.support === "支持" ? 100 : r.support === "部分支持" ? 55 : 0;
    if (r.depth === "基础支持") score -= 12;
    if (r.depth === "需定制开发") score -= 18;
    if (r.standardType === "需定制开发") score -= 18;
    if (r.standardType === "需定制开发" && !r.customDays) score -= 18;
    if (r.standardType === "需定制开发" && !r.fee) score -= 12;
    if (r.standardType === "标准功能" && r.depth === "需定制开发") score -= 18;
    return sum + clamp(score);
  }, 0);
  return clamp(raw / scoped.length);
}

function supplierLevelAdjustment(supplier) {
  const c = supplier.capabilities || {};
  let score = 0;
  if (c.gdpr === "是") score += 2; else if (c.gdpr === "否") score -= 5;
  if (c.europeDeploy === "是") score += 2; else if (c.europeDeploy === "否") score -= 4;
  if (c.openApi === "是") score += 2; else if (c.openApi === "否") score -= 4;
  if (c.thirdParty === "是" && !c.thirdPartySummary) score -= 4;
  if (c.successCase === "是") score += 2; else if (c.successCase === "否") score -= 3;
  return score;
}

function calcScores(supplier) {
  const stats = calcSupplierStats(supplier);
  const categoryScores = {};
  Object.keys(capabilityMeta).forEach((key) => { categoryScores[key] = calcCategoryScore(supplier, key); });
  const supportRate = clamp((supplier.responses.filter((r) => r.support === "支持").length + supplier.responses.filter((r) => r.support === "部分支持").length * 0.55) / requirements.length * 100 - stats.validationCount * 0.15);
  const standardRate = clamp(stats.standard / requirements.length * 100);
  const customRate = clamp(100 - stats.custom / requirements.length * 100);
  const erpScore = categoryScores.C;
  const crossScore = categoryScores.D;
  const migrationScore = categoryScores.E;
  const architectureScore = categoryScores.F;
  const hardwareScore = categoryScores.H;
  const hiddenCostScore = clamp(100 - stats.hiddenMissing / requirements.length * 100 - stats.validationCount * 0.35);
  const weightedNumerator = supplier.responses.reduce((sum, r) => {
    const req = requirementFor(r);
    let score = r.support === "支持" ? 100 : r.support === "部分支持" ? 55 : 0;
    if (r.depth === "深度支持") score += 5;
    if (r.depth === "基础支持") score -= 12;
    if (r.depth === "需定制开发") score -= 18;
    if (r.standardType === "需定制开发") score -= 18;
    if (r.standardType === "标准功能" && Number(r.customDays || 0) >= 3) score -= 20;
    if (r.standardType === "需定制开发" && !r.customDays) score -= 20;
    if (r.standardType === "需定制开发" && !r.fee) score -= 12;
    if (r.standardType === "标准功能" && r.depth === "需定制开发") score -= 18;
    return sum + clamp(score) * req.weightScore;
  }, 0);
  const weightTotal = requirements.reduce((sum, r) => sum + r.weightScore, 0);
  const totalScore = clamp(weightedNumerator / weightTotal + supplierLevelAdjustment(supplier));
  const risk = totalScore < 60 || stats.highRisk > 25 ? "high" : totalScore < 78 || stats.highRisk > 12 ? "medium" : "low";
  return { ...stats, categoryScores, supportRate, standardRate, customRate, erpScore, crossScore, migrationScore, architectureScore, hardwareScore, hiddenCostScore, totalScore, risk };
}

function bossWarning(supplier) {
  const s = calcScores(supplier);
  const warnings = [];
  if (!supplier.companyName || !supplier.declarations.every(Boolean)) warnings.push("当前数据可能尚未完整确认，请谨慎参考。");
  if ((s.categoryScores.A >= 78 || s.supportRate >= 76) && (s.erpScore < 62 || s.crossScore < 62 || s.migrationScore < 62)) warnings.push("该供应商基础功能覆盖较好，但 ERP/WMS 深度、跨业态整合或实施迁移能力不足，不建议仅依据基础功能覆盖率做决策。");
  return warnings.join(" ");
}

function lowPriceRiskWarning(supplier) {
  const s = calcScores(supplier);
  const totals = comparisonSuppliers().map(quoteTotal).filter(Boolean);
  const avg = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
  const clearlyLow = avg > 0 && quoteTotal(supplier) > 0 && quoteTotal(supplier) < avg * 0.72;
  const hiddenSignals = [
    clearlyLow,
    s.custom > requirements.length * 0.22,
    supplier.responses.some((r) => r.standardType === "标准功能" && Number(r.customDays || 0) >= 3),
    supplier.responses.some((r) => r.standardType === "需定制开发" && !r.customDays),
    supplier.responses.some((r) => r.standardType === "需定制开发" && !r.fee),
    ["implementation", "migration", "training", "thirdParty", "annualSaas"].some((key) => !(supplier.quotation && supplier.quotation[key])),
  ];
  if (clearlyLow && (s.custom > requirements.length * 0.15 || supplier.responses.some((r) => r.standardType === "需定制开发" && !r.customDays))) return "该供应商报价明显偏低，可能存在后续追加开发或实施成本风险。";
  if (hiddenSignals.filter(Boolean).length >= 3) return "该供应商存在低价高风险特征：报价可能未完整覆盖实施、迁移、定制开发、接口或后续运维成本，建议进一步澄清。";
  return "";
}

function filteredRequirements(moduleName, supplier) {
  const term = "";
  return requirements.filter((req) => {
    if (req.moduleName !== moduleName) return false;
    const r = supplier.responses.find((item) => item.requirementCode === req.requirementCode);
    const textMatch = !term || `${req.requirementCode}${req.requirementName}${req.moduleName}${req.capabilityName}`.toLowerCase().includes(term);
    const filterMatch = state.activeFilter === "全部" || (state.activeFilter === "未填写" && !isFilled(r)) || (state.activeFilter === "需定制开发" && r.standardType === "需定制开发") || (state.activeFilter === "费用缺失" && r.standardType === "需定制开发" && !r.fee) || (state.activeFilter === "高风险" && validateResponse(r).length >= 2);
    return textMatch && filterMatch;
  });
}

function moduleStats(moduleName, supplier) {
  const scoped = requirements.filter((r) => r.moduleName === moduleName).map((req) => supplier.responses.find((r) => r.requirementCode === req.requirementCode));
  const total = scoped.length;
  const filled = scoped.filter(isFilled).length;
  const totals = responseTotals(supplier, moduleName);
  return { total, filled, highRisk: scoped.filter((r) => validateResponse(r).length >= 2).length, completion: total ? clamp((filled / total) * 100) : 0, customDays: totals.days, feeTotal: totals.fee };
}

function render() {
  normalizeModeState();
  if (currentMode === "supplier") {
    document.querySelector("#app").innerHTML = `<div class="app-shell supplier-shell">${renderSidebar()}<main class="main">${renderTopbar()}<section class="content supplier-only-content">${renderSupplierModePage()}</section></main></div>`;
  } else {
    document.querySelector("#app").innerHTML = `<div class="app-shell">${renderSidebar()}<main class="main">${renderTopbar()}<section class="content">${renderSummary()}<div class="work-area"><div class="stack">${renderMainPanel()}${renderCriteriaPanel()}</div>${renderDetailPanel(selectedSupplier())}</div></section></main></div>`;
  }
  setupLogoFallback();
  bindEvents();
  loadRemoteSuppliersIfNeeded();
}

function renderSidebar() {
  const ownerNav = `<button type="button" class="nav-item ${state.activeView === "boss" ? "active" : ""}" data-view="boss">${icons.dashboard} 老板视图</button><button type="button" class="nav-item ${state.activeView === "risk" ? "active" : ""}" data-view="risk">${icons.shield} 风险分析</button><button type="button" class="nav-item ${state.activeView === "compare" ? "active" : ""}" data-view="compare">${icons.dashboard} 供应商对比</button>`;
  const supplierNav = `<button type="button" class="nav-item active" data-scroll-target="supplier-form">${icons.supplier} 供应商填写</button><button type="button" class="nav-item" data-scroll-target="supplier-project">${icons.dashboard} 项目说明</button><button type="button" class="nav-item" data-scroll-target="supplier-progress">${icons.shield} 保存状态</button>`;
  const adminNav = `<button type="button" class="nav-item ${state.activeView === "admin" ? "active" : ""}" data-view="admin">${icons.shield} 管理员视图</button><button type="button" class="nav-item ${state.activeView === "boss" ? "active" : ""}" data-view="boss">${icons.dashboard} 老板视图预览</button><button type="button" class="nav-item ${state.activeView === "risk" ? "active" : ""}" data-view="risk">${icons.export} 数据导出</button>`;
  const nav = currentMode === "supplier" ? supplierNav : currentMode === "admin" ? adminNav : ownerNav;
  return `<aside class="sidebar"><div class="brand"><div class="brand-logo"><img src="${logoPath}" alt="Gohan Group 标志" /><div class="brand-mark">G</div></div><div><strong>Gohan Group</strong><span>${modeMeta[currentMode].label}</span></div></div><nav class="nav-group"><div class="nav-title">当前模式</div>${nav}</nav><div class="sidebar-footer"><strong>${modeMeta[currentMode].label}</strong><span>${currentMode === "supplier" ? "仅显示填写所需内容、保存状态和自身数据导出。" : "统一比较 ERP、WMS、跨业态、迁移和隐性成本风险。"}</span></div></aside>`;
}

function renderTopbar() {
  const actions = currentMode === "supplier"
    ? `<div class="actions"><button type="button" class="btn primary" data-submit-backend>${icons.export} 提交到后台</button><button type="button" class="btn" data-export="supplier-json">${icons.export} 导出备份 JSON</button></div>`
    : `<div class="actions">${currentMode === "admin" ? `<button type="button" class="btn" data-export="json">${icons.export} 导出 JSON</button><button type="button" class="btn primary" data-export="csv">${icons.export} 导出 CSV</button>` : `<a class="btn" href="index.html?mode=supplier">切换到供应商模拟填写</a>${currentMode === "owner" ? `<a class="btn primary" href="index.html?mode=admin">管理员入口</a>` : ""}`}</div>`;
  return `<header class="topbar"><div><h1>Gohan Group 集团数字化系统采购与供应商评估平台</h1><p>Gohan Group 跨业态数字化系统招标与供应商评估平台 · ${modeMeta[currentMode].label}</p></div><div class="topbar-tools"><span class="mode-badge">${modeMeta[currentMode].label}</span>${actions}<div class="export-status global-export-status" data-export-status></div></div></header>`;
}

function renderSummary() {
  const ranked = comparisonSuppliers().map((supplier) => ({ supplier, scores: calcScores(supplier) })).sort((a, b) => b.scores.totalScore - a.scores.totalScore);
  return `<div class="summary-grid"><div class="metric wide"><div class="status-row"><span class="pill teal">${state.activeRole}</span><span class="pill green">${requirements.length} 个细分需求</span><span class="pill amber">A-F + H 能力分类</span></div><div><div class="metric-label">平台定位</div><div class="metric-foot">不是普通功能清单，而是用于正式招标、老板决策、供应商填报和隐性成本识别的集团级评估平台。</div></div></div><div class="metric"><div class="metric-label">当前第一名</div><div class="metric-value">${ranked[0].scores.totalScore}</div><div class="metric-foot">${displaySupplierName(ranked[0].supplier)}</div></div><div class="metric"><div class="metric-label">ERP 深度最高</div><div class="metric-value">${Math.max(...ranked.map((x) => x.scores.erpScore))}</div><div class="metric-foot">重点识别 ERP / WMS 真能力。</div></div><div class="metric"><div class="metric-label">高风险项</div><div class="metric-value">${ranked.reduce((sum, x) => sum + x.scores.highRisk, 0)}</div><div class="metric-foot">含隐性定制、第三方依赖和合规缺口。</div></div></div>`;
}

function renderMainPanel() {
  const titles = { boss: "老板决策视图", risk: "风险分析", compare: "供应商横向对比", admin: "管理员评估视图" };
  const body = state.activeView === "boss" ? renderBossView() : state.activeView === "risk" ? renderRiskView() : state.activeView === "compare" ? renderCompareView() : renderAdminView();
  const tabs = currentMode === "admin"
    ? `<button type="button" class="tab ${state.activeView === "admin" ? "active" : ""}" data-view="admin">管理员</button><button type="button" class="tab ${state.activeView === "boss" ? "active" : ""}" data-view="boss">老板视图预览</button><button type="button" class="tab ${state.activeView === "risk" ? "active" : ""}" data-view="risk">数据导出</button>`
    : `<button type="button" class="tab ${state.activeView === "boss" ? "active" : ""}" data-view="boss">老板视图</button><button type="button" class="tab ${state.activeView === "risk" ? "active" : ""}" data-view="risk">风险分析</button><button type="button" class="tab ${state.activeView === "compare" ? "active" : ""}" data-view="compare">供应商对比</button>`;
  return `<section class="panel"><div class="panel-header"><div><h2>${titles[state.activeView] || "老板决策视图"}</h2><p>需求编号、能力分类、权重和导出字段全平台统一。</p></div><div class="tabs">${tabs}</div></div>${body}</section>`;
}

function renderBossView() {
  return `<div class="home-surface"><div class="section-title"><h3>决策摘要</h3><span>快速判断推荐、谨慎或不建议</span></div>${renderDecisionCards()}<div class="section-title"><h3>总评分排名</h3><span>老板优先看结论，再看风险明细</span></div>${renderRanking()}${renderQuoteComparison()}<div class="section-title"><h3>C / D / E / F 能力图表</h3><span>ERP、跨业态、迁移、架构和硬件风险单独展示</span></div>${renderBossCharts()}${renderHeatmap()}${renderWeightAnalysis()}<div class="section-title danger"><h3>高风险需求列表</h3><span>优先澄清隐性定制、第三方依赖和合规缺口</span></div>${renderRiskList()}${renderProjectBackground()}</div>`;
}

function renderCompareView() {
  return `<div class="home-surface"><div class="section-title"><h3>供应商横向对比</h3><span>集中比较总分、能力分、工时和隐性成本风险</span></div>${renderDecisionCards()}${renderRanking()}${renderQuoteComparison()}<div class="section-title"><h3>能力对比图表</h3><span>C/D/E/F 与硬件风险分开看，避免基础功能稀释判断</span></div>${renderBossCharts()}${renderHeatmap()}${renderWeightAnalysis()}</div>`;
}

function decisionLabel(score) {
  if (score.totalScore >= 82 && score.erpScore >= 75 && score.crossScore >= 75 && score.migrationScore >= 75 && score.highRisk <= 8) return ["推荐", "green"];
  if (score.totalScore < 65 || score.erpScore < 60 || score.crossScore < 60 || score.migrationScore < 60 || score.highRisk > 18) return ["不建议", "red"];
  return ["谨慎", "amber"];
}

function renderDecisionCards() {
  return `<div class="decision-grid">${comparisonSuppliers().map((supplier) => { const s = calcScores(supplier); const [label, tone] = decisionLabel(s); return `<article class="decision-card ${tone}"><div><span>供应商</span><strong>${label}</strong><p>${displaySupplierName(supplier)}</p></div><div class="decision-score">${s.totalScore}</div><div class="decision-lines"><span>ERP ${s.erpScore}</span><span>跨业态 ${s.crossScore}</span><span>迁移 ${s.migrationScore}</span><span>高风险 ${s.highRisk} 项</span></div>${bossWarning(supplier) ? `<div class="warning-text">${bossWarning(supplier)}</div>` : ""}${lowPriceRiskWarning(supplier) ? `<div class="risk-alert">${lowPriceRiskWarning(supplier)}</div>` : ""}</article>`; }).join("")}</div>`;
}

function renderQuoteComparison() {
  const suppliers = comparisonSuppliers();
  const totals = suppliers.map(quoteTotal).filter(Boolean);
  const min = totals.length ? Math.min(...totals) : 0;
  const max = totals.length ? Math.max(...totals) : 0;
  const avg = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
  const q = (supplier) => supplier.quotation || {};
  return `<div class="section-title"><h3>供应商报价对比</h3><span>最低 ${money(min)} · 最高 ${money(max)} · 平均 ${money(avg)}</span></div><div class="matrix-wrap"><table><thead><tr><th>供应商</th><th>软件费用</th><th>实施费用</th><th>数据迁移费用</th><th>培训费用</th><th>硬件费用</th><th>第三方费用</th><th>年服务费</th><th>需求项费用汇总</th><th>项目总金额</th><th>隐性成本风险提示</th></tr></thead><tbody>${suppliers.map((supplier) => `<tr><td><strong>${displaySupplierName(supplier)}</strong></td><td>${q(supplier).software || "-"}</td><td>${q(supplier).implementation || "-"}</td><td>${q(supplier).migration || "-"}</td><td>${q(supplier).training || "-"}</td><td>${q(supplier).hardware || "-"}</td><td>${q(supplier).thirdParty || "-"}</td><td>${q(supplier).annualSaas || "-"}</td><td><strong>${money(responseTotals(supplier).fee)}</strong></td><td><strong>${money(quoteTotal(supplier))}</strong></td><td>${lowPriceRiskWarning(supplier) || "暂无明显报价风险"}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderHeatmap() {
  const categories = [["C", "ERP/WMS"], ["D", "跨业态"], ["E", "实施迁移"], ["F", "架构扩展"], ["H", "硬件适配"]];
  return `<div class="section-title"><h3>风险热力图</h3><span>颜色越深，越需要优先澄清</span></div><div class="heatmap-grid">${comparisonSuppliers().map((supplier) => { const s = calcScores(supplier); return `<article><strong>${displaySupplierName(supplier)}</strong>${categories.map(([key, label]) => { const value = s.categoryScores[key] || 0; const tone = value >= 78 ? "low" : value >= 62 ? "medium" : "high"; return `<div class="heatmap-cell ${tone}"><span>${label}</span><b>${value}</b></div>`; }).join("")}<div class="heatmap-cell ${s.highRisk <= 8 ? "low" : s.highRisk <= 18 ? "medium" : "high"}"><span>高风险项</span><b>${s.highRisk}</b></div></article>`; }).join("")}</div>`;
}

function renderWeightAnalysis() {
  const rows = Object.entries(capabilityMeta).map(([key, meta]) => {
    const count = requirements.filter((req) => req.capabilityCategory === key).length;
    const weightTotal = requirements.filter((req) => req.capabilityCategory === key).reduce((sum, req) => sum + req.weightScore, 0);
    return { key, meta, count, weightTotal };
  });
  return `<div class="section-title"><h3>权重分析</h3><span>避免基础功能稀释 ERP、跨业态和实施迁移判断</span></div><div class="weight-grid">${rows.map((row) => `<article><div><strong>${row.key} 类：${row.meta.name}</strong><span>${row.meta.weightLevel} / 权重 ${row.meta.weightScore}</span></div><div class="weight-bar"><span style="width:${clamp(row.weightTotal / requirements.reduce((sum, req) => sum + req.weightScore, 0) * 100)}%"></span></div><p>${row.count} 项需求 · 权重合计 ${row.weightTotal}</p></article>`).join("")}</div>`;
}

function renderSupplierModePage() {
  return `<section class="panel supplier-mode-panel"><div id="supplier-project">${renderSupplierIntro()}</div><div id="supplier-form">${renderSupplierView(selectedSupplier())}</div></section>`;
}

function renderSupplierIntro() {
  return `<div class="background-block supplier-intro"><h3>GOHAN GROUP 项目说明</h3><p>本项目为 Gohan Group 跨业态数字化系统招标，覆盖餐饮、零售、娱乐及未来酒店业务。供应商需逐项说明功能支持情况、功能深度、标准或定制、预计工时、费用和风险说明；GDPR、欧洲部署、Open API、第三方依赖和案例统一在供应商基础能力区填写一次。</p><p>请注意：本页面仅用于填写自身响应，不显示评审排名、横向对比、评审配置或全量数据导出。</p></div>`;
}

function renderHomePage() {
  return `<div class="home-surface"><div class="hero-card"><div><span>GOHAN GROUP</span><h2>跨业态数字化系统招标与供应商评估平台</h2><p>面向餐饮、零售、娱乐和未来酒店业务，统一评估 ERP / WMS 深度能力、跨业态整合能力、实施迁移能力和隐性成本风险。</p></div><div class="hero-stats"><strong>${requirements.length}</strong><small>硬核需求项</small><strong>${moduleDefinitions.length}</strong><small>评估模块</small></div></div>${renderProjectBackground()}<div class="section-title"><h3>三步使用流程</h3><span>客户确认范围，供应商逐项填写，老板查看决策结果</span></div><div class="guide-grid"><article><span>第一步</span><strong>客户确认项目背景与需求范围</strong><p>明确本次采购不是单店 POS，而是集团级 ERP / WMS、会员、数据、接口和实施迁移能力评估。</p></article><article><span>第二步</span><strong>供应商逐项填写功能响应、报价与实施风险</strong><p>每个需求只需填写支持情况、功能深度、标准或定制、工时、费用和风险说明；供应商级能力统一填写一次。</p></article><article><span>第三步</span><strong>客户查看供应商横向对比与风险评分</strong><p>老板视图集中展示排名、报价对比、C/D/E/F 能力、硬件适配风险和低价高风险提示。</p></article></div><div class="section-title"><h3>角色入口</h3><span>当前无需登录，支持前端模拟切换</span></div><div class="guide-grid role-entry-grid"><article data-view="boss"><span>客户老板视图</span><strong>看排名、看风险、看决策建议</strong><p>总评分排名、报价对比、C/D/E/F 能力、低价高风险提示、高权重需求覆盖率。</p><button class="btn primary" data-view="boss">进入老板视图</button></article><article data-view="supplier"><span>供应商填写视图</span><strong>逐项填写响应与交付风险</strong><p>手机端卡片填写，自动保存，按核心字段填写需求，并统一维护供应商基础能力和项目总报价。</p><button class="btn primary" data-view="supplier">进入填写视图</button></article><article data-view="admin"><span>管理员评估视图</span><strong>管理数据、校验风险、导出材料</strong><p>查看全部供应商、需求结构统计、风险规则说明，并导出 JSON / CSV。</p><button class="btn primary" data-view="admin">进入管理员视图</button></article></div><div class="module-grid">${moduleDefinitions.map((m) => `<article><h4>${m.code} ${m.name}</h4><p>${m.description}</p><span>${m.items.length} 项需求</span></article>`).join("")}</div></div>`;
}

function renderProjectBackground() {
  return `<div class="background-block"><h3>项目背景</h3><p>Gohan Group 是跨业态集团，业务覆盖餐饮、零售、未来酒店、娱乐和连锁门店。目前已有餐饮系统、零售 POS、会员系统、供应链系统和财务系统等多个独立系统。</p><p>现有供应商存在明显局限：某些供应商仅懂餐饮，某些供应商仅懂零售，没有供应商天然具备完整跨业态整合能力。本次招标重点不是单店 POS，而是集团级数字化、ERP/WMS 深度能力、跨业态会员体系、多系统数据整合、集团级数据中台和长期扩展能力。</p><p><strong>任何供应商都必须存在一定程度定制开发，不得使用低价标准功能误导客户。</strong></p></div>`;
}

function renderRanking() {
  return `<div class="matrix-wrap"><table><thead><tr><th>排名</th><th>供应商</th>${scoreDimensions.map((d) => `<th>${d}</th>`).join("")}<th>老板提示</th></tr></thead><tbody>${comparisonSuppliers().map((supplier) => ({ supplier, s: calcScores(supplier) })).sort((a,b)=>b.s.totalScore-a.s.totalScore).map((row, i) => `<tr><td>${i + 1}</td><td><button class="supplier-btn" data-supplier="${row.supplier.id}"><strong>${displaySupplierName(row.supplier)}</strong></button></td><td><span class="score ${scoreClass(row.s.totalScore)}">${row.s.totalScore}</span></td><td>${mini(row.s.supportRate)}</td><td>${mini(row.s.standardRate)}</td><td>${mini(100-row.s.customRate)}</td><td>${mini(row.s.erpScore)}</td><td>${mini(row.s.crossScore)}</td><td>${mini(row.s.migrationScore)}</td><td>${mini(row.s.architectureScore)}</td><td>${mini(row.s.hardwareScore)}</td><td>${mini(row.s.hiddenCostScore)}</td><td>${bossWarning(row.supplier) || lowPriceRiskWarning(row.supplier) || "暂无关键决策风险"}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderBossCharts() {
  return `<div class="guide-grid">${comparisonSuppliers().map((supplier) => { const s = calcScores(supplier); return `<article><span>供应商</span><strong>${displaySupplierName(supplier)}</strong><p>风险热力图 / 工时分布 / 成本结构 / 模块完成度</p>${["ERP", s.erpScore, "跨业态", s.crossScore, "迁移", s.migrationScore, "架构", s.architectureScore, "硬件", s.hardwareScore].reduce((html, item, i, arr) => i % 2 ? html : html + `<div class="chart-row"><b>${item}</b>${mini(arr[i+1])}</div>`, "")}<div class="chart-row"><b>定制工时</b><span>${s.customDays} 人天</span></div><div class="chart-row"><b>高风险需求</b><span>${s.highRisk} 项</span></div></article>`; }).join("")}</div>`;
}

function renderRiskList() {
  const rows = comparisonSuppliers().reduce((all, supplier) => all.concat(supplier.responses.map((response) => ({ supplier, response, req: requirementFor(response), warnings: validateResponse(response) })).filter((x) => x.warnings.length >= 2)), []).slice(0, 18);
  return `<div class="matrix-wrap"><table><thead><tr><th>供应商</th><th>需求编号</th><th>需求名称</th><th>能力分类</th><th>权重</th><th>风险</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${displaySupplierName(row.supplier)}</td><td>${row.req.requirementCode}</td><td>${row.req.requirementName}</td><td>${row.req.capabilityCategory} 类：${row.req.capabilityName}</td><td>${row.req.weightLevel} / ${row.req.weightScore}</td><td><span class="warning-text">${row.warnings.join("；")}</span></td></tr>`).join("")}</tbody></table></div>`;
}

function renderSupplierView(supplier) {
  const stats = calcSupplierStats(supplier);
  return `<div class="form-surface"><div class="supplier-progress-panel" id="supplier-progress"><div class="panel-subhead"><div><h3>填写进度</h3><p>系统已启用 LocalStorage 自动保存，刷新页面后数据不会丢失。</p></div><span class="save-status">已自动保存</span></div><div class="notice">请供应商根据真实情况逐项选择。未选择的需求项会按“未填写”处理，不会自动计入已完成。</div><div class="progress-track"><span style="width:${stats.completion}%"></span></div><div class="supplier-progress-grid"><div><strong>${stats.filled}</strong><span>已填写</span></div><div><strong>${stats.missing}</strong><span>未填写</span></div><div><strong>${stats.validationCount}</strong><span>必填项缺失提示</span></div><div><strong>${stats.completion}%</strong><span>完成度</span></div></div>${stats.validationCount ? `<div class="risk-alert">当前存在 ${stats.validationCount} 项必填或风险信息缺失，请优先补充需求说明。</div>` : ""}<div class="actions">${currentMode === "supplier" ? `<button type="button" class="btn primary" data-submit-backend>${icons.export} 提交到后台</button><button type="button" class="btn" data-export="supplier-json">${icons.export} 导出备份 JSON</button>` : ""}<button type="button" class="btn" data-reset-form>重置表单</button></div><div class="export-status" data-export-status></div></div>${renderSubmitCheck(supplier)}${renderSupplierEditor(supplier)}${renderSupplierCapabilityBlock(supplier)}${renderQuotationBlock(supplier)}${renderDeclarations(supplier)}${renderDepthGuide()}${renderSearchFilters()}<div class="module-response-list">${moduleDefinitions.map((m) => renderModuleResponse(m, supplier)).join("")}</div></div>`;
}

function renderSubmitCheck(supplier) {
  const stats = calcSupplierStats(supplier);
  const checks = [
    ["供应商名称已填写", Boolean(supplier.companyName)],
    ["联系人已填写", Boolean(supplier.contact)],
    ["自声明已全部确认", supplier.declarations.every(Boolean)],
    ["项目总报价结构已填写", ["software", "implementation", "migration", "training", "annualSaas"].every((key) => supplier.quotation && supplier.quotation[key])],
    ["基础能力已填写", ["openApi", "thirdParty", "successCase"].every((key) => supplier.capabilities && supplier.capabilities[key])],
    ["需求项无必填缺失", stats.validationCount === 0],
  ];
  return `<div class="submit-check"><div class="panel-subhead"><div><h3>提交前检查</h3><p>正式导出前建议逐项确认，减少后续澄清成本。</p></div><span class="pill ${checks.every(([, ok]) => ok) ? "green" : "amber"}">${checks.filter(([, ok]) => ok).length}/${checks.length} 已完成</span></div><div class="check-list">${checks.map(([label, ok]) => `<div class="check-item"><span class="${ok ? "check" : "miss"}">${ok ? "✓" : "!"}</span><strong>${label}</strong></div>`).join("")}</div></div>`;
}

function renderSupplierEditor(supplier) {
  return `<div class="supplier-editor"><div class="field"><label>公司名称</label><input data-supplier-field="companyName" value="${escapeAttr(supplier.companyName)}" placeholder="请填写公司名称" /></div><div class="field"><label>联系人</label><input data-supplier-field="contact" value="${escapeAttr(supplier.contact)}" placeholder="请填写联系人" /></div><div class="field span-2"><label>备注</label><textarea data-supplier-field="notes" placeholder="请填写商务范围、报价边界或交付说明">${escapeHtml(supplier.notes)}</textarea></div></div>`;
}

function renderSupplierCapabilityBlock(supplier) {
  return `<div class="declaration-block"><div class="panel-subhead"><h3>供应商基础能力</h3><p>以下内容按供应商统一填写一次，不再在每个需求项中重复填写。</p></div><div class="supplier-editor"><div class="field"><label>是否具备 Open API</label>${supplierSelect("capabilities.openApi", supplier, ["", "是", "否", "待确认"])}</div><div class="field"><label>是否依赖第三方系统</label>${supplierSelect("capabilities.thirdParty", supplier, ["", "否", "是", "待确认"])}</div><div class="field"><label>是否提供案例</label>${supplierSelect("capabilities.successCase", supplier, ["", "是", "否", "待确认"])}</div><div class="field span-2"><label>第三方系统整体说明</label><textarea data-supplier-field="capabilities.thirdPartySummary" placeholder="请说明整体第三方依赖、接口边界和责任划分">${escapeHtml(getPath(supplier, "capabilities.thirdPartySummary"))}</textarea></div></div></div>`;
}

function renderQuotationBlock(supplier) {
  const q = supplier.quotation || {};
  const automaticTotal = money(quoteAutomaticTotal(supplier));
  const reqTotals = responseTotals(supplier);
  const moduleRows = moduleDefinitions.map((module) => ({ module, totals: responseTotals(supplier, module.name) })).filter((row) => row.totals.days > 0 || row.totals.fee > 0);
  const moduleList = moduleRows.length ? `<div class="field span-2 module-total-list">${moduleRows.map(({ module, totals }) => `<div><span>${module.code}</span><b data-module-days="${module.code}">${formatDays(totals.days)}</b><strong data-module-fee="${module.code}">${money(totals.fee)}</strong></div>`).join("")}</div>` : "";
  return `<div class="declaration-block"><div class="panel-subhead"><div><h3>项目总报价</h3><p>请填写整体报价结构。项目总金额根据下方报价字段和需求项费用自动汇总。</p></div><span class="pill teal quote-total-pill">自动汇总：<strong data-quote-total>${automaticTotal}</strong></span></div><div class="supplier-editor quote-grid">${quoteField("软件总报价", "software", q.software)}${quoteField("实施服务费用", "implementation", q.implementation)}${quoteField("数据迁移费用", "migration", q.migration)}${quoteField("培训费用", "training", q.training)}${quoteField("硬件费用", "hardware", q.hardware)}${quoteField("第三方费用", "thirdParty", q.thirdParty)}${quoteField("年服务费 / SaaS 年费", "annualSaas", q.annualSaas)}<div class="field"><label>项目总金额（自动汇总）</label><input data-quote-total-input value="${escapeAttr(automaticTotal)}" readonly /></div><div class="field span-2 requirement-total-box"><div><span>需求项预计开发工时汇总</span><strong data-response-days-total>${formatDays(reqTotals.days)}</strong></div><div><span>需求项费用汇总</span><strong data-response-fee-total>${money(reqTotals.fee)}</strong></div></div>${moduleList}<div class="field span-2"><label>报价说明</label><textarea data-quote-field="notes" placeholder="报价范围、不包含内容、假设前提、有效期、特殊说明">${escapeHtml(q.notes)}</textarea></div></div></div>`;
}

function quoteField(label, field, value, placeholder = "例如 €12000") {
  return `<div class="field"><label>${label}</label><input data-quote-field="${field}" value="${escapeAttr(value)}" placeholder="${placeholder}" /></div>`;
}

function renderDeclarations(supplier) {
  return `<div class="declaration-block"><div class="panel-subhead"><h3>供应商自声明</h3><span class="pill ${supplier.declarations.every(Boolean) ? "green" : "amber"}">${supplier.declarations.filter(Boolean).length}/${selfDeclarationItems.length} 已确认</span></div><div class="declaration-list">${selfDeclarationItems.map((item, index) => `<label class="checkbox-row"><input type="checkbox" data-declaration="${index}" ${supplier.declarations[index] ? "checked" : ""} /><span>${item}</span></label>`).join("")}</div></div>`;
}

function renderDepthGuide() {
  const rows = [
    ["深度支持", "系统已有成熟功能，并且已在类似复杂场景中落地，可覆盖集团级、多门店、多业态或 ERP/WMS 深度需求。"],
    ["标准支持", "系统标准版本已包含该功能，可通过常规配置启用，不需要代码开发。"],
    ["基础支持", "系统仅支持基础场景，可能无法完整覆盖 Gohan Group 的集团级或跨业态要求。"],
    ["需定制开发", "当前标准产品不具备完整能力，需要新增开发、接口开发、流程改造或专项实施。"],
  ];
  return `<div class="declaration-block depth-guide"><div class="panel-subhead"><div><h3>填写说明 / 功能深度定义</h3><p>请按真实交付能力选择，避免用“支持”模糊覆盖深度差异。</p></div></div><div class="depth-guide-grid">${rows.map(([label, text]) => `<article><strong>${label}</strong><p>${text}</p></article>`).join("")}</div><div class="notice">如选择“基础支持”或“需定制开发”，请在风险说明中写明限制、前提或交付边界。</div></div>`;
}

function renderSearchFilters() {
  return `<div class="filter-bar"><div class="filter-buttons">${["全部","未填写","需定制开发","费用缺失","高风险"].map((f) => `<button type="button" class="${state.activeFilter === f ? "active" : ""}" data-filter="${f}">${f}</button>`).join("")}</div></div>`;
}

function renderModuleResponse(module, supplier) {
  const stats = moduleStats(module.name, supplier);
  const moduleIndex = moduleDefinitions.findIndex((m) => m.name === module.name);
  const isOpen = state.openModules.includes(module.code) || state.openModules.includes(module.name) || (!isMobileViewport() && state.openModules.length === 0 && moduleIndex < 2);
  const items = filteredRequirements(module.name, supplier);
  return `<details class="module-response" id="${module.code}" data-module-details="${module.code}" ${isOpen ? "open" : ""}><summary class="module-response-head"><div><h4>${module.code} ${module.name}</h4><p>${module.description}</p><div class="module-progress"><span style="width:${stats.completion}%"></span></div></div><div class="module-stats"><span>${stats.total} 项</span><span>${stats.filled} 已填</span><span>${stats.completion}% 完成</span><span>${stats.highRisk} 高风险</span><span>工时 <b data-module-days="${module.code}">${formatDays(stats.customDays)}</b></span><span>费用 <b data-module-fee="${module.code}">${money(stats.feeTotal)}</b></span><span class="module-toggle-btn"><span class="toggle-open">收起</span><span class="toggle-closed">展开</span></span></div></summary><div><div class="response-card-list">${items.map((req) => renderRequirementCard(req, supplier)).join("")}</div>${items.length ? "" : `<div class="empty-state">当前条件下没有匹配需求。</div>`}</div></details>`;
}

function renderRequirementCard(req, supplier) {
  const index = requirements.findIndex((r) => r.requirementCode === req.requirementCode);
  const r = supplier.responses[index];
  const warnings = validateResponse(r);
  const costFields = r.standardType === "需定制开发" ? `<div class="field-row cost-fields">${mobileField("预计开发工时", input(index,"customDays",r.customDays,"人天"))}${mobileField("费用", input(index,"fee",r.fee,"例如 €1200"))}</div>` : "";
  return `<article class="requirement-card ${warnings.length ? "invalid-row" : ""}"><div class="requirement-card-head"><div><strong>${req.requirementCode} ${req.requirementName}</strong><small>${req.capabilityCategory} 类：${req.capabilityName}</small></div></div>${warnings.length ? `<div class="row-errors">${warnings.join("；")}</div>` : ""}<div class="compact-fields"><div class="field-row primary-fields">${mobileField("是否支持", select(index,"support",r.support,["","支持","部分支持","不支持"]))}${mobileField("功能深度", select(index,"depth",r.depth,["","深度支持","标准支持","基础支持","需定制开发"]))}${mobileField("是否标准功能", select(index,"standardType",r.standardType,["","标准功能","需定制开发"]))}</div>${costFields}<div class="field-row risk-field">${mobileField("风险说明", textareaResponse(index,"riskNote",r.riskNote,"已知风险、依赖说明、限制条件或特殊实施说明"))}</div></div></article>`;
}

function renderRiskView() {
  return `<div class="home-surface">${renderRiskList()}${renderDisclosureBoard()}</div>`;
}

function renderAdminView() {
  const categoryCounts = {};
  Object.keys(capabilityMeta).forEach((key) => { categoryCounts[key] = requirements.filter((req) => req.capabilityCategory === key).length; });
  return `<div class="home-surface"><div class="section-title"><h3>全部供应商数据</h3><span>管理员用于导入供应商提交文件、检查完整度与风险状态</span></div><div class="notice">可配置 Google Sheets 轻后台自动收集供应商提交；未配置时仍可通过供应商导出的 JSON 文件导入并进入老板视图对比。</div><div class="guide-grid">${comparisonSuppliers().map((supplier) => { const s = calcScores(supplier); return `<article><span>供应商</span><strong>${displaySupplierName(supplier)}</strong><p>完成度 ${s.completion}% · 总分 ${s.totalScore} · 高风险 ${s.highRisk} 项</p>${lowPriceRiskWarning(supplier) ? `<div class="risk-alert">${lowPriceRiskWarning(supplier)}</div>` : `<div class="muted-text">暂无低价高风险提示</div>`}</article>`; }).join("")}</div><div class="section-title"><h3>需求结构统计</h3><span>110 项硬核需求，按能力分类统计</span></div><div class="module-grid">${Object.entries(capabilityMeta).map(([key, meta]) => `<article><h4>${key} 类：${meta.name}</h4><p>权重：${meta.weightLevel} / ${meta.weightScore}</p><span>${categoryCounts[key] || 0} 项需求</span></article>`).join("")}</div><div class="section-title"><h3>导入、导出与规则</h3><span>用于正式评审、会议汇报和供应商澄清</span></div><div class="guide-grid"><article><span>导入</span><strong>导入供应商 JSON</strong><p>支持导入一个或多个供应商填写页导出的 JSON 文件，导入后按公司名称进入对比。</p><label class="file-import"><input type="file" accept="application/json,.json" multiple data-import-supplier />选择 JSON 文件</label></article><article><span>导出</span><strong>供应商响应 JSON</strong><p>包含供应商基础能力、项目报价、逐项响应、评分与风险字段。</p><button type="button" class="btn primary" data-export="json">导出 JSON</button></article><article><span>导出</span><strong>对比结果 CSV</strong><p>包含报价结构、moduleCode、requirementCode、权重、分类分、加权分、工时和费用。</p><button type="button" class="btn primary" data-export="csv">导出 CSV</button></article><article><span>风险规则</span><strong>重点识别低价高风险</strong><p>报价明显偏低但定制开发较多、定制开发未写工时、定制开发费用缺失或总报价结构不完整。</p></article></div>${renderRiskView()}</div>`;
}

function renderDisclosureBoard() {
  const checks = [["供应商自声明全部确认", (s) => s.declarations.every(Boolean)], ["无疑似隐性定制开发", (s) => s.responses.every((r) => !(r.standardType === "标准功能" && Number(r.customDays || 0) >= 3))], ["第三方整体说明完整", (s) => !s.capabilities || s.capabilities.thirdParty !== "是" || s.capabilities.thirdPartySummary], ["ERP / WMS 深度能力有响应", (s) => s.responses.filter((r) => requirementFor(r).capabilityCategory === "C").every(isFilled)], ["实施迁移能力有响应", (s) => s.responses.filter((r) => requirementFor(r).capabilityCategory === "E").every(isFilled)], ["项目总报价结构已填写", (s) => ["software", "implementation", "migration", "training", "annualSaas"].every((key) => s.quotation && s.quotation[key])]];
  const suppliers = comparisonSuppliers();
  return `<div class="matrix-wrap"><table><thead><tr><th>校验项目</th>${suppliers.map((s) => `<th>${displaySupplierName(s)}</th>`).join("")}</tr></thead><tbody>${checks.map(([name, fn]) => `<tr><td><strong>${name}</strong></td>${suppliers.map((s) => `<td><span class="${fn(s) ? "check" : "miss"}">${fn(s) ? "✓" : "!"}</span></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderCriteriaPanel() {
  return `<section class="panel"><div class="panel-header"><div><h2>权重与分类逻辑</h2><p>供应商填写视图不显示权重；老板视图显示 A-F 与硬件分类的完整权重。</p></div><span class="pill teal">能力分类</span></div><div class="criteria-grid">${Object.entries(capabilityMeta).map(([key, meta]) => `<article class="criterion"><div class="criterion-top"><strong>${key} 类：${meta.name}</strong><span class="pill teal">${meta.weightLevel} / ${meta.weightScore}</span></div><small>${key === "A" ? "基础功能，权重较低，避免稀释深度能力评分。" : "用于识别深度能力、跨业态能力、迁移能力、硬件能力或扩展能力。"}</small></article>`).join("")}</div></section>`;
}

function renderDetailPanel(supplier) {
  const s = calcScores(supplier);
  return `<aside class="panel detail-panel"><div class="supplier-head"><div><h2>${displaySupplierName(supplier)}</h2><div class="supplier-meta">联系人：${supplier.contact || "未填写"}</div></div><div class="status-row"><span class="pill ${riskClass(s.risk)}">${s.risk === "high" ? "高风险" : s.risk === "medium" ? "中风险" : "低风险"}</span><span class="pill ${s.completion >= 80 ? "green" : s.completion >= 55 ? "amber" : "red"}">${s.completion}% 完成</span></div></div>${lowPriceRiskWarning(supplier) ? `<div class="detail-section"><div class="risk-alert">${lowPriceRiskWarning(supplier)}</div></div>` : ""}<div class="detail-section"><h3>决策摘要</h3><div class="risk-grid"><div class="risk-cell low">总分<small>${s.totalScore}</small></div><div class="risk-cell medium">ERP<small>${s.erpScore}</small></div><div class="risk-cell medium">跨业态<small>${s.crossScore}</small></div><div class="risk-cell high">高风险<small>${s.highRisk} 项</small></div></div></div><div class="detail-section"><h3>报价与风险</h3><div class="disclosure-list"><div class="disclosure-item"><span class="warn">价</span><span>项目总金额：${money(quoteTotal(supplier))}</span><span></span></div><div class="disclosure-item"><span class="warn">工</span><span>定制开发：${s.custom} 项，${s.customDays} 人天</span><span></span></div><div class="disclosure-item"><span class="warn">费</span><span>定制开发费用缺失：${s.hiddenMissing} 项</span><span></span></div></div></div></aside>`;
}

function mini(value) { return `<div class="mini-score"><span>${clamp(value)}</span><div class="bar ${riskClass(value < 60 ? "high" : value < 78 ? "medium" : "low")}"><span style="width:${clamp(value)}%"></span></div></div>`; }
function select(row, field, value, options) { return `<select data-response-row="${row}" data-response-field="${field}">${options.map((o) => `<option value="${o}" ${value === o ? "selected" : ""}>${o || "请选择"}</option>`).join("")}</select>`; }
function input(row, field, value, placeholder) { return `<input data-response-row="${row}" data-response-field="${field}" value="${escapeAttr(value)}" placeholder="${placeholder}" />`; }
function textareaResponse(row, field, value, placeholder) { return `<textarea data-response-row="${row}" data-response-field="${field}" placeholder="${placeholder}">${escapeHtml(value)}</textarea>`; }
function mobileField(label, control) { return `<label><span>${label}</span>${control}</label>`; }
function supplierSelect(path, supplier, options) { return `<select data-supplier-field="${path}">${options.map((o) => `<option value="${o}" ${getPath(supplier, path) === o ? "selected" : ""}>${o || "请选择"}</option>`).join("")}</select>`; }

function bindEvents() {
  const app = document.querySelector("#app");
  if (!app) return;
  if (app.dataset.eventsBound !== "true") {
    app.addEventListener("click", handleAppClick);
    app.addEventListener("input", handleAppInput);
    app.addEventListener("change", handleAppChange);
    app.dataset.eventsBound = "true";
  }
  document.querySelectorAll("[data-module-details]").forEach((el) => el.addEventListener("toggle", () => setModuleOpen(el.dataset.moduleDetails, el.open)));
}

function eventElement(event) {
  if (!event || !event.target) return null;
  return event.target.nodeType === 1 ? event.target : event.target.parentElement;
}

function eventClosest(event, selector) {
  const element = eventElement(event);
  return element && element.closest ? element.closest(selector) : null;
}

function handleAppClick(event) {
  const viewButton = eventClosest(event, "[data-view]");
  if (viewButton) {
    event.preventDefault();
    const view = viewButton.dataset.view;
    if (modeMeta[currentMode].views.includes(view)) updateState({ activeView: view });
    return;
  }

  const supplierButton = eventClosest(event, "[data-supplier]");
  if (supplierButton) {
    event.preventDefault();
    updateState({ selectedSupplierId: supplierButton.dataset.supplier });
    return;
  }

  const exportButton = eventClosest(event, "[data-export]");
  if (exportButton) {
    event.preventDefault();
    if (exportButton.dataset.export === "supplier-json") exportSupplierJson();
    else if (exportButton.dataset.export === "json") exportJson();
    else exportCsv();
    return;
  }

  const submitBackendButton = eventClosest(event, "[data-submit-backend]");
  if (submitBackendButton) {
    event.preventDefault();
    submitSupplierToBackend();
    return;
  }

  const filterButton = eventClosest(event, "[data-filter]");
  if (filterButton) {
    event.preventDefault();
    updateState({ activeFilter: filterButton.dataset.filter });
    return;
  }

  const resetButton = eventClosest(event, "[data-reset-form]");
  if (resetButton) {
    event.preventDefault();
    resetCurrentSupplierForm();
    return;
  }

  const scrollButton = eventClosest(event, "[data-scroll-target]");
  if (scrollButton) {
    event.preventDefault();
    const target = document.getElementById(scrollButton.dataset.scrollTarget);
    if (target) target.scrollIntoView({ behavior: "smooth" });
    return;
  }

  const moduleJump = eventClosest(event, "[data-module-jump]");
  if (moduleJump) {
    event.preventDefault();
    jumpToModule(moduleJump.dataset.moduleJump);
    return;
  }

}

function handleAppInput(event) {
  handleEditableField(event, false);
}

function handleAppChange(event) {
  const importInput = eventClosest(event, "[data-import-supplier]");
  if (importInput) {
    importSupplierFiles(Array.from(importInput.files || []));
    importInput.value = "";
    return;
  }

  const declaration = eventClosest(event, "[data-declaration]");
  if (declaration) {
    selectedSupplier().declarations[Number(declaration.dataset.declaration)] = declaration.checked;
    saveState();
    render();
    return;
  }
  handleEditableField(event, true);
}

function handleEditableField(event, isChangeEvent) {
  const supplierField = eventClosest(event, "[data-supplier-field]");
  if (supplierField) {
    setPath(selectedSupplier(), supplierField.dataset.supplierField, supplierField.value);
    saveState();
    markSaved();
    refreshDetailOnly();
    return;
  }

  const quoteField = eventClosest(event, "[data-quote-field]");
  if (quoteField) {
    selectedSupplier().quotation[quoteField.dataset.quoteField] = quoteField.value;
    saveState();
    markSaved();
    updateQuoteTotalDisplay();
    refreshDetailOnly();
    return;
  }

  const responseField = eventClosest(event, "[data-response-row]");
  if (responseField) {
    const response = selectedSupplier().responses[Number(responseField.dataset.responseRow)];
    const field = responseField.dataset.responseField;
    response[field] = responseField.value;
    if (field === "standardType" && responseField.value === "标准功能") {
      response.customDays = "0";
      response.fee = "0";
    }
    if (field === "standardType" && responseField.value === "需定制开发" && response.customDays === "0" && response.fee === "0") {
      response.customDays = "";
      response.fee = "";
    }
    saveState();
    markSaved();
    updateQuoteTotalDisplay();
    if (isChangeEvent && (responseField.tagName === "SELECT" || ["customDays", "fee"].includes(field))) render();
    else refreshDetailOnly();
  }
}

function updateState(patch) { state = { ...state, ...patch }; normalizeModeState(); saveState(); render(); }
function toggleModule(identifier) {
  const module = moduleDefinitions.find((m) => m.code === identifier || m.name === identifier);
  const key = module ? module.code : identifier;
  const oldName = module ? module.name : undefined;
  const isOpen = state.openModules.includes(key) || (oldName && state.openModules.includes(oldName));
  state.openModules = isOpen ? state.openModules.filter((m) => m !== key && m !== oldName) : [key, ...state.openModules.filter((m) => m !== oldName)];
  saveState();
  render();
}
function setModuleOpen(identifier, open) {
  const module = moduleDefinitions.find((m) => m.code === identifier || m.name === identifier);
  const key = module ? module.code : identifier;
  const oldName = module ? module.name : undefined;
  const without = state.openModules.filter((m) => m !== key && m !== oldName);
  state.openModules = open ? [key, ...without] : without;
  saveState();
}
function resetCurrentSupplierForm() {
  selectedSupplier().responses = createDefaultResponses();
  saveState();
  render();
  showActionStatus("已重置为空白待填写状态。");
}
function jumpToModule(moduleName) {
  const module = moduleDefinitions.find((m) => m.name === moduleName || m.code === moduleName);
  if (!module) return;
  if (!state.openModules.includes(module.code)) state.openModules = [module.code, ...state.openModules.filter((item) => item !== module.name)];
  saveState();
  render();
  setTimeout(() => {
    const target = document.getElementById(module.code);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  }, 30);
}
function setupLogoFallback() { document.querySelectorAll(".brand-logo img").forEach((img) => img.addEventListener("error", () => img.classList.add("missing"))); }
function refreshDetailOnly() { const detail = document.querySelector(".detail-panel"); if (detail) detail.outerHTML = renderDetailPanel(selectedSupplier()); }
function markSaved() {
  const time = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  document.querySelectorAll(".save-status").forEach((el) => { el.textContent = `已自动保存 ${time}`; });
}
function updateQuoteTotalDisplay() {
  const automaticTotal = money(quoteAutomaticTotal(selectedSupplier()));
  document.querySelectorAll("[data-quote-total]").forEach((el) => { el.textContent = automaticTotal; });
  document.querySelectorAll("[data-quote-total-input]").forEach((el) => { el.value = automaticTotal; });
  updateResponseTotalsDisplay();
}
function updateResponseTotalsDisplay() {
  const reqTotals = responseTotals(selectedSupplier());
  document.querySelectorAll("[data-response-days-total]").forEach((el) => { el.textContent = formatDays(reqTotals.days); });
  document.querySelectorAll("[data-response-fee-total]").forEach((el) => { el.textContent = money(reqTotals.fee); });
  moduleDefinitions.forEach((module) => {
    const totals = responseTotals(selectedSupplier(), module.name);
    document.querySelectorAll(`[data-module-days="${module.code}"]`).forEach((el) => { el.textContent = formatDays(totals.days); });
    document.querySelectorAll(`[data-module-fee="${module.code}"]`).forEach((el) => { el.textContent = money(totals.fee); });
  });
}

function loadRemoteSuppliersIfNeeded() {
  if (currentMode === "supplier" || remoteLoadStarted || !GOOGLE_SHEETS_WEB_APP_URL) return;
  remoteLoadStarted = true;
  const callbackName = `gohanSheetsCallback${Date.now()}`;
  window[callbackName] = (payload) => {
    try {
      const suppliers = Array.isArray(payload && payload.suppliers) ? payload.suppliers : [];
      suppliers.forEach((supplier, index) => importSupplierPayload(supplier, index));
      if (suppliers.length) {
        saveState();
        render();
        showActionStatus(`已从 Google Sheets 读取 ${suppliers.length} 个供应商响应。`);
      }
    } finally {
      delete window[callbackName];
    }
  };
  const script = document.createElement("script");
  const joiner = GOOGLE_SHEETS_WEB_APP_URL.includes("?") ? "&" : "?";
  script.src = `${GOOGLE_SHEETS_WEB_APP_URL}${joiner}action=list&callback=${callbackName}`;
  script.onerror = () => showActionStatus("无法读取 Google Sheets 后台，请检查 Apps Script Web App 链接是否已部署。");
  document.body.appendChild(script);
}

function submitSupplierToBackend() {
  const payload = buildSupplierPayload(selectedSupplier());
  if (!GOOGLE_SHEETS_WEB_APP_URL) {
    exportSupplierJson();
    showActionStatus("Google Sheets 后台链接尚未配置，已先导出 JSON 备份。配置 Apps Script Web App 链接后可直接提交到后台。");
    return;
  }
  fetch(GOOGLE_SHEETS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "submitSupplier", supplier: payload }),
  }).then(() => {
    showActionStatus("已提交到 Google Sheets 后台。建议同时导出 JSON 作为本地备份。");
  }).catch(() => {
    showActionStatus("提交到 Google Sheets 后台失败，请检查 Apps Script Web App 链接或网络状态。");
  });
}
function showActionStatus(message) {
  document.querySelectorAll("[data-export-status]").forEach((target) => {
    target.innerHTML = `<div class="notice">${message}</div>`;
  });
}
function showExportStatus(filename, content, type = "application/json;charset=utf-8") {
  const targets = document.querySelectorAll("[data-export-status]");
  if (!targets.length) return;
  const dataUrl = `data:${type},${encodeURIComponent(content)}`;
  const label = filename.endsWith(".csv") ? "下载 CSV 文件" : "下载 JSON 文件";
  targets.forEach((target) => {
    target.innerHTML = `<div class="notice">已生成导出文件：${filename}。如果浏览器没有自动下载，请点击这里：<a download="${filename}" href="${dataUrl}">${label}</a></div>`;
  });
}

function normalizeImportedSupplier(payload, index) {
  const base = cloneData(defaultState.suppliers[0]);
  const isLegacyState = Number(payload.schemaVersion || 0) < DATA_SCHEMA_VERSION;
  const safeName = String(payload.companyName || payload.supplier || `导入供应商 ${index + 1}`).trim();
  base.id = `imported-${Date.now()}-${index}-${safeName.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 24)}`;
  base.code = "";
  base.label = safeName;
  base.companyName = payload.companyName || safeName;
  base.contact = payload.contact || "";
  base.email = payload.email || "";
  base.website = payload.website || "";
  base.notes = payload.notes || "";
  base.capabilities = { ...base.capabilities, ...(payload.capabilities || {}) };
  base.quotation = { ...base.quotation, ...(payload.quotation || {}) };
  delete base.quotation.totalOverride;
  base.declarations = Array.isArray(payload.declarations)
    ? selfDeclarationItems.map((_, i) => {
      const item = payload.declarations[i];
      return Boolean(item && typeof item === "object" ? item.confirmed : item);
    })
    : base.declarations;
  const importedResponses = Array.isArray(payload.responses) ? payload.responses : [];
  base.responses = requirements.map((req, i) => {
    const source = importedResponses.find((item) => item.requirementCode === req.requirementCode) || {};
    return normalizeLegacyResponse({ ...base.responses[i], ...source, requirementCode: req.requirementCode }, isLegacyState);
  });
  return base;
}

function importSupplierPayload(payload, index = 0) {
  const imported = normalizeImportedSupplier(payload, index);
  const key = String(imported.companyName || imported.email || imported.id).trim().toLowerCase();
  const existingIndex = state.suppliers.findIndex((supplier) => {
    const supplierKey = String(supplier.companyName || supplier.email || "").trim().toLowerCase();
    return supplierKey && supplierKey === key;
  });
  if (existingIndex >= 0) state.suppliers[existingIndex] = imported;
  else state.suppliers.push(imported);
}

function importSupplierFiles(files) {
  if (!files.length) return;
  let completed = 0;
  let importedCount = 0;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const payloads = Array.isArray(parsed) ? parsed : [parsed];
        payloads.forEach((payload, index) => importSupplierPayload(payload, index));
        importedCount += payloads.length;
      } catch {
        showActionStatus(`文件 ${file.name} 无法识别，请确认是供应商导出的 JSON。`);
      } finally {
        completed += 1;
        if (completed === files.length) {
          saveState();
          render();
          showActionStatus(`已导入 ${importedCount} 个供应商响应文件。`);
        }
      }
    };
    reader.readAsText(file);
  });
}

function exportJson() {
  const rows = comparisonSuppliers().map((supplier) => buildSupplierPayload(supplier));
  const filename = "gohan-group-tender-responses.json";
  const content = JSON.stringify(rows, null, 2);
  downloadFile(filename, content, "application/json;charset=utf-8");
  showExportStatus(filename, content, "application/json;charset=utf-8");
}

function buildSupplierPayload(supplier) {
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    companyName: supplier.companyName,
    contact: supplier.contact,
    notes: supplier.notes,
    capabilities: supplier.capabilities,
    quotation: supplier.quotation,
    quoteTotal: quoteTotal(supplier),
    scores: calcScores(supplier),
    declarations: selfDeclarationItems.map((item, index) => ({ item, confirmed: Boolean(supplier.declarations[index]) })),
    progress: calcSupplierStats(supplier),
    responses: supplier.responses.map((response) => {
      const req = requirementFor(response);
      return {
        moduleCode: req.moduleCode,
        moduleName: req.moduleName,
        requirementCode: req.requirementCode,
        requirementName: req.requirementName,
        capabilityCategory: req.capabilityCategory,
        support: response.support,
        depth: response.depth,
        standardType: response.standardType,
        customDays: response.customDays,
        fee: response.fee,
        riskNote: response.riskNote,
      };
    }),
  };
}

function exportSupplierJson() {
  const supplier = selectedSupplier();
  const rows = buildSupplierPayload(supplier);
  const filenameName = String(supplier.companyName || "supplier-response").trim().replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 40) || "supplier-response";
  const filename = `gohan-group-${filenameName}.json`;
  const content = JSON.stringify(rows, null, 2);
  downloadFile(filename, content, "application/json;charset=utf-8");
  showExportStatus(filename, content, "application/json;charset=utf-8");
}

function exportCsv() {
  const header = ["supplier","companyName","quoteTotal","softwareFee","implementationFee","migrationFee","trainingFee","hardwareFee","thirdPartyFee","annualSaasFee","moduleCode","moduleName","requirementCode","requirementName","capabilityCategory","weightLevel","weightScore","categoryScore","weightedScore","support","depth","standardType","customDays","fee","riskNote"];
  const rows = comparisonSuppliers().reduce((all, supplier) => all.concat(supplier.responses.map((response) => {
    const row = exportRow(supplier, response);
    return header.map((key) => row[key]);
  })), []);
  const filename = "gohan-group-tender-comparison.csv";
  const content = "\ufeff" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(filename, content, "text/csv;charset=utf-8");
  showExportStatus(filename, content, "text/csv;charset=utf-8");
}

function exportRow(supplier, response) {
  const req = requirementFor(response);
  const categoryScore = calcCategoryScore(supplier, req.capabilityCategory);
  let raw = response.support === "支持" ? 100 : response.support === "部分支持" ? 55 : 0;
  if (response.depth === "基础支持") raw -= 12;
  if (response.depth === "需定制开发") raw -= 18;
  if (response.standardType === "需定制开发") raw -= 18;
  if (response.standardType === "需定制开发" && !response.customDays) raw -= 20;
  if (response.standardType === "需定制开发" && !response.fee) raw -= 12;
  if (response.standardType === "标准功能" && response.depth === "需定制开发") raw -= 18;
  const weightedScore = clamp(raw) * req.weightScore;
  const q = supplier.quotation || {};
  return { supplier: displaySupplierName(supplier), companyName: supplier.companyName, quoteTotal: quoteTotal(supplier), softwareFee: q.software, implementationFee: q.implementation, migrationFee: q.migration, trainingFee: q.training, hardwareFee: q.hardware, thirdPartyFee: q.thirdParty, annualSaasFee: q.annualSaas, moduleCode: req.moduleCode, moduleName: req.moduleName, requirementCode: req.requirementCode, requirementName: req.requirementName, capabilityCategory: req.capabilityCategory, weightLevel: req.weightLevel, weightScore: req.weightScore, categoryScore, weightedScore, support: response.support, depth: response.depth, standardType: response.standardType, customDays: response.customDays, fee: response.fee, riskNote: response.riskNote };
}

function csvCell(value) { return `"${String(value === undefined || value === null ? "" : value).replace(/"/g, '""')}"`; }
function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function escapeAttr(value) { return escapeHtml(value); }

render();
