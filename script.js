
"use strict";

// =========================
// Get HTML Elements
// =========================

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");

const expenseForm = document.getElementById("expenseForm");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("category");

const transactionList = document.getElementById("transactionList");
const searchInput = document.getElementById("searchInput");
const dateFilter = document.getElementById("dateFilter");
const datePickerBtn = document.getElementById("datePickerBtn");

const addTransactionBtn = document.getElementById("addTransactionBtn");
const transactionFormSection = document.getElementById("transactionFormSection");

// =========================
// Load Saved Transactions
// =========================

function loadTransactions() {
    try {
        const savedData = localStorage.getItem("spendlyTransactions");

        if (!savedData) return [];

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) return [];

        return parsedData
            .filter(transaction =>
                transaction &&
                typeof transaction.description === "string" &&
                Number.isFinite(Number(transaction.amount)) &&
                Number(transaction.amount) > 0 &&
                ["income", "expense"].includes(transaction.type)
            )
            .map((transaction, index) => ({
                ...transaction,
                id: transaction.id ?? `legacy-${index}`,
                amount: Number(transaction.amount),
                category: String(transaction.category || "other"),
                date: typeof transaction.date === "string"
                    ? transaction.date
                    : ""
            }));
    } catch (error) {
        console.error("Could not load Spendly transactions:", error);
        return [];
    }
}

let transactions = loadTransactions();

// =========================
// Save Transactions
// =========================

function saveTransactions() {
    try {
        localStorage.setItem(
            "spendlyTransactions",
            JSON.stringify(transactions)
        );
        return true;
    } catch (error) {
        console.error("Could not save transactions:", error);
        alert("Your transactions could not be saved in browser storage.");
        return false;
    }
}

// =========================
// Format Amount
// =========================

function formatAmount(amount) {
    return Number(amount).toFixed(2);
}

// =========================
// Calculate Summary
// =========================

function updateSummary() {
    const totalIncome = transactions
        .filter(transaction => transaction.type === "income")
        .reduce((total, transaction) => total + transaction.amount, 0);

    const totalExpenses = transactions
        .filter(transaction => transaction.type === "expense")
        .reduce((total, transaction) => total + transaction.amount, 0);

    const balance = totalIncome - totalExpenses;
    
    balanceElement.textContent = `₹${formatAmount(balance)}`;
    incomeElement.textContent = `₹${formatAmount(totalIncome)}`;
    expensesElement.textContent = `₹${formatAmount(totalExpenses)}`;
}

// =========================
// Display and Filter Transactions
// =========================

