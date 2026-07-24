/* ==========================================================================
   PASSWORD STRENGTH ANALYZER — JAVASCRIPT
   All logic for live analysis, scoring, crack-time estimation,
   password generation, copy-to-clipboard and reset functionality.
   ========================================================================== */

/* --------------------------------------------------------------------
   1. GRAB DOM ELEMENTS
   -------------------------------------------------------------------- */
const passwordInput   = document.getElementById('passwordInput');
const toggleVisibility = document.getElementById('toggleVisibility');
const eyeIcon          = document.getElementById('eyeIcon');

const progressFill    = document.getElementById('progressFill');
const strengthText    = document.getElementById('strengthText');

const scoreNumber     = document.getElementById('scoreNumber');
const ringProgress    = document.getElementById('ringProgress');
const ratingBadge     = document.getElementById('ratingBadge');
const crackTime       = document.getElementById('crackTime');

const rulesList       = document.getElementById('rulesList');
const suggestionsList = document.getElementById('suggestionsList');

const generateBtn     = document.getElementById('generateBtn');
const copyBtn         = document.getElementById('copyBtn');
const resetBtn        = document.getElementById('resetBtn');
const copyToast       = document.getElementById('copyToast');

const scoreCard       = document.querySelector('.score-card');

/* --------------------------------------------------------------------
   2. CONSTANTS
   -------------------------------------------------------------------- */
// Circle circumference for the SVG ring (2 * PI * r), r = 60
const RING_CIRCUMFERENCE = 2 * Math.PI * 60;

// Character sets used for password generation
const CHAR_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

/* --------------------------------------------------------------------
   3. INITIALIZE RING (set initial dash values)
   -------------------------------------------------------------------- */
ringProgress.style.strokeDasharray = RING_CIRCUMFERENCE;
ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE;

/* --------------------------------------------------------------------
   4. RULE CHECK FUNCTIONS
   Each function returns true/false whether the password passes the rule.
   -------------------------------------------------------------------- */
function checkLength(password) {
  return password.length >= 8;
}

function checkUppercase(password) {
  return /[A-Z]/.test(password);
}

function checkLowercase(password) {
  return /[a-z]/.test(password);
}

function checkNumber(password) {
  return /[0-9]/.test(password);
}

function checkSpecialChar(password) {
  return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
}

function checkNoSpaces(password) {
  // Passes the rule if there are NO spaces and password is not empty
  return password.length > 0 && !/\s/.test(password);
}

/* --------------------------------------------------------------------
   5. UPDATE THE LIVE RULES CHECKLIST (green tick / red cross)
   -------------------------------------------------------------------- */
function updateRulesChecklist(password) {
  const rules = {
    length: checkLength(password),
    uppercase: checkUppercase(password),
    lowercase: checkLowercase(password),
    number: checkNumber(password),
    special: checkSpecialChar(password),
    space: checkNoSpaces(password)
  };

  // Loop through each rule item in the DOM and update icon + style
  Object.keys(rules).forEach((ruleKey) => {
    const listItem = rulesList.querySelector(`[data-rule="${ruleKey}"]`);
    const icon = listItem.querySelector('.rule-icon');

    if (rules[ruleKey]) {
      listItem.classList.add('valid');
      icon.textContent = '✓';
    } else {
      listItem.classList.remove('valid');
      icon.textContent = '✕';
    }
  });

  return rules;
}

/* --------------------------------------------------------------------
   6. CALCULATE SECURITY SCORE (0 - 100)
   Scoring breakdown:
   - Length contributes up to 40 points
   - Character variety (upper/lower/number/special) contributes up to 40 points
   - Bonus points for extra length and no spaces
   -------------------------------------------------------------------- */
