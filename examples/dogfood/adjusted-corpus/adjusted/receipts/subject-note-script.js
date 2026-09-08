
    const STORAGE_KEY = 'note-text';
    const note = document.getElementById('note');
    const clear = document.getElementById('clear');

    function loadSaved() {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch (err) {
        return null; // storage unavailable; start empty
      }
    }

    function save(value) {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch (err) {
        // storage unavailable; editing still works, just not persisted
      }
    }

    // Restore saved text on load; empty string if nothing was saved.
    const saved = loadSaved();
    note.value = saved === null ? '' : saved;

    note.addEventListener('input', () => {
      save(note.value);
    });

    clear.addEventListener('click', () => {
      note.value = '';
      save(''); // persist the empty note too
      note.focus();
    });
  