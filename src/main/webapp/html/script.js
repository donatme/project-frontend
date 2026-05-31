let state = {
    accountsCount: 0,
    accountsPerPage: 3,
    currentPage: 0,
    pendingHighlightId: null
};

const RACE_ARRAY = ['HUMAN', 'DWARF', 'ELF', 'GIANT', 'ORC', 'TROLL', 'HOBBIT'];
const PROFESSION_ARRAY = ['WARRIOR', 'ROGUE', 'CLERIC', 'PALADIN', 'NAZGUL', 'WARLOCK', 'DRUID'];
const BANNED_ARRAY = ['true', 'false'];

init();

/* ---------------- INIT ---------------- */
function init() {
    initCreateForm();
    createAccountPerPageDropDown();
    fetchCount().then(count => {
        state.accountsCount = count;
        render();
    });
    document.querySelector('.players-table__body')
        .addEventListener('click', (e) => {

            const edit = e.target.closest('.edit-button');
            if (edit) editAccountHandler({ currentTarget: edit });

            const del = e.target.closest('.delete-button');
            if (del) removeAccountHandler({ currentTarget: del });
        });
}

/* ---------------- API ---------------- */
function fetchPlayers(pageNumber, pageSize) {
    return $.get(`/rest/players?pageNumber=${pageNumber}&pageSize=${pageSize}`);
}

function fetchCount() {
    return $.get('/rest/players/count');
}

/* ---------------- RENDER ---------------- */
function render() {
    const totalPages = Math.max(
        1,
        Math.ceil(state.accountsCount / state.accountsPerPage)
    );

    if (state.currentPage >= totalPages) {
        state.currentPage = totalPages - 1;
    }

    renderPagination(totalPages);
    renderTable();
}

/* ---------------- TABLE ---------------- */
function renderTable() {
    fetchPlayers(state.currentPage, state.accountsPerPage).then(players => {

        const tbody = document.querySelector('.players-table__body');

        tbody.innerHTML = players.map(player => `
            <tr class="row ${player.id === state.pendingHighlightId ? 'highlight-created' : ''}"
                data-account-id="${player.id}">
                
                <td class="cell">${player.id}</td>
                <td class="cell" data-account-name>${player.name}</td>
                <td class="cell" data-account-title>${player.title}</td>
                <td class="cell" data-account-race>${player.race}</td>
                <td class="cell" data-account-profession>${player.profession}</td>
                <td class="cell" data-account-level>${player.level}</td>
                <td class="cell" data-account-birthday>${new Date(player.birthday).toLocaleDateString('uk')}</td>
                <td class="cell" data-account-banned>${player.banned}</td>

                <td class="cell">
                    <button class="edit-button" value="${player.id}">
                        <img src="../img/edit.png">
                    </button>
                </td>

                <td class="cell">
                    <button class="delete-button" value="${player.id}">
                        <img src="../img/delete.png" alt="delete img">
                    </button>
                </td>
            </tr>
        `).join('');

        // сбрасываем подсветку после рендера
        if (state.pendingHighlightId !== null) {
            setTimeout(() => {
                state.pendingHighlightId = null;
                render();
            }, 1000);
        }
    });
}

/* ---------------- PAGINATION ---------------- */
function renderPagination(totalPages) {
    const container = document.querySelector('.pagination-buttons');

    container.innerHTML = Array.from(
        { length: totalPages },
        (_, i) => `<button value="${i}">${i + 1}</button>`
    ).join('');

    container.querySelectorAll('button')
        .forEach(btn => btn.addEventListener('click', (e) => {
            state.currentPage = Number(e.currentTarget.value);
            render();
        }));

    setActiveButton(state.currentPage);
}

function setActiveButton(index = 0) {
    const buttons = document.querySelectorAll('.pagination-buttons button');

    buttons.forEach(btn =>
        btn.classList.remove('active-pagination-button')
    );

    if (buttons[index]) {
        buttons[index].classList.add('active-pagination-button');
    }
}

/* ---------------- DROPDOWN ---------------- */
function createAccountPerPageDropDown() {
    const dropdown = document.querySelector('.accounts-per-page');

    dropdown.innerHTML = createSelectOptions([3, 5, 10, 20], 3);
    dropdown.addEventListener('change', (e) => {
        state.accountsPerPage = Number(e.currentTarget.value);
        state.currentPage = 0;
        render();
    });
}

