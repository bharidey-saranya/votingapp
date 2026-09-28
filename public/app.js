/**
 * CivicVote Frontend Application Logic
 * Single Page Application interacting with Express & MongoDB Backend
 */

const API_BASE = window.location.origin;

const state = {
  token: localStorage.getItem('civicvote_token') ||
    null,
  user: null,
  candidates: [],
  voteResults: [],
  activeTab: 'voting',
  selectedCandidateForVote: null
};

// ============================================================================
// Core Application Object
// ============================================================================
const app = {

  /**
   * Initialize Application
   */
  async init() {
    this.setupEventListeners();

    if (state.token) {
      const userLoaded = await this.loadUserProfile();
      if (userLoaded) {
        await Promise.all([this.loadCandidates(), this.loadResults()]);
      } else {
        this.logout();
      }
    } else {
      this.updateUIForLoggedOut();
    }
  },

  /**
   * Setup Navigation and Tab Listeners
   */
  setupEventListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');
        this.switchTab(target);
      });
    });
  },

  /**
   * Switch Active Content Tab
   */
  switchTab(tabName) {
    state.activeTab = tabName;

    // Update Tab Buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update Panes
    const panes = ['voting', 'results', 'admin', 'profile'];
    panes.forEach(pane => {
      const el = document.getElementById(`pane-${pane}`);
      if (el) {
        el.style.display = pane === tabName ? 'block' : 'none';
      }
    });

    // Refresh data if needed
    if (tabName === 'results') {
      this.loadResults();
    } else if (tabName === 'voting') {
      this.loadCandidates();
    } else if (tabName === 'admin') {
      this.renderAdminTable();
    }
  },

  /**
   * Authenticated Fetch Helper
   */
  async apiRequest(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${endpoint}]:`, err);
      throw err;
    }
  },

  // ==========================================================================
  // Authentication & Profile
  // ==========================================================================

  /**
   * Load Logged-in User Profile
   */
  async loadUserProfile() {
    try {
      const user = await this.apiRequest('/user/profile');
      state.user = user;
      this.updateUIForLoggedIn(user);
      return true;
    } catch (err) {
      console.warn('Failed to load user profile with current token:', err.message);
      return false;
    }
  },

  /**
   * Update UI for Logged-In User
   */
  updateUIForLoggedIn(user) {
    document.getElementById('auth-prompt-banner').style.display = 'none';
    document.getElementById('btn-open-auth').style.display = 'none';
    document.getElementById('user-chip').style.display = 'flex';
    document.getElementById('nav-tabs').style.display = 'flex';

    // Set User info in Nav
    document.getElementById('nav-user-name').textContent = user.name || 'Voter';
    document.getElementById('nav-user-avatar').textContent = (user.name || 'U').charAt(0).toUpperCase();
    document.getElementById('nav-user-role').textContent = user.role || 'Voter';

    // Show Admin tab only if admin
    const isAdmin = user.role === 'admin';
    const adminTab = document.getElementById('tab-btn-admin');
    if (adminTab) {
      adminTab.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    // Update Quick Stats
    const statusEl = document.getElementById('stat-user-status');
    const indicatorText = document.getElementById('voter-status-text');
    const indicatorCircle = document.querySelector('#voter-status-indicator .status-circle');

    if (isAdmin) {
      statusEl.textContent = 'Administrator';
      indicatorText.textContent = 'Administrator Account (Ballot Locked)';
      indicatorCircle.className = 'status-circle status-admin';
    } else if (user.isVoted) {
      statusEl.textContent = 'Voted ✓';
      indicatorText.textContent = 'Ballot Cast Successfully';
      indicatorCircle.className = 'status-circle status-voted';
    } else {
      statusEl.textContent = 'Eligible to Vote';
      indicatorText.textContent = 'Ballot Ready: Please Cast Your Vote';
      indicatorCircle.className = 'status-circle status-pending';
    }

    // Populate Profile Tab
    document.getElementById('profile-name').textContent = user.name || '—';
    document.getElementById('profile-role').textContent = user.role || 'Voter';
    document.getElementById('profile-email').textContent = user.email || 'None provided';
    document.getElementById('profile-mobile').textContent = user.mobile || 'None provided';
    document.getElementById('profile-age').textContent = user.age ? `${user.age} years` : '—';

    // Masked Aadhar for Privacy
    const aadhar = user.aadharCardNumber || '';
    if (aadhar.length === 12) {
      document.getElementById('profile-aadhar').textContent = `•••• •••• ${aadhar.slice(8)}`;
    } else {
      document.getElementById('profile-aadhar').textContent = aadhar || '—';
    }

    const voteBadge = document.getElementById('profile-vote-status');
    if (user.isVoted) {
      voteBadge.textContent = 'Ballot Cast';
      voteBadge.className = 'field-value badge-pill badge-active';
    } else {
      voteBadge.textContent = 'Not Voted';
      voteBadge.className = 'field-value badge-pill badge-voted';
    }

    // Show initial tab
    this.switchTab('voting');
  },

  /**
   * Update UI for Logged-Out Guest
   */
  updateUIForLoggedOut() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('civicvote_token');

    document.getElementById('auth-prompt-banner').style.display = 'flex';
    document.getElementById('btn-open-auth').style.display = 'inline-flex';
    document.getElementById('user-chip').style.display = 'none';
    document.getElementById('nav-tabs').style.display = 'none';

    document.getElementById('stat-user-status').textContent = 'Not Logged In';

    // Hide all main tab panes
    ['voting', 'results', 'admin', 'profile'].forEach(pane => {
      const el = document.getElementById(`pane-${pane}`);
      if (el) el.style.display = 'none';
    });
  },

  /**
   * Handle Login Submit
   */
  async handleLogin(e) {
    e.preventDefault();
    const aadhar = document.getElementById('login-aadhar').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('btn-login-submit');

    if (!/^\d{12}$/.test(aadhar)) {
      this.showToast('Aadhar Card Number must be exactly 12 digits', 'warning');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      const data = await this.apiRequest('/user/login', {
        method: 'POST',
        body: JSON.stringify({ aadharCardNumber: aadhar, password })
      });

      state.token = data.token;
      localStorage.setItem('civicvote_token', data.token);

      this.showToast('Login successful! Welcome back.', 'success');
      this.closeAuthModal();

      await this.loadUserProfile();
      await Promise.all([this.loadCandidates(), this.loadResults()]);

    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In to Vote';
    }
  },

  /**
   * Handle Signup Submit
   */
  async handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const age = parseInt(document.getElementById('signup-age').value, 10);
    const email = document.getElementById('signup-email').value.trim();
    const mobile = document.getElementById('signup-mobile').value.trim();
    const aadhar = document.getElementById('signup-aadhar').value.trim();
    const password = document.getElementById('signup-password').value;
    const role = document.getElementById('signup-role').value;
    const submitBtn = document.getElementById('btn-signup-submit');

    if (!/^\d{12}$/.test(aadhar)) {
      this.showToast('Aadhar Card Number must be exactly 12 digits', 'warning');
      return;
    }

    const passwordallowed = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%@!&#*.])[A-Za-z\d%@!&#*.]{6,}$/;
    if (!passwordallowed.test(password)) {
      this.showToast('Password must meet security requirements (Upper, Lower, Number, Special)', 'warning');
      return;
    }

    const payload = {
      name,
      age,
      aadharCardNumber: aadhar,
      password,
      role
    };
    if (email) payload.email = email;
    if (mobile) payload.mobile = mobile;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering Voter...';

      const data = await this.apiRequest('/user/signup', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      state.token = data.token;
      localStorage.setItem('civicvote_token', data.token);

      this.showToast('Registration successful! You are now logged in.', 'success');
      this.closeAuthModal();

      await this.loadUserProfile();
      await Promise.all([this.loadCandidates(), this.loadResults()]);

    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Registration & Sign In';
    }
  },

  /**
   * Logout
   */
  logout() {
    this.updateUIForLoggedOut();
    this.showToast('You have been logged out securely.', 'info');
  },

  /**
   * Handle Password Change
   */
  async handleUpdatePassword(e) {
    e.preventDefault();
    if (!state.user) {
      this.showToast('Please log in first', 'error');
      return;
    }

    const currentpswd = document.getElementById('pswd-current').value;
    const newpassword = document.getElementById('pswd-new').value;
    const confirmpswd = document.getElementById('pswd-confirm').value;
    const submitBtn = document.getElementById('btn-submit-pswd');

    if (currentpswd === newpassword) {
      this.showToast('New password cannot be the same as current password', 'warning');
      return;
    }

    if (newpassword !== confirmpswd) {
      this.showToast('New password and confirm password do not match', 'warning');
      return;
    }

    const passwordallowed = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%@!&#*.])[A-Za-z\d%@!&#*.]{6,}$/;
    if (!passwordallowed.test(newpassword)) {
      this.showToast('Password does not meet complexity requirements', 'warning');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating...';

      await this.apiRequest('/user/updatepswd', {
        method: 'PUT',
        body: JSON.stringify({
          userid: state.user._id,
          currentpswd,
          newpassword,
          confirmpswd
        })
      });

      this.showToast('Password updated successfully! Keep your credentials safe.', 'success');
      document.getElementById('form-update-password').reset();

    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  },

  // ==========================================================================
  // Candidates & Voting
  // ==========================================================================

  /**
   * Load Candidate List
   */
  async loadCandidates() {
    if (!state.token) return;

    try {
      const data = await this.apiRequest('/candidate/candidatelist');
      state.candidates = data.candidatelist || [];

      // Update Stat
      const activeCount = state.candidates.filter(c => c.isactive !== false).length;
      document.getElementById('stat-candidates-count').textContent = activeCount;

      this.renderCandidateCards();
    } catch (err) {
      console.error('Failed to load candidate list:', err);
    }
  },

  /**
   * Render Candidate Grid
   */
  renderCandidateCards() {
    const container = document.getElementById('candidates-container');
    if (!container) return;

    if (!state.candidates || state.candidates.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No registered candidates on the ballot yet.</p>
          ${state.user?.role === 'admin' ? '<button class="btn btn-primary btn-sm" onclick="app.openCandidateModal()">Add Candidate Now</button>' : ''}
        </div>
      `;
      return;
    }

    const hasVoted = state.user?.isVoted === true;
    const isAdmin = state.user?.role === 'admin';

    container.innerHTML = state.candidates.map(candidate => {
      const isInactive = candidate.isactive === false;

      let buttonHtml = '';
      if (isAdmin) {
        buttonHtml = `<button class="btn btn-secondary btn-sm" disabled>Admins Cannot Vote</button>`;
      } else if (hasVoted) {
        buttonHtml = `<button class="btn btn-secondary btn-sm" disabled>Ballot Cast ✓</button>`;
      } else if (isInactive) {
        buttonHtml = `<button class="btn btn-secondary btn-sm" disabled>Candidate Inactive</button>`;
      } else {
        buttonHtml = `<button class="btn btn-emerald btn-sm" onclick="app.openVoteModal('${candidate._id}')">Vote for Candidate</button>`;
      }

      return `
        <div class="candidate-card ${isInactive ? 'opacity-50' : ''}">
          <div class="candidate-card-top">
            <div class="candidate-avatar">
              ${(candidate.name || 'C').charAt(0).toUpperCase()}
            </div>
            <div class="candidate-meta">
              <h3 class="candidate-name">${escapeHtml(candidate.name)}</h3>
              <span class="party-tag">${escapeHtml(candidate.party)}</span>
              <div class="candidate-age-badge">Age: ${candidate.age} years</div>
            </div>
          </div>

          <div class="candidate-card-bottom">
            <div class="candidate-votes-pill">
              Votes: <strong>${candidate.voteCount || 0}</strong>
            </div>
            ${buttonHtml}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Open Vote Confirmation Modal
   */
  openVoteModal(candidateId) {
    if (!state.user) {
      this.showAuthModal('login');
      return;
    }
    if (state.user.role === 'admin') {
      this.showToast('Administrators are not permitted to vote.', 'warning');
      return;
    }
    if (state.user.isVoted) {
      this.showToast('You have already cast your ballot in this election.', 'warning');
      return;
    }

    const candidate = state.candidates.find(c => c._id === candidateId);
    if (!candidate) return;

    state.selectedCandidateForVote = candidate;
    document.getElementById('confirm-candidate-name').textContent = candidate.name;
    document.getElementById('confirm-candidate-party').textContent = candidate.party;
    document.getElementById('modal-vote-confirm').style.display = 'flex';
  },

  /**
   * Close Vote Modal
   */
  closeVoteModal() {
    state.selectedCandidateForVote = null;
    document.getElementById('modal-vote-confirm').style.display = 'none';
  },

  /**
   * Submit Vote to Backend
   */
  async executeVote() {
    if (!state.selectedCandidateForVote) return;
    const candidateId = state.selectedCandidateForVote._id;
    const submitBtn = document.getElementById('btn-confirm-vote-submit');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Encrypting & Casting Ballot...';

      await this.apiRequest(`/candidate/vote/${candidateId}`, {
        method: 'POST'
      });

      this.showToast('Your vote has been officially cast and recorded!', 'success');
      this.closeVoteModal();

      // Update local user status
      if (state.user) {
        state.user.isVoted = true;
        this.updateUIForLoggedIn(state.user);
      }

      await Promise.all([this.loadCandidates(), this.loadResults()]);

    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm & Cast Vote';
    }
  },

  // ==========================================================================
  // Results & Leaderboard
  // ==========================================================================

  /**
   * Load Live Election Results
   */
  async loadResults(isManualRefresh = false) {
    if (!state.token) return;

    try {
      const data = await this.apiRequest('/candidate/votecount');
      state.voteResults = data.voterecord || [];

      // Calculate total votes across all candidates
      const totalVotes = state.voteResults.reduce((sum, item) => sum + (item.voteCount || 0), 0);
      document.getElementById('stat-total-votes').textContent = totalVotes;

      this.renderResultsTable(totalVotes);

      if (isManualRefresh) {
        this.showToast('Election results refreshed.', 'info');
      }
    } catch (err) {
      console.error('Failed to load vote count telemetry:', err);
    }
  },

  /**
   * Render Results Leaderboard Table
   */
  renderResultsTable(totalVotes) {
    const tbody = document.getElementById('results-table-body');
    if (!tbody) return;

    if (!state.voteResults || state.voteResults.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            No votes recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.voteResults.map((item, idx) => {
      const votes = item.voteCount || 0;
      const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
      const rank = idx + 1;

      let rankBadgeClass = 'rank-normal';
      if (rank === 1) rankBadgeClass = 'rank-1';
      else if (rank === 2) rankBadgeClass = 'rank-2';
      else if (rank === 3) rankBadgeClass = 'rank-3';

      return `
        <tr>
          <td style="width: 70px;">
            <span class="rank-badge ${rankBadgeClass}">${rank}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 1.05rem;">
              ${escapeHtml(item.name)}
            </div>
            <span class="party-tag">${escapeHtml(item.party)}</span>
          </td>
          <td style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700;">
            ${votes.toLocaleString()} <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">votes</span>
          </td>
          <td>
            <div class="vote-progress-wrapper">
              <div class="vote-progress-bar">
                <div class="vote-progress-fill" style="width: ${percentage}%;"></div>
              </div>
              <span class="vote-progress-pct">${percentage}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // ==========================================================================
  // Admin Management
  // ==========================================================================

  /**
   * Render Admin Management Table
   */
  renderAdminTable() {
    const tbody = document.getElementById('admin-candidates-table-body');
    if (!tbody) return;

    if (!state.candidates || state.candidates.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No candidates registered. Click "Add New Candidate" above.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.candidates.map(candidate => {
      const isactive = candidate.isactive !== false;

      return `
        <tr>
          <td style="font-weight: 600;">${escapeHtml(candidate.name)}</td>
          <td><span class="party-tag">${escapeHtml(candidate.party)}</span></td>
          <td>${candidate.age} yrs</td>
          <td style="font-weight: 700;">${candidate.voteCount || 0}</td>
          <td>
            <span class="badge-pill ${isactive ? 'badge-active' : 'badge-inactive'}">
              ${isactive ? 'Active' : 'Disabled'}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="app.openCandidateModal('${candidate._id}')">
                Edit
              </button>
              <button class="btn btn-secondary btn-sm" onclick="app.toggleCandidateStatus('${candidate._id}', ${!isactive})">
                ${isactive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Open Candidate Modal (Add or Edit)
   */
  openCandidateModal(candidateId = null) {
    const modal = document.getElementById('modal-candidate');
    const title = document.getElementById('candidate-modal-title');
    const form = document.getElementById('form-candidate');
    form.reset();

    if (candidateId) {
      const c = state.candidates.find(item => item._id === candidateId);
      if (!c) return;
      title.textContent = 'Edit Candidate Details';
      document.getElementById('candidate-id').value = c._id;
      document.getElementById('candidate-name').value = c.name;
      document.getElementById('candidate-party').value = c.party;
      document.getElementById('candidate-age').value = c.age;
    } else {
      title.textContent = 'Add New Candidate';
      document.getElementById('candidate-id').value = '';
    }

    modal.style.display = 'flex';
  },

  /**
   * Close Candidate Modal
   */
  closeCandidateModal() {
    document.getElementById('modal-candidate').style.display = 'none';
  },

  /**
   * Save Candidate (Create or Update)
   */
  async handleSaveCandidate(e) {
    e.preventDefault();
    const id = document.getElementById('candidate-id').value;
    const name = document.getElementById('candidate-name').value.trim();
    const party = document.getElementById('candidate-party').value.trim();
    const age = parseInt(document.getElementById('candidate-age').value, 10);
    const submitBtn = document.getElementById('btn-save-candidate');

    const payload = { name, party, age };

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      if (id) {
        // Update candidate
        await this.apiRequest(`/candidate/updatecandidate/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        this.showToast('Candidate updated successfully.', 'success');
      } else {
        // Create candidate
        await this.apiRequest('/candidate/createcandidate', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        this.showToast('Candidate added to ballot successfully.', 'success');
      }

      this.closeCandidateModal();
      await this.loadCandidates();
      this.renderAdminTable();
      await this.loadResults();

    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Candidate';
    }
  },

  /**
   * Toggle Candidate Active Status
   */
  async toggleCandidateStatus(candidateId, newStatus) {
    try {
      await this.apiRequest(`/candidate/candidate_status/${candidateId}`, {
        method: 'PUT',
        body: JSON.stringify({ isactive: newStatus })
      });

      this.showToast(`Candidate marked as ${newStatus ? 'Active' : 'Deactivated'}.`, 'success');
      await this.loadCandidates();
      this.renderAdminTable();

    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // ==========================================================================
  // UI Helpers (Modals, Toasts, Realtime Validation)
  // ==========================================================================

  /**
   * Open Auth Modal
   */
  showAuthModal(mode = 'login') {
    this.switchAuthMode(mode);
    document.getElementById('modal-auth').style.display = 'flex';
  },

  /**
   * Close Auth Modal
   */
  closeAuthModal() {
    document.getElementById('modal-auth').style.display = 'none';
  },

  /**
   * Toggle Auth Modal Mode
   */
  switchAuthMode(mode) {
    const isLogin = mode === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-signup').classList.toggle('active', !isLogin);
    document.getElementById('form-login').style.display = isLogin ? 'block' : 'none';
    document.getElementById('form-signup').style.display = !isLogin ? 'block' : 'none';
  },

  /**
   * Password Requirements Checklist Checker (Profile update)
   */
  checkPasswordRules(val) {
    document.getElementById('rule-len').classList.toggle('valid', val.length >= 6);
    document.getElementById('rule-upper').classList.toggle('valid', /[A-Z]/.test(val));
    document.getElementById('rule-lower').classList.toggle('valid', /[a-z]/.test(val));
    document.getElementById('rule-num').classList.toggle('valid', /\d/.test(val));
    document.getElementById('rule-special').classList.toggle('valid', /[%@!&#*.]/.test(val));
  },

  /**
   * Password Requirements Checklist Checker (Signup)
   */
  checkSignupPasswordRules(val) {
    document.getElementById('signup-rule-len').classList.toggle('valid', val.length >= 6);
    document.getElementById('signup-rule-upper').classList.toggle('valid', /[A-Z]/.test(val));
    document.getElementById('signup-rule-lower').classList.toggle('valid', /[a-z]/.test(val));
    document.getElementById('signup-rule-num').classList.toggle('valid', /\d/.test(val));
    document.getElementById('signup-rule-spec').classList.toggle('valid', /[%@!&#*.]/.test(val));
  },

  /**
   * Show Toast Notification
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }
};

/**
 * Utility: HTML Escape
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  app.init();
});
