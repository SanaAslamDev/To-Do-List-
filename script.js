const STORAGE_KEY = "taskflow.tasks";

let tasks = loadTasks();        
let activeFilter = "all";       
let activeSort = "newest";      
let searchTerm = "";           
let taskIdPendingDelete = null; 


const taskForm       = document.getElementById("taskForm");
const titleInput     = document.getElementById("titleInput");
const descInput      = document.getElementById("descInput");
const priorityInput  = document.getElementById("priorityInput");
const categoryInput  = document.getElementById("categoryInput");
const dueInput       = document.getElementById("dueInput");
const clearFormBtn   = document.getElementById("clearFormBtn");

const searchInput    = document.getElementById("searchInput");
const filterGroup    = document.getElementById("filterGroup");
const sortSelect     = document.getElementById("sortSelect");

const taskListEl     = document.getElementById("taskList");
const emptyStateEl   = document.getElementById("emptyState");

const modalOverlay   = document.getElementById("modalOverlay");
const modalCancelBtn = document.getElementById("modalCancel");
const modalDeleteBtn = document.getElementById("modalDelete");

const toastContainer = document.getElementById("toastContainer");

const statTotal      = document.getElementById("statTotal");
const statCompleted  = document.getElementById("statCompleted");
const statPending     = document.getElementById("statPending");
const statImportant  = document.getElementById("statImportant");
const statPercent    = document.getElementById("statPercent");
const flowProgress   = document.getElementById("flowProgress");


function loadTasks() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}


function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isToday(dateString) {
  if (!dateString) return false;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  return dateString === todayStr;
}

function isUpcoming(dateString) {
  if (!dateString) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return dateString > todayStr;
}

const priorityRank = { high: 0, medium: 1, low: 2 };


function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 220);
  }, 2200);
}


taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    showToast("Give your task a title first");
    return;
  }


  const editingId = taskForm.dataset.editingId;

  if (editingId) {
    updateTask(editingId);
  } else {
    const newTask = {
      id: generateId(),
      title: title,
      description: descInput.value.trim(),
      priority: priorityInput.value,
      category: categoryInput.value,
      dueDate: dueInput.value,
      completed: false,
      important: false,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(newTask); // newest first
    saveTasks();
    showToast("Task added");
  }

  resetForm();
  render();
});

clearFormBtn.addEventListener("click", resetForm);

function resetForm() {
  taskForm.reset();
  priorityInput.value = "medium";
  delete taskForm.dataset.editingId;
  document.getElementById("submitBtn").textContent = "Add task";
}


function startEditingTask(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;

  titleInput.value = task.title;
  descInput.value = task.description;
  priorityInput.value = task.priority;
  categoryInput.value = task.category;
  dueInput.value = task.dueDate;

  taskForm.dataset.editingId = id;
  document.getElementById("submitBtn").textContent = "Save changes";
  titleInput.focus();
  window.scrollTo({ top: taskForm.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" });
}

function updateTask(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;

  task.title = titleInput.value.trim();
  task.description = descInput.value.trim();
  task.priority = priorityInput.value;
  task.category = categoryInput.value;
  task.dueDate = dueInput.value;

  saveTasks();
  showToast("Task updated");
}

function toggleCompleted(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  showToast(task.completed ? "Marked complete" : "Marked pending");
  render();
}

function toggleImportant(id) {
  const task = tasks.find(function (t) { return t.id === id; });
  if (!task) return;
  task.important = !task.important;
  saveTasks();
  showToast(task.important ? "Marked important" : "Removed from important");
  render();
}


function askDeleteTask(id) {
  taskIdPendingDelete = id;
  modalOverlay.hidden = false;
}

function closeModal() {
  taskIdPendingDelete = null;
  modalOverlay.hidden = true;
}

modalCancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", function (event) {
  if (event.target === modalOverlay) closeModal();
});

modalDeleteBtn.addEventListener("click", function () {
  if (!taskIdPendingDelete) return;
  tasks = tasks.filter(function (t) { return t.id !== taskIdPendingDelete; });
  saveTasks();
  showToast("Task deleted");
  closeModal();
  render();
});

searchInput.addEventListener("input", function () {
  searchTerm = searchInput.value.trim().toLowerCase();
  render();
});

