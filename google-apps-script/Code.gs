const SUBMISSIONS_SHEET = "Submissions";
const RESPONSES_SHEET = "Responses";

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  const supplier = body.supplier || body;
  saveSupplierSubmission_(supplier);
  return jsonOutput_({ ok: true, message: "submitted" });
}

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  const payload = { ok: true, suppliers: latestSupplierPayloads_() };
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonOutput_(payload);
}

function saveSupplierSubmission_(supplier) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const submissions = ensureSheet_(ss, SUBMISSIONS_SHEET, [
    "timestamp",
    "companyName",
    "contact",
    "quoteTotal",
    "payloadJson",
  ]);
  const responses = ensureSheet_(ss, RESPONSES_SHEET, [
    "timestamp",
    "companyName",
    "moduleCode",
    "moduleName",
    "requirementCode",
    "requirementName",
    "capabilityCategory",
    "support",
    "depth",
    "standardType",
    "customDays",
    "fee",
    "riskNote",
  ]);

  const now = new Date();
  submissions.appendRow([
    now,
    supplier.companyName || "",
    supplier.contact || "",
    supplier.quoteTotal || "",
    JSON.stringify(supplier),
  ]);

  const rows = (supplier.responses || []).map((item) => [
    now,
    supplier.companyName || "",
    item.moduleCode || "",
    item.moduleName || "",
    item.requirementCode || "",
    item.requirementName || "",
    item.capabilityCategory || "",
    item.support || "",
    item.depth || "",
    item.standardType || "",
    item.customDays || "",
    item.fee || "",
    item.riskNote || "",
  ]);
  if (rows.length) {
    responses.getRange(responses.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function latestSupplierPayloads_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SUBMISSIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  const latestByCompany = {};
  values.forEach((row) => {
    const companyName = String(row[1] || "").trim();
    const payloadJson = row[4];
    if (!companyName || !payloadJson) return;
    latestByCompany[companyName] = payloadJson;
  });
  return Object.values(latestByCompany).map((json) => {
    try {
      return JSON.parse(json);
    } catch (error) {
      return null;
    }
  }).filter(Boolean);
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
