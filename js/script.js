// ==========================================
// 1. STATE & LOCAL STORAGE
// ==========================================

let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
let isDarkMode = JSON.parse(localStorage.getItem('isDarkMode')) || false;

// Elemen HTML
const transactionForm = document.getElementById('transactionForm');
const itemNameInput = document.getElementById('itemName');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const transactionList = document.getElementById('transactionList');
const totalBalanceEl = document.getElementById('totalBalance');
const sortSelect = document.getElementById('sortSelect');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');

let expenseChart = null;

// Palette warna dinamis untuk kategori kustom
const categoryColors = {
  Food: { bg: 'bg-orange-50 text-orange-600 border-orange-200', emoji: '🍔', chart: '#f97316' },
  Transport: { bg: 'bg-sky-50 text-sky-600 border-sky-200', emoji: '🚗', chart: '#0284c7' },
  Fun: { bg: 'bg-purple-50 text-purple-600 border-purple-200', emoji: '🎮', chart: '#a855f7' }
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

function saveToLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
  localStorage.setItem('customCategories', JSON.stringify(customCategories));
  localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
}

// Generasi Warna Random Kategori Kustom
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Sync Opsi Kategori ke Dropdown
function populateCategories() {
  // Hapus kustom yang ada dulu
  const customOptions = categoryInput.querySelectorAll('.custom-opt');
  customOptions.forEach(opt => opt.remove());

  // Masukkan kategori kustom tersimpan
  customCategories.forEach(cat => {
    if (!categoryColors[cat.name]) {
      categoryColors[cat.name] = {
        bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        emoji: cat.emoji || '🏷️',
        chart: cat.color || getRandomColor()
      };
    }
    const option = document.createElement('option');
    option.value = cat.name;
    option.className = 'custom-opt';
    option.textContent = `${categoryColors[cat.name].emoji} ${cat.name}`;
    
    // Sisipkan sebelum opsi "NEW_CATEGORY_OPTION"
    const newOpt = categoryInput.querySelector('option[value="NEW_CATEGORY_OPTION"]');
    categoryInput.insertBefore(option, newOpt);
  });
}

// ==========================================
// 3. RENDER UI & SORTING
// ==========================================

function getSortedTransactions() {
  const sortBy = sortSelect ? sortSelect.value : 'newest';
  let sorted = [...transactions];

  if (sortBy === 'amount-high') {
    sorted.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === 'amount-low') {
    sorted.sort((a, b) => a.amount - b.amount);
  } else if (sortBy === 'category') {
    sorted.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    // Default newest (berdasarkan timestamp ID)
    sorted.sort((a, b) => b.id - a.id);
  }

  return sorted;
}

function updateUI() {
  transactionList.innerHTML = '';
  const sortedList = getSortedTransactions();

  if (sortedList.length === 0) {
    transactionList.innerHTML = `
      <div class="text-center py-8 text-slate-400 space-y-2">
        <p class="text-3xl">💸</p>
        <p class="text-sm font-medium">Belum ada pengeluaran dicatat.</p>
      </div>
    `;
  } else {
    sortedList.forEach((item) => {
      const catInfo = categoryColors[item.category] || {
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        emoji: '🏷️'
      };

      const itemEl = document.createElement('div');
      itemEl.className = 'flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100/80 dark:hover:bg-slate-700 rounded-xl border border-slate-200/60 dark:border-slate-600/60 transition-colors duration-300 group';
      itemEl.innerHTML = `
        <div class="space-y-1">
          <p class="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none transition-colors duration-300">${item.name}</p>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-indigo-600">${formatRupiah(item.amount)}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${catInfo.bg}">
              ${catInfo.emoji} ${item.category}
            </span>
          </div>
        </div>
        <button 
          onclick="deleteTransaction(${item.id})"
          class="bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-500 transition duration-150 active:scale-95 shadow-sm"
        >
          Hapus
        </button>
      `;

      transactionList.appendChild(itemEl);
    });
  }

  // Calculate Total
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  totalBalanceEl.innerText = formatRupiah(total);

  updateChart();
}

// ==========================================
// 4. VISUAL CHART.JS
// ==========================================

function updateChart() {
  const ctx = document.getElementById('expenseChart').getContext('2d');

  // Ambil semua kategori unik yang dipakai atau tersedia
  const totals = {};
  let grandTotal = 0;

  // Hitung pengeluaran per kategori
  transactions.forEach((item) => {
    totals[item.category] = (totals[item.category] || 0) + item.amount;
    grandTotal += item.amount;
  });

  const categories = Object.keys(totals);
  const dataValues = categories.map(cat => totals[cat]);
  const bgColors = categories.map(cat => (categoryColors[cat] ? categoryColors[cat].chart : getRandomColor()));

  if (expenseChart) {
    expenseChart.destroy();
  }

  const getPercentage = (amount) => {
    if (grandTotal === 0) return '0.0%';
    return ((amount / grandTotal) * 100).toFixed(1) + '%';
  };

  const labelsWithPercent = categories.map(cat => {
    const emoji = categoryColors[cat] ? categoryColors[cat].emoji : '🏷️';
    return `${emoji} ${cat} (${getPercentage(totals[cat])})`;
  });

  expenseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labelsWithPercent,
      datasets: [{
        data: dataValues,
        backgroundColor: bgColors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 11, weight: '600' },
            padding: 14,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw || 0;
              const percentage = grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : '0.0';
              return ` ${formatRupiah(value)} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}

// ==========================================
// 5. HANDLER EVENTS & ACTIONS
// ==========================================

// Handle Dropdown Category Change (Detect "+ Tambah Kategori")
categoryInput.addEventListener('change', (e) => {
  if (e.target.value === 'NEW_CATEGORY_OPTION') {
    const catName = prompt('Masukkan Nama Kategori Baru:');
    if (catName && catName.trim() !== '') {
      const cleanName = catName.trim();
      const emoji = prompt('Masukkan Emoji Kategori (Opsional, misal: 🛒):') || '🏷️';
      
      const newCat = {
        name: cleanName,
        emoji: emoji,
        color: getRandomColor()
      };

      customCategories.push(newCat);
      categoryColors[cleanName] = {
        bg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        emoji: emoji,
        chart: newCat.color
      };

      saveToLocalStorage();
      populateCategories();
      categoryInput.value = cleanName; // Pilih kategori baru tersebut
    } else {
      categoryInput.value = ''; // Reset jika batal
    }
  }
});

// Handle Submit Form
transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = itemNameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;

  if (!name || isNaN(amount) || amount <= 0 || !category || category === 'NEW_CATEGORY_OPTION') {
    alert('Harap isi semua kolom dengan benar!');
    return;
  }

  const newTransaction = {
    id: Date.now(),
    name: name,
    amount: amount,
    category: category
  };

  transactions.push(newTransaction);

  saveToLocalStorage();
  updateUI();

  transactionForm.reset();
});

// Handle Sort Change
if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    updateUI();
  });
}

// Handle Dark Mode Toggle
function applyTheme() {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.replace('bg-slate-100', 'bg-slate-900');
    document.body.classList.replace('text-slate-800', 'text-slate-100');
    themeToggleIcon.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.replace('bg-slate-900', 'bg-slate-100');
    document.body.classList.replace('text-slate-100', 'text-slate-800');
    themeToggleIcon.textContent = '🌙';
  }
}

themeToggleBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  saveToLocalStorage();
  applyTheme();
});

// Delete Transaction
function deleteTransaction(id) {
  transactions = transactions.filter((item) => item.id !== id);
  saveToLocalStorage();
  updateUI();
}

// Inisialisasi
populateCategories();
applyTheme();
updateUI();