/* ---------------- CREATE ---------------- */
function createAccount() {
    const data = {
        name: $('[data-create-name]').val(),
        title: $('[data-create-title]').val(),
        race: $('[data-create-race]').val(),
        profession: $('[data-create-profession]').val(),
        level: $('[data-create-level]').val(),
        birthday: new Date($('[data-create-birthday]').val()).getTime(),
        banned: $('[data-create-banned]').is(':checked')
    };

    $.ajax({
        url: '/rest/players/',
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: (createdPlayer) => {
            clearCreateForm();
            fetchCount().then(count => {
                state.accountsCount = count;
                state.currentPage = Math.ceil(count / state.accountsPerPage) - 1;
                state.pendingHighlightId = createdPlayer.id;
                render();
            });
        }
    });
}

/* ---------------- DELETE ---------------- */
function removeAccountHandler(e) {
    const id = e.currentTarget.value;

    $.ajax({
        url: `/rest/players/${id}`,
        type: 'DELETE',
        success: () => {
            fetchCount().then(count => {
                state.accountsCount = count;
                render();
            });
        }
    });
}

/* ---------------- EDIT ---------------- */
function editAccountHandler(e) {
    const id = e.currentTarget.value;
    const row = document.querySelector(`.row[data-account-id='${id}']`);
    const deleteBtn = row.querySelector('.delete-button');
    const img = row.querySelector('.edit-button img');
    const nameCell = row.querySelector('[data-account-name]');
    const titleCell = row.querySelector('[data-account-title]');
    const raceCell = row.querySelector('[data-account-race]');
    const profCell = row.querySelector('[data-account-profession]');
    const bannedCell = row.querySelector('[data-account-banned]');

    deleteBtn.classList.add('hidden');
    img.src = '../img/save.png';

    nameCell.replaceChildren(createInput(nameCell.textContent));
    titleCell.replaceChildren(createInput(titleCell.textContent));
    raceCell.replaceChildren(createSelect(RACE_ARRAY, raceCell.textContent));
    profCell.replaceChildren(createSelect(PROFESSION_ARRAY, profCell.textContent));
    bannedCell.replaceChildren(createSelect(BANNED_ARRAY, bannedCell.textContent));

    img.onclick = () => {
        updateAccount({
            accountId: id,
            data: {
                name: nameCell.querySelector('input')?.dataset.value ?? nameCell.textContent,
                title: titleCell.querySelector('input')?.dataset.value ?? titleCell.textContent,
                race: raceCell.querySelector('select')?.dataset.value ?? raceCell.textContent,
                profession: profCell.querySelector('select')?.dataset.value ?? profCell.textContent,
                banned: bannedCell.querySelector('select')?.dataset.value ?? bannedCell.textContent,
            }
        });
    };
}

/* ---------------- UPDATE ---------------- */
function updateAccount({ accountId, data }) {
    $.ajax({
        url: `/rest/players/${accountId}`,
        type: 'POST',
        data: JSON.stringify(data),
        contentType: 'application/json',
        success: () => {
            fetchCount().then(count => {
                state.accountsCount = count;
                render();
            });
        }
    });
}

/* ---------------- CREATE FORM ---------------- */
function initCreateForm() {
    document.querySelector('[data-create-race]')
        .insertAdjacentHTML('afterbegin', createSelectOptions(RACE_ARRAY, RACE_ARRAY[0]));
    document.querySelector('[data-create-profession]')
        .insertAdjacentHTML('afterbegin', createSelectOptions(PROFESSION_ARRAY, PROFESSION_ARRAY[0]));
}

function clearCreateForm() {
    $('[data-create-name]').val('');
    $('[data-create-title]').val('');
    $('[data-create-level]').val('');
    $('[data-create-birthday]').val('');
    $('[data-create-banned]').prop('checked', false);
    $('[data-create-race]').val(RACE_ARRAY[0]);
    $('[data-create-profession]').val(PROFESSION_ARRAY[0]);
}

/* ---------------- HELPERS ---------------- */
function createInput(value) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.dataset.value = value;
    input.addEventListener('input', e => {
        input.dataset.value = e.target.value;
    });
    return input;
}

function createSelect(optionsArray, defaultValue) {
    const select = document.createElement('select');

    select.innerHTML = createSelectOptions(optionsArray, defaultValue);
    select.dataset.value = defaultValue;
    select.addEventListener('change', e => {
        select.dataset.value = e.target.value;
    });
    return select;
}

function createSelectOptions(optionsArray, defaultValue) {
    return optionsArray.map(opt => `
        <option value="${opt}" ${opt === defaultValue ? 'selected' : ''}>
            ${opt}
        </option>
    `).join('');
}
