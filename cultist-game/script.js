/* 
   Основной файл JavaScript для Cultist Simulator Zhalkaya Parodia
   Точка входа и инициализация игры
*/

// Инициализация игры - главная функция
function initGame() {
    // Обновляем заголовок страницы
    document.title = "Cultist Simulator Zhalkaya Parodia";
    
    // Показываем стартовый экран
    document.getElementById('start-modal').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('controls-hint').style.display = 'none';
    document.getElementById('auto-group-btn').style.display = 'none';
    document.getElementById('card-description-panel').style.display = 'none';
    
    // Добавляем обработчики для стартового экрана
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('tutorial-button').addEventListener('click', showTutorial);
    document.getElementById('back-from-tutorial').addEventListener('click', hideTutorial);
    document.getElementById('back-to-start').addEventListener('click', backToStart);
    
    // Добавляем обработчики для действий
    document.getElementById('action-work').addEventListener('click', () => startAction('work'));
    document.getElementById('action-study').addEventListener('click', () => startAction('study'));
    document.getElementById('action-dream').addEventListener('click', () => startAction('dream'));
    document.getElementById('action-talk').addEventListener('click', () => startAction('talk'));
    document.getElementById('action-explore').addEventListener('click', showExploreModal);
    document.getElementById('action-ritual').addEventListener('click', () => startAction('ritual'));
    document.getElementById('action-rest').addEventListener('click', () => startAction('rest'));
    document.getElementById('action-create-cult').addEventListener('click', showCultCreationModal);
    
    // Обработчик для кнопки автоматической группировки
    document.getElementById('auto-group-btn').addEventListener('click', autoGroupAllCards);
    
    // Обработчики для модальных окон
    document.getElementById('cancel-cult').addEventListener('click', hideCultCreationModal);
    document.getElementById('become-clerk').addEventListener('click', becomeClerk);
    document.getElementById('continue-cult').addEventListener('click', continueCult);
    document.getElementById('cancel-explore').addEventListener('click', hideExploreModal);
    document.getElementById('explore-world').addEventListener('click', () => startAction('explore-world'));
    
    // Загружаем сохраненную игру, если есть
    loadSavedGame();
}

// Начало игры
function startGame() {
    document.getElementById('start-modal').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('controls-hint').style.display = 'block';
    document.getElementById('auto-group-btn').style.display = 'block';
    
    // Сбрасываем счетчик последовательных работ
    gameState.consecutiveWork = 0;
    
    // Очищаем стек из предыдущей игры
    gameState.cardStacks = {};
    
    // Если карт нет (первый запуск), создаем начальные
    if (gameState.cards.length === 0) {
        createCard('Здоровье', 'Ваша жизненная сила', cardTypes.RESOURCE, 100, 100, gameState.health);
        createCard('Рассудок', 'Ваша ментальная стабильность', cardTypes.RESOURCE, 300, 100, gameState.reason);
        createCard('Деньги', 'Средства к существованию', cardTypes.RESOURCE, 500, 100, gameState.funds);
        createCard('Книжная лавка', 'Место для поиска знаний', cardTypes.LOCATION, 200, 300);
    }
    
    updateUI();
    
    // Инициализируем перетаскивание карт
    initCardDrag();
    
    // Проверяем, можно ли создать культ
    checkCultCreation();
}

// Показать обучение
function showTutorial() {
    document.getElementById('start-modal').style.display = 'none';
    document.getElementById('tutorial-modal').style.display = 'flex';
}

// Скрыть обучение
function hideTutorial() {
    document.getElementById('tutorial-modal').style.display = 'none';
    document.getElementById('start-modal').style.display = 'flex';
}

// Вернуться на стартовый экран
function backToStart() {
    document.getElementById('ending-modal').style.display = 'none';
    document.getElementById('start-modal').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('controls-hint').style.display = 'none';
    document.getElementById('auto-group-btn').style.display = 'none';
    document.getElementById('card-description-panel').style.display = 'none';
    
    // Сброс состояния игры
    resetGameState();
    
    updateUI();
}

// Показать модальное окно создания культа
function showCultCreationModal() {
    // Проверяем, есть ли у игрока аспекты
    const aspects = gameState.cards.filter(card => card.type === cardTypes.ASPECT);
    
    if (aspects.length === 0) {
        addLogEntry('У вас нет знаний аспектов для создания культа.');
        return;
    }
    
    // Собираем уникальные аспекты
    const uniqueAspects = {};
    aspects.forEach(card => {
        if (card.knowledgeType && !uniqueAspects[card.knowledgeType]) {
            uniqueAspects[card.knowledgeType] = KNOWLEDGE_TYPES[card.knowledgeType];
        }
    });
    
    // Заполняем варианты выбора
    const aspectChoices = document.getElementById('aspect-choices');
    aspectChoices.innerHTML = '';
    
    Object.values(uniqueAspects).forEach(knowledge => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'aspect-choice';
        choiceDiv.innerHTML = `
            <div class="aspect-choice-content">
                <span class="aspect-emoji">${knowledge.emoji}</span>
                <span class="aspect-name">${knowledge.name}</span>
                <span class="aspect-desc">${knowledge.description}</span>
            </div>
        `;
        
        choiceDiv.addEventListener('click', () => createCult(knowledge.name));
        aspectChoices.appendChild(choiceDiv);
    });
    
    document.getElementById('cult-choice-modal').style.display = 'flex';
}

