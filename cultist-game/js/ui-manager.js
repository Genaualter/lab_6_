/*
   Управление интерфейсом
   Cultist Simulator Zhalkaya Parodia
*/

// Обновление интерфейса
function updateUI() {
    // Обновляем карты ресурсов с новыми эмодзи
    const healthCard = gameState.cards.find(card => card.title === 'Здоровье');
    if (healthCard) {
        healthCard.value = gameState.health;
        // Обновляем эмодзи в заголовке если нужно
        const healthCardElement = document.querySelector('.card[data-title="Здоровье"]');
        if (healthCardElement) {
            const header = healthCardElement.querySelector('.card-header');
            if (header && !header.textContent.includes('❤️')) {
                header.innerHTML = '❤️ Здоровье';
            }
        }
    }
    
    const reasonCard = gameState.cards.find(card => card.title === 'Рассудок');
    if (reasonCard) {
        reasonCard.value = gameState.reason;
        // Обновляем эмодзи в заголовке если нужно
        const reasonCardElement = document.querySelector('.card[data-title="Рассудок"]');
        if (reasonCardElement) {
            const header = reasonCardElement.querySelector('.card-header');
            if (header && !header.textContent.includes('🧠')) {
                header.innerHTML = '🧠 Рассудок';
            }
        }
    }
    
    const fundsCard = gameState.cards.find(card => card.title === 'Деньги');
    if (fundsCard) {
        fundsCard.value = gameState.funds;
    }
    
    // Обновляем стол
    const desk = document.getElementById('desk');
    desk.innerHTML = '';
    
    // Сначала рисуем стеки
    Object.values(gameState.cardStacks).forEach(stack => {
        const stackElement = createStackElement(stack);
        desk.appendChild(stackElement);
    });
    
    // Затем рисуем одиночные карты (которые не в стеках)
    gameState.cards.forEach(card => {
        if (card.stackId) return; // Пропускаем карты, которые в стеках
        
        const cardElement = createCardElement(card);
        desk.appendChild(cardElement);
    });
    
    // Обновляем журнал
    updateLog();
    
    // Обновляем счетчики статуса
    updateStatusCounters();
    
    // Проверяем, можно ли создать культ
    checkCultCreation();
    
    // Проверяем условия концовок (только базовые - безумие и забвение)
    // Концовки по аспектам проверяются только в performRitual()
    checkEndings();
    
    // Сохраняем состояние игры
    saveGameState();
    
    // Инициализируем обработчики для стеков
    initStackControls();
    
    // Добавляем обработчики клика на карты для показа описания
    initCardClickHandlers();
    
    // Обновляем состояние кнопки исследования
    updateExploreButtonState();
    
    // Обновляем состояние других кнопок
    updateActionButtonsState();
}

// Обновление состояния всех кнопок действий
function updateActionButtonsState() {
    // Обновляем кнопку исследования
    updateExploreButtonState();
    
    // Обновляем кнопку ритуала
    updateRitualButtonState();
    
    // Обновляем кнопку создания культа
    updateCultButtonVisibility();
}

// Обновление состояния кнопки исследования
function updateExploreButtonState() {
    const exploreButton = document.getElementById('action-explore');
    if (!exploreButton) return;
    
    // Проверяем достаточно ли денег
    if (gameState.funds < 3) {
        exploreButton.classList.add('disabled');
        exploreButton.title = "Недостаточно денег (нужно 3💰)";
        
        // Заменяем обработчик на функцию, которая показывает сообщение
        exploreButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            addLogEntry('Недостаточно денег для исследования (нужно 3💰).');
            return false;
        };
    } else {
        exploreButton.classList.remove('disabled');
        exploreButton.title = "Исследовать мир или известные места";
        
        // Восстанавливаем оригинальный обработчик
        exploreButton.onclick = showExploreModal;
    }
}

