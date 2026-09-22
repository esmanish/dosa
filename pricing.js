// pricing.js
// Fetches live data from Google Sheets public CSV export and renders a sleek, premium list

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
        renderPremiumList(data);
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

function renderPremiumList(data) {
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
    contentDiv.innerHTML = ""; // Clear loader and any old content
    
    // Find column indices dynamically
    const areaIndex = headers.findIndex(h => h.includes("area"));
    const nameIndex = headers.findIndex(h => h.includes("component name"));
    const descIndex = headers.findIndex(h => h.includes("description"));
    const qtyIndex = headers.findIndex(h => h === "qty" || h === "quantity");
    
    // For cost, prefer the last column, or the one with "estimated"
    let costIndex = headers.findIndex(h => h.includes("estimated"));
    if (costIndex === -1) costIndex = headers.length - 1; // Fallback to last column
    
    if (areaIndex !== -1 && nameIndex !== -1) {
        // Group by Area
        const grouped = {};
        rows.forEach(row => {
            let area = row[areaIndex] || "Other Components";
            if (area.toLowerCase() === "other") area = "Other Components";
            
            // Skip empty rows that somehow snuck in
            if (!row[nameIndex]) return; 

            if (!grouped[area]) grouped[area] = [];
            grouped[area].push(row);
        });

        let listContainer = document.createElement("div");
        listContainer.className = "premium-bom-list";

        for (const [area, areaRows] of Object.entries(grouped)) {
            // Group container
            let groupDiv = document.createElement("div");
            groupDiv.className = "bom-group";

            // Group Header
            let headerDiv = document.createElement("div");
            headerDiv.className = "bom-group-header";
            
            // Calculate subtotal for this area (best effort parsing of currency strings)
            // Just display the area name for now to avoid parsing complex currency symbols safely
            headerDiv.innerHTML = `<h3>${area}</h3><span class="bom-item-count">${areaRows.length} items</span>`;
            groupDiv.appendChild(headerDiv);

            // Group Items
            let itemsDiv = document.createElement("div");
            itemsDiv.className = "bom-items";

            areaRows.forEach(row => {
                let name = row[nameIndex] || "";
                let desc = descIndex !== -1 ? (row[descIndex] || "") : "";
                let qty = qtyIndex !== -1 ? (row[qtyIndex] || "1") : "1";
                let cost = row[costIndex] || "";

                let itemDiv = document.createElement("div");
                itemDiv.className = "bom-item";

                let infoDiv = document.createElement("div");
                infoDiv.className = "bom-item-info";
                
                let titleSpan = document.createElement("div");
                titleSpan.className = "bom-item-title";
                titleSpan.innerHTML = `<span>${name}</span> <span class="bom-item-qty">x${qty}</span>`;
                
                let descSpan = document.createElement("div");
                descSpan.className = "bom-item-desc";
                descSpan.textContent = desc;

                infoDiv.appendChild(titleSpan);
                if (desc) infoDiv.appendChild(descSpan);

                let priceDiv = document.createElement("div");
                priceDiv.className = "bom-item-price";
                priceDiv.textContent = cost;

                itemDiv.appendChild(infoDiv);
                itemDiv.appendChild(priceDiv);
                itemsDiv.appendChild(itemDiv);
            });

            groupDiv.appendChild(itemsDiv);
            listContainer.appendChild(groupDiv);
        }
        contentDiv.appendChild(listContainer);
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
