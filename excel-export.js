"use strict";

async function downloadExcel(rows, filename) {
  const spreadsheet = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const office = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml";
  const zip = new JSZip();
  const escapeXml = (value) => value.replace(/[&<>]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;"
  })[character]);

  zip.file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="${contentType}.sheet.main+xml"/>
    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="${contentType}.worksheet+xml"/>
    <Override PartName="/xl/styles.xml" ContentType="${contentType}.styles+xml"/>
  </Types>`);
  const relationships = (items) => `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    ${items.map(([id, kind, target]) => `<Relationship Id="${id}" Type="${office}/${kind}" Target="${target}"/>`).join("")}
  </Relationships>`;
  zip.file("_rels/.rels", relationships([["rId1", "officeDocument", "xl/workbook.xml"]]));
  zip.file("xl/_rels/workbook.xml.rels", relationships([
    ["rId1", "worksheet", "worksheets/sheet1.xml"],
    ["rId2", "styles", "styles.xml"]
  ]));
  zip.file("xl/workbook.xml", `<workbook xmlns="${spreadsheet}" xmlns:r="${office}">
    <sheets><sheet name="출장여비" sheetId="1" r:id="rId1"/></sheets>
  </workbook>`);
  zip.file("xl/styles.xml", `<styleSheet xmlns="${spreadsheet}">
    <fonts count="1"><font><sz val="11"/><name val="맑은 고딕"/></font></fonts>
    <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
    <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="2">
      <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
      <xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    </cellXfs>
    <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  </styleSheet>`);
  const sheetRows = rows.map((row, index) => {
    const rowNumber = index + 1;
    const cells = row.map((value, column) => {
      const cell = (column === 0 ? "A" : "B") + rowNumber;
      return typeof value === "number"
        ? `<c r="${cell}" s="1"><v>${value}</v></c>`
        : `<c r="${cell}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    });
    return `<row r="${rowNumber}">${cells.join("")}</row>`;
  });
  zip.file("xl/worksheets/sheet1.xml", `<worksheet xmlns="${spreadsheet}">
    <cols><col min="1" max="1" width="23" customWidth="1"/><col min="2" max="2" width="65" customWidth="1"/></cols>
    <sheetData>${sheetRows.join("")}</sheetData>
  </worksheet>`);

  const data = await zip.generateAsync({ type: "blob", mimeType: contentType + ".sheet", compression: "DEFLATE" });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