// Обновление состояния кнопки ритуала
function updateRitualButtonState() {
    const ritualButton = document.getElementById('action-ritual');
    if (!ritualButton) return;
    
    // Проверяем условия для ритуала
    if (gameState.cultCreated) {
        ritualButton.style.display = 'block';
        
        if (gameState.health <= 1 || gameState.reason <= 1) {
            ritualButton.classList.add('disabled');
            ritualButton.title = "Недостаточно здоровья или рассудка для ритуала";
            ritualButton.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                addLogEntry('Недостаточно здоровья или рассудка для проведения ритуала.');
            };
        } else {
            ritualButton.classList.remove('disabled');
            ritualButton.title = "Провести ритуал";
            ritualButton.onclick = function() { startAction('ritual'); };
        }
    } else {
        ritualButton.style.display = 'none';
    }
}

// Создание элемента стека
function createStackElement(stack) {
    const stackElement = document.createElement('div');
    
    // Определяем классы стека на основе типа карт в нем
    let stackClasses = `card ${stack.type} stack`;
    
    if (stack.type === cardTypes.ASPECT && stack.knowledgeType) {
        stackClasses += ` ${stack.knowledgeType.toLowerCase()}-stack`;
    }
    
    stackElement.className = stackClasses;
    stackElement.style.left = `${stack.x}px`;
    stackElement.style.top = `${stack.y}px`;
    stackElement.setAttribute('data-stack-id', stack.id);
    
    if (stack.type === cardTypes.ASPECT && stack.knowledgeType) {
        stackElement.setAttribute('data-knowledge-type', stack.knowledgeType);
    }
    
    let displayName, displayEmoji;
    
    if (stack.type === cardTypes.ASPECT) {
        const aspectInfo = KNOWLEDGE_TYPES[stack.knowledgeType];
        displayName = aspectInfo.name;
        displayEmoji = aspectInfo.emoji;
        
        // Устанавливаем цвет стека в зависимости от аспекта
        stackElement.style.borderColor = aspectInfo.color;
    } else {
        displayName = stack.cardTitle || stack.type;
        displayEmoji = cardEmojis[stack.type] || '❓';
        
        // Устанавливаем цвет стека для других типов
        if (stack.type === cardTypes.FOLLOWER) {
            stackElement.style.borderColor = '#006400';
        } else if (stack.type === cardTypes.LOCATION) {
            stackElement.style.borderColor = '#4b0082';
        }
    }
    
    // Создаем заголовок с учетом цвета аспекта
    const headerStyle = stack.type === cardTypes.ASPECT && stack.knowledgeType ? 
        `style="color: ${KNOWLEDGE_TYPES[stack.knowledgeType].color}; border-color: ${KNOWLEDGE_TYPES[stack.knowledgeType].color};"` : '';
    
    stackElement.innerHTML = `
        <div class="card-header" ${headerStyle}>${displayEmoji} ${displayName}</div>
        <div class="card-content"></div>
        <div class="stack-counter">${stack.cards.length}</div>
        <div class="stack-controls">
            <button class="ungroup-btn" title="Разобрать стек">✖</button>
        </div>
    `;
    
    return stackElement;
}