// Скрыть модальное окно создания культа
function hideCultCreationModal() {
    document.getElementById('cult-choice-modal').style.display = 'none';
}

// Показать модальное окно исследования
function showExploreModal() {
    // Проверяем есть ли деньги
    if (gameState.funds < 3) {
        addLogEntry('Недостаточно денег для исследования. Нужно 3💰.');
        return;
    }
    
    // Получаем все места, КРОМЕ книжной лавки
    const locationCards = gameState.cards.filter(card => 
        card.type === cardTypes.LOCATION && card.title !== 'Книжная лавка'
    );
    
    // Заполняем варианты выбора
    const exploreChoices = document.getElementById('explore-choices');
    exploreChoices.innerHTML = '';
    
    // Добавляем вариант исследовать мир
    const worldChoiceDiv = document.createElement('div');
    worldChoiceDiv.className = 'aspect-choice';
    worldChoiceDiv.id = 'explore-world-choice';
    worldChoiceDiv.innerHTML = `
        <div class="aspect-choice-content">
            <span class="aspect-emoji">🗺️</span>
            <span class="aspect-name">Исследовать мир</span>
            <span class="aspect-desc">Искать новые интересные места</span>
            <span class="aspect-cost">Стоимость: 3💰</span>
        </div>
    `;
    worldChoiceDiv.addEventListener('click', () => startAction('explore-world'));
    exploreChoices.appendChild(worldChoiceDiv);
    
    // Добавляем существующие места (кроме книжной лавки)
    locationCards.forEach(card => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'aspect-choice location-choice';
        choiceDiv.setAttribute('data-location-id', card.id);
        choiceDiv.innerHTML = `
            <div class="aspect-choice-content">
                <span class="aspect-emoji">🗺️</span>
                <span class="aspect-name">${card.title}</span>
                <span class="aspect-desc">${card.description}</span>
                <span class="aspect-cost">Исследовать это место (стоимость: 3💰)</span>
            </div>
        `;
        
        choiceDiv.addEventListener('click', () => exploreLocation(card.id));
        exploreChoices.appendChild(choiceDiv);
    });
    
    document.getElementById('explore-modal').style.display = 'flex';
}

// Скрыть модальное окно исследования
function hideExploreModal() {
    document.getElementById('explore-modal').style.display = 'none';
}

// Исследовать конкретное место
function exploreLocation(locationId) {
    hideExploreModal();
    
    // Находим карту места
    const locationCard = gameState.cards.find(card => card.id === locationId);
    if (!locationCard) return;
    
    // Проверяем, не пытаются ли исследовать книжную лавку
    if (locationCard.title === 'Книжная лавка') {
        addLogEntry('Вы не можете исследовать книжную лавку. Используйте действие "Посетить книжную лавку".');
        return;
    }
    
    // Снимаем деньги
    gameState.funds -= 3;
    
    // Удаляем карту места
    removeCard(locationCard.id);
    
    // Ищем аспект
    let message = `Вы исследуете "${locationCard.title}". Место больше не доступно.`;
    
    if (Math.random() > 0.5) {
        // Находим аспект
        const knowledgeTypes = Object.keys(KNOWLEDGE_TYPES);
        const randomType = knowledgeTypes[Math.floor(Math.random() * knowledgeTypes.length)];
        const knowledge = KNOWLEDGE_TYPES[randomType];
        
        createCard(knowledge.name, knowledge.description, cardTypes.ASPECT,
                  Math.random() * 800 + 100, Math.random() * 400 + 100,
                  null, randomType);
        message += ` Вы находите знания об аспекте "${knowledge.name}".`;
        gameState.hasAspect = true;
    } else {
        message += ' Вы ничего особенного не нашли.';
    }
    
    addLogEntry(message);
    updateUI();
}

// Создать культ
function createCult(aspectName) {
    // Находим тип аспекта по имени
    const aspectType = Object.keys(KNOWLEDGE_TYPES).find(
        key => KNOWLEDGE_TYPES[key].name === aspectName
    );
    
    if (aspectType) {
        // Создаем карту культа
        createCard(`Культ ${aspectName}`, `Ваша организация, поклоняющаяся ${aspectName}`, cardTypes.CULT, 
                  Math.random() * 800 + 100, Math.random() * 400 + 100);
        
        // Превращаем всех последователей в верных последователей
        gameState.cards.forEach(card => {
            if (card.type === cardTypes.FOLLOWER) {
                card.title = 'Верный последователь';
                card.description = `Преданный член вашего культа ${aspectName}`;
            }
        });
        
        // Также обновляем карты в стеках
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.FOLLOWER) {
                stack.cards.forEach(cardId => {
                    const card = gameState.cards.find(c => c.id === cardId);
                    if (card) {
                        card.title = 'Верный последователь';
                        card.description = `Преданный член вашего культа ${aspectName}`;
                    }
                });
            }
        });
        
        gameState.cultCreated = true;
        gameState.cultAspect = aspectType;
        addLogEntry(`Вы создали Культ ${aspectName}! Теперь вы можете проводить ритуалы.`);
        
        hideCultCreationModal();
        updateUI();
    }
}

