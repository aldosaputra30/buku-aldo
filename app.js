(function () {
  "use strict";

  var STORAGE_KEY = "bukukas_transactions_v1";

  var CATEGORIES_BY_TYPE = {
    expense: ["Makanan", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Pendidikan", "Lainnya"],
    income: ["Gaji", "Bonus", "Hadiah", "Investasi", "Jual barang", "Lainnya"],
  };

  var CATEGORY_COLORS = {
    "Makanan": "#C9A24B",
    "Transportasi": "#7FA98A",
    "Belanja": "#C1666B",
    "Tagihan": "#8C9BC1",
    "Hiburan": "#B98CC1",
    "Kesehatan": "#6FB3B8",
    "Pendidikan": "#C1A06F",
    "Lainnya": "#9BA3A8",
    "Gaji": "#7FA98A",
    "Bonus": "#C9A24B",
    "Hadiah": "#B98CC1",
    "Investasi": "#6FB3B8",
    "Jual barang": "#8C9BC1",
  };

  var CATEGORY_EMOJI = {
    "Makanan": "🍔",
    "Transportasi": "🚗",
    "Belanja": "🛍️",
    "Tagihan": "🧾",
    "Hiburan": "🎬",
    "Kesehatan": "💊",
    "Pendidikan": "📚",
    "Lainnya": "✨",
    "Gaji": "💰",
    "Bonus": "🎁",
    "Hadiah": "🎉",
    "Investasi": "📈",
    "Jual barang": "🏷️",
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

  function hexToRgba(hex, alpha) {
    var h = hex.replace("#", "");
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function toISODate(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function todayISO() { return toISODate(new Date()); }

  function yesterdayISO() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return toISODate(d);
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

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
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
      var emoji = CATEGORY_EMOJI[cat] || "✨";
      return (
        '<div class="breakdown-row">' +
          '<span class="breakdown-cat">' + emoji + ' ' + escapeHtml(cat) + '</span>' +
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
        var emoji = CATEGORY_EMOJI[t.category] || "✨";
        var sign = t.type === "expense" ? "-" : "+";
        return (
          '<div class="tx-row" data-id="' + t.id + '">' +
            '<span class="tx-cat-icon" style="background:' + hexToRgba(color, 0.18) + '">' + emoji + '</span>' +
            '<div class="tx-info">' +
              '<div class="tx-cat">' + escapeHtml(t.category) + '</div>' +
              (t.note ? '<div class="tx-note">' + escapeHtml(t.note) + '</div>' : '') +
            '</div>' +
            '<span class="tx-amount ' + t.type + '">' + sign + formatRupiah(t.amount) + '</span>' +
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

  // ---------- sheet (add/edit form) ----------
  var overlay = document.getElementById("sheetOverlay");
  var form = document.getElementById("txForm");
  var amountValueEl = document.getElementById("amountValue");
  var noteInput = document.getElementById("noteInput");
  var dateInput = document.getElementById("dateInput");
  var dateTodayBtn = document.getElementById("dateTodayBtn");
  var dateYesterdayBtn = document.getElementById("dateYesterdayBtn");
  var deleteBtn = document.getElementById("deleteBtn");
  var sheetTitle = document.getElementById("sheetTitle");
  var categoryChips = document.getElementById("categoryChips");

  var currentType = "expense";
  var currentCategory = CATEGORIES_BY_TYPE.expense[0];
  var amountDigits = "0";

  function buildCategoryChips(type, selected) {
    var cats = CATEGORIES_BY_TYPE[type];
    categoryChips.innerHTML = cats.map(function (cat) {
      var color = CATEGORY_COLORS[cat];
      var emoji = CATEGORY_EMOJI[cat];
      var active = cat === selected ? " active" : "";
      return (
        '<button type="button" class="cat-chip' + active + '" data-cat="' + cat + '">' +
          '<span class="cat-emoji" style="background:' + hexToRgba(color, 0.18) + '">' + emoji + '</span>' +
          '<span class="cat-name">' + cat + '</span>' +
        '</button>'
      );
    }).join("");
  }

  function setCategory(cat) {
    currentCategory = cat;
    Array.prototype.forEach.call(categoryChips.querySelectorAll(".cat-chip"), function (chip) {
      chip.classList.toggle("active", chip.getAttribute("data-cat") === cat);
    });
  }

  categoryChips.addEventListener("click", function (e) {
    var chip = e.target.closest(".cat-chip");
    if (!chip) return;
    setCategory(chip.getAttribute("data-cat"));
  });

  function setType(type, preferredCategory) {
    currentType = type;
    Array.prototype.forEach.call(document.querySelectorAll(".type-opt"), function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-type") === type);
    });
    var cats = CATEGORIES_BY_TYPE[type];
    var selected = (preferredCategory && cats.indexOf(preferredCategory) !== -1)
      ? preferredCategory
      : cats[0];
    currentCategory = selected;
    buildCategoryChips(type, selected);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".type-opt"), function (btn) {
    btn.addEventListener("click", function () {
      setType(btn.getAttribute("data-type"));
    });
  });

  // ---------- keypad ----------
  function renderAmount() {
    var num = parseInt(amountDigits, 10) || 0;
    amountValueEl.textContent = num.toLocaleString("id-ID");
  }

  document.getElementById("keypad").addEventListener("click", function (e) {
    var key = e.target.closest(".key");
    if (!key) return;
    var val = key.getAttribute("data-key");

    if (val === "del") {
      amountDigits = amountDigits.slice(0, -1) || "0";
    } else {
      if (amountDigits === "0") amountDigits = "";
      amountDigits += val;
      // cap at a sane length (999,999,999,999)
      if (amountDigits.length > 12) amountDigits = amountDigits.slice(0, 12);
    }
    renderAmount();
  });

  // ---------- date quick chips ----------
  function syncDateChips() {
    var val = dateInput.value;
    dateTodayBtn.classList.toggle("active", val === todayISO());
    dateYesterdayBtn.classList.toggle("active", val === yesterdayISO());
  }

  dateTodayBtn.addEventListener("click", function () {
    dateInput.value = todayISO();
    syncDateChips();
  });

  dateYesterdayBtn.addEventListener("click", function () {
    dateInput.value = yesterdayISO();
    syncDateChips();
  });

  dateInput.addEventListener("change", syncDateChips);

  function openSheetForAdd() {
    state.editingId = null;
    sheetTitle.textContent = "Catatan baru";
    deleteBtn.hidden = true;
    form.reset();
    setType("expense");
    amountDigits = "0";
    renderAmount();
    dateInput.value = todayISO();
    syncDateChips();
    openSheet();
  }

  function openSheetForEdit(id) {
    var t = state.transactions.find(function (tx) { return tx.id === id; });
    if (!t) return;
    state.editingId = id;
    sheetTitle.textContent = "Edit catatan";
    deleteBtn.hidden = false;
    setType(t.type, t.category);
    amountDigits = String(t.amount);
    renderAmount();
    noteInput.value = t.note || "";
    dateInput.value = t.date;
    syncDateChips();
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
    var amount = parseInt(amountDigits, 10) || 0;
    if (!amount) {
      document.getElementById("keypad").scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    if (state.editingId) {
      var t = state.transactions.find(function (tx) { return tx.id === state.editingId; });
      t.type = currentType;
      t.amount = amount;
      t.category = currentCategory;
      t.note = noteInput.value.trim();
      t.date = dateInput.value;
    } else {
      state.transactions.push({
        id: uid(),
        type: currentType,
        amount: amount,
        category: currentCategory,
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
