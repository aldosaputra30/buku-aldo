(function () {
  "use strict";

  var STORAGE_KEY = "bukukas_transactions_v1";

  var CATEGORIES = [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Hiburan",
    "Kesehatan",
    "Pendidikan",
    "Lainnya",
  ];

  var CATEGORY_COLORS = {
    "Makanan": "#C9A24B",
    "Transportasi": "#7FA98A",
    "Belanja": "#C1666B",
    "Tagihan": "#8C9BC1",
    "Hiburan": "#B98CC1",
    "Kesehatan": "#6FB3B8",
    "Pendidikan": "#C1A06F",
    "Lainnya": "#9BA3A8",
  };

  var MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  // ---------- state ----------
  var state = {
    transactions: [],
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth(), // 0-indexed
    editingId: null,
  };

  // ---------- storage ----------
  function loadTransactions() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Gagal membaca cache:", e);
      return [];
    }
  }

  function saveTransactions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    } catch (e) {
      console.error("Gagal menyimpan ke cache:", e);
      alert("Penyimpanan gagal. Ruang cache perangkat mungkin penuh.");
    }
  }

  // ---------- helpers ----------
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function formatRupiah(n) {
    var sign = n < 0 ? "-" : "";
    var abs = Math.abs(Math.round(n));
    return sign + "Rp " + abs.toLocaleString("id-ID");
  }

  function parseAmountInput(str) {
    var digits = str.replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function formatAmountInput(str) {
    var num = parseAmountInput(str);
    return num ? num.toLocaleString("id-ID") : "";
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function isInViewMonth(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    return d.getFullYear() === state.viewYear && d.getMonth() === state.viewMonth;
  }

  function transactionsInView() {
    return state.transactions.filter(function (t) {
      return isInViewMonth(t.date);
    });
  }

  function formatGroupLabel(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var today = new Date();
    var yest = new Date();
    yest.setDate(today.getDate() - 1);

    var sameDay = function (a, b) {
      return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    };

    if (sameDay(d, today)) return "Hari ini";
    if (sameDay(d, yest)) return "Kemarin";

    var days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    return days[d.getDay()] + ", " + d.getDate() + " " + MONTH_NAMES[d.getMonth()];
  }

  // ---------- rendering ----------
  function render() {
    renderHeader();
    renderBreakdown();
    renderList();
  }

  function renderHeader() {
    document.getElementById("monthLabel").textContent =
      MONTH_NAMES[state.viewMonth] + " " + state.viewYear;

    var items = transactionsInView();
    var income = 0, expense = 0;
    items.forEach(function (t) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

    document.getElementById("incomeValue").textContent = formatRupiah(income);
    document.getElementById("expenseValue").textContent = formatRupiah(expense);
    document.getElementById("balanceValue").textContent = formatRupiah(income - expense);
  }

  function renderBreakdown() {
    var items = transactionsInView().filter(function (t) { return t.type === "expense"; });
    var totals = {};
    var grandTotal = 0;

    items.forEach(function (t) {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      grandTotal += t.amount;
    });

    var list = document.getElementById("breakdownList");
    var section = document.getElementById("breakdownSection");

    var cats = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });

    if (cats.length === 0) {
      section.hidden = true;
      return;
    }
    section.hidden = false;

    list.innerHTML = cats.map(function (cat) {
      var pct = grandTotal ? Math.round((totals[cat] / grandTotal) * 100) : 0;
      var color = CATEGORY_COLORS[cat] || "#9BA3A8";
      return (
        '<div class="breakdown-row">' +
          '<span class="breakdown-cat">' + escapeHtml(cat) + '</span>' +
          '<span class="breakdown-bar-track"><span class="breakdown-bar-fill" style="width:' + pct + '%;background:' + color + '"></span></span>' +
          '<span class="breakdown-amount">' + formatRupiah(totals[cat]) + '</span>' +
        '</div>'
      );
    }).join("");
  }

  function renderList() {
    var items = transactionsInView().sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.createdAt - a.createdAt;
    });

    var container = document.getElementById("txList");
    var empty = document.getElementById("emptyState");

    if (items.length === 0) {
      container.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    var groups = [];
    var lastDate = null;
    items.forEach(function (t) {
      if (t.date !== lastDate) {
        groups.push({ date: t.date, items: [] });
        lastDate = t.date;
      }
      groups[groups.length - 1].items.push(t);
    });

    container.innerHTML = groups.map(function (g) {
      var rows = g.items.map(function (t) {
        var color = CATEGORY_COLORS[t.category] || "#9BA3A8";
        var sign = t.type === "expense" ? "-" : "+";
        return (
          '<div class="tx-row" data-id="' + t.id + '">' +
            '<span class="tx-cat-dot" style="background:' + color + '"></span>' +
            '<div class="tx-info">' +
              '<div class="tx-cat">' + escapeHtml(t.category) + '</div>' +
              (t.note ? '<div class="tx-note">' + escapeHtml(t.note) + '</div>' : '') +
            '</div>' +
            '<span class="tx-amount ' + t.type + '">' + sign + formatRupiah(t.amount).replace('Rp ', 'Rp ') + '</span>' +
          '</div>'
        );
      }).join("");

      return (
        '<div class="tx-group-label">' + formatGroupLabel(g.date) + '</div>' + rows
      );
    }).join("");

    Array.prototype.forEach.call(container.querySelectorAll(".tx-row"), function (row) {
      row.addEventListener("click", function () {
        openSheetForEdit(row.getAttribute("data-id"));
      });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- sheet (add/edit form) ----------
  var overlay = document.getElementById("sheetOverlay");
  var form = document.getElementById("txForm");
  var amountInput = document.getElementById("amountInput");
  var categoryInput = document.getElementById("categoryInput");
  var noteInput = document.getElementById("noteInput");
  var dateInput = document.getElementById("dateInput");
  var deleteBtn = document.getElementById("deleteBtn");
  var sheetTitle = document.getElementById("sheetTitle");
  var currentType = "expense";

  categoryInput.innerHTML = CATEGORIES.map(function (c) {
    return '<option value="' + c + '">' + c + '</option>';
  }).join("");

  function setType(type) {
    currentType = type;
    Array.prototype.forEach.call(document.querySelectorAll(".type-opt"), function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-type") === type);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll(".type-opt"), function (btn) {
    btn.addEventListener("click", function () {
      setType(btn.getAttribute("data-type"));
    });
  });

  amountInput.addEventListener("input", function () {
    var cursorFromEnd = amountInput.value.length - amountInput.selectionStart;
    amountInput.value = formatAmountInput(amountInput.value);
    var pos = amountInput.value.length - cursorFromEnd;
    amountInput.setSelectionRange(pos, pos);
  });

  function openSheetForAdd() {
    state.editingId = null;
    sheetTitle.textContent = "Catatan baru";
    deleteBtn.hidden = true;
    form.reset();
    setType("expense");
    dateInput.value = todayISO();
    categoryInput.value = CATEGORIES[0];
    openSheet();
  }

  function openSheetForEdit(id) {
    var t = state.transactions.find(function (tx) { return tx.id === id; });
    if (!t) return;
    state.editingId = id;
    sheetTitle.textContent = "Edit catatan";
    deleteBtn.hidden = false;
    setType(t.type);
    amountInput.value = t.amount.toLocaleString("id-ID");
    categoryInput.value = t.category;
    noteInput.value = t.note || "";
    dateInput.value = t.date;
    openSheet();
  }

  function openSheet() {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeSheet() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.getElementById("fabAdd").addEventListener("click", openSheetForAdd);
  document.getElementById("cancelBtn").addEventListener("click", closeSheet);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeSheet();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var amount = parseAmountInput(amountInput.value);
    if (!amount) {
      amountInput.focus();
      return;
    }

    if (state.editingId) {
      var t = state.transactions.find(function (tx) { return tx.id === state.editingId; });
      t.type = currentType;
      t.amount = amount;
      t.category = categoryInput.value;
      t.note = noteInput.value.trim();
      t.date = dateInput.value;
    } else {
      state.transactions.push({
        id: uid(),
        type: currentType,
        amount: amount,
        category: categoryInput.value,
        note: noteInput.value.trim(),
        date: dateInput.value,
        createdAt: Date.now(),
      });
    }

    saveTransactions();
    closeSheet();
    render();
  });

  deleteBtn.addEventListener("click", function () {
    if (!state.editingId) return;
    if (!confirm("Hapus catatan ini?")) return;
    state.transactions = state.transactions.filter(function (t) { return t.id !== state.editingId; });
    saveTransactions();
    closeSheet();
    render();
  });

  // ---------- month navigation ----------
  document.getElementById("prevMonth").addEventListener("click", function () {
    state.viewMonth--;
    if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
    render();
  });

  document.getElementById("nextMonth").addEventListener("click", function () {
    state.viewMonth++;
    if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
    render();
  });

  // ---------- export / import ----------
  document.getElementById("exportBtn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(state.transactions, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "buku-kas-backup-" + todayISO() + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  var importFile = document.getElementById("importFile");
  document.getElementById("importBtn").addEventListener("click", function () {
    importFile.click();
  });

  importFile.addEventListener("change", function () {
    var file = importFile.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("format tidak valid");
        var merge = confirm(
          "Gabungkan " + data.length + " catatan dengan data yang ada?\n" +
          "Klik Batal untuk mengganti seluruh data yang ada."
        );
        if (merge) {
          var existingIds = new Set(state.transactions.map(function (t) { return t.id; }));
          data.forEach(function (t) {
            if (!existingIds.has(t.id)) state.transactions.push(t);
          });
        } else {
          state.transactions = data;
        }
        saveTransactions();
        render();
        alert("Data berhasil diimpor.");
      } catch (err) {
        alert("Gagal membaca file: " + err.message);
      }
      importFile.value = "";
    };
    reader.readAsText(file);
  });

  // ---------- init ----------
  state.transactions = loadTransactions();
  render();

  // ---------- PWA service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) {
        console.warn("Service worker gagal didaftarkan:", e);
      });
    });
  }
})();
