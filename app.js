/* Add floating-label enhancer for selects & date inputs */
/* Place this near the top after DOM is ready setup, or before seed() */

function initFloatingLabels() {
  // For each .field, mark as filled if its control has a value
  document.querySelectorAll('.field').forEach(field => {
    const control = field.querySelector('input, select, textarea');
    if (!control) return;

    const update = () => {
      const hasValue = !!(control.value && control.value.trim && control.value.trim().length > 0) || (!!control.value && control.value.length > 0);
      field.classList.toggle('filled', hasValue);
    };

    // Initialize
    update();

    // Events to detect changes
    control.addEventListener('input', update);
    control.addEventListener('change', update);
    control.addEventListener('blur', update);
  });
}

// Call after the initial render
initFloatingLabels();

/* If your app dynamically adds fields (e.g., Quick Add form reset), call initFloatingLabels() again after such changes. For example, after quickAddForm.reset(): */
const quickAddForm = document.getElementById('quick-add-form');
if (quickAddForm) {
  quickAddForm.addEventListener('submit', (e) => {
    // ... existing submit logic ...
    quickAddForm.reset();
    initFloatingLabels(); // re-evaluate labels after reset
  });
}

/* Also call after renderAll if forms can re-render */
const originalRenderAll = renderAll;
renderAll = function() {
  originalRenderAll();
  initFloatingLabels();
};

/* The rest of your existing app.js code remains unchanged below */