function displayTransactions(searchTerm = "") {
    const query = searchTerm.trim().toLowerCase();
    const selectedDate = dateFilter ? dateFilter.value : "";

    const filteredTransactions = transactions.filter(transaction => {
        const description = String(transaction.description || "").toLowerCase();
        const category = String(transaction.category || "").toLowerCase();
        const type = String(transaction.type || "").toLowerCase();

        const matchesText =
            description.includes(query) ||
            category.includes(query) ||
            type.includes(query);

        const matchesDate =
            !selectedDate || transaction.date === selectedDate;

        return matchesText && matchesDate;
    });

    transactionList.replaceChildren();

    if (filteredTransactions.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";

        const message = document.createElement("p");
        const detail = document.createElement("span");

        if (transactions.length === 0) {
            message.textContent = "No transactions yet.";
            detail.textContent = "Add your first transaction to get started.";
        } else {
            message.textContent = "No matching transactions.";
            detail.textContent = selectedDate
                ? `No transactions found for ${selectedDate}. Try another date or clear the filters.`
                : "Try another search.";
        }

        emptyState.append(message, detail);
        transactionList.appendChild(emptyState);
        return;
    }

    // Show newest transactions first
    [...filteredTransactions].reverse().forEach(transaction => {
        const item = document.createElement("div");
        item.className = "transaction-item";

        const details = document.createElement("div");
        details.className = "transaction-details";

        const title = document.createElement("strong");
        title.textContent = transaction.description;

        const category = document.createElement("span");
        category.textContent = transaction.category;

        const dateText = document.createElement("small");
        dateText.textContent = transaction.date || "Date unavailable";

        details.append(title, category, dateText);

        const amount = document.createElement("strong");
        const isIncome = transaction.type === "income";

        amount.textContent =
            `${isIncome ? "+" : "-"}₹${formatAmount(transaction.amount)}`;

        amount.style.color = isIncome ? "#16a34a" : "#dc2626";

        const actions = document.createElement("div");
        actions.className = "transaction-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.setAttribute("aria-label", `Edit ${transaction.description}`);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${transaction.description}`);

        // Edit transaction
        editButton.addEventListener("click", () => {
            const newDescription = prompt(
                "Enter new description:",
                transaction.description
            );

            if (newDescription === null) return;

            const cleanDescription = newDescription.trim();

            if (!cleanDescription || cleanDescription.length > 100) {
                alert("Description must contain 1–100 characters.");
                return;
            }

            const newAmountText = prompt(
                "Enter new amount:",
                String(transaction.amount)
            );

            if (newAmountText === null) return;

            const newAmount = Number(newAmountText);

            if (
                newAmountText.trim() === "" ||
                !Number.isFinite(newAmount) ||
                newAmount <= 0
            ) {
                alert("Enter a valid amount greater than zero.");
                return;
            }

            const oldDescription = transaction.description;
            const oldAmount = transaction.amount;

            transaction.description = cleanDescription;
            transaction.amount = newAmount;

            if (!saveTransactions()) {
                transaction.description = oldDescription;
                transaction.amount = oldAmount;
                return;
            }

            updateSummary();
            displayTransactions(searchInput.value);
        });

        // Delete transaction
        deleteButton.addEventListener("click", () => {
            const confirmed = confirm(
                `Delete "${transaction.description}"?`
            );

            if (!confirmed) return;

            const previousTransactions = transactions;

            transactions = transactions.filter(
                item => item.id !== transaction.id
            );

            if (!saveTransactions()) {
                transactions = previousTransactions;
                return;
            }

            updateSummary();
            displayTransactions(searchInput.value);
        });

        actions.append(editButton, deleteButton);
        item.append(details, amount, actions);
        transactionList.appendChild(item);
    });
}

// =========================
// Add Transaction
// =========================

expenseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;

    if (
        !description ||
        description.length > 100 ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !["income", "expense"].includes(type) ||
        !category
    ) {
        alert("Please enter valid transaction details.");
        return;
    }

    // Use local date to avoid UTC date shifts
    const now = new Date();
    const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    const transaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description,
        amount,
        type,
        category,
        date: localDate
    };

    transactions.push(transaction);

    if (!saveTransactions()) {
        transactions.pop();
        return;
    }

    updateSummary();

    // Show the new transaction even if old filters were active
    if (searchInput) searchInput.value = "";
    if (dateFilter) dateFilter.value = "";

    displayTransactions();
    expenseForm.reset();
});

// =========================
// Search by Text
// =========================

searchInput.addEventListener("input", () => {
    displayTransactions(searchInput.value);
});

// =========================
// Filter by Date
// =========================

if (dateFilter) {
    dateFilter.addEventListener("change", () => {
        displayTransactions(searchInput.value);
    });
}

// Open the date picker from the calendar icon
if (datePickerBtn && dateFilter) {
    datePickerBtn.addEventListener("click", () => {
        if (typeof dateFilter.showPicker === "function") {
            try {
                dateFilter.showPicker();
            } catch (error) {
                dateFilter.focus();
                dateFilter.click();
            }
        } else {
            dateFilter.focus();
            dateFilter.click();
        }
    });
}

// =========================
// Top Button: Scroll to Form
// =========================

if (addTransactionBtn && transactionFormSection) {
    addTransactionBtn.addEventListener("click", () => {
        transactionFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        descriptionInput.focus({ preventScroll: true });
    });
}

// =========================
// Initial Display
// =========================

updateSummary();
displayTransactions();



/* =========================
   Monthly Expense Insights
========================= */

const insightsMonth = document.getElementById("insightsMonth");
const monthlyExpenseTotal = document.getElementById("monthlyExpenseTotal");
const monthlyTransactionCount = document.getElementById("monthlyTransactionCount");
const categoryChart = document.getElementById("categoryChart");
const expenseTree = document.getElementById("expenseTree");

