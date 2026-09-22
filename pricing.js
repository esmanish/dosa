// pricing.js
// Fetches live data from Google Sheets and renders a side-by-side grid of vertical placeholders

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
        renderVerticalGrid(data);
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

function parseCurrency(str) {
    let num = parseFloat(str.replace(/[^0-9.-]+/g,""));
    return isNaN(num) ? 0 : num;
}

function getCurrencySymbol(str) {
    let match = str.match(/[₹$€£]/);
    return match ? match[0] : '';
}

function renderVerticalGrid(data) {
    if (!data || data.length < 2) return;
    
    let headerIndex = 0;
    for (let i = 0; i < data.length; i++) {
        const rowData = data[i].filter(cell => cell.trim() !== "");
        if (rowData.length >= 4) {
            headerIndex = i;
            break;
        }
    }
    
    const headers = data[headerIndex].map(h => h.toLowerCase().trim());
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
    contentDiv.innerHTML = ""; 
    
    const areaIndex = headers.findIndex(h => h.includes("area"));
    const nameIndex = headers.findIndex(h => h.includes("component name"));
    const descIndex = headers.findIndex(h => h.includes("description"));
    const qtyIndex = headers.findIndex(h => h === "qty" || h === "quantity");
    let costIndex = headers.findIndex(h => h.includes("estimated"));
    if (costIndex === -1) costIndex = headers.length - 1; 
    
    if (areaIndex !== -1 && nameIndex !== -1) {
        const grouped = {};
        let currencySymbol = '$'; // default

        rows.forEach(row => {
            let area = row[areaIndex] || "Other";
            if (area.toLowerCase() === "other") area = "Other";
            if (!row[nameIndex]) return; 

            if (!grouped[area]) grouped[area] = [];
            grouped[area].push(row);

            let costStr = row[costIndex] || "";
            let sym = getCurrencySymbol(costStr);
            if(sym) currencySymbol = sym;
        });

        let gridContainer = document.createElement("div");
        gridContainer.className = "pricing-vertical-grid";

        for (const [area, areaRows] of Object.entries(grouped)) {
            let columnDiv = document.createElement("div");
            columnDiv.className = "pricing-column";

            // Calculate subtotal
            let subtotal = 0;
            areaRows.forEach(row => {
                subtotal += parseCurrency(row[costIndex] || "0");
            });
            // Format subtotal
            let subtotalStr = currencySymbol + subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

            let headerDiv = document.createElement("div");
            headerDiv.className = "column-header";
            headerDiv.innerHTML = `<h3>${area}</h3><div class="column-subtotal">${subtotalStr}</div>`;
            columnDiv.appendChild(headerDiv);

            // Dropdown wrapper
            let details = document.createElement("details");
            details.className = "column-details";
            
            let summary = document.createElement("summary");
            summary.innerHTML = `<span>View ${areaRows.length} Items</span>`;
            details.appendChild(summary);

            let itemsDiv = document.createElement("div");
            itemsDiv.className = "column-items";

            areaRows.forEach(row => {
                let name = row[nameIndex] || "";
                let qty = qtyIndex !== -1 ? (row[qtyIndex] || "1") : "1";
                let cost = row[costIndex] || "";

                let itemDiv = document.createElement("div");
                itemDiv.className = "column-item";
                itemDiv.innerHTML = `
                    <div class="col-item-name">${name} <span class="col-item-qty">x${qty}</span></div>
                    <div class="col-item-price">${cost}</div>
                `;
                itemsDiv.appendChild(itemDiv);
            });

            details.appendChild(itemsDiv);
            columnDiv.appendChild(details);
            gridContainer.appendChild(columnDiv);
        }
        contentDiv.appendChild(gridContainer);
    }

    if (summaryRow) {
        let totalDiv = document.createElement("div");
        totalDiv.className = "pricing-total-card";
        let totalVal = summaryRow[summaryRow.length - 1] || summaryRow.find(val => val.match(/[₹$€£]|INR/));
        totalDiv.innerHTML = `<span>Total Estimated Cost</span> <strong>${totalVal}</strong>`;
        contentDiv.appendChild(totalDiv);
    }

    document.getElementById("pricing-loader").style.display = "none";
}