function calculateScore(password, rules) {
  if (password.length === 0) return 0;

  let score = 0;

  // Length scoring (max 40 points)
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // Variety scoring (max 40 points, 10 each)
  if (rules.uppercase) score += 10;
  if (rules.lowercase) score += 10;
  if (rules.number) score += 10;
  if (rules.special) score += 10;

  // Bonus points (max 20 points)
  if (rules.space) score += 10; // no spaces used
  if (password.length >= 10 && rules.uppercase && rules.number && rules.special) {
    score += 10; // combo bonus for strong mixed password
  }

  // Penalty for very short passwords even if they pass some rules
  if (password.length < 6) {
    score = Math.min(score, 20);
  }

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/* --------------------------------------------------------------------
   7. DETERMINE STRENGTH LEVEL FROM SCORE
   -------------------------------------------------------------------- */
function getStrengthLevel(score, password) {
  if (password.length === 0) {
    return { level: 'none', label: '—', className: '' };
  }
  if (score < 20) {
    return { level: 'very-weak', label: 'Very Weak', className: 'very-weak' };
  } else if (score < 40) {
    return { level: 'weak', label: 'Weak', className: 'weak' };
  } else if (score < 60) {
    return { level: 'medium', label: 'Medium', className: 'medium' };
  } else if (score < 85) {
    return { level: 'strong', label: 'Strong', className: 'strong' };
  } else {
    return { level: 'very-strong', label: 'Very Strong', className: 'very-strong' };
  }
}

/* --------------------------------------------------------------------
   8. ESTIMATE CRACK TIME BASED ON STRENGTH LEVEL
   -------------------------------------------------------------------- */
function estimateCrackTime(level) {
  const crackTimes = {
    'none': '—',
    'very-weak': 'Instantly',
    'weak': 'Few Minutes',
    'medium': 'Few Days',
    'strong': 'Several Years',
    'very-strong': 'Centuries'
  };
  return crackTimes[level] || '—';
}

/* --------------------------------------------------------------------
   9. GENERATE SUGGESTIONS BASED ON FAILED RULES
   -------------------------------------------------------------------- */
function generateSuggestions(password, rules, score) {
  suggestionsList.innerHTML = ''; // clear old suggestions

  if (password.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Start typing a password to see suggestions.';
    suggestionsList.appendChild(li);
    return;
  }

  const suggestions = [];

  if (!rules.length) suggestions.push('Increase length to at least 8 characters');
  if (password.length < 12 && rules.length) suggestions.push('Use 12+ characters for stronger protection');
  if (!rules.uppercase) suggestions.push('Add at least one uppercase letter');
  if (!rules.lowercase) suggestions.push('Add at least one lowercase letter');
  if (!rules.number) suggestions.push('Add at least one number');
  if (!rules.special) suggestions.push('Add a special symbol (!@#$%)');
  if (!rules.space) suggestions.push('Remove spaces from your password');
  suggestions.push('Avoid common dictionary words or names');
  suggestions.push('Avoid predictable patterns like "1234" or "qwerty"');

  // If score is already very high, show a positive message instead
  if (score >= 85) {
    const li = document.createElement('li');
    li.className = 'good';
    li.textContent = 'Excellent! Your password meets all security best practices.';
    suggestionsList.appendChild(li);
    return;
  }

  // Display up to 5 relevant suggestions
  suggestions.slice(0, 5).forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    suggestionsList.appendChild(li);
  });
}

/* --------------------------------------------------------------------
   10. UPDATE VISUAL METER, RING, SCORE, RATING AND CRACK TIME
   -------------------------------------------------------------------- */
function updateVisuals(score, strength) {
  // Update progress bar width
  progressFill.style.width = score + '%';

  // Update strength text label
  strengthText.textContent = strength.label;

  // Update score number
  scoreNumber.textContent = score;

  // Update ring progress (stroke-dashoffset decreases as score increases)
  const offset = RING_CIRCUMFERENCE - (score / 100) * RING_CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = offset;

  // Update rating badge text
  ratingBadge.textContent = strength.level === 'none' ? 'No Password' : strength.label;

  // Update crack time display
  crackTime.textContent = estimateCrackTime(strength.level);

  // Remove all strength color classes, then apply the current one
  const allLevels = ['very-weak', 'weak', 'medium', 'strong', 'very-strong'];
  allLevels.forEach((cls) => {
    progressFill.classList.remove(cls);
    scoreCard.classList.remove(cls);
    document.body.classList.remove(cls);
  });

  if (strength.className) {
    progressFill.classList.add(strength.className);
    scoreCard.classList.add(strength.className);
    document.body.classList.add(strength.className);
  }

  // Update rating badge background/color to match strength
  updateRatingBadgeStyle(strength.level);
}

/* --------------------------------------------------------------------
   11. STYLE THE RATING BADGE DYNAMICALLY BASED ON STRENGTH LEVEL
   -------------------------------------------------------------------- */
