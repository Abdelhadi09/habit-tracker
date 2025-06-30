// Smooth scroll for navigation links
      document.querySelectorAll('header a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const targetId = this.getAttribute('href');
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth'
            });
            // Update active nav link
            document.querySelectorAll('header a.nav-link').forEach(link => link.classList.remove('active'));
            this.classList.add('active');
          }
        });
      });
      // Dynamic active link based on scroll position
      const sections = document.querySelectorAll('main section[id]');
      const navLinks = document.querySelectorAll('header a.nav-link');
      window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
          const sectionTop = section.offsetTop;
          if (pageYOffset >= sectionTop - 100) { // Adjusted offset for better UX
            current = section.getAttribute('id');
          }
        });
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
          }
        });
        // Ensure dashboard is active if no other section is current (e.g., at the very top)
        if (!current && pageYOffset < sections[0].offsetTop - 100) {
             document.querySelector('header a.nav-link[href="#"]').classList.add('active');
        }
      });



      let goals = {};  // key = habit, value = target

// Submit habit entry
document.getElementById("habitForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const habit = document.getElementById("habit").value;
  const duration = document.getElementById("duration").value;

  const response = await fetch("/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habit, duration })
  });

  const result = await response.json();
  document.getElementById("status").innerText = result.message;

  await loadSummary(); // refresh immediately
});

// Submit new goal
document.getElementById("goalForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const habit = document.getElementById("goalHabit").value;
  const target = parseInt(document.getElementById("goalDuration").value);
  await saveGoal(habit, target);
  await loadSummary();
  await showGoalList();
});

async function saveGoal(habit, target) {
  await fetch("/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habit, target })
  });
  await loadGoals();
}

async function loadGoals() {
  const res = await fetch("/goals");
  goals = await res.json();
}

async function loadSummary() {
  const response = await fetch("/summary");
  const data = await response.json();
  window.summaryData = data;

  const tableBody = document.querySelector("#habits table tbody");
  tableBody.innerHTML = "";

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let item of data) {
    const tr = document.createElement("tr");
    tr.className = "border-t border-t-[var(--border-color)]";
    const tdHabit = document.createElement("td");
    tdHabit.className = "h-[60px] px-4 py-2 text-[var(--text-primary)] text-sm font-normal leading-normal";
    tdHabit.textContent = item.habit;
    tr.appendChild(tdHabit);
    for (let day of days) {
      const td = document.createElement("td");
      td.className = "h-[60px] px-3 py-2 text-center text-sm font-normal leading-normal";
      if (item[day] && item[day] > 0) {
        td.classList.add("table-cell-status-true");
        td.innerHTML = `<span class="material-icons-outlined icon-sm text-[var(--primary-color)]">check_circle</span><br><span>${item[day]} min</span>`;
      } else {
        td.classList.add("table-cell-status-false");
        td.innerHTML = `<span class="material-icons-outlined icon-sm text-red-500">cancel</span>`;
      }
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

async function showGoalList() {
  const goalList = document.getElementById("goalList");
  goalList.innerHTML = "";
  for (const habit in goals) {
    const target = goals[habit];
    // Calculate progress for this habit
    let progress = 0;
    if (window.summaryData) {
      const found = window.summaryData.find(item => item.habit === habit);
      if (found) {
        // Sum all days' durations for this habit
        progress = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].reduce((acc, day) => acc + (found[day] || 0), 0);
      }
    }
    const percent = target ? Math.min((progress / target) * 100, 100) : 0;
    // Card style for each goal
    const card = document.createElement("div");
    card.className = "flex items-center gap-4 p-4 rounded-lg border border-[var(--border-color)] hover:shadow-md transition-shadow bg-white mb-2";
    const info = document.createElement("div");
    info.className = "flex-1";
    info.innerHTML = `<p class='text-[var(--text-primary)] text-base font-medium leading-normal line-clamp-1'>${habit}</p><p class='text-[var(--text-secondary)] text-sm font-normal leading-normal line-clamp-2'>Target: ${target} min/week</p>`;
    // Progress bar beside percentage
    const barRow = document.createElement("div");
    barRow.className = "flex items-center gap-2 ml-6";
    const barContainer = document.createElement("div");
    barContainer.className = "w-32 overflow-hidden rounded-full bg-[var(--accent-color)] h-2.5";
    const bar = document.createElement("div");
    bar.className = "h-full rounded-full bg-[var(--primary-color)] progress-bar-fill";
    bar.style.width = percent + "%";
    barContainer.appendChild(bar);
    // Percentage label beside the bar
    const percentLabel = document.createElement("span");
    percentLabel.className = "ml-2 text-[var(--text-primary)] text-xs font-semibold w-8 text-right";
    percentLabel.innerText = percent ? Math.round(percent) + "%" : "0%";
    barRow.appendChild(barContainer);
    barRow.appendChild(percentLabel);
    // Layout: info | barRow | delete btn
    card.appendChild(info);
    card.appendChild(barRow);
    const btns = document.createElement("div");
    btns.className = "shrink-0 flex items-center gap-3";
    // Delete button only
    const delBtn = document.createElement("button");
    delBtn.className = "text-red-500 hover:text-red-700 transition-colors";
    delBtn.innerHTML = '<span class="material-icons-outlined icon-sm">delete</span>';
    delBtn.onclick = async () => {
      if (confirm(`Delete goal for \"${habit}\"?`)) {
        await fetch("/goals", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ habit })
        });
        await loadGoals();
        await loadSummary();
        showGoalList();
      }
    };
    btns.appendChild(delBtn);
    card.appendChild(btns);
    goalList.appendChild(card);
  }
}


// Chart.js chart rendering for habit trends
function renderTrendChart(trend) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  if(window.trendChartInstance) window.trendChartInstance.destroy();
  window.trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.labels,
      datasets: trend.datasets.map((ds, i) => ({
        ...ds,
        fill: true,
        borderColor: `hsl(${i*60}, 70%, 45%)`,
        backgroundColor: `hsla(${i*60}, 70%, 45%, 0.15)`,
        borderWidth: 3,
        pointBackgroundColor: `hsl(${i*60}, 70%, 45%)`,
        pointRadius: 5,
        tension: 0.3,
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: false }
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.05)' } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }
      }
    }
  });
}

// Example: Replace with your real data fetch
async function loadTrendChart() {
  try {
    const res = await fetch('/trend-data');
    if (!res.ok) throw new Error('Failed to fetch trend data');
    const trend = await res.json();
    if (!trend || !trend.labels || !trend.datasets) throw new Error('Invalid trend data');
    renderTrendChart(trend);
  } catch (err) {
    console.error('Chart load error:', err);
    // Optionally, show a message in the chart area
    const chartContainer = document.getElementById('trendChart').parentElement;
    if (chartContainer) chartContainer.innerHTML = '<div style="color:var(--text-secondary);padding:2rem;text-align:center;">No chart data available</div>';
  }
}

window.onload = async () => {
  await loadGoals();
  await loadSummary();
  await showGoalList();
  await loadTrendChart();
};

function showSection(id) {
  const sections = ['log', 'summary', 'goals', 'chart'];
  sections.forEach(s => {
    document.getElementById(`${s}Section`).style.display = (s === id) ? "block" : "none";
  });
}
