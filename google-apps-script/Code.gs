const SPREADSHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const SUBMISSIONS_SHEET = "Submissions";
const RESPONSES_SHEET = "Responses";

function doPost(e) {
  const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  const supplier = body.supplier || body;
  const result = saveSupplierSubmission_(supplier);
  return jsonOutput_({ ok: true, message: "submitted", result });
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
  const ss = getSpreadsheet_();
  const companyName = String(supplier.companyName || "").trim();
  if (!companyName) throw new Error("companyName is required");
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
  const submissionId = Utilities.getUuid();
  submissions.appendRow([
    now,
    companyName,
    supplier.contact || "",
    supplier.quoteTotal || "",
    JSON.stringify(supplier),
  ]);

  deleteRowsByCompany_(responses, 2, companyName);
  const rows = (supplier.responses || []).map((item) => [
    now,
    companyName,
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
  return { submissionId, companyName, submittedAt: now, responseRows: rows.length };
}

function latestSupplierPayloads_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(SUBMISSIONS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  const latestByCompany = {};
  values.forEach((row) => {
    const companyName = String(row[1] || "").trim();
    const payloadJson = row[4];
    if (!companyName || !payloadJson) return;
    latestByCompany[companyName] = { timestamp: row[0], payloadJson };
  });
  return Object.values(latestByCompany).map((item) => {
    try {
      const payload = JSON.parse(item.payloadJson);
      payload.submissionStatus = {
        status: "success",
        message: "已从 Google Sheets 后台读取最新提交。",
        submittedAt: item.timestamp,
      };
      return payload;
    } catch (error) {
      return null;
    }
  }).filter(Boolean);
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "PASTE_GOOGLE_SHEET_ID_HERE") {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error("请在 Code.gs 顶部填写 SPREADSHEET_ID，或从目标 Google Sheet 内打开 Apps Script。");
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function deleteRowsByCompany_(sheet, companyColumn, companyName) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const values = sheet.getRange(2, companyColumn, lastRow - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (String(values[i][0] || "").trim() === companyName) {
      sheet.deleteRow(i + 2);
    }
  }
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