// Стать клерком (концовка)
function becomeClerk() {
    document.getElementById('career-modal').style.display = 'none';
    showEnding(endings.CLERK);
}

// Продолжить путь культиста
function continueCult() {
    document.getElementById('career-modal').style.display = 'none';
    gameState.consecutiveWork = 0; // Сбрасываем счетчик
    addLogEntry('Вы решили продолжить свой путь культиста.');
}

// Функция для загрузки сохраненной игры
function loadSavedGame() {
    // Восстанавливаем позиции карт из localStorage, если они есть
    const savedPositions = localStorage.getItem('cultGameCardPositions');
    if (savedPositions) {
        gameState.cardPositions = JSON.parse(savedPositions);
    }
    
    // Восстанавливаем состояние игры из localStorage
    const savedGameState = localStorage.getItem('cultGameState');
    if (savedGameState) {
        const savedState = JSON.parse(savedGameState);
        gameState.health = savedState.health || 10;
        gameState.reason = savedState.reason || 10;
        gameState.funds = savedState.funds || 5;
        gameState.cultCreated = savedState.cultCreated || false;
        gameState.hasAspect = savedState.hasAspect || false;
        gameState.logEntries = savedState.logEntries || ['Вы начинаете свой путь в тайных знаниях...'];
        gameState.consecutiveWork = savedState.consecutiveWork || 0;
        gameState.cultAspect = savedState.cultAspect || null;
        gameState.workCount = savedState.workCount || 0;
        gameState.ritualCount = savedState.ritualCount || 0;
        
        // Восстанавливаем стеки карт
        if (savedState.cardStacks) {
            gameState.cardStacks = savedState.cardStacks;
        }
        
        // Восстанавливаем полученные аспекты
        if (savedState.obtainedKnowledge) {
            gameState.obtainedKnowledge = new Set(savedState.obtainedKnowledge);
        }
    }
    
    // Восстанавливаем карты из localStorage
    const savedCards = localStorage.getItem('cultGameCards');
    if (savedCards) {
        gameState.cards = JSON.parse(savedCards);
        
        // Восстанавливаем связи между картами и стеками
        Object.values(gameState.cardStacks).forEach(stack => {
            stack.cards.forEach(cardId => {
                const card = gameState.cards.find(c => c.id == cardId);
                if (card) {
                    card.stackId = stack.id;
                    card.stackIndex = stack.cards.indexOf(cardId);
                }
            });
        });
    }
}

// Функция для удаления карты
function removeCard(cardId) {
    const cardIndex = gameState.cards.findIndex(c => c.id === cardId);
    if (cardIndex > -1) {
        const card = gameState.cards[cardIndex];
        
        // Если карта в стеке, удаляем ее из стека
        if (card.stackId) {
            const stack = gameState.cardStacks[card.stackId];
            if (stack) {
                const indexInStack = stack.cards.indexOf(cardId);
                if (indexInStack > -1) {
                    stack.cards.splice(indexInStack, 1);
                    
                    // Если в стеке осталась одна карта, разбираем стек
                    if (stack.cards.length <= 1) {
                        if (stack.cards.length === 1) {
                            const lastCard = gameState.cards.find(c => c.id === stack.cards[0]);
                            if (lastCard) {
                                lastCard.stackId = null;
                                lastCard.stackIndex = 0;
                            }
                        }
                        delete gameState.cardStacks[card.stackId];
                    }
                }
            }
        }
        
        // Удаляем карту
        gameState.cards.splice(cardIndex, 1);
    }
}

// Функция для сброса состояния игры
function resetGameState() {
    gameState.health = 10;
    gameState.reason = 10;
    gameState.funds = 5;
    gameState.cards = [];
    gameState.logEntries = ['Вы начинаете свой путь в тайных знаниях...'];
    gameState.hasAspect = false;
    gameState.cultCreated = false;
    gameState.cardPositions = {};
    gameState.cardStacks = {};
    gameState.obtainedKnowledge = new Set();
    gameState.consecutiveWork = 0;
    gameState.cultAspect = null;
    gameState.workCount = 0;
    gameState.ritualCount = 0;
    
    // Очищаем localStorage
    localStorage.removeItem('cultGameCardPositions');
    localStorage.removeItem('cultGameState');
    localStorage.removeItem('cultGameCards');
}

// Запуск игры при загрузке страницы
window.addEventListener('DOMContentLoaded', initGame);