function updateRatingBadgeStyle(level) {
  const colors = {
    'none': { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', text: '#94a3b8' },
    'very-weak': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#ef4444' },
    'weak': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
    'medium': { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', text: '#eab308' },
    'strong': { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', text: '#22c55e' },
    'very-strong': { bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.35)', text: '#22d3ee' }
  };

  const style = colors[level] || colors['none'];
  ratingBadge.style.background = style.bg;
  ratingBadge.style.borderColor = style.border;
  ratingBadge.style.color = style.text;
}

/* --------------------------------------------------------------------
   12. MAIN ANALYSIS FUNCTION — runs every time user types
   -------------------------------------------------------------------- */
function analyzePassword() {
  const password = passwordInput.value;

  // Step 1: Check all rules and update checklist UI
  const rules = updateRulesChecklist(password);

  // Step 2: Calculate score
  const score = calculateScore(password, rules);

  // Step 3: Determine strength level
  const strength = getStrengthLevel(score, password);

  // Step 4: Update all visuals (meter, ring, badge, crack time)
  updateVisuals(score, strength);

  // Step 5: Generate helpful suggestions
  generateSuggestions(password, rules, score);
}

/* --------------------------------------------------------------------
   13. TOGGLE PASSWORD VISIBILITY (Show / Hide)
   -------------------------------------------------------------------- */
function togglePasswordVisibility() {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';

  // Swap the eye icon to reflect state (open eye vs crossed-out eye)
  if (isPassword) {
    eyeIcon.innerHTML = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.7 19.7 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.7 19.7 0 0 1-4.22 5.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>';
  } else {
    eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  }
}

/* --------------------------------------------------------------------
   14. GENERATE A STRONG RANDOM PASSWORD (16 characters)
   Guarantees at least one character from each set for real strength.
   -------------------------------------------------------------------- */
function generateStrongPassword(length = 16) {
  const allChars = CHAR_SETS.upper + CHAR_SETS.lower + CHAR_SETS.numbers + CHAR_SETS.symbols;
  let passwordChars = [];

  // Guarantee one character from each required category
  passwordChars.push(getRandomChar(CHAR_SETS.upper));
  passwordChars.push(getRandomChar(CHAR_SETS.lower));
  passwordChars.push(getRandomChar(CHAR_SETS.numbers));
  passwordChars.push(getRandomChar(CHAR_SETS.symbols));

  // Fill the rest of the password randomly from all character sets
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(getRandomChar(allChars));
  }

  // Shuffle the array so guaranteed characters aren't always at the start
  passwordChars = shuffleArray(passwordChars);

  return passwordChars.join('');
}

// Helper: pick one random character from a given string
function getRandomChar(charSet) {
  const randomIndex = Math.floor(Math.random() * charSet.length);
  return charSet[randomIndex];
}

// Helper: shuffle an array using the Fisher-Yates algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* --------------------------------------------------------------------
   15. COPY PASSWORD TO CLIPBOARD
   -------------------------------------------------------------------- */
function copyPasswordToClipboard() {
  const password = passwordInput.value;

  if (password.length === 0) {
    // Shake the input to indicate nothing to copy
    passwordInput.classList.add('shake');
    setTimeout(() => passwordInput.classList.remove('shake'), 400);
    return;
  }

  // Use the Clipboard API to copy text
  navigator.clipboard.writeText(password).then(() => {
    showCopyToast();
  }).catch(() => {
    // Fallback method for older browsers
    passwordInput.select();
    document.execCommand('copy');
    showCopyToast();
  });
}

// Show the "Copied Successfully" toast message briefly
function showCopyToast() {
  copyToast.classList.add('show');
  setTimeout(() => {
    copyToast.classList.remove('show');
  }, 2000);
}

/* --------------------------------------------------------------------
   16. RESET EVERYTHING
   -------------------------------------------------------------------- */
function resetAnalyzer() {
  passwordInput.value = '';
  passwordInput.type = 'password';
  eyeIcon.innerHTML = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>';
  analyzePassword();
  passwordInput.focus();
}

/* --------------------------------------------------------------------
   17. EVENT LISTENERS
   -------------------------------------------------------------------- */

// Live analysis as the user types
passwordInput.addEventListener('input', analyzePassword);

// Toggle show/hide password
toggleVisibility.addEventListener('click', togglePasswordVisibility);

// Generate a new strong password and fill the input
generateBtn.addEventListener('click', () => {
  const newPassword = generateStrongPassword(16);
  passwordInput.value = newPassword;
  passwordInput.type = 'text'; // reveal generated password automatically
  eyeIcon.innerHTML = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.7 19.7 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.7 19.7 0 0 1-4.22 5.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>';
  analyzePassword();
});

// Copy current password to clipboard
copyBtn.addEventListener('click', copyPasswordToClipboard);

// Reset the entire form
resetBtn.addEventListener('click', resetAnalyzer);

/* --------------------------------------------------------------------
   18. INITIAL RUN ON PAGE LOAD
   -------------------------------------------------------------------- */
analyzePassword();