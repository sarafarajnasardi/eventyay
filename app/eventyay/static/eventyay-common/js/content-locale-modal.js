/**
 * content-locale-modal.js
 *
 * Handles the "Proposal Submission Languages" modal on the CfP Forms page.
 *
 * Responsibilities:
 *  - Render a searchable checkbox grid inside #content-locale-language-grid
 *  - Respond to the settings link to reopen the modal when Content Locale is active
 *  - POST the selected locales to window.contentLocaleUpdateUrl on "Save languages"
 */

(function () {
    'use strict';

    /* ── Globals injected by the template ──────────────────────────── */
    var UPDATE_URL     = window.contentLocaleUpdateUrl || '';
    var FIELD_ID       = window.contentLocaleFieldId   || '';

    /* ── DOM refs ───────────────────────────────────────────────────── */
    var modal         = document.getElementById('content-locale-modal');
    var gridContainer  = document.getElementById('content-locale-language-grid');
    var saveBtn        = document.getElementById('content-locale-modal-save');
    var cancelBtn      = document.getElementById('content-locale-modal-cancel');
    var closeBtn       = document.getElementById('content-locale-modal-close');
    var errorBox       = document.getElementById('content-locale-modal-error');
    var activeToggle   = document.getElementById('content-locale-active-toggle');
    var hiddenField    = FIELD_ID ? document.getElementById(FIELD_ID) : null;

    /* ── Read data attributes ───────────────────────────────────────── */
    var allLanguages = [];
    var currentLocales = [];

    if (gridContainer) {
        try {
            allLanguages = JSON.parse(gridContainer.dataset.allLanguages || '[]');
            currentLocales = JSON.parse(gridContainer.dataset.current || '[]');
        } catch (err) {
            console.error('Could not parse content locale language data:', err);
        }
    }

    /* ── Build the language grid ────────────────────────────────────── */
    function buildGrid() {
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        var searchWrapper = document.createElement('div');
        searchWrapper.className = 'content-locale-search-wrapper';
        var searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search languages...';
        searchInput.className = 'form-control content-locale-search';
        searchInput.setAttribute('aria-label', 'Search languages');
        searchWrapper.appendChild(searchInput);
        gridContainer.appendChild(searchWrapper);

        var toolbar = document.createElement('div');
        toolbar.className = 'content-locale-toolbar';
        var deselectAll = document.createElement('button');
        deselectAll.type = 'button';
        deselectAll.className = 'btn btn-xs btn-default';
        deselectAll.textContent = 'Deselect all';
        toolbar.appendChild(deselectAll);
        gridContainer.appendChild(toolbar);

        var grid = document.createElement('div');
        grid.className = 'content-locale-grid';

        allLanguages.forEach(function (lang) {
            var label = document.createElement('label');
            label.className = 'content-locale-item';

            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = lang.code;
            cb.checked = currentLocales.indexOf(lang.code) !== -1;
            cb.setAttribute('aria-label', lang.name);

            var span = document.createElement('span');
            span.textContent = lang.name;

            label.appendChild(cb);
            label.appendChild(span);
            grid.appendChild(label);
        });

        var noResults = document.createElement('p');
        noResults.className = 'content-locale-no-results text-muted';
        noResults.style.display = 'none';
        noResults.textContent = 'No languages match your search.';
        gridContainer.appendChild(grid);
        gridContainer.appendChild(noResults);

        searchInput.addEventListener('input', function () {
            var query = searchInput.value.trim().toLowerCase();
            var visible = 0;
            grid.querySelectorAll('.content-locale-item').forEach(function (item) {
                var matches = !query || item.textContent.toLowerCase().indexOf(query) !== -1;
                item.style.display = matches ? '' : 'none';
                if (matches) visible += 1;
            });
            noResults.style.display = visible === 0 ? '' : 'none';
        });

        deselectAll.addEventListener('click', function () {
            grid.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
                cb.checked = false;
            });
        });
    }

    /* ── Helpers ────────────────────────────────────────────────────── */
    function getSelected() {
        var selected = [];
        if (!gridContainer) return selected;
        gridContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
            selected.push(cb.value);
        });
        return selected;
    }

    function setSelected(codes) {
        if (!gridContainer) return;
        var changed = null;
        gridContainer.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            var checked = codes.indexOf(cb.value) !== -1;
            if (cb.checked !== checked) changed = cb;
            cb.checked = checked;
        });
        if (changed) changed.dispatchEvent(new Event('change', {bubbles: true}));
    }

    function showError(msg) {
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.style.display = '';
    }

    function hideError() {
        if (!errorBox) return;
        errorBox.style.display = 'none';
        errorBox.textContent = '';
    }

    function showSettingsWarning() {
        window.alert('Enable Content Locale before configuring proposal submission languages.');
    }

    function hideSettingsWarning() {
    }

    /* ── Modal lifecycle ────────────────────────────────────────────── */
    function onModalShow() {
        setSelected(currentLocales);
        hideError();
        hideSettingsWarning();
    }

    function openModal() {
        onModalShow();
        if (modal && typeof modal.showModal === 'function') {
            modal.showModal();
        } else if (modal) {
            modal.setAttribute('open', 'open');
        }
    }

    function closeModal() {
        if (modal && typeof modal.close === 'function') {
            modal.close();
        } else if (modal) {
            modal.removeAttribute('open');
        }
    }

    function contentLocaleIsActive() {
        var currentToggle = document.getElementById('content-locale-active-toggle') || activeToggle;
        var currentHiddenField = FIELD_ID ? document.getElementById(FIELD_ID) : hiddenField;
        if (currentToggle) {
            return currentToggle.checked;
        }
        return currentHiddenField ? currentHiddenField.value !== 'do_not_ask' : false;
    }

    function syncHiddenFieldIfToggleIsActive() {
        var currentToggle = document.getElementById('content-locale-active-toggle') || activeToggle;
        var currentHiddenField = FIELD_ID ? document.getElementById(FIELD_ID) : hiddenField;
        if (!currentHiddenField || !currentToggle || !currentToggle.checked || currentHiddenField.value !== 'do_not_ask') {
            return;
        }
        currentHiddenField.value = 'optional';
    }

    function getCookie(name) {
        var value = '; ' + document.cookie;
        var parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
            return decodeURIComponent(parts.pop().split(';').shift());
        }
        return '';
    }

    function getCSRFToken() {
        var csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        return (
            getCookie('eventyay_csrftoken') ||
            getCookie('csrftoken') ||
            (csrfInput && csrfInput.value) ||
            ''
        );
    }

    /* ── Save logic (AJAX POST) ─────────────────────────────────────── */
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            var selected = getSelected();
            if (selected.length === 0) {
                showError('Please select at least one language.');
                return;
            }
            hideError();

            var csrfToken = getCSRFToken();
            if (!csrfToken) {
                showError('Unable to save because your security token is missing or expired. Please reload the page and try again.');
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';

            fetch(UPDATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({locales: selected}),
            })
            .then(function (resp) {
                if (resp.status === 403) {
                    throw new Error('csrf');
                }
                return resp.json().catch(function () {
                    return {};
                }).then(function (data) {
                    return {ok: resp.ok, data: data};
                });
            })
            .then(function (result) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa fa-save"></i> Save languages';

                if (!result.ok || !result.data.success) {
                    showError(result.data.error || 'An error occurred. Please try again.');
                    return;
                }

                /* Persist the new selection as the current set */
                currentLocales = result.data.content_locales || selected;

                closeModal();
            })
            .catch(function (err) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa fa-save"></i> Save languages';
                if (err && err.message === 'csrf') {
                    showError('Unable to save because your security token expired. Please reload the page and try again.');
                    return;
                }
                showError('Network error. Please try again.');
                console.error('Content locale save error:', err);
            });
        });
    }

    document.addEventListener('click', function (e) {
        var link = e.target.closest ? e.target.closest('#content-locale-settings-link') : null;
        if (!link) return;

        e.preventDefault();
        if (!contentLocaleIsActive()) {
            showSettingsWarning();
            return;
        }
        hideSettingsWarning();
        syncHiddenFieldIfToggleIsActive();
        openModal();
    }, true);

    if (activeToggle) {
        activeToggle.addEventListener('change', function () {
            if (contentLocaleIsActive()) {
                hideSettingsWarning();
            }
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModal();
        });
        modal.addEventListener('cancel', function () {
            hideError();
        });
    }

    /* ── Build the grid on load ─────────────────────────────────────── */
    buildGrid();
})();