// Создание элемента карты
function createCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${card.type}`;
    cardElement.style.left = `${card.x}px`;
    cardElement.style.top = `${card.y}px`;
    cardElement.style.zIndex = card.stackIndex || 1;
    cardElement.setAttribute('data-id', card.id);
    cardElement.setAttribute('data-title', card.title);
    
    if (card.knowledgeType) {
        cardElement.setAttribute('data-knowledge-type', card.knowledgeType);
        
        // Устанавливаем цвет карты аспекта
        const aspectInfo = KNOWLEDGE_TYPES[card.knowledgeType];
        if (aspectInfo) {
            cardElement.style.borderColor = aspectInfo.color;
        }
    } else if (card.type === cardTypes.FOLLOWER) {
        cardElement.style.borderColor = '#006400';
    } else if (card.type === cardTypes.LOCATION) {
        cardElement.style.borderColor = '#4b0082';
    }
    
    let emoji = cardEmojis[card.type] || '❓';
    let displayTitle = card.title;
    
    // Для карт аспектов используем специальный формат
    if (card.type === cardTypes.ASPECT && card.knowledgeType) {
        const aspectInfo = KNOWLEDGE_TYPES[card.knowledgeType];
        emoji = aspectInfo.emoji;
        displayTitle = aspectInfo.name;
    }
    
    // Для ресурсов добавляем эмодзи в заголовок
    if (card.type === cardTypes.RESOURCE) {
        if (card.title === 'Здоровье') {
            emoji = '❤️';
            cardElement.style.borderColor = '#dc143c';
        } else if (card.title === 'Рассудок') {
            emoji = '🧠';
            cardElement.style.borderColor = '#4682b4';
        } else if (card.title === 'Деньги') {
            emoji = '💰';
            cardElement.style.borderColor = '#1e90ff';
        }
    }
    
    // Карты без описания (прячем content)
    const hasDescription = card.description && card.description.trim() !== '';
    const contentClass = hasDescription ? '' : 'no-description';
    
    // Создаем заголовок с учетом цвета
    const headerStyle = card.type === cardTypes.ASPECT && card.knowledgeType ? 
        `style="color: ${KNOWLEDGE_TYPES[card.knowledgeType].color}; border-color: ${KNOWLEDGE_TYPES[card.knowledgeType].color};"` : 
        '';
    
    cardElement.innerHTML = `
        <div class="card-header" ${headerStyle}>${emoji} ${displayTitle}</div>
        <div class="card-content ${contentClass}">${card.description || ''}</div>
        ${card.value !== null ? `<div class="resource-value">${card.value}</div>` : ''}
    `;
    
    return cardElement;
}

// Обновление журнала
function updateLog() {
    const logEntries = document.getElementById('log-entries');
    logEntries.innerHTML = '';
    
    gameState.logEntries.slice().reverse().forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'log-entry';
        entryElement.textContent = entry;
        logEntries.appendChild(entryElement);
    });
}

// Обновление счетчиков статуса
function updateStatusCounters() {
    // Считаем уникальные аспекты
    const uniqueAspects = new Set(gameState.cards
        .filter(card => card.type === cardTypes.ASPECT && card.knowledgeType)
        .map(card => card.knowledgeType)
    );
    
    // Также учитываем аспекты в стеках
    Object.values(gameState.cardStacks).forEach(stack => {
        if (stack.type === cardTypes.ASPECT && stack.knowledgeType) {
            uniqueAspects.add(stack.knowledgeType);
        }
    });

    document.getElementById('knowledge-count').textContent = uniqueAspects.size;
    
    // Обновляем счетчик концовок (функция из endings.js)
    if (typeof updateEndingsCounter === 'function') {
        updateEndingsCounter();
    }
}

// Функция для инициализации контролов стеков
function initStackControls() {
    // Удаляем старые обработчики
    document.querySelectorAll('.ungroup-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Обработчики для кнопок разборки стека
    document.querySelectorAll('.ungroup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const stackElement = e.target.closest('.stack');
            const stackId = stackElement.getAttribute('data-stack-id');
            unstackAll(stackId);
        });
    });
    
    // Обработчики для двойного клика по стеку (удаление одной карты)
    document.querySelectorAll('.stack').forEach(stackElement => {
        // Удаляем старые обработчики
        stackElement.removeEventListener('dblclick', handleStackDoubleClick);
        // Добавляем новый обработчик
        stackElement.addEventListener('dblclick', handleStackDoubleClick);
    });
}

// Обработчик двойного клика по стеку
function handleStackDoubleClick(e) {
    if (e.target.closest('.stack-controls') || e.target.closest('.ungroup-btn')) {
        return;
    }
    
    const stackElement = e.currentTarget;
    const stackId = stackElement.getAttribute('data-stack-id');
    const stack = gameState.cardStacks[stackId];
    
    if (stack && stack.cards.length > 0) {
        // Удаляем последнюю карту из стека
        const lastCardId = stack.cards[stack.cards.length - 1];
        const card = gameState.cards.find(c => c.id === lastCardId);
        if (card) {
            removeFromStack(card);
            
            // Если после удаления карты стек пуст, удаляем его
            if (stack.cards.length === 0) {
                delete gameState.cardStacks[stackId];
                updateUI();
            }
        }
    }
}

// Инициализация обработчиков клика на карты для показа описания
function initCardClickHandlers() {
    document.querySelectorAll('.card').forEach(cardElement => {
        // Удаляем старые обработчики
        cardElement.removeEventListener('click', handleCardClick);
        // Добавляем новый обработчик
        cardElement.addEventListener('click', handleCardClick);
    });
}

// Обработчик клика на карту
function handleCardClick(e) {
    // Не обрабатываем клики по кнопкам управления
    if (e.target.closest('.stack-controls') || e.target.closest('.ungroup-btn')) {
        return;
    }
    
    const cardElement = e.currentTarget;
    showCardDescription(cardElement);
}

// Показать описание карты
function showCardDescription(cardElement) {
    const cardId = cardElement.getAttribute('data-id');
    const stackId = cardElement.getAttribute('data-stack-id');
    
    let card = null;
    
    if (cardId) {
        card = gameState.cards.find(c => c.id == cardId);
    } else if (stackId) {
        const stack = gameState.cardStacks[stackId];
        if (stack && stack.cards.length > 0) {
            const firstCardId = stack.cards[0];
            card = gameState.cards.find(c => c.id === firstCardId);
            
            // Для стека показываем информацию о количестве
            if (card) {
                const stack = gameState.cardStacks[stackId];
                const description = getCardDescription(card);
                const countInfo = `<br><br><span class="stack-info">В стеке: ${stack.cards.length} карт</span>`;
                
                showDescriptionPanel(description + countInfo);
                return;
            }
        }
    }
    
    if (card) {
        const description = getCardDescription(card);
        showDescriptionPanel(description);
    }
}

// Показать панель описания
function showDescriptionPanel(description) {
    const descriptionPanel = document.getElementById('card-description-panel');
    const descriptionText = document.getElementById('card-description-text');
    
    if (description && descriptionPanel && descriptionText) {
        descriptionText.innerHTML = description;
        descriptionPanel.style.display = 'block';
        
        // Скрываем предыдущий таймер
        if (window.descriptionTimer) {
            clearTimeout(window.descriptionTimer);
        }
        
        // Скрываем описание через 5 секунд
        window.descriptionTimer = setTimeout(() => {
            descriptionPanel.style.display = 'none';
        }, 5000);
    }
}

// Скрыть панель описания
function hideDescriptionPanel() {
    const descriptionPanel = document.getElementById('card-description-panel');
    if (descriptionPanel) {
        descriptionPanel.style.display = 'none';
    }
}

// Обновить видимость кнопки создания культа
function updateCultButtonVisibility() {
    const hasAspect = gameState.cards.some(card => card.type === cardTypes.ASPECT);
    const cultButton = document.getElementById('action-create-cult');
    
    if (hasAspect && !gameState.cultCreated) {
        cultButton.style.display = 'block';
    } else {
        cultButton.style.display = 'none';
    }
}

// Обновить кнопку ритуала
function updateRitualButtonVisibility() {
    const ritualButton = document.getElementById('action-ritual');
    ritualButton.style.display = gameState.cultCreated ? 'block' : 'none';
}

// Обновить интерфейс последователей после создания культа
function updateFollowersAfterCult() {
    if (gameState.cultCreated && gameState.cultAspect) {
        const aspectName = KNOWLEDGE_TYPES[gameState.cultAspect]?.name || gameState.cultAspect;
        
        gameState.cards.forEach(card => {
            if (card.type === cardTypes.FOLLOWER && !card.title.includes('Верный')) {
                card.title = 'Верный последователь';
                card.description = `Преданный член Культа ${aspectName}`;
            }
        });
        
        // Также обновляем карты в стеках
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.FOLLOWER) {
                // Нужно проверить каждую карту в стеке
                stack.cards.forEach(cardId => {
                    const card = gameState.cards.find(c => c.id === cardId);
                    if (card && !card.title.includes('Верный')) {
                        card.title = 'Верный последователь';
                        card.description = `Преданный член Культа ${aspectName}`;
                    }
                });
            }
        });
    }
}