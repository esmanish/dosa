// pricing.js
// Fetches live data from Google Sheets public CSV export and renders grouped HTML accordions

const SHEET_ID = '1wckSyLTZinbpNALntkBX_qYVVdd0e6UApgQu9zHhYYs';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=173898044`;

document.addEventListener("DOMContentLoaded", () => {
    fetchPricingData();
});

async function fetchPricingData() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error("Failed to fetch data");
        const csvText = await response.text();
        
        const data = parseCSV(csvText);
        renderTable(data);
    } catch (error) {
        console.error("Error fetching pricing data:", error);
        document.getElementById("pricing-loader").innerHTML = `
            <p style="color: #d93025; font-weight: 500;">
                Unable to sync live pricing data.<br>
                <small style="color: var(--text-muted)">Please ensure the Google Sheet sharing setting is set to "Anyone with the link can view".</small>
            </p>
        `;
    }
}

function parseCSV(text) {
    let result = [];
    let row = [];
    let inQuotes = false;
    let val = "";
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        let nextChar = text[i+1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                val += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(val.trim());
            val = "";
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            row.push(val.trim());
            if (row.join("").trim() !== "") {
                result.push(row);
            }
            row = [];
            val = "";
        } else {
            val += char;
        }
    }
    
    if (val !== "" || row.length > 0) {
        row.push(val.trim());
        result.push(row);
    }
    
    return result;
}

function renderTable(data) {
    if (!data || data.length < 2) return;
    
    let headerIndex = 0;
    for (let i = 0; i < data.length; i++) {
        const rowData = data[i].filter(cell => cell.trim() !== "");
        if (rowData.length >= 4) {
            headerIndex = i;
            break;
        }
    }
    
    const headers = data[headerIndex];
    let rows = data.slice(headerIndex + 1);
    
    let summaryRow = null;
    rows = rows.filter(row => {
        const text = row.join(" ").toLowerCase();
        if (text.includes("total cost") || text.includes("total:")) {
            summaryRow = row;
            return false;
        }
        if (row.join("").trim() === "") return false;
        return true;
    });

    const contentDiv = document.getElementById("pricing-content");
    contentDiv.innerHTML = ""; // Clear loader and any old content
    
    // Find Area column
    const areaIndex = headers.findIndex(h => h.toLowerCase() === "area");
    
    if (areaIndex !== -1) {
        // Group by Area
        const grouped = {};
        rows.forEach(row => {
            let area = row[areaIndex] || "Other";
            if (!grouped[area]) grouped[area] = [];
            grouped[area].push(row);
        });

        for (const [area, areaRows] of Object.entries(grouped)) {
            let details = document.createElement("details");
            details.className = "pricing-accordion";
            // Open the first one by default
            if (Object.keys(grouped)[0] === area) details.open = true;

            let summary = document.createElement("summary");
            summary.innerHTML = `<strong>${area} Components</strong> <span>${areaRows.length} items</span>`;
            details.appendChild(summary);

            let tableWrapper = document.createElement("div");
            tableWrapper.className = "table-responsive";

            let table = document.createElement("table");
            table.className = "pricing-table sub-table";
            
            let thead = document.createElement("thead");
            let trHead = document.createElement("tr");
            headers.forEach((h, i) => {
                if(h === "" || i === areaIndex) return;
                let th = document.createElement("th");
                th.textContent = h;
                trHead.appendChild(th);
            });
            thead.appendChild(trHead);
            table.appendChild(thead);

            let tbody = document.createElement("tbody");
            areaRows.forEach(row => {
                let tr = document.createElement("tr");
                for(let i=0; i < headers.length; i++) {
                    if(headers[i] === "" || i === areaIndex) continue; 
                    
                    let td = document.createElement("td");
                    td.textContent = row[i] || "";
                    
                    if (row[i] && row[i].match(/[₹$€£]|INR/)) {
                        td.style.fontWeight = "600";
                        td.style.color = "#20262c";
                        td.style.textAlign = "right";
                    }
                    if (i === 0) { 
                         td.style.color = "var(--text-muted)";
                         td.style.fontWeight = "500";
                    }
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            details.appendChild(tableWrapper);
            contentDiv.appendChild(details);
        }
    }

    // Total Cost Card
    if (summaryRow) {
        let totalDiv = document.createElement("div");
        totalDiv.className = "pricing-total-card";
        let totalVal = summaryRow[summaryRow.length - 1] || summaryRow.find(val => val.match(/[₹$€£]|INR/));
        totalDiv.innerHTML = `<span>Total Estimated Cost</span> <strong>${totalVal}</strong>`;
        contentDiv.appendChild(totalDiv);
    }

    document.getElementById("pricing-loader").style.display = "none";
}
