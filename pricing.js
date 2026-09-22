// pricing.js
// Fetches live data from Google Sheets public CSV export and renders an HTML table

const SHEET_ID = '1wckSyLTZinbpNALntkBX_qYVVdd0e6UApgQu9zHhYYs'; // Extracted from user's screenshot
// We use the gid for the specific sheet tab (Sheet1 usually gid=0, but URL says gid=173898044)
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

// Simple CSV parser handling quotes for comma-containing fields like "$5,000.00"
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
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            row.push(val.trim());
            val = "";
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // handle \r\n
            row.push(val.trim());
            if (row.join("").trim() !== "") { // Skip completely empty rows
                result.push(row);
            }
            row = [];
            val = "";
        } else {
            val += char;
        }
    }
    
    // push last token
    if (val !== "" || row.length > 0) {
        row.push(val.trim());
        result.push(row);
    }
    
    return result;
}

function renderTable(data) {
    if (!data || data.length < 2) return;
    
    // Find where the actual table headers begin
    // Sometimes Google Sheets has empty title rows at the top. 
    // We look for a row that has at least 3 columns to assume it's the header.
    let headerIndex = 0;
    for (let i = 0; i < data.length; i++) {
        const rowData = data[i].filter(cell => cell.trim() !== "");
        if (rowData.length >= 4) { // E.g. "Sr no", "Area", "Component Name"...
            headerIndex = i;
            break;
        }
    }
    
    const headers = data[headerIndex];
    let rows = data.slice(headerIndex + 1);
    
    // Extract a summary row if it exists (e.g. "Total Cost:")
    let summaryRow = null;
    rows = rows.filter(row => {
        const text = row.join(" ").toLowerCase();
        if (text.includes("total cost") || text.includes("total:")) {
            summaryRow = row;
            return false;
        }
        // Filter out completely empty rows
        if (row.join("").trim() === "") return false;
        return true;
    });

    const thead = document.getElementById("pricing-thead");
    const tbody = document.getElementById("pricing-tbody");
    const tfoot = document.getElementById("pricing-tfoot");
    
    // Render Header
    let trHead = document.createElement("tr");
    headers.forEach(h => {
        if(h === "") return; // Skip empty columns
        let th = document.createElement("th");
        th.textContent = h;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    
    // Render Body Rows
    rows.forEach(row => {
        let tr = document.createElement("tr");
        
        let cellsAdded = 0;
        for(let i=0; i < headers.length; i++) {
            if(headers[i] === "") continue; 
            
            let td = document.createElement("td");
            td.textContent = row[i] || "";
            
            // Format numbers nicely if they look like currency
            if (row[i] && row[i].includes("$")) {
                td.style.fontWeight = "600";
                td.style.color = "#20262c";
                td.style.textAlign = "right";
            }
            if (i === 0) { // Sr No column
                 td.style.color = "var(--text-muted)";
                 td.style.fontWeight = "500";
            }
            
            tr.appendChild(td);
            cellsAdded++;
        }
        tbody.appendChild(tr);
    });
    
    // Render Footer (Total)
    if (summaryRow) {
        let trFoot = document.createElement("tr");
        let th = document.createElement("th");
        
        // Find the index of the cost column to align the total
        const validHeadersCount = headers.filter(h => h !== "").length;
        
        th.colSpan = validHeadersCount - 1; // Span across all but the last column
        th.style.textAlign = "right";
        th.textContent = "Total Estimated Cost:";
        
        let tdTotal = document.createElement("th"); // use th for bolding
        tdTotal.textContent = summaryRow[summaryRow.length - 1] || summaryRow.find(val => val.includes("$"));
        tdTotal.className = "total-cost-highlight";
        tdTotal.style.textAlign = "right";
        
        trFoot.appendChild(th);
        trFoot.appendChild(tdTotal);
        tfoot.appendChild(trFoot);
    }

    // Hide loader, show table
    document.getElementById("pricing-loader").style.display = "none";
    document.getElementById("pricing-table").style.display = "table";
}