// Set the current month as the default.
const today = new Date();
const currentMonth =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

insightsMonth.value = currentMonth;

function renderMonthlyInsights() {
    const selectedMonth = insightsMonth.value;

    const monthlyExpenses = transactions.filter(transaction =>
        transaction.type === "expense" &&
        /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) &&
        transaction.date.startsWith(selectedMonth)
    );

    const total = monthlyExpenses.reduce(
        (sum, transaction) => sum + transaction.amount,
        0
    );

    monthlyExpenseTotal.textContent = `₹${formatAmount(total)}`;
    monthlyTransactionCount.textContent =
        `${monthlyExpenses.length} expense transaction${monthlyExpenses.length === 1 ? "" : "s"}`;

    categoryChart.replaceChildren();
    expenseTree.replaceChildren();

    if (monthlyExpenses.length === 0) {
        const chartMessage = document.createElement("p");
        chartMessage.className = "insights-empty";
        chartMessage.textContent =
            "No dated expenses found for this month.";

        const treeMessage = document.createElement("p");
        treeMessage.className = "insights-empty";
        treeMessage.textContent =
            "Add an expense with a date to see its category and transaction details.";

        categoryChart.appendChild(chartMessage);
        expenseTree.appendChild(treeMessage);
        return;
    }

    // Group expenses by category.
    const categoryTotals = {};

    monthlyExpenses.forEach(transaction => {
        const category = transaction.category || "other";

        if (!categoryTotals[category]) {
            categoryTotals[category] = [];
        }

        categoryTotals[category].push(transaction);
    });

    // Show the highest-spending categories first.
    const categories = Object.entries(categoryTotals)
        .map(([category, items]) => ({
            category,
            items,
            total: items.reduce((sum, item) => sum + item.amount, 0)
        }))
        .sort((a, b) => b.total - a.total);

    categories.forEach(group => {
        const percentage = total > 0
            ? (group.total / total) * 100
            : 0;

        // Category bar chart
        const row = document.createElement("div");
        row.className = "category-row";

        const rowHeader = document.createElement("div");
        rowHeader.className = "category-row-header";

        const name = document.createElement("span");
        name.textContent = group.category;

        const amount = document.createElement("strong");
        amount.textContent = `₹${formatAmount(group.total)}`;

        rowHeader.append(name, amount);

        const track = document.createElement("div");
        track.className = "category-track";

        const bar = document.createElement("div");
        bar.className = "category-bar";
        bar.style.width = `${percentage}%`;
        bar.setAttribute("aria-label", `${percentage.toFixed(1)} percent`);

        track.appendChild(bar);

        const percentText = document.createElement("span");
        percentText.className = "category-percentage";
        percentText.textContent = `${percentage.toFixed(1)}% of monthly expenses`;

        row.append(rowHeader, track, percentText);
        categoryChart.appendChild(row);

        // Expandable expense tree
        const details = document.createElement("details");
        details.className = "tree-category";

        const summary = document.createElement("summary");
        summary.textContent = group.category;

        const categoryAmount = document.createElement("strong");
        categoryAmount.textContent =
            `₹${formatAmount(group.total)} (${percentage.toFixed(1)}%)`;

        summary.appendChild(categoryAmount);

        const transactionContainer = document.createElement("div");
        transactionContainer.className = "tree-transactions";

        // Latest transactions first within each category.
        [...group.items]
            .sort((a, b) => b.date.localeCompare(a.date))
            .forEach(transaction => {
                const item = document.createElement("div");
                item.className = "tree-transaction";

                const description = document.createElement("div");

                const title = document.createElement("strong");
                title.textContent = transaction.description;

                const date = document.createElement("small");
                date.textContent = transaction.date;

                description.append(title, date);

                const transactionAmount = document.createElement("span");
                transactionAmount.textContent =
                    `₹${formatAmount(transaction.amount)}`;

                item.append(description, transactionAmount);
                transactionContainer.appendChild(item);
            });

        details.append(summary, transactionContainer);
        expenseTree.appendChild(details);
    });
}

// Recalculate when the selected month changes.
insightsMonth.addEventListener("change", renderMonthlyInsights);

// Initial dashboard display.
renderMonthlyInsights();
