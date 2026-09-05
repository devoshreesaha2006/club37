// =========================================================================
// CLUB 37 — Frontend logic
// No secrets live here. All writes go through the backend API, which
// enforces auth, validation, and the PENDING -> APPROVED workflow.
// =========================================================================

const API_BASE = "https://club37.onrender.com/api";

/* ---------------------------- Shared: nav ---------------------------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links
    .querySelectorAll("a")
    .forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open")),
    );
}

/* ---------------------------- Shared: toast ---------------------------- */
function showToast(message, type = "success") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast show ${type === "error" ? "error" : ""}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ---------------------------- Shared: fetch wrapper ---------------------------- */
async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send the httpOnly admin cookie when present
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = { success: false, message: "Unexpected server response." };
  }

  if (!res.ok) {
    const err = new Error(data.message || "Request failed.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initJoinForm();
  initMembersPage();
  initAdminLoginPage();
  initAdminDashboard();
});

/* =========================================================================
   JOIN CLUB 37 — application form
   ========================================================================= */
function initJoinForm() {
  const form = document.getElementById("join-form");
  if (!form) return;

  const fileInput = document.getElementById("profilePhoto");
  const fileDrop = document.getElementById("file-drop");
  const alertBox = document.getElementById("form-alert");
  const submitBtn = document.getElementById("submit-btn");

  if (fileDrop && fileInput) {
    fileDrop.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
          showFieldError(
            "profilePhoto",
            "Only JPEG, PNG or WEBP images are allowed.",
          );
          fileInput.value = "";
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showFieldError("profilePhoto", "Image must be smaller than 5MB.");
          fileInput.value = "";
          return;
        }
        clearFieldError("profilePhoto");
        fileDrop.textContent = `Selected: ${file.name}`;
        fileDrop.classList.add("has-file");
      }
    });
  }

  function showFieldError(name, message) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    field.classList.add("has-error");
    const err = field.querySelector(".field-error");
    if (err) err.textContent = message;
  }

  function clearFieldError(name) {
    const field = form.querySelector(`[data-field="${name}"]`);
    if (!field) return;
    field.classList.remove("has-error");
  }

  function clearAllErrors() {
    form
      .querySelectorAll(".field")
      .forEach((f) => f.classList.remove("has-error"));
  }

  function validateClientSide(fd) {
    let valid = true;
    const required = [
      "name",
      "age",
      "city",
      "phone",
      "motorcycle",
      "bikeModel",
      "experience",
      "reason",
    ];
    required.forEach((key) => {
      const value = (fd.get(key) || "").toString().trim();
      if (!value) {
        showFieldError(key, "This field is required.");
        valid = false;
      }
    });

    const age = Number(fd.get("age"));
    if (fd.get("age") && (!Number.isInteger(age) || age < 16 || age > 100)) {
      showFieldError("age", "Enter a valid age between 16 and 100.");
      valid = false;
    }

    const instagram = (fd.get("instagram") || "").toString().trim();
    if (instagram && !/^@?[a-zA-Z0-9._]{1,30}$/.test(instagram)) {
      showFieldError("instagram", "Enter a valid Instagram username.");
      valid = false;
    }

    const reason = (fd.get("reason") || "").toString().trim();
    if (reason && reason.length < 10) {
      showFieldError(
        "reason",
        "Please tell us a bit more (at least 10 characters).",
      );
      valid = false;
    }

    return valid;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();
    alertBox.classList.remove("show", "error", "success");

    const fd = new FormData(form);
    if (!validateClientSide(fd)) {
      alertBox.textContent = "Please fix the highlighted fields.";
      alertBox.classList.add("show", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting…';

    try {
      const data = await apiRequest("/applications", {
        method: "POST",
        body: fd,
      });
      renderConfirmation(data.applicationId);
    } catch (err) {
      const message =
        (err.data &&
          err.data.errors &&
          err.data.errors[0] &&
          err.data.errors[0].message) ||
        err.message ||
        "Unable to submit your application. Please try again.";
      alertBox.textContent = message;
      alertBox.classList.add("show", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "SUBMIT MEMBERSHIP REQUEST";
    }
  });
}

function renderConfirmation(applicationId) {
  const main = document.getElementById("join-main");
  if (!main) return;
  main.innerHTML = `
    <div class="confirm-screen">
      <div class="confirm-panel">
        <div class="confirm-icon">✓</div>
        <h1>REQUEST RECEIVED</h1>
        <p>Your application is currently under review.</p>
        <p>You will be notified once the Club 37 team makes a decision.</p>
        <div class="confirm-id">${applicationId || "C37-REQ-XXXX"}</div>
        <a href="index.html" class="btn btn-outline">BACK TO HOME</a>
      </div>
    </div>
  `;
}

/* =========================================================================
   MEMBERS — public directory
   ========================================================================= */
function initMembersPage() {
  const grid = document.getElementById("members-grid");
  if (!grid) return;

  grid.innerHTML = Array.from({ length: 6 })
    .map(
      () =>
        `<div class="member-card"><div class="member-photo skeleton"></div><div class="member-info"><div class="skeleton" style="height:16px;width:70%;margin-bottom:8px;"></div><div class="skeleton" style="height:12px;width:50%;"></div></div></div>`,
    )
    .join("");

  apiRequest("/members")
    .then((data) => renderMembers(grid, data.members || []))
    .catch(() => {
      grid.innerHTML = `<div class="empty-state">Unable to load members right now. Please try again later.</div>`;
    });
}

function renderMembers(grid, members) {
  if (!members.length) {
    grid.innerHTML = `<div class="empty-state">No members to show yet. Be the first to <a href="join.html" style="color:var(--red)">join Club 37</a>.</div>`;
    return;
  }

  grid.innerHTML = members
    .map((m) => {
      const photo =
        m.profilePhoto && m.profilePhoto.url
          ? `style="background-image:url('${escapeHtml(m.profilePhoto.url)}')"`
          : "";
      const initial = (m.name || "?").trim().charAt(0).toUpperCase();
      return `
        <div class="member-card">
          <div class="member-photo" ${photo}>
            ${!m.profilePhoto || !m.profilePhoto.url ? `<span class="placeholder-initial">${initial}</span>` : ""}
          </div>
          <div class="member-info">
            <h3>${escapeHtml(m.name)}</h3>
            <div class="member-bike">${escapeHtml(m.motorcycle)} · ${escapeHtml(m.bikeModel)}</div>
            <div class="member-city">${escapeHtml(m.city)}</div>
            <div class="member-meta">
              <span class="insta">${m.instagram ? "@" + escapeHtml(m.instagram) : ""}</span>
              <span class="mid">${escapeHtml(m.memberId)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/* =========================================================================
   ADMIN LOGIN
   ========================================================================= */
function initAdminLoginPage() {
  const form = document.getElementById("admin-login-form");
  if (!form) return;

  const alertBox = document.getElementById("login-alert");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.classList.remove("show", "error");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Signing in…';

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      await apiRequest("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "admin.html";
    } catch (err) {
      alertBox.textContent = err.message || "Unauthorized access.";
      alertBox.classList.add("show", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "SIGN IN";
    }
  });
}

/* =========================================================================
   ADMIN DASHBOARD
   ========================================================================= */
function initAdminDashboard() {
  const shell = document.getElementById("admin-dashboard");
  if (!shell) return;

  let currentTab = "PENDING";
  const tabButtons = document.querySelectorAll(".tab-btn");
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  const listEl = document.getElementById("applications-list");
  const membersTableBody = document.getElementById("members-table-body");
  const logoutBtn = document.getElementById("logout-btn");

  // Guard: verify the session before rendering anything sensitive.
  apiRequest("/admin/me")
    .then((data) => {
      const nameEl = document.getElementById("admin-email");
      if (nameEl) nameEl.textContent = data.admin.email;
      loadStats();
      loadApplications(currentTab);
      loadMembers();
    })
    .catch(() => {
      window.location.href = "admin-login.html";
    });

  logoutBtn &&
    logoutBtn.addEventListener("click", async () => {
      try {
        await apiRequest("/admin/logout", { method: "POST" });
      } finally {
        window.location.href = "admin-login.html";
      }
    });

  function activateTab(tab) {
    currentTab = tab;
    tabButtons.forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === tab),
    );
    sidebarLinks.forEach((b) =>
      b.classList.toggle("active", b.dataset.gotoTab === tab),
    );
    document.getElementById("members-panel").style.display =
      tab === "MEMBERS" ? "block" : "none";
    document.getElementById("applications-panel").style.display =
      tab === "MEMBERS" ? "none" : "block";
    if (tab !== "MEMBERS") loadApplications(tab);
  }

  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => activateTab(btn.dataset.tab)),
  );
  sidebarLinks.forEach((btn) =>
    btn.addEventListener("click", () => activateTab(btn.dataset.gotoTab)),
  );

  async function loadStats() {
    try {
      const { stats } = await apiRequest("/admin/stats");
      setStat("stat-pending", stats.pending);
      setStat("stat-approved", stats.approved);
      setStat("stat-rejected", stats.rejected);
      setStat("stat-total", stats.totalMembers);
    } catch (err) {
      showToast("Unable to load statistics.", "error");
    }
  }

  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  async function loadApplications(status) {
    listEl.innerHTML =
      `<div class="skeleton" style="height:120px;margin-bottom:16px;"></div>`.repeat(
        3,
      );
    try {
      const { applications } = await apiRequest(
        `/admin/applications?status=${status}`,
      );
      renderApplications(applications);
    } catch (err) {
      listEl.innerHTML = `<div class="empty-state">Unable to load applications.</div>`;
    }
  }

  function renderApplications(apps) {
    if (!apps.length) {
      listEl.innerHTML = `<div class="empty-state">No ${currentTab.toLowerCase()} applications.</div>`;
      return;
    }

    listEl.innerHTML = apps
      .map((a) => {
        const photo =
          a.profilePhoto && a.profilePhoto.url
            ? `style="background-image:url('${escapeHtml(a.profilePhoto.url)}');background-size:cover;"`
            : "";
        const initial = (a.name || "?").charAt(0).toUpperCase();
        const actions =
          a.status === "PENDING"
            ? `<button class="btn btn-success btn-block" data-action="approve" data-id="${a.applicationId}">APPROVE</button>
               <button class="btn btn-danger btn-block" data-action="reject" data-id="${a.applicationId}">REJECT</button>`
            : `<span class="badge ${a.status}">${a.status}</span>`;

        return `
          <div class="app-card">
            <div class="photo" ${photo}>${!a.profilePhoto || !a.profilePhoto.url ? initial : ""}</div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <h3 style="text-transform:none;font-family:var(--font-body);font-weight:700;font-size:1.05rem;">${escapeHtml(a.name)}</h3>
                <span class="badge ${a.status}">${a.status}</span>
              </div>
              <div class="app-detail-grid">
                <div>Age: <strong>${escapeHtml(a.age)}</strong></div>
                <div>City: <strong>${escapeHtml(a.city)}</strong></div>
                <div>Phone: <strong>${escapeHtml(a.phone)}</strong></div>
                <div>Instagram: <strong>${a.instagram ? "@" + escapeHtml(a.instagram) : "—"}</strong></div>
                <div>Motorcycle: <strong>${escapeHtml(a.motorcycle)}</strong></div>
                <div>Model: <strong>${escapeHtml(a.bikeModel)}</strong></div>
                <div>Experience: <strong>${escapeHtml(a.experience)}</strong></div>
                <div>Application ID: <strong>${escapeHtml(a.applicationId)}</strong></div>
                <div>Submitted: <strong>${new Date(a.createdAt).toLocaleDateString()}</strong></div>
              </div>
              <div class="app-reason">${escapeHtml(a.reason)}</div>
            </div>
            <div class="app-actions">${actions}</div>
          </div>
        `;
      })
      .join("");
  }

  listEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      await apiRequest(`/admin/applications/${id}/${action}`, {
        method: "POST",
      });
      showToast(
        action === "approve"
          ? "Application approved."
          : "Application rejected.",
      );
      loadStats();
      loadApplications(currentTab);
      loadMembers();
    } catch (err) {
      showToast(err.message || "Action failed.", "error");
      loadApplications(currentTab);
    }
  });

  async function loadMembers() {
    if (!membersTableBody) return;
    try {
      const { members } = await apiRequest("/admin/members");
      renderMembersTable(members);
    } catch (err) {
      membersTableBody.innerHTML = `<tr><td colspan="7">Unable to load members.</td></tr>`;
    }
  }

  function renderMembersTable(members) {
    if (!members.length) {
      membersTableBody.innerHTML = `<tr><td colspan="7">No members yet.</td></tr>`;
      return;
    }

    membersTableBody.innerHTML = members
      .map(
        (m) => `
        <tr>
          <td>${escapeHtml(m.memberId)}</td>
          <td>${escapeHtml(m.name)}</td>
          <td>${escapeHtml(m.city)}</td>
          <td>${escapeHtml(m.motorcycle)} / ${escapeHtml(m.bikeModel)}</td>
          <td><span class="badge ${m.status}">${m.status}</span></td>
          <td>${new Date(m.joinedDate).toLocaleDateString()}</td>
          <td>
            ${
              m.status === "ACTIVE"
                ? `<button class="btn btn-outline" data-member-action="remove" data-mid="${m.memberId}">Remove</button>`
                : `<button class="btn btn-outline" data-member-action="restore" data-mid="${m.memberId}">Restore</button>`
            }
          </td>
        </tr>
      `,
      )
      .join("");
  }

  membersTableBody &&
    membersTableBody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-member-action]");
      if (!btn) return;
      const { memberAction, mid } = btn.dataset;
      const newStatus = memberAction === "remove" ? "REMOVED" : "ACTIVE";

      try {
        await apiRequest(`/admin/members/${mid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        showToast("Member updated.");
        loadMembers();
        loadStats();
      } catch (err) {
        showToast(err.message || "Unable to update member.", "error");
      }
    });
}