filterGroup.addEventListener("click", function (event) {
  const chip = event.target.closest(".chip");
  if (!chip) return;

  filterGroup.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
  chip.classList.add("is-active");
  activeFilter = chip.dataset.filter;
  render();
});

sortSelect.addEventListener("change", function () {
  activeSort = sortSelect.value;
  render();
});


function getVisibleTasks() {
  let list = tasks.slice(); 

 
  list = list.filter(function (task) {
    switch (activeFilter) {
      case "pending":   return !task.completed;
      case "completed": return task.completed;
      case "important": return task.important;
      case "high":      return task.priority === "high";
      case "medium":    return task.priority === "medium";
      case "low":        return task.priority === "low";
      case "today":     return isToday(task.dueDate);
      case "upcoming":  return isUpcoming(task.dueDate);
      default:          return true; // "all"
    }
  });

 
  if (searchTerm) {
    list = list.filter(function (task) {
      return (
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.category.toLowerCase().includes(searchTerm)
      );
    });
  }

 
  list.sort(function (a, b) {
    switch (activeSort) {
      case "oldest":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "az":
        return a.title.localeCompare(b.title);
      case "priority":
        return priorityRank[a.priority] - priorityRank[b.priority];
      case "due":
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      default: // "newest"
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return list;
}


function render() {
  renderStats();
  renderTaskList();
}

function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(function (t) { return t.completed; }).length;
  const pending = total - completed;
  const important = tasks.filter(function (t) { return t.important; }).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statCompleted.textContent = completed;
  statPending.textContent = pending;
  statImportant.textContent = important;
  statPercent.textContent = percent;


  const pathLength = 420; 
  const offset = pathLength - (pathLength * percent) / 100;
  flowProgress.style.strokeDashoffset = offset;
}

function renderTaskList() {
  const visibleTasks = getVisibleTasks();

  taskListEl.innerHTML = "";

  if (visibleTasks.length === 0) {
    emptyStateEl.hidden = false;
    if (tasks.length > 0) {
      emptyStateEl.querySelector(".empty-state__title").textContent = "No matching tasks";
      emptyStateEl.querySelector(".empty-state__subtitle").textContent = "Try a different filter or search term.";
    } else {
      emptyStateEl.querySelector(".empty-state__title").textContent = "No tasks yet";
      emptyStateEl.querySelector(".empty-state__subtitle").textContent = "Start by adding your first task above.";
    }
    return;
  }

  emptyStateEl.hidden = true;

  visibleTasks.forEach(function (task) {
    taskListEl.appendChild(buildTaskCard(task));
  });
}

function buildTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card" + (task.completed ? " is-completed" : "");
  card.dataset.id = task.id;

  card.innerHTML = `
    <input type="checkbox" class="task-card__checkbox" ${task.completed ? "checked" : ""} aria-label="Mark task completed">

    <div class="task-card__body">
      <h3 class="task-card__title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="task-card__desc">${escapeHtml(task.description)}</p>` : ""}
      <div class="task-card__meta">
        <span class="badge badge--priority-${task.priority}">${task.priority}</span>
        <span class="badge badge--category">${task.category}</span>
        ${task.dueDate ? `<span class="badge badge--date">Due ${formatDate(task.dueDate)}</span>` : ""}
        <span class="badge badge--date">Added ${formatDate(task.createdAt.slice(0, 10))}</span>
        ${task.completed ? `<span class="badge badge--completed">Done</span>` : ""}
      </div>
    </div>

    <div class="task-card__actions">
      <button class="icon-btn icon-btn--star ${task.important ? "is-important" : ""}" data-action="important">★ Important</button>
      <button class="icon-btn" data-action="edit">Edit</button>
      <button class="icon-btn icon-btn--danger" data-action="delete">Delete</button>
    </div>
  `;

  
  card.querySelector(".task-card__checkbox").addEventListener("change", function () {
    toggleCompleted(task.id);
  });
  card.querySelector('[data-action="important"]').addEventListener("click", function () {
    toggleImportant(task.id);
  });
  card.querySelector('[data-action="edit"]').addEventListener("click", function () {
    startEditingTask(task.id);
  });
  card.querySelector('[data-action="delete"]').addEventListener("click", function () {
    askDeleteTask(task.id);
  });

  return card;
}


function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long", month: "long", day: "numeric", year: "numeric"
});


render();